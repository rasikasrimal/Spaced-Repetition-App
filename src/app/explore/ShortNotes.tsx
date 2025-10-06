import * as React from "react";

const shortNotes = [
  {
    id: "short-notes-atomic-habits",
    title: "Atomic Habits – Cue → Routine → Reward",
    subject: "Behavioral Science",
    tags: ["Habits", "Systems"],
    summary:
      "Map every habit loop to cue, craving, response, and reward. Stack a new habit onto an existing cue to reduce friction and reinforce identity-based change.",
    author: "Amelia W.",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "short-notes-photosynthesis",
    title: "Photosynthesis Energy Transfers",
    subject: "Biology",
    tags: ["Chloroplast", "Calvin Cycle"],
    summary:
      "Light reactions split water, releasing O₂ and capturing ATP + NADPH. The Calvin cycle spends that currency fixing CO₂ into triose phosphates; three turns = one G3P.",
    author: "Darius L.",
    updatedAt: "Updated 5 days ago",
  },
  {
    id: "short-notes-french-revolution",
    title: "French Revolution Power Blocks",
    subject: "World History",
    tags: ["Revolution", "1789"],
    summary:
      "Track shifting alliances: estates-general deadlock → National Assembly reforms → radical Jacobin surge → Thermidorian backlash paving way for the Consulate.",
    author: "Priya S.",
    updatedAt: "Updated 1 week ago",
  },
];

export const ShortNotes: React.FC = () => (
  <div className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight text-fg">Short Notes</h2>
      <p className="text-sm text-muted-foreground">
        Bite-sized syntheses built for quick refreshers. Bookmark, remix, or fork them into your personal subjects.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      {shortNotes.map((note) => (
        <article
          key={note.id}
          className="group flex h-full flex-col rounded-2xl border border-muted/30 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:from-accent/20 hover:via-accent/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/80">{note.subject}</p>
              <h3 className="mt-2 text-lg font-semibold text-fg">{note.title}</h3>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Shared
            </span>
          </div>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{note.summary}</p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground/80">
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-right">
              <p className="font-medium text-fg/80">{note.author}</p>
              <p>{note.updatedAt}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

export default ShortNotes;
