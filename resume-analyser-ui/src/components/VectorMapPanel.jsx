export default function VectorMapPanel({ url }) {
  if (!url) return null;

  return (
    <div className="lg:sticky lg:top-10 flex flex-col rounded-sm border border-ink-600 bg-ink-800 overflow-hidden h-[560px] lg:h-[calc(100vh-5rem)]">
      <div className="px-5 py-4 border-b border-ink-600 shrink-0">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted mb-1">XAI Visualizer</p>
        <p className="font-display text-[1rem] font-semibold text-ink_text">Retrieval Vector Space</p>
        <p className="text-[0.75rem] text-muted mt-1">
          Every chunk in this track's index, compressed to 2D. Red points are what was actually retrieved.
        </p>
      </div>
      <iframe
        title="Retrieval vector space map"
        src={url}
        className="flex-1 w-full"
        style={{ border: "none", background: "#0B0D16" }}
      />
    </div>
  );
}
