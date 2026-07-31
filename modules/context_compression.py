# modules/context_compression.py
"""
Token-optimization layer applied after retrieval, before anything gets
stuffed into an LLM prompt. Three things happen here, in order:

1. Query routing already narrows WHICH index gets queried (aiml/sap/data_analyst
   in retriever.py's _determine_track) and section-based chunking (chunking.py)
   already narrows retrieval to whole, relevant sections instead of arbitrary
   512-token windows - so most of the "retrieve only relevant sections" work is
   done upstream of this file.
2. Dedup: near-duplicate chunks (e.g. the same requirement line retrieved
   twice via both the dense and BM25 arm of the hybrid retriever) are
   collapsed to one before they reach the prompt.
3. Compression: each surviving chunk is truncated to a per-chunk character
   budget, and the whole context is capped at a total character budget,
   dropping the lowest-scored chunks first if it's still over.

This is deliberately NOT an LLM-based "summarize the context" step - that
would reintroduce exactly the synthesis-then-hallucination risk the retrieval
layer was fixed to avoid (see the fix note in retriever.py). Compression here
only ever removes/truncates verbatim text; it never rewrites it.
"""
from __future__ import annotations


def _jaccard_similarity(a: str, b: str) -> float:
    set_a, set_b = set(a.lower().split()), set(b.lower().split())
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def compress_nodes(
    nodes: list,
    max_chars_per_chunk: int = 700,
    max_total_chars: int = 6000,
    dedup_threshold: float = 0.85,
) -> list:
    """
    Takes a list of NodeWithScore (already ranked, highest score first),
    drops near-duplicates, truncates each surviving chunk, and stops adding
    chunks once the total character budget is spent. Returns a new list of
    the same NodeWithScore objects (never mutates node text in place, so
    citations elsewhere in the pipeline still see the original full chunk).
    """
    kept = []
    kept_texts: list[str] = []
    total_chars = 0

    for node in nodes:
        text = node.node.get_content().strip()
        if not text:
            continue

        if any(_jaccard_similarity(text, seen) >= dedup_threshold for seen in kept_texts):
            continue

        truncated = text if len(text) <= max_chars_per_chunk else text[:max_chars_per_chunk].rstrip() + "…"

        if total_chars + len(truncated) > max_total_chars and kept:
            break  # budget exhausted; stop adding lower-ranked chunks

        kept.append(node)
        kept_texts.append(text)
        total_chars += len(truncated)

    return kept


def render_context(nodes: list, max_chars_per_chunk: int = 700) -> str:
    """Renders compressed nodes into a citation-friendly, source-tagged context block."""
    blocks = []
    for node in nodes:
        text = node.node.get_content().strip()
        if len(text) > max_chars_per_chunk:
            text = text[:max_chars_per_chunk].rstrip() + "…"
        file_name = node.node.metadata.get("file_name", "unknown")
        section = node.node.metadata.get("section", "")
        tag = f"[Source: {file_name}" + (f" | Section: {section}" if section else "") + "]"
        blocks.append(f"{tag}\n{text}")
    return "\n---\n".join(blocks)
