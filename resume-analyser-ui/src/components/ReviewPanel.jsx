import { useState } from "react";
import { submitFeedback } from "../api";

const STATUS_OPTIONS = ["HIRE", "HIGH_QUALITY_CANDIDATE", "POTENTIAL_CANDIDATE", "REJECT"];

export default function ReviewPanel({ caseId, aiStatus, fitProbability, policyAction, policyExplanation, policyDetail }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [correctedStatus, setCorrectedStatus] = useState(aiStatus);
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isEscalated = policyAction === "ESCALATE_HUMAN";

  async function handleAgree() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitFeedback({
        caseId,
        agree: true,
        recruiterStatus: aiStatus,
        freeText: "Reviewer confirmed the AI's decision."
      });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisagreeSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitFeedback({
        caseId,
        agree: false,
        recruiterStatus: correctedStatus,
        freeText: note
      });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-sm border border-teal/40 bg-teal/10 px-6 py-5">
        <p className="font-display text-[1rem] font-semibold text-teal-light mb-1.5">Feedback recorded</p>
        <p className="text-[0.85rem] text-ink_text/80">
          Reward applied to the routing policy: <span className="font-mono">{result?.reward_applied?.toFixed(2)}</span>
          {" · "}total cases the policy has learned from: <span className="font-mono">{result?.total_feedback_recorded}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-sm border p-6 ${isEscalated ? "border-brass/50 bg-brass/5" : "border-ink-600 bg-ink-800"}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-1">Human-in-the-loop review</p>
          <p className="font-display text-[1rem] font-semibold text-ink_text">
            {isEscalated ? "Flagged for mandatory review" : "Auto-trusted by the routing policy"}
          </p>
        </div>
        <span className={`shrink-0 font-mono text-[0.72rem] px-2.5 py-1 rounded-full border ${isEscalated ? "border-brass text-brass-light" : "border-teal text-teal-light"}`}>
          {policyAction}
        </span>
      </div>

      <p className="text-[0.85rem] text-ink_text/75 mb-1">
        AI verdict: <span className="text-ink_text font-medium">{aiStatus}</span> at{" "}
        <span className="font-mono">{fitProbability?.toFixed(0)}%</span> fit probability.
      </p>
      <p className="text-[0.8rem] text-muted mb-5">{policyExplanation}</p>

      {policyDetail && (
        <details className="mb-5">
          <summary className="text-[0.75rem] text-muted cursor-pointer hover:text-ink_text/70">
            Show the policy's full scoring detail
          </summary>
          <div className="mt-2 rounded-sm bg-ink-900/40 border border-ink-600 px-4 py-3 font-mono text-[0.72rem] text-ink_text/70 space-y-1">
            <p>UCB score chosen: {policyDetail.ucb_score} (point estimate {policyDetail.point_estimate} + exploration bonus {policyDetail.exploration_bonus})</p>
            {Object.entries(policyDetail.alternative_scores || {}).map(([action, s]) => (
              <p key={action}>{action}: ucb {s.ucb_score}, point estimate {s.point_estimate}</p>
            ))}
            <p className="pt-1 border-t border-ink-600 mt-2">
              Trained on {Object.entries(policyDetail.trained_on_n_cases || {}).map(([a, n]) => `${a}: ${n}`).join(", ")} prior cases
            </p>
          </div>
        </details>
      )}

      {error && <p className="text-[0.8rem] text-rust-light mb-3">{error}</p>}

      {!showOverrideForm ? (
        <div className="flex gap-3">
          <button
            onClick={handleAgree}
            disabled={submitting}
            className="rounded-sm bg-teal text-ink-950 font-semibold text-[0.85rem] px-4 py-2.5 disabled:opacity-60 hover:enabled:bg-teal-light transition-colors"
          >
            Agree with this decision
          </button>
          <button
            onClick={() => setShowOverrideForm(true)}
            disabled={submitting}
            className="rounded-sm border border-ink-600 text-ink_text/80 text-[0.85rem] px-4 py-2.5 hover:border-rust/50 hover:text-rust-light transition-colors"
          >
            Disagree / override
          </button>
        </div>
      ) : (
        <form onSubmit={handleDisagreeSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-1.5">
              Corrected status
            </label>
            <select
              value={correctedStatus}
              onChange={(e) => setCorrectedStatus(e.target.value)}
              className="w-full bg-ink-900/40 border border-ink-600 rounded-sm px-3 py-2 text-[0.85rem] text-ink_text"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-1.5">
              Reason (required)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              rows={3}
              placeholder="What did the AI get wrong, and why?"
              className="w-full bg-ink-900/40 border border-ink-600 rounded-sm px-3 py-2 text-[0.85rem] text-ink_text placeholder:text-muted/60"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !note.trim()}
              className="rounded-sm bg-rust text-ink_text font-semibold text-[0.85rem] px-4 py-2.5 disabled:opacity-60 hover:enabled:bg-rust-light transition-colors"
            >
              Submit override
            </button>
            <button
              type="button"
              onClick={() => setShowOverrideForm(false)}
              className="text-[0.82rem] text-muted hover:text-ink_text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
