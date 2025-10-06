import * as React from "react";

const flashcardDecks = [
  {
    id: "deck-neuro",
    title: "Neuroplasticity Essentials",
    subject: "Biology",
    difficulty: "Intermediate",
    cards: 64,
    summary:
      "Layered prompts that mix terminology recall with scenario-based retrieval. Includes spaced intervals tuned for steady mastery over 21 days.",
    stats: "84% average mastery",
  },
  {
    id: "deck-derivatives",
    title: "Calculus – Derivatives Toolkit",
    subject: "Mathematics",
    difficulty: "Advanced",
    cards: 72,
    summary:
      "Proof-oriented prompts followed by applied optimization problems. Adaptive tags flag items that slip below 70% retention.",
    stats: "New deck · trending",
  },
  {
    id: "deck-spanish",
    title: "Spanish Conversational Verbs",
    subject: "Languages",
    difficulty: "Beginner",
    cards: 48,
    summary:
      "Audio-backed cards focus on high-frequency verbs with mini dialogue stems. Includes context cues + spaced production drills.",
    stats: "Imported 120×",
  },
];

export const Flashcards: React.FC = () => (
  <div className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight text-fg">Flashcards</h2>
      <p className="text-sm text-muted-foreground">
        Decks tuned for spaced repetition. Filter by subject, import directly, or remix cards to your own intervals.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      {flashcardDecks.map((deck) => (
        <article
          key={deck.id}
          className="group flex h-full flex-col rounded-2xl border border-muted/30 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:from-accent/20 hover:via-accent/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/80">{deck.subject}</p>
              <h3 className="mt-2 text-lg font-semibold text-fg">{deck.title}</h3>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {deck.cards} cards
            </span>
          </div>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{deck.summary}</p>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground/80">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
              {deck.difficulty}
            </span>
            <p className="font-medium text-accent/90">{deck.stats}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
);

export default Flashcards;
