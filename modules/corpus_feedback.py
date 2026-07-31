# modules/corpus_feedback.py
"""
Recruiter feedback loop (the third leg, alongside human_loop.py's RL routing
policy): 'Store as structured records, summarize periodically into new
guideline documents, and use as labeled data for improving the scoring
model.'

- Structured records: every submission is persisted as a row (track, role,
  resume, the AI's status vs. what the recruiter says is correct, and their
  free-text note) - see save_feedback() / init_db().
- Labeled data for the scoring model: when a recruiter marks agree/disagree,
  human_loop.record_feedback() is what actually updates the LinUCB routing
  policy (main.py wires that call separately using the same submission - see
  the /api/recruiter/feedback route). That's the "scoring model" in this
  architecture: not a fine-tuned LLM, but the trust/escalate policy, per the
  design rationale in reward_policy.py.
- Periodic summarization into new guideline documents: once a track
  accumulates >= DIGEST_THRESHOLD un-summarized feedback rows, an LLM turns
  them into one anonymized "Recruiter Feedback Digest" guideline document,
  which gets written into data/<track>/guidelines/ and hot-reloaded into that
  track's index via loader.refresh_track() - so future screenings in that
  track are retrieving against recruiters' own accumulated calibration
  notes, not just the original static rubric.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from modules.embedder import Settings
from modules import loader

DB_PATH = Path(__file__).resolve().parent.parent / "rl_state" / "corpus_feedback.db"
GUIDELINES_ROOT = Path(__file__).resolve().parent.parent / "data"

DIGEST_THRESHOLD = 5  # min un-summarized rows per track before a digest is generated


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
            CREATE TABLE IF NOT EXISTS recruiter_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT,
                track TEXT NOT NULL,
                target_role TEXT,
                resume_filename TEXT,
                ai_status TEXT,
                agree INTEGER,
                recruiter_status TEXT,
                free_text TEXT,
                submitted_at TEXT NOT NULL,
                summarized INTEGER NOT NULL DEFAULT 0
            )
        """)


def save_feedback(track: str, case_id: str = None, target_role: str = None, resume_filename: str = None,
                   ai_status: str = None, agree: bool = None, recruiter_status: str = None,
                   free_text: str = "") -> int:
    init_db()
    with _connect() as conn:
        cur = conn.execute("""
            INSERT INTO recruiter_feedback
                (case_id, track, target_role, resume_filename, ai_status, agree,
                 recruiter_status, free_text, submitted_at, summarized)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            case_id, track, target_role, resume_filename, ai_status,
            int(agree) if agree is not None else None, recruiter_status, free_text,
            datetime.now(timezone.utc).isoformat(),
        ))
        return cur.lastrowid


def _pending_rows(track: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM recruiter_feedback WHERE track = ? AND summarized = 0 ORDER BY id ASC",
            (track,),
        ).fetchall()
        return [dict(r) for r in rows]


def pending_count(track: str) -> int:
    return len(_pending_rows(track))


DIGEST_PROMPT_TEMPLATE = """
You are compiling an internal calibration note for a resume-screening system, based on real
recruiter feedback on past AI-generated screenings for the [{track_upper}] track.

Below are {n} recruiter feedback entries. Each includes what the AI originally decided, whether the
recruiter agreed, and any free-text note they left.

=========================================
RECRUITER FEEDBACK ENTRIES
=========================================
{entries}

=========================================
INSTRUCTIONS
=========================================
Produce a concise "Recruiter Feedback Digest" guideline document that a future screening pass can
use as additional calibration context. Requirements:
- Identify concrete PATTERNS across entries (e.g. "recruiters consistently flagged X as
  overweighted", "candidates with Y were undervalued by the automated score").
- Do NOT include any candidate names, recruiter names, or any other personally identifying detail
  from the entries - describe patterns generically (by skill, gap, or scoring behavior only).
- If entries conflict or there's only one data point for a pattern, say so explicitly rather than
  overgeneralizing from a single case.
- Write it as a calibration note guidelines document, using this structure:

## RECRUITER FEEDBACK DIGEST ({track_upper} TRACK)

### Patterns Observed
- ...

### Calibration Adjustments
- ...

### Data Basis
- Compiled from {n} recruiter feedback entries as of this digest.
"""


def summarize_and_append_to_corpus(track: str, force: bool = False) -> dict | None:
    """
    If a track has >= DIGEST_THRESHOLD un-summarized feedback rows (or force=True
    with at least 1), asks the LLM to compile them into an anonymized digest,
    writes it as a new guideline file, marks those rows summarized, and
    hot-reloads that track's index so the digest is immediately retrievable.
    Returns the digest metadata, or None if the threshold wasn't met.
    """
    rows = _pending_rows(track)
    if not rows or (not force and len(rows) < DIGEST_THRESHOLD):
        return None

    entries_text = "\n---\n".join(
        f"AI status: {r['ai_status']}\n"
        f"Recruiter agreed: {'Yes' if r['agree'] else 'No' if r['agree'] is not None else 'N/A'}\n"
        f"Recruiter's stated status: {r['recruiter_status'] or 'N/A'}\n"
        f"Note: {r['free_text'] or '(no note provided)'}"
        for r in rows
    )

    prompt = DIGEST_PROMPT_TEMPLATE.format(track_upper=track.upper(), n=len(rows), entries=entries_text)
    digest_text = str(Settings.llm.complete(prompt)).strip()

    guidelines_dir = GUIDELINES_ROOT / track / "guidelines"
    guidelines_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = guidelines_dir / f"recruiter_feedback_digest_{timestamp}.txt"
    out_path.write_text(digest_text, encoding="utf-8")

    with _connect() as conn:
        conn.execute(
            f"UPDATE recruiter_feedback SET summarized = 1 WHERE id IN "
            f"({','.join('?' * len(rows))})",
            [r["id"] for r in rows],
        )

    loader.refresh_track(track)  # hot-reload so the digest is retrievable immediately

    return {
        "track": track,
        "digest_file": out_path.name,
        "entries_summarized": len(rows),
        "digest_text": digest_text,
    }
