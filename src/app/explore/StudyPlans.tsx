import * as React from "react";

const studyPlans = [
  {
    id: "plan-organic-chem",
    title: "Organic Chemistry I – 8 Week Sprint",
    duration: "8 weeks",
    milestones: ["Mechanisms", "Synthesis", "Spectroscopy"],
    summary:
      "Alternating focus blocks: concept lectures on Monday/Wednesday, problem sets Tuesday/Thursday, spaced recap on Saturdays. Includes lab pre-read checklists and active recall prompts.",
    contributors: 18,
    lastImported: "Imported 4 times this week",
  },
  {
    id: "plan-linear-algebra",
    title: "Linear Algebra Foundations",
    duration: "6 weeks",
    milestones: ["Vector spaces", "Eigenvalues", "Applications"],
    summary:
      "Flipped-classroom layout with daily warmups, proof workshops, and weekly reflection forms. Integrates Desmos activities and Anki deck sync reminders.",
    contributors: 12,
    lastImported: "Imported 9 times this month",
  },
  {
    id: "plan-psych-revision",
    title: "AP Psychology Exam Runway",
    duration: "5 weeks",
    milestones: ["Biological basis", "Learning", "Behavior"],
    summary:
      "Thematic pods bundle readings + podcasts + flashcard decks. Friday retros guide adjustments to lighten load before cumulative mock exams.",
    contributors: 9,
    lastImported: "Imported 3 times today",
  },
];

export const StudyPlans: React.FC = () => (
  <div className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight text-fg">Study Plans</h2>
      <p className="text-sm text-muted-foreground">
        Ready-to-run roadmaps with pacing, milestones, and built-in review slots. Import one to seed your own subject timeline.
      </p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      {studyPlans.map((plan) => (
        <article
          key={plan.id}
          className="group flex h-full flex-col rounded-2xl border border-muted/30 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:from-accent/20 hover:via-accent/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/80">{plan.duration}</p>
              <h3 className="mt-2 text-lg font-semibold text-fg">{plan.title}</h3>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {plan.contributors} collaborators
            </span>
          </div>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
          <div className="mt-6 space-y-4 text-xs text-muted-foreground/80">
            <div className="flex flex-wrap items-center gap-2">
              {plan.milestones.map((milestone) => (
                <span
                  key={milestone}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-accent"
                >
                  {milestone}
                </span>
              ))}
            </div>
            <p className="font-medium text-accent/90">{plan.lastImported}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
);

export default StudyPlans;
