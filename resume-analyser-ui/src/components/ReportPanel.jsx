import ReactMarkdown from "react-markdown";

export default function ReportPanel({ title, eyebrow, content }) {
  if (!content) return null;
  return (
    <div className="rounded-sm bg-paper px-7 py-7 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-900/50 mb-1">{eyebrow}</p>
      <h2 className="font-display text-[1.2rem] font-semibold text-ink-900 mb-4">{title}</h2>
      <div className="dossier-prose">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
