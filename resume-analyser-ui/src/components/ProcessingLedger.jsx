import { useEffect, useState } from "react";

const STAGES = [
  "Routing candidate to the correct track index",
  "Retrieving evaluation rubric & guideline benchmarks",
  "Running objective evaluation against source chunks",
  "Auditing fidelity — context relevance, groundedness, intent",
  "Fetching high-performing peer benchmarks",
  "Drafting the guidance roadmap",
];

export default function ProcessingLedger() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-800 px-6 py-7">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted mb-5">
        Case in progress — this involves several model calls and typically takes a minute
      </p>
      <ol className="space-y-3">
        {STAGES.map((label, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <li key={label} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${
                  done
                    ? "border-teal bg-teal/20"
                    : active
                    ? "border-brass"
                    : "border-ink-600"
                }`}
              >
                {done && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1 4.5 3.3 7 8 1.5" stroke="#7CC0AC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {active && <span className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse" />}
              </span>
              <span className={`text-[0.85rem] ${active ? "text-ink_text" : done ? "text-ink_text/60" : "text-muted"}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
