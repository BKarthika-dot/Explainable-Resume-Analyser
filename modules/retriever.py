# modules/retriever.py
import time

from modules.embedder import Settings
from modules.loader import get_track_assets
from modules.hybrid_retriever import build_hybrid_retriever
from modules.context_compression import compress_nodes

TRACKS = ["aiml", "sap", "data_analyst"]

STUDENT_MODE = "student"
RECRUITER_MODE = "recruiter"


def get_engines():
    """Back-compat accessor for modules that only need {track: query_engine}."""
    return {track: assets["query_engine"] for track, assets in get_track_assets().items()}


def _determine_track(role_title_or_query: str) -> str:
    """Routes any string query to the correct isolated track. Query routing = token optimization
    step #1: this means only ONE track's index is ever touched per request, not all three."""
    routing_prompt = f"""
    You are an expert recruitment system router. Analyze the following target job position or text context and determine which track it belongs to.

    Target: "{role_title_or_query}"

    Respond with exactly one word from this list: ['aiml', 'sap', 'data_analyst'].
    If it is completely ambiguous, choose 'aiml'. Do not include any punctuation, spaces, or extra text.
    """
    llm_decision = str(Settings.llm.complete(routing_prompt)).strip().lower()
    time.sleep(4)

    selected_track = "aiml"
    for track in TRACKS:
        if track in llm_decision:
            selected_track = track
            break
    return selected_track


def _get_retriever(track: str, mode: str, top_k: int):
    """
    Student mode: dense-only vector retriever, per the assignment
    (Component: Student mode -> Dense RAG).

    Recruiter mode: BM25 + dense fusion, per the assignment
    (Component: Recruiter mode -> Hybrid RAG (BM25 + Dense)). This applies to
    BOTH the rubric-retrieval path below and to ad-hoc resume Q&A
    (modules/resume_qna.py uses the same build_hybrid_retriever helper).
    """
    assets = get_track_assets().get(track)
    if assets is None:
        return None

    if mode == RECRUITER_MODE:
        return build_hybrid_retriever(assets["index"], assets["nodes"], similarity_top_k=top_k)

    from llama_index.core.retrievers import VectorIndexRetriever
    return VectorIndexRetriever(index=assets["index"], similarity_top_k=top_k)


def fetch_evaluation_rubric(
    target_role: str,
    active_file_name: str = None,
    top_k: int = 5,
    mode: str = STUDENT_MODE,
) -> tuple[str, str, list]:
    """
    Retrieves the grading rubric / guideline context for a target role.
    Retrieval-only (no LLM synthesis step) - grading_rubrics is built by
    concatenating exact retrieved chunk text, so anything the evaluation
    prompt calls a "Guideline Benchmark Target" is byte-for-byte traceable to
    a retrieved chunk. mode picks dense-only (student) vs hybrid (recruiter).
    """
    track = _determine_track(target_role)
    print(f"\n[Retriever]: Fetching EVALUATION metrics from the [{track.upper()}] isolated index. (mode={mode})")

    structural_evaluation_query = (
        f"grading schema, evaluation rubrics, scoring matrices, "
        f"point allocations, and selection guidelines criteria for {target_role} recruitment."
    )

    active_retriever = _get_retriever(track, mode, top_k * 2)
    if active_retriever is None:
        return track, f"Error: No index found for track {track}", []

    raw_source_nodes = active_retriever.retrieve(structural_evaluation_query)

    # Application-layer filtering: drop resumes, keep guidelines/job_desc, and
    # always keep the active file's own chunks if they happen to be indexed.
    sanitized_nodes = []
    for node in raw_source_nodes:
        file_origin = node.node.metadata.get('file_name', '').lower()

        if "resume" in file_origin and (not active_file_name or active_file_name.lower() not in file_origin):
            continue

        if "guidelines" in file_origin or "job_desc" in file_origin or (
            active_file_name and file_origin == active_file_name.lower()
        ):
            sanitized_nodes.append(node)
            if len(sanitized_nodes) >= top_k:
                break

    if not sanitized_nodes:
        print("[WARNING]: Metadata filter returned empty. Falling back to raw retrieved context nodes.")
        sanitized_nodes = raw_source_nodes[:top_k]

    # Token optimization step 3: dedup + per-chunk/total character budget,
    # applied AFTER sanitization so we never compress away context we then
    # discard anyway.
    compressed_nodes = compress_nodes(sanitized_nodes)

    grading_rubrics = "\n---\n".join(
        f"[Source: {node.node.metadata.get('file_name', 'unknown')}"
        f" | Section: {node.node.metadata.get('section', 'n/a')}]\n{node.node.get_content().strip()}"
        for node in compressed_nodes
    )

    return track, grading_rubrics, compressed_nodes


def fetch_guidance_benchmarks(track: str, student_skills_and_gaps: str, mode: str = STUDENT_MODE) -> str:
    """GUIDANCE MODE: Searches exclusively for high-performing sample resumes."""
    print(f"[Retriever]: Fetching CAREER GUIDANCE benchmarks from high-performing [{track.upper()}] sample profiles.")

    guidance_query = f"""
    Identify resumes labeled as HIGH_QUALITY_CANDIDATE or having a high selection probability.
    Focus on their specific PROJECTS, framework implementations, and professional experience lines
    that could bridge these skill gaps: {student_skills_and_gaps}.
    """

    assets = get_track_assets().get(track)
    if assets is None:
        return "Error: No guidance index found."

    response = assets["query_engine"].query(guidance_query)
    time.sleep(4)
    return str(response)
