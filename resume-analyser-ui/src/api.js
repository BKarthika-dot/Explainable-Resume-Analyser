// Base URL of the FastAPI service (modules/main.py). Configure per-environment
// via a .env file — see .env.example. Falls back to local dev default.
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export class ScreeningError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Submits a candidate's resume (.txt) and a target role to the screening
 * pipeline. Mirrors the exact contract of POST /api/screen-resume in main.py:
 * multipart form fields `target_role` and `file`.
 */
export async function screenResume({ role, file, mode = "student", signal }) {
  const form = new FormData();
  form.append("target_role", role);
  form.append("file", file);
  form.append("mode", mode);

  let response;
  try {
    response = await fetch(`${API_BASE}/api/screen-resume`, {
      method: "POST",
      body: form,
      signal,
    });
  } catch (networkErr) {
    throw new ScreeningError(
      `Could not reach the screening service at ${API_BASE}. Confirm the API is running and reachable.`,
      0
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ScreeningError("The service returned a response that could not be parsed.", response.status);
  }

  if (!response.ok) {
    throw new ScreeningError(payload?.detail || "The screening pipeline failed.", response.status);
  }

  return payload;
}

export async function submitFeedback({ caseId, agree, recruiterStatus, freeText, signal }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/recruiter/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        agree,
        recruiter_status: recruiterStatus || null,
        free_text: freeText || "",
      }),
      signal,
    });
  } catch {
    throw new ScreeningError(`Could not reach the screening service at ${API_BASE}.`, 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ScreeningError(payload?.detail || "Could not record feedback.", response.status);
  }
  return payload;
}

export async function fetchPolicySummary() {
  const response = await fetch(`${API_BASE}/api/recruiter/policy-summary`);
  if (!response.ok) throw new ScreeningError("Could not load policy summary.", response.status);
  return response.json();
}

export async function askQuestion({ caseId, question, targetRole, signal }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/recruiter/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        question,
        target_role: targetRole || "",
      }),
      signal,
    });
  } catch {
    throw new ScreeningError(`Could not reach the Q&A service at ${API_BASE}.`, 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ScreeningError(payload?.detail || "Could not get answer to the question.", response.status);
  }
  return payload;
}

export { API_BASE };
