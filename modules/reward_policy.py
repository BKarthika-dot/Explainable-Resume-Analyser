# modules/reward_policy.py
"""
A small, fully-interpretable contextual bandit (LinUCB) that learns WHEN to
trust the automated screening pipeline versus escalate a case to mandatory
human review.

Why a bandit, and not "reinforcement-learning fine-tune the LLM"?
-------------------------------------------------------------------
Gemini is served behind a closed API (see embedder.py) - there are no
gradients, log-probs, or weights available here, so classic RLHF-style
policy-gradient fine-tuning of the *generation* model itself isn't something
this architecture can do. What CAN be learned online from human feedback is a
narrower, arguably more useful thing: a routing policy that decides, given
the pipeline's own self-reported confidence (the RAG-triad scores) and the
LLM's own stated fit probability, whether to trust the automated decision or
require a human to review it before it's acted on.

This is still reinforcement learning in the standard sense - a policy that
takes an action based on a state to maximize expected reward, learned online
from feedback - just applied one layer up from the LLM, at the "should we
trust this output" layer. LinUCB (Li et al., 2010, "A Contextual-Bandit
Approach to Personalized News Article Recommendation") is used deliberately
instead of a neural policy: its learned weights are literally the
coefficients in `theta`, so at any point you can print out exactly which
features are driving the escalate/trust decision and by how much. That keeps
the RL layer itself as explainable as the rest of the system, instead of
adding a black box on top of one.
"""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np

TRUST_AI = "TRUST_AI"
ESCALATE_HUMAN = "ESCALATE_HUMAN"
ACTIONS = [TRUST_AI, ESCALATE_HUMAN]

FEATURE_NAMES = [
    "bias",
    "context_relevance",
    "generation_groundedness",
    "answer_relevance",
    "retrieval_confidence",
    "fit_probability",
]


class LinUCBPolicy:
    """
    One ridge-regression reward estimator per action ("arm"). At decision
    time, picks the arm with the highest upper confidence bound on expected
    reward: exploit what's worked before, but stay willing to explore arms
    we're still uncertain about. `alpha` controls how much weight exploration
    gets relative to the current best-guess estimate.
    """

    def __init__(self, n_features: int = len(FEATURE_NAMES), alpha: float = 0.6):
        self.n_features = n_features
        self.alpha = alpha
        # A_a: d x d ridge design matrix per arm, starts at identity (a weak prior).
        # b_a: d-dim reward-weighted feature sum per arm.
        self.A = {a: np.identity(n_features) for a in ACTIONS}
        self.b = {a: np.zeros(n_features) for a in ACTIONS}
        self.update_count = {a: 0 for a in ACTIONS}

    def _theta(self, action: str) -> np.ndarray:
        A_inv = np.linalg.inv(self.A[action])
        return A_inv @ self.b[action]

    def score(self, action: str, x: np.ndarray) -> tuple[float, float, float]:
        """Returns (ucb_score, point_estimate, exploration_bonus) for one arm."""
        A_inv = np.linalg.inv(self.A[action])
        theta = A_inv @ self.b[action]
        point_estimate = float(theta @ x)
        exploration_bonus = float(self.alpha * np.sqrt(x @ A_inv @ x))
        return point_estimate + exploration_bonus, point_estimate, exploration_bonus

    def select_action(self, x: np.ndarray) -> dict:
        """
        Chooses an action for state vector x and returns a full explanation of
        why - not just the decision, but the per-feature contribution behind
        it, so the choice is auditable rather than a black-box output.
        """
        scored = {a: self.score(a, x) for a in ACTIONS}
        chosen = max(scored, key=lambda a: scored[a][0])
        ucb, point_estimate, bonus = scored[chosen]

        theta = self._theta(chosen)
        per_feature = {
            name: round(float(theta[i] * x[i]), 4)
            for i, name in enumerate(FEATURE_NAMES)
        }

        return {
            "action": chosen,
            "ucb_score": round(ucb, 4),
            "point_estimate": round(point_estimate, 4),
            "exploration_bonus": round(bonus, 4),
            "per_feature_contribution": per_feature,
            "alternative_scores": {
                a: {"ucb_score": round(s[0], 4), "point_estimate": round(s[1], 4)}
                for a, s in scored.items()
            },
            "trained_on_n_cases": dict(self.update_count),
        }

    def update(self, action: str, x: np.ndarray, reward: float) -> None:
        self.A[action] += np.outer(x, x)
        self.b[action] += reward * x
        self.update_count[action] += 1

    # ---- persistence ----
    def to_dict(self) -> dict:
        return {
            "n_features": self.n_features,
            "alpha": self.alpha,
            "A": {a: self.A[a].tolist() for a in ACTIONS},
            "b": {a: self.b[a].tolist() for a in ACTIONS},
            "update_count": self.update_count,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LinUCBPolicy":
        policy = cls(n_features=data["n_features"], alpha=data["alpha"])
        policy.A = {a: np.array(data["A"][a]) for a in ACTIONS}
        policy.b = {a: np.array(data["b"][a]) for a in ACTIONS}
        policy.update_count = data["update_count"]
        return policy

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict()))

    @classmethod
    def load_or_create(cls, path: Path, **kwargs) -> "LinUCBPolicy":
        if path.exists():
            try:
                return cls.from_dict(json.loads(path.read_text()))
            except Exception:
                pass  # corrupt/incompatible state file - fall back to a fresh policy
        return cls(**kwargs)

    def summary(self) -> dict:
        """A human-readable snapshot of the policy's current learned behavior."""
        out = {}
        for action in ACTIONS:
            theta = self._theta(action)
            out[action] = {
                "weights": {name: round(float(w), 4) for name, w in zip(FEATURE_NAMES, theta)},
                "trained_on_n_cases": self.update_count[action],
            }
        return out
