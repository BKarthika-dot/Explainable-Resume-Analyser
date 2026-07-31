# modules/report_parsing.py
"""
The evaluation report (see prompts.EVALUATION_PROMPT_TEMPLATE) is markdown
meant for a human to read top-to-bottom. Student mode also needs a couple of
numbers pulled OUT of it cleanly - the fit probability and a per-category
score list - so the frontend can render an actual progress bar per skill
instead of asking the student to read prose to find their strengths. This is
a plain regex extraction over the report's own fixed section structure, not
a second LLM call - it can only ever surface a number the report already
states, never invent one.
"""
from __future__ import annotations

import re

_CATEGORY_BLOCK_RE = re.compile(
    r"### \[?([^\]\n]+?)\]?\s*\n(.*?)(?=\n### |\n## |\Z)",
    re.DOTALL,
)
_CATEGORY_SCORE_RE = re.compile(r"\*\*Category Score:\*\*\s*\[?(\d+(?:\.\d+)?)\s*/\s*10\]?")
_STATUS_RE = re.compile(r"\*\*ASSIGNED STATUS:\*\*\s*\[?([A-Za-z_ ]+?)\]?\s*(?:\n|$)")
_FIT_PROB_RE = re.compile(r"\*\*FIT PROBABILITY:\*\*\s*\[?(\d+(?:\.\d+)?)\s*%?\]?")


def extract_skill_breakdown(evaluation_report: str) -> list[dict]:
    """Returns [{"category": ..., "score_out_of_10": ...}, ...] for every category the report scored."""
    breakdown = []
    for match in _CATEGORY_BLOCK_RE.finditer(evaluation_report):
        category, block = match.group(1).strip(), match.group(2)
        score_match = _CATEGORY_SCORE_RE.search(block)
        if score_match:
            breakdown.append({
                "category": category,
                "score_out_of_10": float(score_match.group(1)),
            })
    return breakdown


def extract_status_and_probability(evaluation_report: str) -> tuple[str, float]:
    status_match = _STATUS_RE.search(evaluation_report)
    prob_match = _FIT_PROB_RE.search(evaluation_report)
    status = status_match.group(1).strip() if status_match else "UNKNOWN"
    probability = float(prob_match.group(1)) if prob_match else 50.0
    return status, probability
