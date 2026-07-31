import { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Zap, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  FileCheck2, 
  BookOpen,
  Cpu
} from "lucide-react";

function tone(value) {
  if (value >= 75) return { bar: "bg-teal", text: "text-teal-light", ring: "#4F9C87", border: "border-teal/40", bg: "bg-teal/10" };
  if (value >= 45) return { bar: "bg-brass", text: "text-brass-light", ring: "#B8935A", border: "border-brass/40", bg: "bg-brass/10" };
  return { bar: "bg-rust", text: "text-rust-light", ring: "#C1442D", border: "border-rust/40", bg: "bg-rust/10" };
}

function AuditMetricBar({ label, value, weight, detail, formula }) {
  const t = tone(value);
  return (
    <div className="space-y-1.5 rounded-sm border border-ink-700 bg-ink-950/70 p-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.82rem] font-semibold text-ink_text">{label}</span>
          <span className="font-mono text-[0.66rem] px-2 py-0.5 rounded bg-ink-800 border border-ink-600 text-muted">
            Weight: {weight}
          </span>
        </div>
        <span className={`font-mono text-[0.9rem] font-bold ${t.text}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      
      <div className="h-2 w-full rounded-full bg-ink-800 overflow-hidden border border-ink-700">
        <div
          className={`h-full rounded-full ${t.bar} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 font-mono text-[0.72rem] text-muted">
        <span>{detail}</span>
        {formula && <span className="text-brass/80 text-[0.68rem]">{formula}</span>}
      </div>
    </div>
  );
}

export default function TrustGauges({ metrics, groundednessReason, relevanceReason }) {
  const [showFullLogs, setShowFullLogs] = useState(false);

  if (!metrics) return null;
  const composite = tone(metrics.trust_index || 0);

  const selfConsistency = metrics.self_consistency || {};
  const isVerified = selfConsistency.verified;
  const isConsistent = selfConsistency.consistent;
  const issues = selfConsistency.issues || [];

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-ink-700">
        <div className="flex items-center gap-4">
          {/* Radial Trust Badge */}
          <div
            className="shrink-0 h-16 w-16 rounded-full border-2 flex flex-col items-center justify-center font-mono shadow-inner bg-ink-950"
            style={{ borderColor: composite.ring, color: composite.ring }}
          >
            <span className="text-[1.1rem] font-bold leading-none">{metrics.trust_index.toFixed(0)}%</span>
            <span className="text-[0.55rem] uppercase tracking-wider text-muted mt-0.5">Trust</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brass" />
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
                Fidelity & Verification Matrix
              </span>
            </div>
            <h2 className="font-display text-[1.2rem] font-semibold text-ink_text mt-0.5">
              RAG Triad Trust & Mathematical Compliance Audit
            </h2>
            <p className="text-[0.78rem] text-muted mt-0.5">
              Multi-pillar verification engine: 40% Groundedness, 40% Context Relevance, 20% Answer Relevance.
            </p>
          </div>
        </div>

        {/* Deterministic Verification Pill */}
        <div className={`shrink-0 font-mono text-[0.76rem] px-3.5 py-2 rounded-sm border flex items-center gap-2 ${
          isConsistent 
            ? "border-teal/50 bg-teal/10 text-teal-light" 
            : isVerified 
            ? "border-rust/50 bg-rust/10 text-rust-light" 
            : "border-brass/50 bg-brass/10 text-brass-light"
        }`}>
          {isConsistent ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-teal" />
              <span>Scorecard Math: PASSED</span>
            </>
          ) : isVerified ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rust" />
              <span>Scorecard Math: FAILED</span>
            </>
          ) : (
            <>
              <HelpCircle className="w-4 h-4 text-brass" />
              <span>Scorecard Math: UNVERIFIED</span>
            </>
          )}
        </div>
      </div>

      {/* Primary 3 Pillars Grid */}
      <div className="space-y-4">
        <AuditMetricBar
          label="Context Relevance (Query → Retreived Vector Chunks)"
          value={metrics.retrieval_relevance || 0}
          weight="40%"
          detail="Mean cosine vector similarity between job role query and retrieved rubrics"
          formula="Sim(q, d) = (e(q) · e(d)) / (||e(q)|| ||e(d)||)"
        />

        <AuditMetricBar
          label="Generation Groundedness (Source Documents → LLM Scorecard)"
          value={metrics.generation_groundedness || 0}
          weight="40%"
          detail={groundednessReason ? truncate(groundednessReason, 120) : "Fact-checked against retrieved rubric chunks and raw candidate resume"}
          formula="Audit = LLM_Judge(Response, Guidelines, Resume)"
        />

        <AuditMetricBar
          label="Answer Relevance (Screening Query Intent → Final Verdict)"
          value={metrics.answer_relevance || 0}
          weight="20%"
          detail={relevanceReason ? truncate(relevanceReason, 120) : "Measures whether report satisfies screening intent and gap requirements"}
          formula="Match = Intent_Audit(Role, Report)"
        />
      </div>

      {/* Deterministic Self-Consistency Audit Card */}
      <div className="rounded-sm border border-ink-700 bg-ink-950 p-4 space-y-3 font-mono text-[0.78rem]">
        <div className="flex items-center justify-between border-b border-ink-800 pb-2">
          <div className="flex items-center gap-2 text-ink_text font-semibold">
            <FileCheck2 className="w-4 h-4 text-brass" />
            <span>Deterministic Scorecard Self-Consistency Audit (Python AST)</span>
          </div>
          <span className={`text-[0.7rem] px-2 py-0.5 rounded border ${
            isConsistent ? "border-teal/40 bg-teal/10 text-teal-light" : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}>
            {isConsistent ? "Zero Calculation Errors" : "Audit Flag"}
          </span>
        </div>

        <p className="text-[0.74rem] text-muted leading-relaxed">
          Executes non-LLM Python AST arithmetic verification over all scorecard equations (e.g. Total Score calculations and decision-band thresholds) to prevent hallucinated scoring math.
        </p>

        {issues && issues.length > 0 ? (
          <div className="rounded bg-rust/10 border border-rust/30 p-3 space-y-1 text-[0.74rem] text-rust-light">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Arithmetic / Decision-Band Discrepancies Detected:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-rust-light/90">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded bg-teal/10 border border-teal/30 p-2.5 text-[0.74rem] text-teal-light flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal" />
            <span>Scorecard math verified: all stated calculations and decision-band mappings are strictly consistent.</span>
          </div>
        )}
      </div>

      {/* Per-Chunk Vector Similarity Breakdown & Audit Log Toggle */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowFullLogs(!showFullLogs)}
          className="flex items-center justify-between w-full p-3 rounded-sm border border-ink-700 bg-ink-900/60 hover:bg-ink-900 font-mono text-[0.78rem] text-brass hover:text-brass-light transition-colors"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span>Show Vector Similarity Breakdown & Auditor Reasoning Logs</span>
          </div>
          {showFullLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFullLogs && (
          <div className="mt-3 p-4 rounded-sm border border-ink-700 bg-ink-950 font-mono text-[0.75rem] space-y-4 animate-fade-in">
            {/* Groundedness Auditor Reasoning */}
            <div>
              <span className="text-muted block text-[0.66rem] uppercase tracking-wider mb-1">
                Factual Auditor Log (Grounding Verification):
              </span>
              <p className="text-ink_text/85 bg-ink-900/80 p-3 rounded border border-ink-800 leading-relaxed whitespace-pre-wrap">
                {groundednessReason || "Fact-checking complete against retrieved guideline chunks and raw candidate resume."}
              </p>
            </div>

            {/* Answer Relevance Auditor Reasoning */}
            <div>
              <span className="text-muted block text-[0.66rem] uppercase tracking-wider mb-1">
                Intent Alignment Log (Answer Relevance):
              </span>
              <p className="text-ink_text/85 bg-ink-900/80 p-3 rounded border border-ink-800 leading-relaxed whitespace-pre-wrap">
                {relevanceReason || "Analysis verified against target job role prompt."}
              </p>
            </div>

            {/* Per-Chunk Vector Similarity Table */}
            {metrics.per_chunk_scores && metrics.per_chunk_scores.length > 0 && (
              <div>
                <span className="text-muted block text-[0.66rem] uppercase tracking-wider mb-2">
                  Retrieved Chunk Vector Distance Scores:
                </span>
                <div className="space-y-1.5">
                  {metrics.per_chunk_scores.map((chunk, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-ink-900 px-3 py-2 rounded border border-ink-800 text-[0.72rem]">
                      <span className="text-ink_text truncate max-w-xs">{chunk.file_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">Chunk #{idx + 1}</span>
                        <span className="text-teal-light font-bold">
                          {chunk.similarity !== null ? `${(chunk.similarity * 100).toFixed(1)}%` : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function truncate(text, max = 140) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trim() + "\u2026" : text;
}
