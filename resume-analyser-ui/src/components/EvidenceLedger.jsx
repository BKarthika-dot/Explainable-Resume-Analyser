import { useState } from "react";

function stampTone(confidence) {
  if (confidence >= 0.62) return { ring: "#4F9C87", text: "text-teal-light" };
  if (confidence >= 0.4) return { ring: "#B8935A", text: "text-brass-light" };
  return { ring: "#C1442D", text: "text-rust-light" };
}

export default function EvidenceLedger({ citations, confidence }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!citations || citations.length === 0) {
    return (
      <div className="rounded-sm border border-ink-600 bg-ink-800 p-6">
        <p className="font-display text-[1rem] font-semibold text-ink_text mb-1">Evidence Ledger</p>
        <p className="text-[0.85rem] text-muted">No source chunks were retrieved for this case.</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-800 p-6">
      <div className="flex items-start justify-between mb-1">
        <p className="font-display text-[1rem] font-semibold text-ink_text">Evidence Ledger</p>
        <span className="font-mono text-[0.72rem] text-muted">{citations.length} exhibit{citations.length !== 1 ? "s" : ""}</span>
      </div>
      <p className="text-[0.8rem] text-muted mb-5">
        Every retrieved chunk that fed the evaluation, numbered in retrieval order.
      </p>

      {confidence?.warning && (
        <div className="mb-5 rounded-sm border border-rust/40 bg-rust/10 px-4 py-3">
          <p className="text-[0.8rem] text-rust-light">{confidence.warning}</p>
        </div>
      )}

      <div className="relative pl-6">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink-600" aria-hidden="true" />
        <ul className="space-y-3">
          {citations.map((c, idx) => {
            const t = stampTone(c.confidence);
            const isOpen = openIndex === idx;
            return (
              <li key={c.chunk_index ?? idx} className="relative">
                <span
                  className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-ink-800"
                  style={{ borderColor: t.ring }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left rounded-sm border border-ink-600 hover:border-ink-600/60 bg-ink-900/40 px-4 py-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-[0.7rem] text-muted uppercase tracking-[0.1em]">
                        Exhibit {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[0.85rem] text-ink_text truncate mt-0.5">{c.source_file}</p>
                    </div>
                    <span className={`shrink-0 font-mono text-[0.78rem] ${t.text}`}>
                      {(c.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {isOpen && (
                    <p className="mt-3 pt-3 border-t border-ink-600 text-[0.8rem] leading-relaxed text-ink_text/75 font-mono">
                      {c.snippet}
                      {c.snippet?.length >= 200 ? "\u2026" : ""}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
