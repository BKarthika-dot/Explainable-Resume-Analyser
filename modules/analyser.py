from pathlib import Path

from modules.retriever import fetch_evaluation_rubric, fetch_guidance_benchmarks, STUDENT_MODE, RECRUITER_MODE
from modules.embedder import Settings
from modules.visualize_space import generate_retrieval_map
from modules.evaluator import run_package_fidelity_audit
from modules.report_parsing import extract_skill_breakdown, extract_status_and_probability
from modules import human_loop
from modules import resume_qna

from modules.prompts import EVALUATION_PROMPT_TEMPLATE, GUIDANCE_PROMPT_TEMPLATE


def process_complete_student_screening(resume_file_path: str, target_role_title: str, mode: str = STUDENT_MODE):
    """
    mode="student": dense RAG only. Response is shaped for a student reading
      it directly - clean fit probability + per-skill score breakdown up front.
    mode="recruiter": hybrid (BM25 + dense) RAG for both rubric retrieval and
      guidance. The candidate's resume is additionally indexed for ad-hoc
      follow-up Q&A via modules/resume_qna.py (see /api/recruiter/ask), and
      the automated routing decision (trust vs. escalate to human review) is
      attached so a recruiter sees not just the score but whether the system
      itself thinks this case needs their judgment.
    """
    mode = mode if mode in (STUDENT_MODE, RECRUITER_MODE) else STUDENT_MODE

    resume_path = Path(resume_file_path)
    if not resume_path.exists():
        print(f"Error: Target resume not found at {resume_path.resolve()}")
        return {
            "status": "error",
            "detail": f"Target resume not found at {resume_path.resolve()}",
        }

    with open(resume_path, "r", encoding="utf-8") as f:
        student_resume_text = f.read()

    print(f"\nProcessing Screening Pipeline for Student Resume: {resume_path.name} (mode={mode})")
    print("=" * 70)

    # STAGE 1: EVALUATION
    track, grading_rubrics, source_nodes = fetch_evaluation_rubric(
        target_role_title, active_file_name=resume_path.name, mode=mode
    )

    print("\n--- XAI RETRIEVAL AUDIT TRAIL ---")
    total_score = 0
    citations = []

    for idx, node in enumerate(source_nodes):
        score = node.score if node.score is not None else 0.0
        file_origin = node.node.metadata.get('file_name', 'unknown')
        total_score += score
        print(f" -> [Chunk {idx}] Source File: {file_origin} | Vector Confidence Score: {score:.4f}")
        citations.append({
            "chunk_index": idx,
            "source_file": file_origin,
            "section": node.node.metadata.get('section', 'n/a'),
            "confidence": round(float(score), 4),
            "snippet": node.node.get_content()[:200].strip(),
            "full_content": node.node.get_content().strip(),
        })

    avg_confidence = total_score / len(source_nodes) if source_nodes else 0.0
    print(f"Overall Retrieval Consistency Index: {avg_confidence:.4f}")

    low_confidence_warning = None
    if avg_confidence < 0.62:
        low_confidence_warning = (
            "Low context alignment threshold detected. Output evaluation parameters "
            "may lack direct domain references."
        )
        print(f"[WARNING]: {low_confidence_warning}")
    print("--------------------------------\n")

    print("[XAI Visualizer]: Fetching mathematical embedding for active query vector...")
    try:
        query_embedding = Settings.embed_model.get_query_embedding(target_role_title)
    except Exception as e:
        print(f"[WARNING]: Could not generate query embedding: {str(e)}. Defaulting to static fallback map.")
        query_embedding = None

    vector_map_url = generate_retrieval_map(
        target_track=track,
        retrieved_nodes=source_nodes,
        active_query_text=target_role_title,
        active_query_embedding=query_embedding,
    )

    evaluation_prompt = EVALUATION_PROMPT_TEMPLATE.format(
        track_upper=track.upper(),
        grading_rubrics=grading_rubrics,
        student_resume_text=student_resume_text,
    )

    print("Running Stage 1 Objective Evaluation...")
    evaluation_scorecard = str(Settings.llm.complete(evaluation_prompt))
    print("\n" + evaluation_scorecard)
    print("-" * 70)

    audit_results = run_package_fidelity_audit(
        target_query=target_role_title,
        source_nodes=source_nodes,
        evaluation_report=evaluation_scorecard,
        resume_text=student_resume_text,
    )

    # STAGE 2: ACTIONABLE CAREER NUDGE
    print("Initializing Stage 2: Contextual Career Nudging...")
    guidance_context = fetch_guidance_benchmarks(track, student_skills_and_gaps=evaluation_scorecard, mode=mode)

    guidance_prompt = GUIDANCE_PROMPT_TEMPLATE.format(
        guidance_context=guidance_context,
        evaluation_scorecard=evaluation_scorecard,
    )

    career_nudge_report = str(Settings.llm.complete(guidance_prompt))

    print("\n====== FINAL CANDIDATE GUIDANCE & ACTION ROADMAP ======")
    print(career_nudge_report)
    print("=" * 70)

    # HUMAN-IN-THE-LOOP RL ROUTING (both modes get a recommendation; recruiter
    # mode is where a human actually acts on it via /api/recruiter/feedback)
    routing = human_loop.route_case(
        target_role=target_role_title,
        track=track,
        resume_filename=resume_path.name,
        evaluation_scorecard=evaluation_scorecard,
        triad_metrics=audit_results,
        retrieval_confidence_avg=avg_confidence,
    )

    result = {
        "status": "success",
        "mode": mode,
        "track": track,
        "evaluation_report": evaluation_scorecard,
        "guidance_report": career_nudge_report,
        "triad_metrics": audit_results,
        "retrieval_confidence": {
            "average": round(avg_confidence, 4),
            "warning": low_confidence_warning,
        },
        "citations": citations,
        "vector_map_url": vector_map_url,
        "case_id": routing["case_id"],
        "ai_status": routing["ai_status"],
        "fit_probability": routing["fit_probability"],
        "policy_action": routing["policy_action"],
        "policy_explanation": routing["policy_explanation"],
        "policy_detail": routing["policy_detail"],
        "candidate_resume_text": student_resume_text,
    }

    if mode == STUDENT_MODE:
        # Student-facing shape: pull the numbers out of the prose so the
        # frontend can render fit % and per-skill bars directly.
        status, probability = extract_status_and_probability(evaluation_scorecard)
        result["skill_breakdown"] = extract_skill_breakdown(evaluation_scorecard)
        result["selection_status"] = status
        result["selection_probability"] = probability

    if mode == RECRUITER_MODE:
        # Index the resume for ad-hoc hybrid Q&A ("does she have AWS
        # experience", "is this candidate a good fit for a senior role") via
        # /api/recruiter/ask, keyed by this case's id.
        resume_qna.index_resume(routing["case_id"], student_resume_text, resume_path.name)
        result["qna_ready"] = True

    return result


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Run the screening pipeline directly from the command line, without the API/frontend."
    )
    parser.add_argument("resume_file_path", nargs="?", default="test.txt")
    parser.add_argument("target_role_title", nargs="?", default="AI Engineer")
    parser.add_argument("--mode", choices=[STUDENT_MODE, RECRUITER_MODE], default=STUDENT_MODE)
    args = parser.parse_args()

    result = process_complete_student_screening(
        resume_file_path=args.resume_file_path,
        target_role_title=args.target_role_title,
        mode=args.mode,
    )
    print(result)
