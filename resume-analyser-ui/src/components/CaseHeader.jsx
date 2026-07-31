import { ShieldCheck, Calendar, FileText, Compass } from "lucide-react";

const TRACK_LABELS = {
  aiml: "AI / ML Engineering",
  sap: "SAP Enterprise Systems",
  data_analyst: "Data Analytics & Intelligence",
};

export default function CaseHeader({ filename, track, generatedAt }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-brass/40 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 px-6 py-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-sm bg-brass/10 border border-brass/30 text-brass">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-brass">
            Active Dossier Record
          </span>
          <p className="font-mono text-[0.95rem] font-bold text-ink_text truncate max-w-sm">
            {filename}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted block">
              Vector Domain Track
            </span>
            <span className="font-mono text-[0.88rem] font-semibold text-cyan-300">
              {TRACK_LABELS[track] || track?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 border-l border-ink-700 pl-6">
          <Calendar className="w-4 h-4 text-muted" />
          <div>
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted block">
              Screened Timestamp
            </span>
            <span className="font-mono text-[0.82rem] text-ink_text/80">
              {generatedAt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded border border-teal/40 bg-teal/10 text-teal-light font-mono text-[0.72rem]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Active</span>
        </div>
      </div>
    </div>
  );
}
