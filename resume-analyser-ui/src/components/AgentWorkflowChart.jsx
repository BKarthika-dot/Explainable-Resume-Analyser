import { useState } from "react";
import { 
  ShieldCheck, 
  GitBranch, 
  Database, 
  Sparkles, 
  FileCheck2, 
  TrendingUp, 
  Cpu, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Layers
} from "lucide-react";

const WORKFLOW_STAGES = [
  {
    id: "stage-1-anonymization",
    stepNumber: "01",
    name: "Intake & Demographics Neutralization",
    subtitle: "XAI Metadata Isolation Layer",
    icon: ShieldCheck,
    color: "from-blue-500/20 to-cyan-500/20 border-cyan-500/50 text-cyan-400",
    badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    objective: "Strips candidate demographic headers (names, contact info, locations) to prevent bias from entering the embedding space.",
    formula: "Latent_Vector = Embed(Sanitize(Resume_Text)) where Metadata_Filter(Demographics) = 0",
    inputs: ["Raw candidate .txt resume file", "Header regex patterns"],
    outputs: ["Sanitized resume text", "Unselected background node list"],
    keyMetricLabel: "Demographic Masking",
    keyMetricValue: "100% Masked"
  },
  {
    id: "stage-2-routing",
    stepNumber: "02",
    name: "Dynamic Track Routing",
    subtitle: "Domain Index Classification",
    icon: GitBranch,
    color: "from-purple-500/20 to-indigo-500/20 border-indigo-500/50 text-indigo-400",
    badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    objective: "Classifies target role query against domain clusters to select isolated vector index (AI/ML, SAP, Data Analyst).",
    formula: "Track* = argmax_{t in {aiml, sap, data_analyst}} P(t | Target_Role)",
    inputs: ["Target Role Title (e.g. 'AI Engineer')"],
    outputs: ["Selected isolated track index", "Track query engine handle"],
    keyMetricLabel: "Selected Track",
    keyMetricValue: (res) => res?.track_routed?.toUpperCase() || "AI/ML"
  },
  {
    id: "stage-3-retrieval",
    stepNumber: "03",
    name: "Dual-Pass RAG Retrieval",
    subtitle: "Vector Search & Score Audit",
    icon: Database,
    color: "from-emerald-500/20 to-teal-500/20 border-teal-500/50 text-teal-400",
    badgeColor: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    objective: "Retrieves top-k grading schema rubrics and guideline benchmarks from vector storage without LLM synthesis distortion.",
    formula: "Sim(q, d) = (e(q) · e(d)) / (||e(q)|| ||e(d)||), k=5",
    inputs: ["Structural evaluation query", "Track vector index"],
    outputs: ["Raw source chunks (Exhibits)", "Vector similarity confidence scores"],
    keyMetricLabel: "Avg Retrieval Confidence",
    keyMetricValue: (res) => res?.retrieval_confidence?.average ? `${(res.retrieval_confidence.average * 100).toFixed(1)}%` : "N/A"
  },
  {
    id: "stage-4-triad-audit",
    stepNumber: "04",
    name: "Triad Fidelity Audit",
    subtitle: "Hallucination & Relevance Guardrails",
    icon: Sparkles,
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/50 text-amber-400",
    badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    objective: "Evaluates Groundedness, Context Relevance, and Intent Alignment before generating candidate recommendations.",
    formula: "Triad = (Relevance(q, c), Groundedness(r, c, res), Intent(r, q))",
    inputs: ["Retrieved chunks", "Candidate resume", "Evaluation draft"],
    outputs: ["Groundedness score", "Relevance score", "Fidelity verification verdict"],
    keyMetricLabel: "Groundedness Score",
    keyMetricValue: (res) => res?.triad_metrics?.generation_groundedness ? `${(res.triad_metrics.generation_groundedness).toFixed(0)}%` : "Auditing..."
  },
  {
    id: "stage-5-scorecard",
    stepNumber: "05",
    name: "Stage 1 Scorecard Synthesis",
    subtitle: "Objective Rubric Evaluation",
    icon: FileCheck2,
    color: "from-emerald-500/20 to-green-500/20 border-green-500/50 text-green-400",
    badgeColor: "bg-green-500/10 text-green-300 border-green-500/30",
    objective: "Generates objective selection scorecard by evaluating candidate experience against strict retrieved rubric metrics.",
    formula: "Scorecard = LLM_complete(Prompt(Rubrics, Resume))",
    inputs: ["Grading rubrics context", "Candidate resume text"],
    outputs: ["Objective selection scorecard", "Categorized skill breakdown"],
    keyMetricLabel: "Evaluation Verdict",
    keyMetricValue: (res) => res?.ai_status || "Pending"
  },
  {
    id: "stage-6-career-nudge",
    stepNumber: "06",
    name: "Stage 2 Career Guidance",
    subtitle: "Contextual Action Roadmap",
    icon: TrendingUp,
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/50 text-sky-400",
    badgeColor: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    objective: "Searches high-performing peer profile benchmarks to provide personalized skill-gap bridging recommendations.",
    formula: "Roadmap = LLM(Benchmarking(Gaps, Peer_Profiles))",
    inputs: ["Evaluation scorecard", "High-performer index"],
    outputs: ["Actionable career nudge report", "Skills gap bridge roadmap"],
    keyMetricLabel: "Nudges Generated",
    keyMetricValue: (res) => res?.guidance ? "Complete" : "Pending"
  },
  {
    id: "stage-7-rl-policy",
    stepNumber: "07",
    name: "Human-in-the-Loop RL Router",
    subtitle: "UCB Contextual Bandit Decision",
    icon: Cpu,
    color: "from-rose-500/20 to-pink-500/20 border-rose-500/50 text-rose-400",
    badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    objective: "Determines whether to auto-approve case or escalate to human review based on Upper Confidence Bound (UCB) policy.",
    formula: "UCB_a = mu_hat_a + c * sqrt(ln(N) / N_a)",
    inputs: ["Retrieval confidence", "Triad audit metrics", "Prior case rewards"],
    outputs: ["Routing verdict (TRUST_AI vs ESCALATE_HUMAN)", "UCB score breakdown"],
    keyMetricLabel: "Policy Action",
    keyMetricValue: (res) => res?.policy_action || "ESCALATE_HUMAN"
  }
];

export default function AgentWorkflowChart({ status, result }) {
  const [selectedStage, setSelectedStage] = useState(null);

  const getStageStatus = (index) => {
    if (status === "idle") return "pending";
    if (status === "running") {
      return index === 0 ? "completed" : index <= 3 ? "active" : "pending";
    }
    if (status === "done") return "completed";
    return "pending";
  };

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-700">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brass" />
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
              System Architecture Flowchart
            </span>
          </div>
          <h2 className="font-display text-[1.15rem] font-semibold text-ink_text mt-0.5">
            Agent Cognition & Pipeline Execution Architecture
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.75rem] text-muted">
          <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />
          <span>7-Stage Multi-Pass Pipeline</span>
        </div>
      </div>

      {/* Pipeline Flowchart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const stageState = getStageStatus(idx);
          const isSelected = selectedStage?.id === stage.id;
          const metricVal = typeof stage.keyMetricValue === "function" 
            ? stage.keyMetricValue(result) 
            : stage.keyMetricValue;

          return (
            <div key={stage.id} className="relative group">
              {idx < WORKFLOW_STAGES.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-ink-600">
                  <ChevronRight className="w-5 h-5 text-ink-600 group-hover:text-brass transition-colors" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedStage(stage)}
                className={`w-full text-left rounded-sm border p-4 transition-all duration-200 relative overflow-hidden ${
                  isSelected
                    ? "border-brass bg-ink-700/80 shadow-lg shadow-brass/5"
                    : stageState === "completed"
                    ? "border-ink-700 bg-ink-900/60 hover:border-ink-600 hover:bg-ink-900"
                    : stageState === "active"
                    ? "border-brass/60 bg-brass/10 animate-pulse"
                    : "border-ink-800 bg-ink-950/40 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-[0.68rem] text-muted uppercase tracking-wider">
                    Stage {stage.stepNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {stageState === "completed" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                    )}
                    {stageState === "active" && (
                      <Loader2 className="w-3.5 h-3.5 text-brass animate-spin" />
                    )}
                    <span className={`font-mono text-[0.62rem] px-2 py-0.5 rounded border ${stage.badgeColor}`}>
                      {stageState.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 mb-3">
                  <div className={`p-2 rounded-sm bg-ink-900 border ${stage.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-[0.92rem] font-semibold text-ink_text leading-tight">
                      {stage.name}
                    </h3>
                    <p className="text-[0.73rem] text-muted font-mono mt-0.5">{stage.subtitle}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-ink-800 flex items-center justify-between font-mono text-[0.72rem]">
                  <span className="text-muted">{stage.keyMetricLabel}:</span>
                  <span className="text-ink_text font-medium">{metricVal}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Stage Detail Inspector Drawer */}
      {selectedStage && (
        <div className="p-5 rounded-sm border border-brass/40 bg-ink-950 space-y-4 font-mono text-[0.8rem]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm bg-ink-900 border ${selectedStage.color}`}>
                <selectedStage.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-brass">
                  Stage {selectedStage.stepNumber} Deep-Dive Inspector
                </span>
                <h4 className="font-display text-[1.05rem] font-semibold text-ink_text">
                  {selectedStage.name}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedStage(null)}
              className="text-[0.75rem] font-mono text-muted hover:text-ink_text border border-ink-600 px-2.5 py-1 rounded-sm hover:bg-ink-800 transition-colors"
            >
              Close Inspector
            </button>
          </div>

          <p className="text-[0.83rem] text-ink_text/85 leading-relaxed font-body">
            {selectedStage.objective}
          </p>

          <div className="rounded-sm border border-ink-700 bg-ink-900 p-3 font-mono text-[0.76rem] text-teal-light">
            <span className="text-muted block text-[0.65rem] uppercase mb-1">XAI Mathematical Formula</span>
            <code>{selectedStage.formula}</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.8rem]">
            <div className="rounded-sm border border-ink-700 bg-ink-900/50 p-3">
              <span className="font-mono text-[0.68rem] uppercase text-muted block mb-1.5">Inputs Passed</span>
              <ul className="list-disc pl-4 space-y-1 text-ink_text/80">
                {selectedStage.inputs.map((inp) => (
                  <li key={inp}>{inp}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-sm border border-ink-700 bg-ink-900/50 p-3">
              <span className="font-mono text-[0.68rem] uppercase text-muted block mb-1.5">Outputs Produced</span>
              <ul className="list-disc pl-4 space-y-1 text-ink_text/80">
                {selectedStage.outputs.map((out) => (
                  <li key={out}>{out}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
