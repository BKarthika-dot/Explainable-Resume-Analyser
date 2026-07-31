import { useState } from "react";
import { askQuestion, ScreeningError } from "../api";
import { MessageSquare, Send, BookOpen, Clock, AlertCircle, HelpCircle } from "lucide-react";

export default function CandidateQna({ caseId, targetRole }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const currentQuestion = question.trim();
    setQuestion("");
    setAsking(true);
    setError(null);

    // Add placeholder to history immediately
    const tempId = Date.now();
    setHistory((prev) => [
      ...prev,
      {
        id: tempId,
        question: currentQuestion,
        answer: null,
        citations: [],
        loading: true,
      },
    ]);

    try {
      const res = await askQuestion({
        caseId,
        question: currentQuestion,
        targetRole,
      });

      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                answer: res.answer,
                citations: res.citations || [],
                loading: false,
              }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof ScreeningError ? err.message : "Failed to retrieve an answer.");
      setHistory((prev) => prev.filter((item) => item.id !== tempId));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="rounded-sm border border-ink-600 bg-ink-850 p-6 shadow-xl space-y-6">
      {/* Q&A Header */}
      <div className="border-b border-ink-700 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brass" />
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-brass">
            Interactive RAG Query Terminal
          </span>
        </div>
        <h2 className="font-display text-[1.2rem] font-semibold text-ink_text mt-0.5">
          Resume Details & Fit Q&A
        </h2>
        <p className="text-[0.8rem] text-muted mt-0.5">
          Ask specific questions grounded in the candidate's resume (e.g., "What specific databases did she use?", "Does she have leadership experience?").
        </p>
      </div>

      {/* Answer History */}
      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
        {history.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-ink-700 rounded-sm bg-ink-900/20 text-muted space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto opacity-40 animate-pulse text-brass" />
            <p className="text-[0.8rem] font-mono">No questions asked yet for this candidate.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="space-y-3 border border-ink-700 rounded-sm bg-ink-900/40 p-4">
              {/* Question */}
              <div className="flex items-start gap-2.5">
                <span className="font-mono text-[0.68rem] px-2 py-0.5 rounded bg-brass/10 border border-brass/20 text-brass shrink-0 mt-0.5">
                  Q
                </span>
                <p className="text-[0.86rem] text-ink_text font-semibold leading-relaxed">
                  {item.question}
                </p>
              </div>

              {/* Answer */}
              {item.loading ? (
                <div className="flex items-center gap-2 text-[0.8rem] text-muted font-mono pl-7 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brass animate-ping" />
                  <span>Searching resume segments via hybrid RAG...</span>
                </div>
              ) : (
                <div className="pl-7 space-y-3">
                  <div className="text-[0.85rem] text-ink_text/85 leading-relaxed bg-ink-950/40 border border-ink-800/80 px-3.5 py-2.5 rounded-sm whitespace-pre-wrap">
                    {item.answer}
                  </div>

                  {/* Citations list */}
                  {item.citations.length > 0 && (
                    <div className="space-y-2">
                      <span className="block font-mono text-[0.64rem] uppercase tracking-[0.1em] text-muted">
                        Grounding Citations
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {item.citations.map((cite, i) => (
                          <div key={i} className="rounded-sm border border-ink-850 bg-ink-950/60 p-2.5 text-[0.72rem] space-y-1">
                            <div className="flex justify-between items-center text-[0.66rem] font-mono text-muted">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-brass" />
                                <span className="font-bold text-ink_text/70">{cite.section}</span>
                              </span>
                              {cite.confidence !== null && (
                                <span className="text-teal-light">
                                  Score: {(cite.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <p className="text-muted/80 leading-normal italic line-clamp-2">
                              "{cite.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-rust/30 bg-rust/10 p-3.5 text-[0.78rem] text-rust-light font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Question Form */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this resume (e.g. 'Stated Java experience?')"
          disabled={asking}
          className="flex-1 bg-ink-950 border border-ink-700 rounded-sm px-3.5 py-2.5 text-[0.88rem] text-ink_text placeholder:text-muted/50 focus:border-brass focus:ring-1 focus:ring-brass transition-colors disabled:opacity-50 font-body"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="rounded-sm bg-brass text-ink-950 font-mono font-semibold text-[0.84rem] px-5 py-2.5 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brass-light transition-all"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
