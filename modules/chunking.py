# modules/chunking.py
"""
Structure-aware chunking, replacing llama_index's generic sentence/token
splitter for this corpus.

Two different documents need two different chunking strategies here, because
they have two different internal structures worth preserving:

- Resumes are organized by SECTION (Experience, Skills, Projects, Education...).
  A generic 512-token splitter can and does slice a bullet point in half or
  merge the tail of "Experience" with the head of "Skills" into one chunk,
  which is exactly what makes citations ("Direct Resume Evidence: ...") read
  as almost-but-not-quite what's on the page. Chunking by section keeps each
  chunk semantically whole and lets us tag it with WHICH section it came from,
  which both the citation log and the recruiter Q&A layer rely on.

- Guidelines/job-desc docs are organized by HEADING (numbered rubric
  categories, markdown headers, etc). Chunking by heading keeps a scoring
  band or a requirement's full text together as one retrievable unit instead
  of splitting the rule from its threshold.

Both chunkers are deliberately simple, regex-based heuristics rather than an
ML section classifier - they're fast, dependency-free, fully deterministic
(so retrieval is reproducible), and good enough for the plain-text resumes
and guideline docs this pipeline works with. If a document doesn't match any
heading pattern, both chunkers fall back to returning the whole document as
one chunk rather than silently dropping content.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Common resume section headings, matched case-insensitively at the start of a line.
RESUME_SECTION_PATTERNS = [
    r"summary|objective|profile",
    r"education|academic",
    r"experience|employment|work history",
    r"skills|technical skills|core competenc\w*",
    r"projects?",
    r"certifications?|licenses?",
    r"publications?",
    r"achievements?|awards?|honors?",
    r"extracurricular|leadership|activities",
    r"contact|personal (info|details)",
]
_RESUME_HEADING_RE = re.compile(
    r"^[ \t]*(?:#{1,3}\s*)?(" + "|".join(RESUME_SECTION_PATTERNS) + r")\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Guideline/job-desc headings: markdown headers, numbered sections, or ALL-CAPS
# lines under ~60 chars (a common plain-text convention for section titles).
_GUIDELINE_HEADING_RE = re.compile(
    r"^(?:#{1,4}\s+.+|\d+[\.\)]\s+[A-Z][^\n]{0,80}|[A-Z][A-Z \-/&]{3,59})$",
    re.MULTILINE,
)


@dataclass
class Chunk:
    text: str
    label: str  # section name / heading text this chunk came from


def chunk_resume_by_section(raw_text: str) -> list[Chunk]:
    """Split a resume into one chunk per detected section heading."""
    text = raw_text.strip()
    if not text:
        return []

    matches = list(_RESUME_HEADING_RE.finditer(text))
    if not matches:
        return [Chunk(text=text, label="Full Resume")]

    chunks: list[Chunk] = []

    # Anything before the first detected heading (name/contact line, etc.)
    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            chunks.append(Chunk(text=preamble, label="Header / Contact"))

    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_label = m.group(1).strip().title()
        section_text = text[start:end].strip()
        if section_text:
            chunks.append(Chunk(text=section_text, label=section_label))

    return chunks


def chunk_guideline_by_heading(raw_text: str) -> list[Chunk]:
    """Split a guideline/job-desc doc into one chunk per detected heading."""
    text = raw_text.strip()
    if not text:
        return []

    matches = list(_GUIDELINE_HEADING_RE.finditer(text))
    if not matches:
        return [Chunk(text=text, label="Full Document")]

    chunks: list[Chunk] = []

    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            chunks.append(Chunk(text=preamble, label="Preamble"))

    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        heading_label = m.group(0).strip().lstrip("#").strip()
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(Chunk(text=chunk_text, label=heading_label))

    return chunks


def chunk_file(raw_text: str, subfolder: str) -> list[Chunk]:
    """Dispatch to the right chunker based on which corpus subfolder a file lives in."""
    if subfolder == "resumes":
        return chunk_resume_by_section(raw_text)
    return chunk_guideline_by_heading(raw_text)  # guidelines/job_desc -> heading-based
