"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodayDifficulty } from "@/stores/today";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type DifficultyDialogProps = {
  open: boolean;
  mode: "revise" | "skip";
  topicTitle: string;
  onClose: () => void;
  onSelect: (difficulty: TodayDifficulty) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

const DIFFICULTY_OPTIONS: { value: TodayDifficulty; label: string; helper: string; tone: string }[] = [
  {
    value: "EASY",
    label: "Easy",
    helper: "Smooth sailing — extend the next review.",
    tone: "bg-success/10 text-success border-success/30"
  },
  {
    value: "NORMAL",
    label: "Normal",
    helper: "Felt about right — keep the current pacing.",
    tone: "bg-muted/40 text-muted-foreground border-border/50"
  },
  {
    value: "HARD",
    label: "Hard",
    helper: "Challenging — tighten the next interval.",
    tone: "bg-error/10 text-error border-error/30"
  }
];

export const DifficultyDialog: React.FC<DifficultyDialogProps> = ({
  open,
  mode,
  topicTitle,
  onClose,
  onSelect,
  returnFocusRef
}) => {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusPanel = panelRef.current;
    if (focusPanel) {
      const focusable = focusPanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusable[0];
      if (first) {
        window.requestAnimationFrame(() => first.focus({ preventScroll: true }));
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const element = panelRef.current;
      if (!element) return;

      const focusable = Array.from(
        element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((node) => !node.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) return;
    const target = returnFocusRef?.current ?? previouslyFocused.current;
    if (target) {
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  }, [open, returnFocusRef]);

  if (!mounted) {
    return null;
  }

  const description =
    mode === "revise"
      ? "Tell us how this review felt so we can tailor the next interval."
      : "We’ll nudge this topic to tomorrow and adjust the cadence based on your pick.";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="difficulty-dialog"
          ref={overlayRef}
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-bg/70 backdrop-blur"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === overlayRef.current) {
              onClose();
            }
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-full max-w-lg rounded-3xl border border-inverse/10 bg-card/95 p-6 shadow-xl"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mode === "revise" ? "Log review" : "Skip for now"}
              </p>
              <h2 id={titleId} className="text-2xl font-semibold text-fg">
                How was “{topicTitle}”?
              </h2>
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card hover:shadow-lg",
                    option.tone
                  )}
                >
                  <span className="text-base font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.helper}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

