import * as React from "react";

const studyTips = [
  {
    id: "tip-retrieval",
    title: "Retrieval > Re-reading",
    category: "Memory",
    summary:
      "Swap passive review for low-stakes recall. After reading, close the source and sketch the key points or teach it aloud. Spaced retrieval boosts durable learning by 30–50%.",
    source: "Brown et al., Make It Stick",
  },
  {
    id: "tip-interleave",
    title: "Interleave Similar Topics",
    category: "Planning",
    summary:
      "Mix problem types instead of batching. Rotate between related concepts—like derivatives, integrals, limits—to strengthen discrimination and flexible transfer.",
    source: "Rohrer & Taylor, 2007",
  },
  {
    id: "tip-metacog",
    title: "Preview → Practice → Reflect",
    category: "Meta-learning",
    summary:
      "Start sessions with a 3-minute preview of targets, end with a mini reflection: what clicked, what needs another pass, and what strategy worked. Keeps calibration tight.",
    source: "Cornell Learning Strategies Center",
  },
];

export const StudyTips: React.FC = () => (
  <div className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight text-fg">Study Tips</h2>
      <p className="text-sm text-muted-foreground">
        Evidence-backed nudges to refine your learning loop. Pin your favorites and surface them as streak reminders.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      {studyTips.map((tip) => (
        <article
          key={tip.id}
          className="group flex h-full flex-col rounded-2xl border border-muted/30 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:from-accent/20 hover:via-accent/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/80">{tip.category}</p>
              <h3 className="mt-2 text-lg font-semibold text-fg">{tip.title}</h3>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Tip
            </span>
          </div>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{tip.summary}</p>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-accent/90">{tip.source}</p>
        </article>
      ))}
    </div>
  </div>
);

export default StudyTips;
