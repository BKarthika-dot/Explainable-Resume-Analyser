import { useState } from "react";
import { 
  FileText, 
  Search, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  Filter, 
  BookOpen, 
  User, 
  Hash, 
  Zap, 
  X,
  Layers,
  ChevronRight
} from "lucide-react";

function getConfidenceBadge(score) {
  if (score >= 0.70) {
    return { bg: "bg-teal/15 text-teal-light border-teal/40", ring: "border-teal", label: "Strong Alignment" };
  }
  if (score >= 0.50) {
    return { bg: "bg-brass/15 text-brass-light border-brass/40", ring: "border-brass", label: "Moderate Alignment" };
  }
  return { bg: "bg-rust/15 text-rust-light border-rust/40", ring: "border-rust", label: "Weak Alignment" };
}

export default function DocumentInspector({ citations, confidence, candidateResumeText, track }) {
  const [activeTab, setActiveTab] = useState("exhibits"); // exhibits | candidate_resume | side_by_side
  const [searchQuery, setSearchQuery] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const filteredCitations = (citations || []).filter((c) => {
    const matchesSearch = 
      (c.source_file || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.full_content || c.snippet || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (confidenceFilter === "high") return matchesSearch && c.confidence >= 0.70;
    if (confidenceFilter === "medium") return matchesSearch && c.confidence >= 0.50 && c.confidence < 0.70;
    if (confidenceFilter === "low") return matchesSearch && c.confidence < 0.50;
    return matchesSearch;
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-6">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-ink-700">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brass" />
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
              Explainable RAG Knowledge Grounding
            </span>
          </div>
          <h2 className="font-display text-[1.2rem] font-semibold text-ink_text mt-0.5">
            Retrieved Reference Documents & Candidate Resume Inspector
          </h2>
          <p className="text-[0.8rem] text-muted mt-0.5">
            Byte-for-byte audit of vector chunks retrieved from the isolated domain corpus to evaluate this candidate.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-ink-950 border border-ink-700 rounded-sm font-mono text-[0.75rem]">
          <button
            onClick={() => setActiveTab("exhibits")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
              activeTab === "exhibits"
                ? "bg-brass text-ink-950 font-semibold"
                : "text-muted hover:text-ink_text"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Retrieved Exhibits ({citations?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("candidate_resume")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
              activeTab === "candidate_resume"
                ? "bg-brass text-ink-950 font-semibold"
                : "text-muted hover:text-ink_text"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Candidate Resume Text</span>
          </button>

          <button
            onClick={() => setActiveTab("side_by_side")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-colors ${
              activeTab === "side_by_side"
                ? "bg-brass text-ink-950 font-semibold"
                : "text-muted hover:text-ink_text"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Side-by-Side View</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-sm border border-ink-700 bg-ink-950/80 p-4">
          <span className="font-mono text-[0.66rem] uppercase text-muted block mb-1">Total Retrieved Exhibits</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[1.4rem] font-bold text-ink_text">{citations?.length || 0}</span>
            <span className="text-[0.75rem] font-mono text-teal-light">Knowledge Chunks</span>
          </div>
        </div>

        <div className="rounded-sm border border-ink-700 bg-ink-950/80 p-4">
          <span className="font-mono text-[0.66rem] uppercase text-muted block mb-1">Retrieval Consistency Index</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[1.4rem] font-bold text-brass-light">
              {confidence?.average ? `${(confidence.average * 100).toFixed(1)}%` : "N/A"}
            </span>
            <Zap className="w-4 h-4 text-brass" />
          </div>
        </div>

        <div className="rounded-sm border border-ink-700 bg-ink-950/80 p-4">
          <span className="font-mono text-[0.66rem] uppercase text-muted block mb-1">Isolated Vector Track</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[1.1rem] font-semibold text-cyan-300 uppercase">
              {track || "AIML"}
            </span>
            <span className="text-[0.68rem] font-mono px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              Isolated Index
            </span>
          </div>
        </div>
      </div>

      {/* Low Confidence Warning */}
      {confidence?.warning && (
        <div className="rounded-sm border border-rust/50 bg-rust/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rust-light shrink-0 mt-0.5" />
          <p className="text-[0.82rem] text-rust-light leading-relaxed font-mono">
            {confidence.warning}
          </p>
        </div>
      )}

      {/* EXHIBITS TAB CONTENT */}
      {activeTab === "exhibits" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exhibit content or file name..."
                className="w-full bg-ink-950 border border-ink-700 rounded-sm pl-9 pr-3 py-2 text-[0.82rem] text-ink_text placeholder:text-muted/60 focus:border-brass transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end font-mono text-[0.76rem]">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <span className="text-muted">Confidence:</span>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="bg-ink-950 border border-ink-700 rounded-sm px-2.5 py-1.5 text-ink_text font-mono"
              >
                <option value="all">All ({citations?.length || 0})</option>
                <option value="high">High Match (&gt;70%)</option>
                <option value="medium">Medium Match (50-70%)</option>
                <option value="low">Low Match (&lt;50%)</option>
              </select>
            </div>
          </div>

          {/* Exhibits List */}
          {!filteredCitations || filteredCitations.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-ink-700 rounded-sm">
              <FileText className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-[0.88rem] text-muted font-mono">No matching exhibit documents found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCitations.map((item, idx) => {
                const badge = getConfidenceBadge(item.confidence);

                return (
                  <div
                    key={item.chunk_index ?? idx}
                    className="rounded-sm border border-ink-700 bg-ink-900/70 p-5 hover:border-brass/50 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[0.72rem] px-2 py-0.5 rounded bg-ink-800 border border-ink-600 text-brass font-bold">
                          Exhibit #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-mono text-[0.88rem] font-semibold text-ink_text truncate max-w-md">
                          {item.source_file}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-ink-950 h-2 rounded-full overflow-hidden border border-ink-700 hidden md:block">
                          <div
                            className="h-full bg-brass transition-all duration-500"
                            style={{ width: `${(item.confidence * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[0.75rem] px-2.5 py-0.5 rounded border ${badge.bg}`}>
                          {(item.confidence * 100).toFixed(1)}% Match
                        </span>
                      </div>
                    </div>

                    <div className="font-mono text-[0.8rem] text-ink_text/85 leading-relaxed bg-ink-950 p-3.5 rounded-sm border border-ink-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {item.snippet}
                      {item.snippet?.length >= 200 && "..."}
                    </div>

                    <div className="flex items-center justify-between pt-1 font-mono text-[0.74rem]">
                      <span className="text-muted">
                        Source chunk #{item.chunk_index} from isolated vector corpus
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocModal(item)}
                        className="flex items-center gap-1.5 text-brass hover:text-brass-light border border-brass/30 bg-brass/10 px-3 py-1.5 rounded-sm hover:bg-brass/20 transition-colors font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Full Exhibit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CANDIDATE RESUME TAB CONTENT */}
      {activeTab === "candidate_resume" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-ink-900 border border-ink-700 p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-brass" />
              <div>
                <h3 className="font-display text-[0.95rem] font-semibold text-ink_text">
                  Uploaded Candidate Resume (Raw Text Input)
                </h3>
                <p className="text-[0.75rem] font-mono text-muted">
                  Demographically-sanitized and passed to Stage 1 Rubric Evaluator
                </p>
              </div>
            </div>
            {candidateResumeText && (
              <button
                type="button"
                onClick={() => handleCopy(candidateResumeText)}
                className="flex items-center gap-1.5 font-mono text-[0.75rem] text-muted hover:text-ink_text border border-ink-600 px-3 py-1.5 rounded-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Copied!" : "Copy Resume Text"}</span>
              </button>
            )}
          </div>

          {!candidateResumeText ? (
            <div className="text-center py-12 border border-dashed border-ink-700 rounded-sm">
              <User className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-[0.88rem] text-muted font-mono">No candidate resume text attached to active case.</p>
            </div>
          ) : (
            <div className="rounded-sm border border-ink-700 bg-ink-950 p-5 font-mono text-[0.82rem] text-ink_text/90 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {candidateResumeText}
            </div>
          )}
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARISON TAB */}
      {activeTab === "side_by_side" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Retrieved Exhibits */}
          <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-ink-800 pb-2">
              <BookOpen className="w-4 h-4 text-brass" />
              <h3 className="font-mono text-[0.85rem] font-semibold text-ink_text">Retrieved Vector Rubrics</h3>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {citations?.map((c, i) => (
                <div key={i} className="p-3 bg-ink-950 rounded border border-ink-800 font-mono text-[0.76rem] space-y-1">
                  <div className="flex items-center justify-between text-brass">
                    <span>{c.source_file}</span>
                    <span>{(c.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-ink_text/80 leading-normal">{c.snippet}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Candidate Resume */}
          <div className="rounded-sm border border-ink-700 bg-ink-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-ink-800 pb-2">
              <User className="w-4 h-4 text-teal" />
              <h3 className="font-mono text-[0.85rem] font-semibold text-ink_text">Candidate Resume Text</h3>
            </div>
            <div className="p-3 bg-ink-950 rounded border border-ink-800 font-mono text-[0.76rem] text-ink_text/85 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {candidateResumeText || "No candidate resume text available."}
            </div>
          </div>
        </div>
      )}

      {/* FULL EXHIBIT MODAL */}
      {selectedDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="bg-ink-900 border border-brass/50 rounded-sm max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-ink-700 flex items-center justify-between bg-ink-950">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brass" />
                <div>
                  <span className="font-mono text-[0.68rem] uppercase text-brass">Full Exhibit Raw Text Inspection</span>
                  <h3 className="font-mono text-[1rem] font-semibold text-ink_text">
                    {selectedDocModal.source_file}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocModal(null)}
                className="text-muted hover:text-ink_text p-1 rounded-sm border border-ink-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-[0.83rem] text-ink_text/90 leading-relaxed bg-ink-950 whitespace-pre-wrap">
              {selectedDocModal.full_content || selectedDocModal.snippet}
            </div>

            <div className="p-4 border-t border-ink-700 bg-ink-900 flex items-center justify-between font-mono text-[0.75rem]">
              <span className="text-muted">
                Confidence: {(selectedDocModal.confidence * 100).toFixed(1)}% &middot; Chunk #{selectedDocModal.chunk_index}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(selectedDocModal.full_content || selectedDocModal.snippet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-ink-600 text-ink_text hover:bg-ink-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Copied!" : "Copy Exhibit Text"}</span>
                </button>
                <button
                  onClick={() => setSelectedDocModal(null)}
                  className="px-4 py-1.5 rounded-sm bg-brass text-ink-950 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
