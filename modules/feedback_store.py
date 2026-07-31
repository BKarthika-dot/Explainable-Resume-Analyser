# modules/feedback_store.py
"""
Lightweight SQLite persistence for the human-in-the-loop review layer.
Every screened case is recorded with its triad scores and the routing
policy's decision; every human review is recorded against that case with the
reward it produced. This doubles as the RL pipeline's replay buffer AND a
durable audit trail - every past decision, and whether a human later agreed
with it, can be reconstructed later.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "rl_state" / "feedback.db"


@contextmanager
def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                target_role TEXT,
                track TEXT,
                resume_filename TEXT,
                ai_status TEXT,
                fit_probability REAL,
                context_relevance REAL,
                generation_groundedness REAL,
                answer_relevance REAL,
                trust_index REAL,
                retrieval_confidence_avg REAL,
                policy_action TEXT,
                policy_ucb_score REAL,
                policy_explanation TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                agree INTEGER NOT NULL,
                human_status TEXT,
                reviewer_note TEXT,
                reward REAL NOT NULL,
                FOREIGN KEY(case_id) REFERENCES cases(case_id)
            )
        """)


def save_case(case: dict) -> None:
    with _connect() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO cases (
                case_id, created_at, target_role, track, resume_filename,
                ai_status, fit_probability, context_relevance,
                generation_groundedness, answer_relevance, trust_index,
                retrieval_confidence_avg, policy_action, policy_ucb_score,
                policy_explanation
            ) VALUES (
                :case_id, :created_at, :target_role, :track, :resume_filename,
                :ai_status, :fit_probability, :context_relevance,
                :generation_groundedness, :answer_relevance, :trust_index,
                :retrieval_confidence_avg, :policy_action, :policy_ucb_score,
                :policy_explanation
            )
        """, case)


def get_case(case_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
        return dict(row) if row else None


def save_feedback(case_id: str, agree: bool, human_status: str, reviewer_note: str, reward: float) -> None:
    with _connect() as conn:
        conn.execute("""
            INSERT INTO feedback (case_id, submitted_at, agree, human_status, reviewer_note, reward)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (case_id, datetime.now(timezone.utc).isoformat(), int(agree), human_status, reviewer_note, reward))


def feedback_count() -> int:
    with _connect() as conn:
        row = conn.execute("SELECT COUNT(*) AS n FROM feedback").fetchone()
        return row["n"]


def recent_cases(limit: int = 25) -> list[dict]:
    """Cases with their latest feedback (if any) - handy for a future review queue."""
    with _connect() as conn:
        rows = conn.execute("""
            SELECT c.*, f.agree AS last_agree, f.human_status AS last_human_status,
                   f.reviewer_note AS last_reviewer_note, f.reward AS last_reward
            FROM cases c
            LEFT JOIN feedback f ON f.id = (
                SELECT id FROM feedback WHERE case_id = c.case_id ORDER BY id DESC LIMIT 1
            )
            ORDER BY c.created_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]
