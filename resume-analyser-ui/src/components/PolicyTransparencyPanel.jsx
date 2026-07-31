import { useEffect, useState } from "react";
import { fetchPolicySummary } from "../api";

const FEATURE_LABELS = {
  bias: "Bias",
  context_relevance: "Context relevance",
  generation_groundedness: "Groundedness",
  answer_relevance: "Answer relevance",
  retrieval_confidence: "Retrieval confidence",
  fit_probability: "Fit probability",
};

export default function PolicyTransparencyPanel() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicySummary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return null;
  if (!summary) return null;

  const { summary: arms, feature_names: features, total_feedback_recorded } = summary;

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-800 p-6">
      <div className="flex items-baseline justify-between mb-1">
        <p className="font-display text-[1rem] font-semibold text-ink_text">Routing Policy Transparency</p>
        <span className="font-mono text-[0.7rem] text-muted">{total_feedback_recorded} reviews learned from</span>
      </div>
      <p className="text-[0.78rem] text-muted mb-4">
        The literal weights the LinUCB policy currently assigns each feature, per action. A positive weight means
        higher values of that feature push the policy toward choosing that action.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(arms || {}).map(([action, data]) => (
          <div key={action} className="rounded-sm bg-ink-900/40 border border-ink-600 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[0.75rem] text-ink_text">{action}</span>
              <span className="font-mono text-[0.68rem] text-muted">n={data.trained_on_n_cases}</span>
            </div>
            <div className="space-y-1">
              {features.map((f) => {
                const w = data.weights[f] ?? 0;
                return (
                  <div key={f} className="flex items-center justify-between text-[0.72rem]">
                    <span className="text-muted">{FEATURE_LABELS[f] || f}</span>
                    <span className={`font-mono ${w > 0 ? "text-teal-light" : w < 0 ? "text-rust-light" : "text-muted"}`}>
                      {w > 0 ? "+" : ""}{w.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
