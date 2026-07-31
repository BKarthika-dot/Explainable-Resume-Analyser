import ReactMarkdown from "react-markdown";
import { Award, ShieldCheck, Zap, TrendingUp } from "lucide-react";

export default function StudentDashboard({ result }) {
  if (!result) return null;

  const {
    selection_status = "UNKNOWN",
    selection_probability = 50,
    skill_breakdown = [],
    report = "",
    guidance = ""
  } = result;

  const isHire = selection_status === "HIRE" || selection_status === "HIGH_QUALITY_CANDIDATE" || selection_status === "POTENTIAL_CANDIDATE";
  const isReject = selection_status === "REJECT" || selection_status === "REJECTED";

  const getStatusColor = (status) => {
    if (status === "HIRE" || status === "HIGH_QUALITY_CANDIDATE") return "text-teal-400 border-teal-500/30 bg-teal-500/10";
    if (status === "POTENTIAL_CANDIDATE") return "text-brass border-brass/30 bg-brass/10";
    if (status === "REJECT" || status === "REJECTED") return "text-rust-light border-rust/30 bg-rust/10";
    return "text-muted border-ink-600 bg-ink-800";
  };

  const getScoreBarColor = (score) => {
    if (score >= 8.0) return "bg-gradient-to-r from-teal-600 to-teal-400";
    if (score >= 5.0) return "bg-gradient-to-r from-brass-dark to-brass";
    return "bg-gradient-to-r from-rust-dark to-rust-light";
  };

  return (
    <div className="space-y-8">
      {/* Visual Analytics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fit Probability Meter */}
        <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brass/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-brass">
              Intent Match Index
            </span>
            <Zap className="w-4 h-4 text-brass" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold text-ink_text">
              {selection_probability.toFixed(0)}%
            </span>
            <span className="text-[0.76rem] text-muted">Fit Probability</span>
          </div>
          {/* Visual Bar */}
          <div className="w-full bg-ink-950 rounded-full h-2 mt-4 overflow-hidden border border-ink-700">
            <div
              className="h-full bg-brass rounded-full transition-all duration-500"
              style={{ width: `${selection_probability}%` }}
            />
          </div>
        </div>

        {/* Screening Decision */}
        <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-teal-light">
              Decision Verdict
            </span>
            <Award className="w-4 h-4 text-teal-light" />
          </div>
          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-sm border font-semibold ${getStatusColor(selection_status)}`}>
              {selection_status.replace(/_/g, " ")}
            </div>
            <p className="text-[0.72rem] text-muted font-mono mt-3 leading-normal">
              {isHire
                ? "Your profile aligns well with the threshold benchmarks."
                : isReject
                ? "Significant core mismatches identified against target rubrics."
                : "Awaiting administrative review classification."}
            </p>
          </div>
        </div>

        {/* Explanatory Context */}
        <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted">
              Explainable AI Policy
            </span>
            <ShieldCheck className="w-4 h-4 text-muted" />
          </div>
          <div>
            <p className="font-mono text-[0.8rem] text-ink_text/80 leading-normal">
              This dossier evaluation was audited utilizing isolated dense RAG vectors. No demographics were processed, preventing structural bias.
            </p>
          </div>
        </div>
      </div>

      {/* Skills Breakdown Mapped Scores */}
      {skill_breakdown.length > 0 && (
        <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-5">
          <div>
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-brass">
              Skill Dimensions Metrics
            </span>
            <h3 className="font-display text-[1.15rem] font-semibold text-ink_text mt-0.5">
              Portfolio & Project Criteria Score Card
            </h3>
            <p className="text-[0.8rem] text-muted mt-0.5">
              Specific core capabilities extracted from your resume and graded out of 10.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {skill_breakdown.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between items-baseline text-[0.8rem]">
                  <span className="font-semibold text-ink_text/90">{item.category}</span>
                  <span className="font-mono font-bold text-brass-light">{item.score_out_of_10.toFixed(1)} / 10.0</span>
                </div>
                <div className="w-full bg-ink-950 rounded-full h-2 overflow-hidden border border-ink-850">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(item.score_out_of_10)}`}
                    style={{ width: `${(item.score_out_of_10 / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side detailed feedback panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Rubric scorecard */}
        <div className="rounded-sm border border-ink-600 bg-ink-900 px-6 py-6 shadow-xl space-y-4">
          <div className="border-b border-ink-700 pb-3">
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-muted">
              Stage 1 &middot; Rubric Audit
            </span>
            <h3 className="font-display text-[1.1rem] font-semibold text-ink_text">
              Detailed Score Analysis
            </h3>
          </div>
          <div className="bg-paper text-ink-900 rounded-sm p-6 shadow-inner dossier-prose max-h-[600px] overflow-y-auto">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>

        {/* Improvement nudges */}
        <div className="rounded-sm border border-ink-600 bg-ink-900 px-6 py-6 shadow-xl space-y-4">
          <div className="border-b border-ink-700 pb-3">
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-brass">
              Stage 2 &middot; Peer Benchmarking
            </span>
            <h3 className="font-display text-[1.1rem] font-semibold text-brass-light flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Project & Portfolio Improvements</span>
            </h3>
          </div>
          <div className="bg-paper text-ink-900 rounded-sm p-6 shadow-inner dossier-prose max-h-[600px] overflow-y-auto">
            <ReactMarkdown>{guidance}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
