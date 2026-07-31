# modules/human_loop.py
"""
Glue layer connecting the screening pipeline (analyser.py) to the RL routing
policy (reward_policy.py) and its persisted feedback log (feedback_store.py).

Flow:
1. After a case is screened, route_case() builds a state vector from the
   pipeline's own self-reported confidence (RAG-triad scores + the LLM's
   stated fit probability) and asks the policy whether to trust the automated
   decision or force human review. The decision AND its full explanation are
   attached to the API response and persisted.
2. When a reviewer later submits feedback (agree/disagree) via
   POST /api/cases/{case_id}/feedback, record_feedback() computes a reward
   from the outcome, updates the policy online, and persists the new policy
   state to disk so it survives a restart.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path
from datetime import datetime, timezone

import numpy as np

from modules import feedback_store
from modules.reward_policy import LinUCBPolicy, TRUST_AI, ESCALATE_HUMAN, FEATURE_NAMES

POLICY_STATE_PATH = Path(__file__).resolve().parent.parent / "rl_state" / "policy_state.json"

_policy: LinUCBPolicy | None = None


def get_policy() -> LinUCBPolicy:
    global _policy
    if _policy is None:
        feedback_store.init_db()
        _policy = LinUCBPolicy.load_or_create(POLICY_STATE_PATH)
    return _policy


def _parse_status_and_probability(evaluation_scorecard: str) -> tuple[str, float]:
    status_match = re.search(r"ASSIGNED STATUS:\*\*\s*\[?([A-Za-z_ ]+?)\]?\s*(?:\n|$)", evaluation_scorecard)
    prob_match = re.search(r"FIT PROBABILITY:\*\*\s*\[?(\d+(?:\.\d+)?)\s*%?\]?", evaluation_scorecard)
    status = status_match.group(1).strip() if status_match else "UNKNOWN"
    probability = float(prob_match.group(1)) if prob_match else 50.0
    return status, probability


def build_state_vector(triad_metrics: dict, retrieval_confidence_avg: float, fit_probability: float) -> np.ndarray:
    return np.array([
        1.0,  # bias term
        triad_metrics.get("retrieval_relevance", 0.0) / 100.0,
        triad_metrics.get("generation_groundedness", 0.0) / 100.0,
        triad_metrics.get("answer_relevance", 0.0) / 100.0,
        float(retrieval_confidence_avg),
        fit_probability / 100.0,
    ])


def _explain(decision: dict) -> str:
    action = decision["action"]
    contributions = decision["per_feature_contribution"]
    top = sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)[:2]
    top_str = " and ".join(f"{name.replace('_', ' ')} ({value:+.2f})" for name, value in top)
    if action == TRUST_AI:
        return f"Routed to auto-trust. Strongest drivers: {top_str}."
    return f"Routed to mandatory human review. Strongest drivers: {top_str}."


def route_case(target_role: str, track: str, resume_filename: str, evaluation_scorecard: str,
               triad_metrics: dict, retrieval_confidence_avg: float) -> dict:
    """
    Called once per screened case. Decides TRUST_AI vs ESCALATE_HUMAN, persists
    the case + decision, and returns everything the frontend needs to display
    both the recommendation and why it was made.
    """
    ai_status, fit_probability = _parse_status_and_probability(evaluation_scorecard)
    x = build_state_vector(triad_metrics, retrieval_confidence_avg, fit_probability)

    policy = get_policy()
    decision = policy.select_action(x)
    explanation = _explain(decision)

    case_id = str(uuid.uuid4())
    feedback_store.save_case({
        "case_id": case_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "target_role": target_role,
        "track": track,
        "resume_filename": resume_filename,
        "ai_status": ai_status,
        "fit_probability": fit_probability,
        "context_relevance": triad_metrics.get("retrieval_relevance"),
        "generation_groundedness": triad_metrics.get("generation_groundedness"),
        "answer_relevance": triad_metrics.get("answer_relevance"),
        "trust_index": triad_metrics.get("trust_index"),
        "retrieval_confidence_avg": retrieval_confidence_avg,
        "policy_action": decision["action"],
        "policy_ucb_score": decision["ucb_score"],
        "policy_explanation": explanation,
    })

    return {
        "case_id": case_id,
        "ai_status": ai_status,
        "fit_probability": fit_probability,
        "policy_action": decision["action"],
        "policy_explanation": explanation,
        "policy_detail": decision,
    }


# Reward shaping. Trusting the AI and being right is the best outcome (no
# review cost incurred); trusting it and being wrong is the worst (an error
# reached the outcome unchecked). Escalating is always mildly positive - it's
# never actively harmful - but it's worth noticeably more when the human
# actually catches a disagreement, since that's the case where the review
# cost was clearly justified.
_REWARDS = {
    (TRUST_AI, True): 1.0,
    (TRUST_AI, False): -1.0,
    (ESCALATE_HUMAN, True): 0.4,
    (ESCALATE_HUMAN, False): 0.9,
}


def record_feedback(case_id: str, agree: bool, human_status: str | None, reviewer_note: str) -> dict:
    case = feedback_store.get_case(case_id)
    if case is None:
        raise ValueError(f"No case found for case_id={case_id}")

    action = case["policy_action"]
    reward = _REWARDS[(action, agree)]

    x = build_state_vector(
        triad_metrics={
            "retrieval_relevance": case["context_relevance"],
            "generation_groundedness": case["generation_groundedness"],
            "answer_relevance": case["answer_relevance"],
        },
        retrieval_confidence_avg=case["retrieval_confidence_avg"],
        fit_probability=case["fit_probability"],
    )

    policy = get_policy()
    policy.update(action, x, reward)
    policy.save(POLICY_STATE_PATH)

    feedback_store.save_feedback(
        case_id=case_id,
        agree=agree,
        human_status=human_status or case["ai_status"],
        reviewer_note=reviewer_note,
        reward=reward,
    )

    return {
        "case_id": case_id,
        "reward_applied": reward,
        "policy_action_that_was_taken": action,
        "policy_summary": policy.summary(),
        "total_feedback_recorded": feedback_store.feedback_count(),
    }


def policy_summary() -> dict:
    policy = get_policy()
    return {
        "summary": policy.summary(),
        "feature_names": FEATURE_NAMES,
        "total_feedback_recorded": feedback_store.feedback_count(),
    }
