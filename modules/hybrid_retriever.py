# modules/hybrid_retriever.py
"""
Recruiter-mode retrieval: BM25 (sparse/keyword) fused with the existing dense
vector retriever. Student mode never touches this file - it stays on pure
dense retrieval via modules/retriever.py's `_dense_retriever()`.

Why hybrid for recruiters specifically: a recruiter's ad-hoc question
("does she have AWS experience", "any mention of a notice period") is often a
short, keyword-heavy lookup where the exact term matters more than semantic
similarity - BM25 is very good at "the word AWS is literally in this chunk"
in a way dense embeddings sometimes blur. Fusing both means we don't lose
dense retrieval's strength on paraphrased/semantic questions either
("has she led a team" should still match "managed 4 engineers").

BM25Retriever requires the `llama-index-retrievers-bm25` package (see
requirements.txt). If it isn't installed, or node count is too small to be
useful, `build_hybrid_retriever` degrades to the plain dense retriever rather
than raising - hybrid retrieval is a quality improvement for recruiter mode,
not something that should take the whole pipeline down if the optional
dependency is missing in a given deployment.
"""
from __future__ import annotations

from llama_index.core.retrievers import VectorIndexRetriever, QueryFusionRetriever
from llama_index.core.schema import TextNode


def build_hybrid_retriever(vector_index, nodes: list[TextNode], similarity_top_k: int = 6):
    dense_retriever = VectorIndexRetriever(index=vector_index, similarity_top_k=similarity_top_k)

    if len(nodes) < 2:
        return dense_retriever

    try:
        from llama_index.retrievers.bm25 import BM25Retriever
        bm25_retriever = BM25Retriever.from_defaults(nodes=nodes, similarity_top_k=similarity_top_k)
    except Exception as e:
        print(f"[HybridRetriever]: BM25 unavailable ({e}); falling back to dense-only retrieval.")
        return dense_retriever

    # relative_score fusion normalizes each retriever's scores to [0,1] before
    # combining, so BM25's unbounded scores don't dominate/get dominated by
    # cosine similarity purely due to differing scales. num_queries=1 keeps
    # this deterministic and cheap - we deliberately do NOT let the fusion
    # retriever spend an LLM call generating alternate query phrasings.
    return QueryFusionRetriever(
        [dense_retriever, bm25_retriever],
        similarity_top_k=similarity_top_k,
        num_queries=1,
        mode="relative_score",
        use_async=False,
    )
