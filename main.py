from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import shutil
import os
from pathlib import Path

from modules.analyser import process_complete_student_screening
from modules.retriever import STUDENT_MODE, RECRUITER_MODE
from modules import resume_qna
from modules import human_loop
from modules import corpus_feedback

app = FastAPI(title="Inara Resume Analyser Engine")

# CORS: allow_origins=["*"] with allow_credentials=True is invalid per spec and
# gets silently blocked by browsers - list actual frontend origin(s) explicitly,
# overridable via FRONTEND_ORIGINS (comma-separated) per environment.
FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
).split(",")

print(f"[CORS DEBUG] Loaded origins: {FRONTEND_ORIGINS!r}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "data" / "_incoming")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATIC_MAPS_DIR = BASE_DIR / "static_maps"
STATIC_MAPS_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_DIR = BASE_DIR / "frontend"


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/screen-resume")
async def screen_resume(
    target_role: str = Form(...),
    mode: str = Form(STUDENT_MODE),
    file: UploadFile = File(...),
):
    """
    mode="student" (default): dense RAG. Response is shaped for the student -
    clean fit % + per-skill breakdown.
    mode="recruiter": hybrid BM25+dense RAG, plus the resume gets indexed for
    follow-up ad-hoc Q&A via /api/recruiter/ask, and a trust/escalate routing
    recommendation is attached.
    """
    if mode not in (STUDENT_MODE, RECRUITER_MODE):
        raise HTTPException(status_code=400, detail=f"mode must be '{STUDENT_MODE}' or '{RECRUITER_MODE}'.")

    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only standard .txt files are supported currently.")

    try:
        target_file_path = UPLOAD_DIR / file.filename
        with target_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        screening_results = process_complete_student_screening(
            resume_file_path=str(target_file_path),
            target_role_title=target_role,
            mode=mode,
        )

        if not screening_results or screening_results.get("status") != "success":
            detail = (screening_results or {}).get("detail", "Pipeline did not produce a result.")
            raise HTTPException(status_code=500, detail=detail)

        response = {
            "status": "success",
            "mode": screening_results.get("mode"),
            "filename": file.filename,
            "track_routed": screening_results.get("track"),
            "report": screening_results.get("evaluation_report"),
            "guidance": screening_results.get("guidance_report"),
            "metrics": screening_results.get("triad_metrics"),
            "retrieval_confidence": screening_results.get("retrieval_confidence"),
            "citations": screening_results.get("citations"),
            "vector_map_url": screening_results.get("vector_map_url"),
            "case_id": screening_results.get("case_id"),
            "ai_status": screening_results.get("ai_status"),
            "fit_probability": screening_results.get("fit_probability"),
            "policy_action": screening_results.get("policy_action"),
            "policy_explanation": screening_results.get("policy_explanation"),
            "policy_detail": screening_results.get("policy_detail"),
        }

        if mode == STUDENT_MODE:
            response["skill_breakdown"] = screening_results.get("skill_breakdown")
            response["selection_status"] = screening_results.get("selection_status")
            response["selection_probability"] = screening_results.get("selection_probability")

        if mode == RECRUITER_MODE:
            response["qna_ready"] = screening_results.get("qna_ready", False)

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failure: {str(e)}")


class RecruiterAskRequest(BaseModel):
    case_id: str
    question: str
    target_role: str = ""


@app.post("/api/recruiter/ask")
async def recruiter_ask(payload: RecruiterAskRequest):
    """Ad-hoc hybrid-RAG Q&A over one candidate's resume ('does she have AWS
    experience', 'would he be a good fit for a senior role'), grounded with citations."""
    if not resume_qna.is_indexed(payload.case_id):
        raise HTTPException(
            status_code=404,
            detail="This case's resume isn't indexed for Q&A. Screen it in recruiter mode first.",
        )
    return resume_qna.ask_about_resume(payload.case_id, payload.question, payload.target_role)


class RecruiterFeedbackRequest(BaseModel):
    case_id: str
    agree: bool
    recruiter_status: str | None = None
    free_text: str = ""


@app.post("/api/recruiter/feedback")
async def recruiter_feedback(payload: RecruiterFeedbackRequest):
    """
    Recruiter feedback loop:
    1. agree/disagree feeds human_loop.record_feedback(), which updates the
       LinUCB trust/escalate routing policy online - this is the "labeled data
       for improving the scoring model" leg.
    2. The full structured record (+ free text) is separately persisted via
       corpus_feedback.save_feedback().
    3. If that track has now accumulated enough feedback, it's compiled into
       an anonymized digest and appended to the guideline corpus, hot-reloaded
       immediately - the "summarize periodically into new guideline
       documents" leg.
    """
    try:
        rl_result = human_loop.record_feedback(
            case_id=payload.case_id,
            agree=payload.agree,
            human_status=payload.recruiter_status,
            reviewer_note=payload.free_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    case = None
    try:
        from modules import feedback_store
        case = feedback_store.get_case(payload.case_id)
    except Exception:
        pass

    corpus_feedback.save_feedback(
        track=(case or {}).get("track", "aiml"),
        case_id=payload.case_id,
        target_role=(case or {}).get("target_role"),
        resume_filename=(case or {}).get("resume_filename"),
        ai_status=(case or {}).get("ai_status"),
        agree=payload.agree,
        recruiter_status=payload.recruiter_status,
        free_text=payload.free_text,
    )

    digest = corpus_feedback.summarize_and_append_to_corpus((case or {}).get("track", "aiml"))

    return {
        "status": "success",
        "rl_policy_update": rl_result,
        "corpus_digest_triggered": digest is not None,
        "corpus_digest": digest,
    }


@app.get("/api/recruiter/policy-summary")
async def policy_summary():
    """Human-readable snapshot of the learned trust/escalate routing policy - fully
    interpretable since it's LinUCB, not a black-box model (see reward_policy.py)."""
    return human_loop.policy_summary()


@app.post("/api/recruiter/digest/{track}")
async def force_digest(track: str):
    """Manually trigger a feedback digest for a track regardless of the pending-count threshold."""
    digest = corpus_feedback.summarize_and_append_to_corpus(track, force=True)
    if digest is None:
        return {"status": "no_pending_feedback"}
    return {"status": "success", "digest": digest}


# Serve the generated XAI vector-space maps
app.mount("/static", StaticFiles(directory=str(STATIC_MAPS_DIR)), name="static")

# Serve the frontend SPA last, so it never shadows the /api/* routes above
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
