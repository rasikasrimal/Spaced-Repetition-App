"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger" | "warning";
  cancelLabel?: string;
  warning?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void;
  extraActions?: { label: string; action: () => void }[];
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  description,
  warning,
  confirmLabel,
  confirmTone = "default",
  cancelLabel = "Cancel",
  icon,
  onConfirm,
  onClose,
  onCancel,
  extraActions,
  returnFocusRef
}) => {
  const [isMounted, setIsMounted] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    setIsMounted(true);
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

  if (!isMounted) {
    return null;
  }

  const dialog = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="confirmation-dialog"
          ref={overlayRef}
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-bg/70 backdrop-blur"
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
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full max-w-md rounded-3xl border border-inverse/10 bg-card/90 p-6"
          >
            <div className="flex items-start gap-3">
              {icon ? <span className="mt-1 rounded-2xl bg-inverse/10 p-2 text-accent" aria-hidden="true">{icon}</span> : null}
              <div className="space-y-2">
                <h2 id={titleId} className="text-lg font-semibold text-fg">
                  {title}
                </h2>
                <p id={descriptionId} className="text-sm text-muted-foreground">
                  {description}
                </p>
                {warning ? <p className="text-xs font-semibold text-warn/30">{warning}</p> : null}
              </div>
            </div>
            {extraActions && extraActions.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-inverse/10 bg-inverse/5 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-fg">Quick preferences</p>
                {extraActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="w-full rounded-xl border border-inverse/10 px-3 py-2 text-left transition hover:border-accent/40 hover:text-accent"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => (onCancel ? onCancel() : onClose())}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "min-w-[140px] rounded-2xl",
                  confirmTone === "danger"
                    ? "bg-error/80 hover:bg-error text-fg"
                    : confirmTone === "warning"
                    ? "bg-warn/80 hover:bg-warn text-inverse-foreground"
                    : ""
                )}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
};
