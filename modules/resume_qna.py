# modules/resume_qna.py
"""
Recruiter-mode capability: "query resume details, ask if candidate would be a
good fit for a certain position". This is deliberately NOT the same as the
Stage-1 evaluation report - that report runs once, against the guideline
corpus. This is an open-ended, repeatable Q&A surface over ONE candidate's
resume, answered with hybrid (BM25 + dense) retrieval so a recruiter's
keyword-heavy question ("mentions Docker?") and a semantic one ("led a team
before?") both work well.

Resume retrieval = metadata filtering + vector search: every chunk here is
tagged with metadata={"file_name": ..., "section": ...} at index-build time
(chunking.py + here), and the fusion retriever in hybrid_retriever.py already
combines BM25 keyword matching with dense vector search over those chunks.
Any downstream filtering (e.g. "only look at the Experience section") can
filter on that same metadata.

Indexes are built once per resume and cached in memory keyed by case_id, so
a recruiter can ask several follow-up questions about the same candidate
without re-embedding the resume each time. This is process-local caching
(fine for a single-worker deployment); a multi-worker/production deployment
would want this in a shared store (Redis, etc.) instead - noted here rather
than silently assumed.
"""
from __future__ import annotations

from llama_index.core import VectorStoreIndex
from llama_index.core.schema import TextNode

from modules.embedder import Settings
from modules.chunking import chunk_resume_by_section
from modules.hybrid_retriever import build_hybrid_retriever
from modules.context_compression import compress_nodes, render_context

_resume_index_cache: dict[str, dict] = {}


def index_resume(case_id: str, resume_text: str, file_name: str) -> None:
    """Chunk + embed a candidate's resume and cache a hybrid retriever for it."""
    chunks = chunk_resume_by_section(resume_text)
    nodes = [
        TextNode(
            text=chunk.text,
            metadata={"file_name": file_name, "section": chunk.label, "chunk_index": i},
        )
        for i, chunk in enumerate(chunks)
    ]
    if not nodes:
        return

    index = VectorStoreIndex(nodes=nodes)
    retriever = build_hybrid_retriever(index, nodes, similarity_top_k=min(6, len(nodes)))
    _resume_index_cache[case_id] = {"retriever": retriever, "nodes": nodes, "file_name": file_name}


def is_indexed(case_id: str) -> bool:
    return case_id in _resume_index_cache


ASK_PROMPT_TEMPLATE = """
You are assisting a recruiter reviewing ONE specific candidate's resume. Answer strictly and only
from the RESUME EXCERPTS below - if the excerpts don't contain the answer, say so plainly rather
than guessing or drawing on outside knowledge about typical candidates.

=========================================
RESUME EXCERPTS (retrieved via hybrid BM25 + dense search)
=========================================
{context}

=========================================
TARGET ROLE UNDER CONSIDERATION
=========================================
{target_role}

=========================================
RECRUITER'S QUESTION
=========================================
{question}

=========================================
INSTRUCTIONS
=========================================
- Answer the question directly in 2-5 sentences.
- If the question asks about fit for the target role, ground your answer in specific resume
  excerpts above, not generic assumptions about the role.
- Cite which resume section(s) support your answer using their [Source: ... | Section: ...] tags.
- If the excerpts are insufficient to answer confidently, say exactly that instead of speculating.
"""


def ask_about_resume(case_id: str, question: str, target_role: str = "") -> dict:
    """
    Runs a hybrid-retrieval Q&A turn over one candidate's cached resume index.
    Returns the answer plus the exact source chunks it was grounded in, so the
    frontend can show the recruiter the citations alongside the answer.
    """
    entry = _resume_index_cache.get(case_id)
    if entry is None:
        return {
            "answer": "This candidate's resume hasn't been indexed for Q&A yet "
                      "(re-run screening in recruiter mode first).",
            "citations": [],
        }

    retrieved = entry["retriever"].retrieve(question)
    compressed = compress_nodes(retrieved, max_chars_per_chunk=500, max_total_chars=3000)
    context = render_context(compressed, max_chars_per_chunk=500)

    prompt = ASK_PROMPT_TEMPLATE.format(context=context, target_role=target_role or "Not specified", question=question)
    answer = str(Settings.llm.complete(prompt))

    citations = [
        {
            "section": node.node.metadata.get("section", "n/a"),
            "confidence": round(float(node.score), 4) if node.score is not None else None,
            "snippet": node.node.get_content()[:220].strip(),
        }
        for node in compressed
    ]

    return {"answer": answer, "citations": citations}
