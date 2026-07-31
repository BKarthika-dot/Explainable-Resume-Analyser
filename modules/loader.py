# modules/loader.py
import os
from pathlib import Path

from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage
from llama_index.core.schema import TextNode
from modules.embedder import Settings
from modules.chunking import chunk_file

BASE_DIR = Path(__file__).resolve().parent
DATA_ROOT = BASE_DIR.parent / "data"
STORAGE_ROOT = BASE_DIR.parent / "storage"

TRACKS = ["aiml", "sap", "data_analyst"]
SUBFOLDERS = ["resumes", "job_desc", "guidelines"]

# In-memory cache: {track: {"index": VectorStoreIndex, "nodes": [TextNode, ...],
# "query_engine": ...}}. `nodes` is what modules/hybrid_retriever.py needs to
# build a BM25 index alongside the dense one - llama_index's BM25Retriever
# needs the actual node objects, not just a query engine.
_track_assets: dict[str, dict] = {}


def needs_reindex(track_files, storage_path):
    """
    Checks if any source file is newer than the newest persisted index file.
    Compared against the persisted files' own mtimes rather than the storage
    directory's mtime, since directory mtime updates aren't reliably bumped by
    every filesystem when only file *contents* change (e.g. NTFS).
    """
    if not storage_path.exists():
        return True

    persisted_files = [f for f in storage_path.rglob("*") if f.is_file()]
    if not persisted_files:
        return True

    index_time = max(os.path.getmtime(f) for f in persisted_files)

    for file_path in track_files:
        if os.path.getmtime(file_path) > index_time:
            return True

    return False


def _build_nodes_for_track(track_files: list[Path]) -> list[TextNode]:
    """
    Reads each file's raw text and runs it through the structure-aware
    chunker (section-based for resumes, heading-based for guidelines/job_desc)
    instead of a generic token/sentence splitter. Each resulting chunk becomes
    one TextNode carrying file_name + section/heading metadata, which both the
    citation log and the recruiter Q&A layer key off of.
    """
    nodes: list[TextNode] = []
    for file_path in track_files:
        subfolder = file_path.parent.name  # resumes / job_desc / guidelines
        try:
            raw_text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raw_text = file_path.read_text(encoding="utf-8", errors="ignore")

        chunks = chunk_file(raw_text, subfolder)
        for i, chunk in enumerate(chunks):
            nodes.append(TextNode(
                text=chunk.text,
                metadata={
                    "file_name": file_path.name,
                    "subfolder": subfolder,
                    "section": chunk.label,
                    "chunk_index": i,
                },
            ))
    return nodes


def _load_or_build_track_index(track: str, track_path: Path, track_storage_path: Path):
    track_files = []
    for subfolder in SUBFOLDERS:
        subfolder_path = track_path / subfolder
        if subfolder_path.exists():
            track_files.extend(list(subfolder_path.glob("*.txt")))

    if not track_files:
        return None

    if not needs_reindex(track_files, track_storage_path) and track_storage_path.exists():
        print(f"-> [Cache Hit]: Loading static index for [{track.upper()}] instantly...")
        storage_context = StorageContext.from_defaults(persist_dir=str(track_storage_path.resolve()))
        track_index = load_index_from_storage(storage_context)
        # We still need the raw node list for BM25 even on a cache hit - pull it
        # back out of the loaded docstore rather than re-chunking from disk.
        nodes = list(track_index.docstore.docs.values())
    else:
        print(f"-> [Cache Miss]: Building/Updating index for [{track.upper()}]...")
        nodes = _build_nodes_for_track(track_files)
        track_index = VectorStoreIndex(nodes=nodes)
        track_index.storage_context.persist(persist_dir=str(track_storage_path.resolve()))
        print(f"   [Saved]: Target vector matrices written to disk. ({len(nodes)} structured chunks)")

    query_engine = track_index.as_query_engine(similarity_top_k=5)
    return {"index": track_index, "nodes": nodes, "query_engine": query_engine}


def build_isolated_engines() -> dict[str, dict]:
    """
    Scans data directories and builds/loads one isolated index per track.
    Returns {track: {"index", "nodes", "query_engine"}}. Cached at module
    level after first call so repeated calls within a process are free.
    """
    global _track_assets
    if _track_assets:
        return _track_assets

    print(f"Scanning Data Root Directory: {DATA_ROOT.resolve()}\n" + "=" * 50)
    for track in TRACKS:
        track_path = DATA_ROOT / track
        track_storage_path = STORAGE_ROOT / track
        if not track_path.exists():
            continue

        assets = _load_or_build_track_index(track, track_path, track_storage_path)
        if assets is None:
            continue

        _track_assets[track] = assets
        print(f"-> Active query engine configured for [{track.upper()}]\n" + "-" * 50)

    return _track_assets


def refresh_track(track: str) -> dict | None:
    """
    Force a single track's index to be rebuilt from disk and hot-swapped into
    the shared cache, WITHOUT restarting the process or touching the other two
    tracks. This is what lets modules/corpus_feedback.py's periodic recruiter
    feedback digest actually take effect immediately: it writes a new
    guideline .txt file into data/<track>/guidelines/, then calls this so the
    next request in that track already sees it, instead of waiting for the
    next full process restart.
    """
    track_path = DATA_ROOT / track
    track_storage_path = STORAGE_ROOT / track
    if not track_path.exists():
        return None

    assets = _load_or_build_track_index(track, track_path, track_storage_path)
    if assets is not None:
        _track_assets[track] = assets
    return assets


def get_track_assets() -> dict[str, dict]:
    """Accessor used by retriever.py / hybrid_retriever.py so nothing re-scans disk."""
    return build_isolated_engines()
