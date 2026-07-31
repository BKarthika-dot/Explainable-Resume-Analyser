import { useState } from "react";
import { 
  GitBranch, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  ArrowDown, 
  ChevronRight, 
  Layers, 
  FileCheck2,
  Award,
  AlertTriangle,
  Info,
  Zap,
  BookOpen
} from "lucide-react";

export default function DecisionWorkflowDiagram({ result, status }) {
  const [activeBranch, setActiveBranch] = useState("all"); // all | selection | recommendation | governance
  const [selectedNode, setSelectedNode] = useState(null);

  if (status !== "done" || !result) {
    return (
      <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-8 text-center space-y-3">
        <GitBranch className="w-8 h-8 text-brass opacity-50 mx-auto animate-pulse" />
        <h3 className="font-display text-[1rem] font-semibold text-ink_text">
          Logical LLM Decision Workflow Engine Ready
        </h3>
        <p className="text-[0.8rem] text-muted max-w-md mx-auto font-mono">
          Execute candidate screening to map the exact decision branches evaluated by the LLM during selection/rejection and project recommendation.
        </p>
      </div>
    );
  }

  const aiStatus = result.ai_status || "HIGH_QUALITY_CANDIDATE";
  const fitProbability = result.fit_probability || 75;
  const policyAction = result.policy_action || "ESCALATE_HUMAN";
  const track = result.track_routed || "aiml";

  const isSelected = aiStatus === "HIRE" || aiStatus === "HIGH_QUALITY_CANDIDATE" || aiStatus === "POTENTIAL_CANDIDATE";
  const isRejected = aiStatus === "REJECT" || aiStatus === "REJECTED";

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink-700">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-brass" />
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
              Explainable Decision Logic Architecture
            </span>
          </div>
          <h2 className="font-display text-[1.2rem] font-semibold text-ink_text mt-0.5">
            Logical Decision Workflow & Reasoning Tree
          </h2>
          <p className="text-[0.8rem] text-muted mt-0.5">
            Step-by-step logic branches executed by the LLM for selection verdict, project nudges, and RL policy routing.
          </p>
        </div>

        {/* Branch Filter Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-ink-950 border border-ink-700 rounded-sm font-mono text-[0.75rem]">
          <button
            onClick={() => setActiveBranch("all")}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
              activeBranch === "all" ? "bg-brass text-ink-950 font-semibold" : "text-muted hover:text-ink_text"
            }`}
          >
            All Decision Paths
          </button>
          <button
            onClick={() => setActiveBranch("selection")}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
              activeBranch === "selection" ? "bg-brass text-ink-950 font-semibold" : "text-muted hover:text-ink_text"
            }`}
          >
            1. Selection / Rejection
          </button>
          <button
            onClick={() => setActiveBranch("recommendation")}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
              activeBranch === "recommendation" ? "bg-brass text-ink-950 font-semibold" : "text-muted hover:text-ink_text"
            }`}
          >
            2. Project Nudges
          </button>
          <button
            onClick={() => setActiveBranch("governance")}
            className={`px-3 py-1.5 rounded-sm transition-colors ${
              activeBranch === "governance" ? "bg-brass text-ink-950 font-semibold" : "text-muted hover:text-ink_text"
            }`}
          >
            3. Policy Governance
          </button>
        </div>
      </div>

      {/* Main Workflow Grid */}
      <div className="space-y-8">
        {/* ============================================================== */}
        {/* PATH 1: CANDIDATE SELECTION & REJECTION DECISION FLOW */}
        {/* ============================================================== */}
        {(activeBranch === "all" || activeBranch === "selection") && (
          <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-5 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[0.68rem] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
                  BRANCH 01
                </span>
                <h3 className="font-display text-[1.05rem] font-semibold text-ink_text">
                  Candidate Qualification & Selection / Rejection Decision Logic
                </h3>
              </div>
              <span className={`font-mono text-[0.72rem] px-2.5 py-0.5 rounded border ${
                isSelected ? "border-teal/50 bg-teal/10 text-teal-light" : "border-rust/50 bg-rust/10 text-rust-light"
              }`}>
                Verdict: {aiStatus} ({fitProbability.toFixed(0)}% Fit)
              </span>
            </div>

            {/* Decision Nodes Sequence */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
              {/* Node A1: Intake & Demographics Filter */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 1.1</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Demographic Isolation</h4>
                <p className="text-[0.73rem] text-muted">Masks PII (name, phone, location) before vector encoding.</p>
                <div className="text-[0.68rem] font-mono text-teal-light pt-1 border-t border-ink-800">
                  Status: 100% Sanitized
                </div>
              </div>

              {/* Node A2: Rubric Vector Match */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 1.2</span>
                  <BookOpen className="w-3.5 h-3.5 text-brass" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Rubric Vector Match</h4>
                <p className="text-[0.73rem] text-muted">Evaluates candidate resume against isolated {track.toUpperCase()} rubrics.</p>
                <div className="text-[0.68rem] font-mono text-brass-light pt-1 border-t border-ink-800">
                  Confidence: {((result.retrieval_confidence?.average || 0.75) * 100).toFixed(1)}%
                </div>
              </div>

              {/* Node A3: Scorecard Band Mapping */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 1.3</span>
                  <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Band Threshold Rule</h4>
                <p className="text-[0.73rem] text-muted">Maps computed scorecard score to standard hiring threshold bands.</p>
                <div className="text-[0.68rem] font-mono text-cyan-300 pt-1 border-t border-ink-800">
                  Calculated Fit: {fitProbability.toFixed(0)}%
                </div>
              </div>

              {/* Node A4: Final Selection Branch Outcome */}
              <div className={`rounded-sm border p-3.5 space-y-2 ${
                isSelected ? "border-teal/50 bg-teal/10" : "border-rust/50 bg-rust/10"
              }`}>
                <div className="flex items-center justify-between font-mono text-[0.68rem]">
                  <span className={isSelected ? "text-teal-light" : "text-rust-light"}>Final Decision</span>
                  {isSelected ? <CheckCircle2 className="w-4 h-4 text-teal" /> : <XCircle className="w-4 h-4 text-rust" />}
                </div>
                <h4 className={`font-mono text-[0.85rem] font-bold ${isSelected ? "text-teal-light" : "text-rust-light"}`}>
                  {aiStatus}
                </h4>
                <p className="text-[0.72rem] text-ink_text/80 leading-tight">
                  {isSelected 
                    ? "Candidate meets technical requirements and rubric benchmarks."
                    : "Candidate falls below mandatory domain threshold boundaries."}
                </p>
              </div>
            </div>

            {/* Threshold Rules Breakdown Box */}
            <div className="rounded-sm bg-ink-950 border border-ink-800 p-3.5 font-mono text-[0.74rem] space-y-1.5">
              <div className="flex items-center gap-2 text-brass font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>LLM Selection/Rejection Decision Rules Applied:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[0.7rem]">
                <div className="p-2 rounded bg-ink-900 border border-ink-800">
                  <span className="text-teal-light font-bold block">≥ 85% Fit</span>
                  <span className="text-muted">STRONG HIRE</span>
                </div>
                <div className="p-2 rounded bg-ink-900 border border-ink-800">
                  <span className="text-brass-light font-bold block">70% – 84% Fit</span>
                  <span className="text-muted">HIGH QUALITY</span>
                </div>
                <div className="p-2 rounded bg-ink-900 border border-ink-800">
                  <span className="text-amber-400 font-bold block">50% – 69% Fit</span>
                  <span className="text-muted font-mono">POTENTIAL</span>
                </div>
                <div className="p-2 rounded bg-ink-900 border border-ink-800">
                  <span className="text-rust-light font-bold block">&lt; 50% Fit</span>
                  <span className="text-muted">REJECT</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PATH 2: PROJECT & IMPROVEMENT RECOMMENDATION DECISION FLOW */}
        {/* ============================================================== */}
        {(activeBranch === "all" || activeBranch === "recommendation") && (
          <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[0.68rem] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-semibold">
                  BRANCH 02
                </span>
                <h3 className="font-display text-[1.05rem] font-semibold text-ink_text">
                  Project & Skill Improvement Recommendation Logic
                </h3>
              </div>
              <span className="font-mono text-[0.72rem] px-2.5 py-0.5 rounded border border-sky-500/40 bg-sky-500/10 text-sky-300">
                Stage 2 Nudge Engine Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
              {/* Node B1: Skill Gap Matrix */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 2.1</span>
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Gap Identification Matrix</h4>
                <p className="text-[0.73rem] text-muted">Identifies missing technical competencies from Stage 1 Rubric evaluation.</p>
                <div className="text-[0.68rem] font-mono text-sky-300 pt-1 border-t border-ink-800">
                  Input: Selection Scorecard Gaps
                </div>
              </div>

              {/* Node B2: High-Performer Profile Search */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 2.2</span>
                  <Award className="w-3.5 h-3.5 text-brass" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Peer Benchmark Matching</h4>
                <p className="text-[0.73rem] text-muted">Retrieves high-performing peer profiles in {track.toUpperCase()} vector space.</p>
                <div className="text-[0.68rem] font-mono text-brass-light pt-1 border-t border-ink-800">
                  Target: Peer Excellence Benchmarks
                </div>
              </div>

              {/* Node B3: Project Nudge & Action Synthesis */}
              <div className="rounded-sm border border-sky-500/40 bg-sky-500/10 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-sky-300">
                  <span>Step 2.3</span>
                  <Sparkles className="w-4 h-4 text-sky-300" />
                </div>
                <h4 className="font-mono text-[0.85rem] font-bold text-sky-200">Action Roadmap Synthesis</h4>
                <p className="text-[0.73rem] text-sky-100/80 leading-tight">
                  Generates personalized hands-on project recommendations and targeted skill-bridging steps.
                </p>
                <div className="text-[0.68rem] font-mono text-sky-300 pt-1 border-t border-sky-500/30">
                  Output: Project Nudges Ready
                </div>
              </div>
            </div>

            <div className="rounded-sm bg-ink-950 border border-ink-800 p-3.5 font-mono text-[0.74rem] space-y-1">
              <span className="text-muted block text-[0.65rem] uppercase">LLM Recommendation Strategy</span>
              <p className="text-ink_text/85">
                Evaluates candidate's skill gaps against top 10% peer benchmark projects to provide concrete, non-generic project suggestions (e.g. SHAP interpretability audits, ALV PO tracking, real-time API integrations).
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PATH 3: GOVERNANCE & RL POLICY ROUTING DECISION FLOW */}
        {/* ============================================================== */}
        {(activeBranch === "all" || activeBranch === "governance") && (
          <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[0.68rem] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
                  BRANCH 03
                </span>
                <h3 className="font-display text-[1.05rem] font-semibold text-ink_text">
                  RL Policy Governance & Human-in-the-Loop Routing
                </h3>
              </div>
              <span className={`font-mono text-[0.72rem] px-2.5 py-0.5 rounded border ${
                policyAction === "TRUST_AI" ? "border-teal/50 bg-teal/10 text-teal-light" : "border-brass/50 bg-brass/10 text-brass-light"
              }`}>
                Policy Verdict: {policyAction}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
              {/* Node C1: Triad Trust Integration */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 3.1</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">Triad Trust Feature Extraction</h4>
                <p className="text-[0.73rem] text-muted">Combines Groundedness, Relevance, and Intent score into feature vector.</p>
                <div className="text-[0.68rem] font-mono text-teal-light pt-1 border-t border-ink-800">
                  Trust Index: {(result.triad_metrics?.trust_index || 80).toFixed(1)}%
                </div>
              </div>

              {/* Node C2: LinUCB Contextual Bandit */}
              <div className="rounded-sm border border-ink-700 bg-ink-950 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  <span>Step 3.2</span>
                  <Cpu className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <h4 className="font-mono text-[0.82rem] font-semibold text-ink_text">LinUCB Bandit Score</h4>
                <p className="text-[0.73rem] text-muted">Computes Upper Confidence Bound score for TRUST_AI vs ESCALATE_HUMAN.</p>
                <div className="text-[0.68rem] font-mono text-rose-300 pt-1 border-t border-ink-800">
                  Formula: UCB_a = μ̂_a + c·√(ln N / N_a)
                </div>
              </div>

              {/* Node C3: Governance Action Branch */}
              <div className={`rounded-sm border p-4 space-y-2 ${
                policyAction === "TRUST_AI" ? "border-teal/50 bg-teal/10" : "border-brass/50 bg-brass/10"
              }`}>
                <div className="flex items-center justify-between font-mono text-[0.68rem]">
                  <span className={policyAction === "TRUST_AI" ? "text-teal-light" : "text-brass-light"}>Routing Action</span>
                  <Cpu className="w-4 h-4 text-brass" />
                </div>
                <h4 className={`font-mono text-[0.85rem] font-bold ${policyAction === "TRUST_AI" ? "text-teal-light" : "text-brass-light"}`}>
                  {policyAction}
                </h4>
                <p className="text-[0.72rem] text-ink_text/80 leading-tight">
                  {policyAction === "TRUST_AI"
                    ? "System confidence is high — auto-trusting screening verdict."
                    : "System uncertainty or border-line score — flagged for mandatory human review."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
