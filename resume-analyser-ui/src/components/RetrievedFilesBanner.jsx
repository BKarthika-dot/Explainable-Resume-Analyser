import { useState } from "react";
import { 
  FileText, 
  BookOpen, 
  Database, 
  ExternalLink, 
  Eye, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  X,
  Copy
} from "lucide-react";

export default function RetrievedFilesBanner({ citations, confidence, track, onViewAllExhibits }) {
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!citations || citations.length === 0) return null;

  // Group citations by source file name
  const filesMap = {};
  citations.forEach((c) => {
    const fileName = c.source_file || "unknown_source.txt";
    if (!filesMap[fileName]) {
      filesMap[fileName] = {
        name: fileName,
        chunks: [],
        maxConfidence: 0,
        avgConfidence: 0,
      };
    }
    filesMap[fileName].chunks.push(c);
    if (c.confidence > filesMap[fileName].maxConfidence) {
      filesMap[fileName].maxConfidence = c.confidence;
    }
  });

  // Calculate average confidence for each file
  Object.values(filesMap).forEach((f) => {
    const sum = f.chunks.reduce((acc, curr) => acc + (curr.confidence || 0), 0);
    f.avgConfidence = sum / f.chunks.length;
  });

  const uniqueFiles = Object.values(filesMap);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-sm border border-brass/40 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 p-6 shadow-xl relative overflow-hidden">
      {/* Top Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-brass/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-ink-700/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-brass/10 border border-brass/30 text-brass">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
                RAG Pipeline Isolation Audit
              </span>
              <span className="font-mono text-[0.62rem] px-2 py-0.5 rounded border border-teal/40 bg-teal/10 text-teal-light font-medium">
                {citations.length} Knowledge Chunks Retrieved
              </span>
            </div>
            <h2 className="font-display text-[1.15rem] font-semibold text-ink_text mt-0.5">
              Retrieved Reference Files & Source Documents
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {confidence?.average && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-ink-950 border border-ink-700 font-mono text-[0.76rem]">
              <Zap className="w-3.5 h-3.5 text-brass" />
              <span className="text-muted">Retrieval Confidence:</span>
              <span className="text-brass-light font-bold">{(confidence.average * 100).toFixed(1)}%</span>
            </div>
          )}
          {onViewAllExhibits && (
            <button
              onClick={onViewAllExhibits}
              className="flex items-center gap-1.5 font-mono text-[0.78rem] text-brass hover:text-brass-light border border-brass/40 bg-brass/10 px-3.5 py-1.5 rounded-sm hover:bg-brass/20 transition-all font-medium"
            >
              <span>Inspect All Exhibits</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Retrieved Files Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {uniqueFiles.map((file) => (
          <div
            key={file.name}
            className="rounded-sm border border-ink-700 bg-ink-950/80 p-4 hover:border-brass/50 transition-all space-y-3 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-brass shrink-0" />
                  <h3 className="font-mono text-[0.85rem] font-semibold text-ink_text truncate group-hover:text-brass transition-colors">
                    {file.name}
                  </h3>
                </div>
                <span className="font-mono text-[0.65rem] px-2 py-0.5 rounded bg-ink-800 border border-ink-600 text-teal-light shrink-0">
                  {(file.maxConfidence * 100).toFixed(0)}% Match
                </span>
              </div>

              <p className="text-[0.75rem] text-muted font-mono leading-normal">
                {file.chunks.length} Vector {file.chunks.length === 1 ? "Chunk" : "Chunks"} &middot; Isolated Track Index: <span className="text-cyan-300 font-semibold uppercase">{track || "AIML"}</span>
              </p>
            </div>

            {/* First chunk preview snippet */}
            <div className="bg-ink-900/90 border border-ink-800 p-2.5 rounded-sm font-mono text-[0.73rem] text-ink_text/80 line-clamp-2">
              "{file.chunks[0]?.snippet || file.chunks[0]?.full_content?.slice(0, 100)}"
            </div>

            <div className="pt-2 border-t border-ink-800/80 flex items-center justify-between font-mono text-[0.74rem]">
              <span className="text-muted">Avg: {(file.avgConfidence * 100).toFixed(1)}%</span>
              <button
                type="button"
                onClick={() => setSelectedDocModal(file.chunks[0])}
                className="flex items-center gap-1 text-brass hover:text-brass-light font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Quick View</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QUICK VIEW MODAL */}
      {selectedDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="bg-ink-900 border border-brass/50 rounded-sm max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-ink-700 flex items-center justify-between bg-ink-950">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-brass" />
                <div>
                  <span className="font-mono text-[0.66rem] uppercase text-brass">Retrieved Reference File Chunk</span>
                  <h3 className="font-mono text-[0.92rem] font-semibold text-ink_text">
                    {selectedDocModal.source_file}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocModal(null)}
                className="text-muted hover:text-ink_text p-1 rounded-sm border border-ink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 font-mono text-[0.8rem] text-ink_text/90 leading-relaxed bg-ink-950 whitespace-pre-wrap">
              {selectedDocModal.full_content || selectedDocModal.snippet}
            </div>
            <div className="p-3 border-t border-ink-700 bg-ink-900 flex items-center justify-between font-mono text-[0.74rem]">
              <span className="text-muted">
                Confidence: {(selectedDocModal.confidence * 100).toFixed(1)}% &middot; Chunk #{selectedDocModal.chunk_index}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(selectedDocModal.full_content || selectedDocModal.snippet)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-sm border border-ink-600 text-ink_text hover:bg-ink-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
                <button
                  onClick={() => setSelectedDocModal(null)}
                  className="px-3.5 py-1 rounded-sm bg-brass text-ink-950 font-semibold"
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
