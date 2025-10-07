"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Brain, FileText, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortNotes } from "./ShortNotes";
import { StudyPlans } from "./StudyPlans";
import { Flashcards } from "./Flashcards";
import { StudyTips } from "./StudyTips";
import { useAppearanceStore } from "@/stores/appearance";

type SectionId = "short-notes" | "study-plans" | "flashcards" | "study-tips";

type Section = {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  render: () => React.ReactNode;
};

const sections: Section[] = [
  {
    id: "short-notes",
    label: "Short Notes",
    description: "Community-contributed snapshots that surface exam-ready takeaways.",
    icon: FileText,
    render: () => <ShortNotes />,
  },
  {
    id: "study-plans",
    label: "Study Plans",
    description: "Structured timelines that bundle goals, pacing, and resource templates.",
    icon: Layers,
    render: () => <StudyPlans />,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Curated decks tagged by subject, topic, and spaced repetition difficulty.",
    icon: Sparkles,
    render: () => <Flashcards />,
  },
  {
    id: "study-tips",
    label: "Study Tips",
    description: "Evidence-backed micro habits that reinforce stronger learning routines.",
    icon: Brain,
    render: () => <StudyTips />,
  },
];

export const ExplorePage: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState<SectionId>("short-notes");
  const surfaceOverlayOpacity = useAppearanceStore((state) => state.surfaceOverlayOpacity);
  const overlayIsTransparent = surfaceOverlayOpacity <= 0.03;

  const active = React.useMemo(() => sections.find((section) => section.id === activeSection) ?? sections[0], [activeSection]);
  const ActiveComponent = React.useMemo(() => active.render, [active]);

  return (
    <div className="space-y-12 pb-16">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
          Explore library
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">Discover community knowledge</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Browse shared notes, ready-to-run study plans, flashcard decks, and techniques vetted by learners like you.
            Surface what matters, remix it for your schedule, and keep momentum across every subject.
          </p>
        </div>
      </header>

      <div
        className={cn(
          "w-full max-w-4xl rounded-3xl border border-muted/30 bg-card/80 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70",
          overlayIsTransparent && "bg-transparent supports-[backdrop-filter]:bg-transparent"
        )}
      >
        <div role="tablist" aria-label="Explore sections" className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={active ? "true" : "false"}
                aria-controls={`explore-${section.id}`}
                data-active={active}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out",
                  "hover:bg-accent/10 hover:text-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  "data-[active=true]:bg-accent/20 data-[active=true]:text-accent"
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" aria-hidden="true" />
                <span className="text-left">
                  <span className="block">{section.label}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground/80 group-data-[active=true]:text-accent">
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section
        id={`explore-${active.id}`}
        aria-live="polite"
        className={cn(
          "rounded-3xl border border-muted/30 bg-card/80 p-6 shadow-lg supports-[backdrop-filter]:bg-card/70 md:p-10",
          overlayIsTransparent && "bg-transparent supports-[backdrop-filter]:bg-transparent"
        )}
      >
        <ActiveComponent />
      </section>
    </div>
  );
};

export default ExplorePage;
