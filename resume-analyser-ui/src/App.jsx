import { useRef, useState } from "react";
import { screenResume, ScreeningError, API_BASE } from "./api";
import IntakeForm from "./components/IntakeForm";
import ProcessingLedger from "./components/ProcessingLedger";
import CaseHeader from "./components/CaseHeader";
import TrustGauges from "./components/TrustGauges";
import ReportPanel from "./components/ReportPanel";
import VectorMapPanel from "./components/VectorMapPanel";
import ReviewPanel from "./components/ReviewPanel";
import PolicyTransparencyPanel from "./components/PolicyTransparencyPanel";
import AgentWorkflowChart from "./components/AgentWorkflowChart";
import DocumentInspector from "./components/DocumentInspector";
import RetrievedFilesBanner from "./components/RetrievedFilesBanner";
import DecisionWorkflowDiagram from "./components/DecisionWorkflowDiagram";
import StudentDashboard from "./components/StudentDashboard";
import CandidateQna from "./components/CandidateQna";

import { 
  Layers, 
  FileText, 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  RotateCcw, 
  Sliders, 
  Activity,
  Award,
  ShieldCheck,
  GitBranch,
  BookOpen,
  Zap,
  MessageSquare
} from "lucide-react";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | running | error | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [activeTab, setActiveTab] = useState("decision_workflow"); // decision_workflow | workflow | documents | reports | vector
  const abortRef = useRef(null);

  async function handleSubmit({ role, file, mode }) {
    setStatus("running");
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = await screenResume({ role, file, mode, signal: controller.signal });
      setResult(payload);
      setMeta({
        filename: payload.filename,
        track: payload.track_routed,
        mode: payload.mode,
        generatedAt: new Date().toLocaleString(),
      });
      setStatus("done");
      if (payload.mode === "student") {
        setActiveTab("student_dashboard");
      } else {
        setActiveTab("decision_workflow");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err instanceof ScreeningError ? err.message : "Something went wrong while screening this candidate.");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setMeta(null);
    setActiveTab("decision_workflow");
  }

  const vectorMapUrl = result?.vector_map_url ? `${API_BASE}${result.vector_map_url}` : null;

  return (
    <div className="min-h-screen bg-ink-950 text-ink_text flex flex-col font-body selection:bg-brass/30 antialiased">
      {/* Executive Header Bar */}
      <header className="border-b border-ink-700/80 bg-ink-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-sm bg-gradient-to-br from-brass to-brass-light text-ink-950 font-mono font-bold text-xl tracking-wider shadow-md">
              INARA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-brass font-bold">
                  Explainable Candidate Screening System
                </span>
                <span className="font-mono text-[0.62rem] px-2 py-0.5 rounded border border-teal/40 bg-teal/10 text-teal-light font-medium">
                  v2.4 Formal Enterprise
                </span>
              </div>
              <h1 className="font-display text-[1.25rem] font-semibold text-ink_text -mt-0.5 tracking-tight">
                Executive Candidate Decision & Screening Dossier
              </h1>
            </div>
          </div>

          {/* Top Navigation Bar (when screening complete) */}
          <div className="flex items-center gap-2">
            {status === "done" && (
              <div className="flex flex-wrap items-center p-1 bg-ink-950 border border-ink-700 rounded-sm font-mono text-[0.76rem]">
                {result?.mode === "student" && (
                  <button
                    onClick={() => setActiveTab("student_dashboard")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                      activeTab === "student_dashboard" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Student Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("decision_workflow")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                    activeTab === "decision_workflow" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Logical Decision Tree</span>
                </button>

                <button
                  onClick={() => setActiveTab("workflow")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                    activeTab === "workflow" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Trust & Governance</span>
                </button>

                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                    activeTab === "documents" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Retrieved Files ({result?.citations?.length || 0})</span>
                </button>

                {result?.mode === "recruiter" && (
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                      activeTab === "reports" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Scorecard & Guidance</span>
                  </button>
                )}

                {result?.mode === "recruiter" && (
                  <button
                    onClick={() => setActiveTab("qna")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                      activeTab === "qna" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Candidate Q&A</span>
                  </button>
                )}

                {vectorMapUrl && (
                  <button
                    onClick={() => setActiveTab("vector")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
                      activeTab === "vector" ? "bg-brass text-ink-950 font-semibold shadow" : "text-muted hover:text-ink_text"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>2D Vector Map</span>
                  </button>
                )}
              </div>
            )}

            {status === "done" && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 font-mono text-[0.76rem] text-muted hover:text-ink_text border border-ink-600 rounded-sm px-3 py-2 hover:bg-ink-800 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Dossier</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* System Architecture Flowchart (Top) */}
        <section>
          <AgentWorkflowChart status={status} result={result} />
        </section>

        {/* Content Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">
          {/* Left Column: Intake & Case Meta */}
          <aside className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-brass font-bold">
                  Institutional Case Intake
                </span>
                <ShieldCheck className="w-4 h-4 text-teal" />
              </div>
              <h2 className="font-display text-[1.1rem] font-semibold text-ink_text mb-5">
                Candidate Screening Control
              </h2>
              <IntakeForm onSubmit={handleSubmit} disabled={status === "running"} />
            </div>

            {status === "done" && meta && (
              <div className="rounded-sm border border-ink-700 bg-ink-900 p-4 font-mono text-[0.76rem] space-y-2.5 shadow-md">
                <div className="flex justify-between items-center text-muted border-b border-ink-800 pb-2">
                  <span>Candidate File:</span>
                  <span className="text-ink_text font-semibold truncate max-w-[150px]">{meta.filename}</span>
                </div>
                <div className="flex justify-between items-center text-muted border-b border-ink-800 pb-2">
                  <span>Screening Mode:</span>
                  <span className="text-brass font-bold uppercase">{meta.mode}</span>
                </div>
                <div className="flex justify-between items-center text-muted border-b border-ink-800 pb-2">
                  <span>Vector Track:</span>
                  <span className="text-cyan-300 font-bold uppercase">{meta.track}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Timestamp:</span>
                  <span className="text-ink_text/80">{meta.generatedAt}</span>
                </div>
              </div>
            )}
          </aside>

          {/* Right Column: Screen Output Panels */}
          <section className="min-h-[500px] space-y-8">
            {/* IDLE STATE */}
            {status === "idle" && (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 border border-dashed border-ink-700 rounded-sm bg-ink-900/40 p-8 space-y-4">
                <Activity className="w-12 h-12 text-brass opacity-60 animate-pulse" />
                <div>
                  <p className="font-display text-[1.2rem] font-semibold text-ink_text mb-1">
                    Explainable Candidate Screening Dossier Ready
                  </p>
                  <p className="text-[0.85rem] text-muted max-w-md mx-auto leading-relaxed font-body">
                    Select a benchmark preset or upload a plain-text candidate resume on the left. The agent will execute demographically-isolated vector search, factual fidelity auditing, decision tree logging, and bandit policy routing.
                  </p>
                </div>
              </div>
            )}

            {/* RUNNING STATE */}
            {status === "running" && <ProcessingLedger />}

            {/* ERROR STATE */}
            {status === "error" && (
              <div className="rounded-sm border border-rust/40 bg-rust/10 px-6 py-6 space-y-2">
                <p className="font-display text-[1.05rem] font-semibold text-rust-light">
                  Pipeline Execution Error
                </p>
                <p className="text-[0.85rem] text-ink_text/80 font-mono">{error}</p>
              </div>
            )}

            {/* DONE STATE */}
            {status === "done" && result && (
              <div className="space-y-8">
                {/* Active Case Metadata Header */}
                <CaseHeader filename={meta.filename} track={meta.track} generatedAt={meta.generatedAt} />

                {/* HIGH VISIBILITY: Retrieved Reference Files Banner */}
                <RetrievedFilesBanner
                  citations={result.citations}
                  confidence={result.retrieval_confidence}
                  track={result.track_routed}
                  onViewAllExhibits={() => setActiveTab("documents")}
                />

                {/* TAB: STUDENT DASHBOARD (ONLY STUDENT MODE) */}
                {activeTab === "student_dashboard" && (
                  <StudentDashboard result={result} />
                )}

                {/* TAB 1: LOGICAL LLM DECISION WORKFLOW TREE */}
                {activeTab === "decision_workflow" && (
                  <div className="space-y-6">
                    <DecisionWorkflowDiagram result={result} status={status} />
                  </div>
                )}

                {/* TAB 2: TRUST & GOVERNANCE */}
                {activeTab === "workflow" && (
                  <div className="space-y-6">
                    {result.mode === "recruiter" && (
                      <ReviewPanel
                        caseId={result.case_id}
                        aiStatus={result.ai_status}
                        fitProbability={result.fit_probability}
                        policyAction={result.policy_action}
                        policyExplanation={result.policy_explanation}
                        policyDetail={result.policy_detail}
                      />
                    )}

                    <TrustGauges
                      metrics={result.triad_metrics}
                      groundednessReason={result.triad_metrics?.groundedness_reason}
                      relevanceReason={result.triad_metrics?.relevance_reason}
                    />

                    <PolicyTransparencyPanel />
                  </div>
                )}

                {/* TAB 3: RETRIEVED EXHIBITS & DOCUMENTS */}
                {activeTab === "documents" && (
                  <DocumentInspector
                    citations={result.citations}
                    confidence={result.retrieval_confidence}
                    candidateResumeText={result.candidate_resume_text}
                    track={result.track_routed}
                  />
                )}

                {/* TAB 4: SCORECARD & GUIDANCE REPORTS */}
                {activeTab === "reports" && (
                  <div className="space-y-6">
                    <ReportPanel
                      eyebrow="Stage 1 &middot; Objective Rubric Evaluation"
                      title="Selection Scorecard"
                      content={result.report}
                    />

                    <ReportPanel
                      eyebrow="Stage 2 &middot; Peer Benchmarking Nudge"
                      title="Guidance & Action Roadmap"
                      content={result.guidance}
                    />
                  </div>
                )}

                {/* TAB 5: CANDIDATE Q&A (ONLY RECRUITER MODE) */}
                {activeTab === "qna" && (
                  <CandidateQna caseId={result.case_id} targetRole={result.track_routed} />
                )}

                {/* TAB 6: 2D VECTOR MAP */}
                {activeTab === "vector" && vectorMapUrl && (
                  <VectorMapPanel url={vectorMapUrl} />
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Dashboard Footer */}
      <footer className="border-t border-ink-800 bg-ink-950 px-6 py-6 text-center text-[0.75rem] text-muted font-mono">
        Inara Explainable Candidate Screening System &middot; Multi-Pass RAG & LinUCB Bandit Reinforcement Learning Governance
      </footer>
    </div>
  );
}
