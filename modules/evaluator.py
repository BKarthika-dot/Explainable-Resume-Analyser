# modules/evaluator.py
import re
import ast
import json
import numpy as np
from llama_index.core import Settings


_ARITHMETIC_CHARS = set("0123456789.+-*/() \t")


def _safe_eval_arithmetic(expr: str):
    """
    Evaluates a plain arithmetic expression (digits, + - * / ( ) . only) with
    no access to names, calls, or attributes - used to actually check the
    model's shown work, not just parse it. Returns None if the expression
    contains anything outside that character set or fails to evaluate/parse,
    rather than guessing.
    """
    if not expr or not set(expr) <= _ARITHMETIC_CHARS:
        return None
    try:
        node = ast.parse(expr, mode="eval")
        for sub in ast.walk(node):
            if not isinstance(sub, (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant,
                                     ast.Add, ast.Sub, ast.Mult, ast.Div, ast.USub, ast.UAdd)):
                return None
        return eval(compile(node, "<arith>", "eval"))
    except Exception:
        return None


def _check_scorecard_self_consistency(evaluation_report: str) -> dict:
    """
    Deterministic (non-LLM) sanity check on the SELECTION SCORECARD section.

    This exists to catch failure modes an LLM-based judge is structurally
    poor at catching: a model that fabricates or mis-derives its own shown
    arithmetic can, and does, talk another LLM judge into agreeing the result
    is "grounded" - every individual quote can be real even when the overall
    conclusion doesn't follow from the model's own math. This function can't
    be persuaded by fluent reasoning the way another LLM call can; it either
    verifies the arithmetic actually holds, or it says it couldn't check.

    Two things it checks, independently:
    1. Every "<expression> = <value>" pattern found near "Total Score" is
       re-evaluated in Python and compared to the claimed value. This is what
       catches a claim like "16.6 * 100 / 100 = 77.0" - a false equation that
       a citation-only judge has no mechanism to notice, since no source
       document needs to be consulted to know it's wrong.
    2. Whether the final declared total actually falls in the decision band
       the report maps to its ASSIGNED STATUS (catches the earlier Track B/C
       conflation failure mode).

    IMPORTANT: if the report's phrasing doesn't match what this function
    knows how to parse, it reports "verified": False rather than defaulting
    to "consistent": True. A parse failure is not evidence of correctness -
    treating it that way was the bug that let the "16.6 * 100 / 100 = 77.0"
    case slip through undetected in an earlier version of this check.
    """
    issues = []

    status_match = re.search(r"ASSIGNED STATUS:\*\*\s*\[?([A-Za-z_ ]+?)\]?\s*(?:\n|$)", evaluation_report)
    assigned_status = status_match.group(1).strip() if status_match else None

    probability_match = re.search(r"FIT PROBABILITY:\*\*\s*\[?(\d+(?:\.\d+)?)\s*%?\]?", evaluation_report)
    fit_probability = float(probability_match.group(1)) if probability_match else None

    # Scan EVERY "Total Score" occurrence, not just the first. A model that
    # catches its own arithmetic mistake mid-response (as seen in practice -
    # it writes a wrong weighted-sum, notices, and redoes it) will produce
    # multiple "Total Score" mentions; checking only the first one means the
    # discarded scratch-work number gets treated as authoritative instead of
    # the model's own final, corrected figure - which produces exactly the
    # kind of misleading "FAILED" message (flagging a divergence from a
    # number the model itself already abandoned) this rewrite fixes.
    total_score_positions = [m.start() for m in re.finditer(r"Total Score", evaluation_report, re.IGNORECASE)]
    arithmetic_checked = False
    declared_total = None
    for pos in total_score_positions:
        block = evaluation_report[pos:pos + 400]
        # Strip markdown bold markers ("**") before arithmetic parsing - "*" is
        # also the multiplication operator in this document style, so a literal
        # "**Total Score:**" would otherwise leak "**" into an expression and
        # break parsing of an otherwise-valid equation right at the start.
        arith_block = block.replace("**", " ")

        # Split on every "=" and check each CONSECUTIVE pair of segments as
        # its own equation, rather than regex-matching isolated "expr = value"
        # fragments. This correctly handles a genuine multi-step chain like
        # "A + B = C = D" (verify A+B==C, then separately verify C==D) instead
        # of misreading fragments of it as new, unrelated equations.
        segments = arith_block.split("=")
        for i in range(len(segments) - 1):
            left_tail_match = re.search(r"([\d][\d.\s+\-*/()]*)$", segments[i])
            right_head_match = re.match(r"\s*([\d]+(?:\.\d+)?)", segments[i + 1])
            if not left_tail_match or not right_head_match:
                continue
            computed = _safe_eval_arithmetic(left_tail_match.group(1).strip())
            if computed is None:
                continue
            claimed = float(right_head_match.group(1))
            arithmetic_checked = True
            # The last successfully-parsed equation across the WHOLE document
            # wins as "the" declared total - if the model redid its math
            # further down, that later value is the one that's actually
            # authoritative for band-matching and FIT PROBABILITY comparison.
            declared_total = claimed
            if abs(computed - claimed) > 0.5:
                issues.append(
                    f"The report's own shown arithmetic doesn't hold: it states "
                    f"\"{left_tail_match.group(1).strip()} = {right_head_match.group(1)}\", but that "
                    f"expression actually evaluates to {computed:.2f}. This is a fabricated derivation, "
                    "independent of whether any cited source is accurate."
                )

    stated_total = declared_total
    if stated_total is not None and stated_total <= 10:
        stated_total *= 10  # normalize an "out of 10" total onto a 0-100 scale

    # Pull every "NN - NN -> LABEL" style decision-band mention out of the
    # report - the model is required to quote these verbatim when citing a
    # band from the guidelines directly, so this reliably finds every table
    # it referenced in that canonical form.
    band_matches = re.findall(
        r"(\d{1,3})\s*[-–]\s*(\d{1,3})\s*(?:→|->|:)?\s*\**\s*([A-Z][A-Z_ ]{2,})",
        evaluation_report,
    )
    # 🎯 THE FIX: the model doesn't always cite bands in that canonical order
    # when it's narrating its own reasoning rather than quoting the guideline
    # directly - e.g. "the 'STRONG HIRE' band (85 - 100)" states the label
    # BEFORE the range. That phrasing matched nothing in the pattern above,
    # so the mismatch check below had zero bands to compare against and
    # silently passed by omission. This second pattern catches that reversed
    # order too.
    band_matches += [
        (lo, hi, label)
        for label, lo, hi in re.findall(
            r"\"?([A-Z][A-Z_ ]{2,}?)\"?\s*(?:band|status)\s*\(?\s*(\d{1,3})\s*[-–]\s*(\d{1,3})\s*\)?",
            evaluation_report,
        )
    ]
    band_labels = {b[2].strip().upper() for b in band_matches}

    if stated_total is not None and assigned_status:
        assigned_norm = assigned_status.upper().replace(" ", "_").strip()
        matching_bands = [b for b in band_matches if float(b[0]) <= stated_total <= float(b[1])]
        matching_labels = {b[2].strip().upper().replace(" ", "_") for b in matching_bands}

        # 🎯 THE FIX: this used to allow a loose substring match
        # (assigned_norm in label or label in assigned_norm), on the theory
        # that labels get paraphrased slightly. But "HIRE" is literally a
        # substring of "STRONG_HIRE" - so that check would have silently
        # accepted ASSIGNED STATUS: HIRE against a band the report itself
        # mapped to STRONG_HIRE, which is exactly the real bug in this
        # report. Distinguishing adjacent-but-different bands is the whole
        # point of this check, so it needs an EXACT match, not a fuzzy one.
        if matching_labels and assigned_norm not in matching_labels:
            issues.append(
                f"Stated Total Score ({stated_total}) falls inside a band the report itself "
                f"maps to {sorted(matching_labels)}, but ASSIGNED STATUS is '{assigned_status}' - "
                "these contradict each other."
            )

    if fit_probability is not None and stated_total is not None and abs(fit_probability - stated_total) > 15:
        issues.append(
            f"FIT PROBABILITY ({fit_probability}%) diverges sharply from the report's own computed "
            f"Total Score ({stated_total}) with no verified formula connecting them - looks like a "
            "post-hoc qualitative adjustment rather than a value derived from the scoring."
        )

    if len(band_labels) > 4:
        issues.append(
            f"The report cites an unusually large number of distinct decision-band labels "
            f"({sorted(band_labels)}) - check whether it conflated two different tables (e.g. an "
            "experience-track scoring table and a separate screening-process tier) to justify its "
            "final verdict."
        )

    # A report we couldn't parse enough of to check is NOT the same thing as
    # a report we checked and found consistent. Downstream code (the
    # groundedness cap, and the frontend, if wired up) should treat these
    # differently rather than both reading as a clean "PASSED".
    verified = arithmetic_checked or (stated_total is not None and assigned_status is not None)
    if not verified:
        issues.append(
            "Could not parse enough of the SELECTION SCORECARD section to verify its arithmetic "
            "or band consistency - this is NOT a confirmation that the report is correct, only that "
            "this check couldn't be run against this response's phrasing."
        )

    return {
        "consistent": verified and len(issues) == 0,
        "verified": verified,
        "assigned_status": assigned_status,
        "fit_probability": fit_probability,
        "stated_total_score": stated_total,
        "issues": issues,
    }

def _run_constrained_judge(prompt: str) -> dict:
    """
    Helper to execute a zero-temperature LLM call, sanitize invalid control 
    characters, and cleanly extract a structured JSON payload.
    """
    if not Settings.llm:
        return {"reason": "LLM engine unpopulated.", "score": 0}
        
    try:
        # Enforce deterministic tracking via zero temperature
        response = Settings.llm.complete(prompt)
        response_text = response.text.strip()
        
       
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            return {"reason": f"No valid JSON block detected in response: {response_text[:100]}...", "score": 0}
            
        raw_json_str = json_match.group(0)
        
    
        sanitized_json_str = raw_json_str.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        
        sanitized_json_str = re.sub(r'\\+', r'\\', sanitized_json_str)
        sanitized_json_str = sanitized_json_str.replace('\\n\\t', '').replace('{\\n', '{').replace('\\n}', '}')
        sanitized_json_str = re.sub(r'",\\n\s*"', '", "', sanitized_json_str)
        
    
        try:
            return json.loads(sanitized_json_str)
        except json.JSONDecodeError:
            
            import ast
            cleaned_as_python_lit = raw_json_str.replace('true', 'True').replace('false', 'False').replace('null', 'None')
            return ast.literal_eval(cleaned_as_python_lit)

    except Exception as e:
        return {"reason": f"Judge runtime cleaning exception: {str(e)}", "score": 0}
    

def run_package_fidelity_audit(target_query: str, source_nodes: list, evaluation_report: str, resume_text: str = "") -> dict:
    """
    Executes a transparent, reference-free RAG Triad evaluation.
    Measures: Context Relevance, Generation Groundedness, and Answer Relevance.
    """
    print("\n" + "═"*60)
    print(" 🛡️  NATIVE RAG TRIAD COMPLIANCE AUDIT")
    print("═"*60)

    # Extract raw text strings from the LlamaIndex source nodes
    retrieved_chunks = [node.node.get_content() for node in source_nodes]

    if not retrieved_chunks:
        print("[WARNING]: No retrieval context available to audit.")
        return {
            "retrieval_relevance": 0.0,
            "generation_groundedness": 0.0,
            "answer_relevance": 0.0,
            "trust_index": 0.0,
            "per_chunk_scores": [],
        }

    combined_context = "\n---\n".join(retrieved_chunks)

    # ════════════════════════════════════════════════════════════
    # TRIAD PILLAR 1: CONTEXT RELEVANCE (Query -> Context)
    # ════════════════════════════════════════════════════════════
    print(" -> Evaluating Context Relevance via Vector Distance Mapping...")
    vector_scores = [float(node.score) for node in source_nodes if node.score is not None]

    if vector_scores:
        avg_similarity = float(np.mean(vector_scores))
        context_relevance = float(np.clip(avg_similarity * 100.0, 0.0, 100.0))
    else:
        avg_similarity = None
        context_relevance = 75.0  # Stable operational baseline when no scores are available

    per_chunk_scores = [
        {
            "file_name": node.node.metadata.get("file_name", "unknown"),
            "similarity": round(float(node.score), 4) if node.score is not None else None,
            "snippet": node.node.get_content()[:200].strip(),
        }
        for node in source_nodes
    ]

    # ════════════════════════════════════════════════════════════
    # TRIAD PILLAR 2: GENERATION GROUNDEDNESS (Context -> Response)
    # ════════════════════════════════════════════════════════════
    print(" -> Auditing Generation Groundedness via Fact-Checking Judge...")

    # 🎯 THE FIX: The judge was previously only shown the retrieved guideline
    # chunks and asked to verify EVERY claim against them — including the
    # report's "Direct Resume Evidence" quotes. But the candidate's resume is
    # never retrieved/chunked; it's handed to the evaluation LLM directly as
    # raw text (see analyser.py / EVALUATION_PROMPT_TEMPLATE). So any faithful
    # quote from the actual resume was structurally guaranteed to look
    # "ungrounded" to a judge that only had the guidelines in front of it —
    # the score wasn't measuring hallucination, it was measuring "did you also
    # show me the resume," and the answer was always no. We now give the judge
    # both source documents and ask it to attribute claims to whichever one
    # actually supports them, which is what "groundedness" is supposed to mean
    # here.
    resume_block = (
        f"\n\n[Candidate's Actual Resume Text]\n{resume_text}\n"
        if resume_text
        else "\n\n[Candidate's Actual Resume Text]\n(Not provided to this audit — treat any resume-attributed quote as unverifiable.)\n"
    )

    groundedness_prompt = f"""
    You are an expert factual auditor checking an AI system's report for hallucinations.
    Your task is to verify if the claims in the Generated Report are strictly supported by
    EITHER of the two source documents provided below: the retrieved Guideline/Job-Description
    chunks, or the candidate's own resume text. A claim is grounded if it is supported by at
    least one of these two sources — it does not need to appear in both.

    [Provided Guideline / Job Description Chunks]
    {combined_context}
    {resume_block}
    [Generated Report]
    {evaluation_report}

    CRITERIA:
    - Claims labeled "Direct Resume Evidence" or quoting the candidate's own experience should be
      checked against the Candidate's Actual Resume Text, not the Guideline chunks.
    - Claims labeled "Guideline Benchmark Target" or referencing scoring bands/criteria should be
      checked against the Guideline/Job Description chunks.
    - Only flag a claim as hallucinated if it is unsupported by BOTH sources, or if it invents
      specific details (numbers, thresholds, quotes) that appear in neither source verbatim.
    - If the report correctly identifies missing skills or accurately references skills present
      in either source, it is grounded.
    - IMPORTANT - check logical consistency, not just quote accuracy: a claim can be an accurate,
      correctly-cited quote and the report can STILL be ungrounded if the report uses that
      accurate quote to justify a conclusion that contradicts its own stated arithmetic. Look
      specifically at Section 3 (SELECTION SCORECARD): if the report computes a Total Score
      against one decision-band table and then overrides its own ASSIGNED STATUS or FIT
      PROBABILITY using a *different* classification system found elsewhere in the context
      (e.g. confusing the candidate's experience-track scoring table with an unrelated
      screening-process tier), treat that as a serious grounding failure even though every
      individual sentence in it may be independently well-cited. A real citation does not make a
      conclusion that contradicts the report's own math correct.
    - Assign a score from 0 to 3:
      0 = Complete hallucination. Report makes up facts disconnected from both sources.
      1 = High risk. Contains multiple assumptions or generalizations not found in either source,
          OR the final verdict contradicts the report's own computed score/decision-band logic.
      2 = Minor variance. High grounding overall, but includes light extra commentary or unverified minor fluff.
      3 = Perfect grounding. Every claim, gap, or assertion is verified by at least one source, AND
          the final ASSIGNED STATUS/FIT PROBABILITY follow mechanically from the report's own
          stated arithmetic with no unexplained overrides.

    You MUST output your response strictly in JSON format. Provide the architectural reasoning BEFORE the score to anchor your logic.
    {{
        "reason": "Write your detailed step-by-step verification audit here",
        "score": <integer_between_0_and_3>
    }}
    """
    grounded_result = _run_constrained_judge(groundedness_prompt)
    raw_groundedness_score = grounded_result.get("score", 2)
    generation_groundedness = (raw_groundedness_score / 3.0) * 100.0

    # ════════════════════════════════════════════════════════════
    # INDEPENDENT, NON-LLM SELF-CONSISTENCY CHECK
    # ════════════════════════════════════════════════════════════
    # The LLM judge above is instructed to catch score/status contradictions,
    # but it's still an LLM call, and a fluent, well-cited-sounding override
    # can talk another LLM into agreeing it's "grounded" the same way it
    # talked itself into that conclusion in the first place. This check is
    # plain regex/arithmetic - it can't be persuaded, only wrong about
    # parsing - so it acts as a hard cap on the score rather than one more
    # opinion to average in.
    print(" -> Cross-checking scorecard arithmetic for self-consistency (non-LLM)...")
    consistency = _check_scorecard_self_consistency(evaluation_report)
    if consistency["verified"] and not consistency["consistent"]:
        print(f"[WARNING]: Scorecard self-consistency check FAILED: {consistency['issues']}")
        generation_groundedness = min(generation_groundedness, 40.0)
    elif not consistency["verified"]:
        print(f"[NOTE]: Scorecard arithmetic could not be independently verified (parser didn't "
              f"recognize this response's phrasing) - treating as unconfirmed, not as passed.")
        generation_groundedness = min(generation_groundedness, 70.0)

    # ════════════════════════════════════════════════════════════
    # TRIAD PILLAR 3: ANSWER RELEVANCE (Query -> Response)
    # ════════════════════════════════════════════════════════════
    print(" -> Analyzing Answer Relevance via Target Intent Audit...")
    
    relevance_prompt = f"""
    You are an AI quality judge evaluating whether a RAG system's response directly addresses a user's prompt.
    
    [User Prompt / Target Role]
    {target_query}
    
    [Generated Report]
    {evaluation_report}
    
    CRITERIA:
    - Determine if the Generated Report actually answers the operational task of screening a candidate for the target role.
    - Does it deliver a clear technical match, gap analysis, and scorecard matching the query intent?
    - Assign a score from 0 to 2:
      0 = Irrelevant. The system completely missed the point of the query.
      1 = Partially relevant. The system screened the candidate but missed major elements of the role title's intent.
      2 = Highly relevant. The system perfectly aligned its analysis to match the target position.
      
    You MUST output your response strictly in JSON format.
    {{
        "reason": "Brief analysis of prompt intent vs response delivery",
        "score": <integer_between_0_and_2>
    }}
    """
    relevance_result = _run_constrained_judge(relevance_prompt)
    raw_relevance_score = relevance_result.get("score", 2)
    answer_relevance = (raw_relevance_score / 2.0) * 100.0

    # ════════════════════════════════════════════════════════════
    # COMPOSITE WEIGHTING ENGINE
    # ════════════════════════════════════════════════════════════
    # Weighting: 40% Groundedness (No Hallucinations), 40% Relevance, 20% Intent Mapping
    system_trust_index = (generation_groundedness * 0.40) + (context_relevance * 0.40) + (answer_relevance * 0.20)

    # Print out a beautifully structured, explainable log dashboard
    print("\n" + "─"*40)
    print(f" 🔍 AUDITOR LOG: {grounded_result.get('reason', 'N/A')}")
    print("─"*40)
    print(f" ✅ [Context Relevance]:           {context_relevance:.1f}%")
    print(f" ✅ [Generation Groundedness]:     {generation_groundedness:.1f}%")
    print(f" ✅ [Answer Relevance]:           {answer_relevance:.1f}%")
    if consistency["verified"] and not consistency["consistent"]:
        print(f" ⚠️  [Self-Consistency Check]:      FAILED — {'; '.join(consistency['issues'])}")
    elif not consistency["verified"]:
        print(f" ❔ [Self-Consistency Check]:      UNVERIFIED — could not parse this response's scorecard arithmetic")
    else:
        print(f" ✅ [Self-Consistency Check]:      PASSED")
    print(f" 💎 COMPOSITE SYSTEM TRUST INDEX: {system_trust_index:.1f}%")
    print("═"*60 + "\n")

    return {
        "retrieval_relevance": context_relevance,
        "generation_groundedness": generation_groundedness,
        "answer_relevance": answer_relevance,
        "trust_index": system_trust_index,
        "per_chunk_scores": per_chunk_scores,
        "groundedness_reason": grounded_result.get("reason", ""),
        "relevance_reason": relevance_result.get("reason", ""),
        "self_consistency": consistency,
    }