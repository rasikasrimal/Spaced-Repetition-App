"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface QuickRevisionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
  topicTitle?: string;
  isConfirming?: boolean;
  /**
   * Element to restore focus to when the dialog closes.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function QuickRevisionDialog({
  open,
  onConfirm,
  onClose,
  topicTitle,
  isConfirming = false,
  returnFocusRef
}: QuickRevisionDialogProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  const getFocusableElements = React.useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return [] as HTMLElement[];

    return Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((node) => {
      if (node.hasAttribute("disabled")) return false;
      if (node.getAttribute("aria-hidden") === "true") return false;
      return node.tabIndex !== -1;
    });
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusableElements();
      const target = focusable[0] ?? dialog;
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const element = dialogRef.current;
      if (!element) return;

      const focusable = getFocusableElements();

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const dialogElement = dialogRef.current;
      if (!dialogElement) return;

      if (dialogElement.contains(event.target as Node)) {
        return;
      }

      const focusable = getFocusableElements();
      const fallback = focusable[0] ?? dialogElement;
      window.requestAnimationFrame(() => fallback.focus({ preventScroll: true }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [getFocusableElements, open, onClose]);

  React.useEffect(() => {
    if (open) return;

    const target = returnFocusRef?.current ?? previouslyFocused.current;
    if (target && target.isConnected) {
      window.requestAnimationFrame(() => target.focus());
    }
  }, [open, returnFocusRef]);

  if (!open || !isMounted) {
    return null;
  }

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/80 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),24px)] backdrop-blur-sm transition sm:items-center sm:pb-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-revision-title"
        aria-describedby="quick-revision-description"
        className="relative w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl outline-none sm:max-h-[min(520px,calc(100vh-6rem))] sm:p-8"
        tabIndex={-1}
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:text-white"
          onClick={onClose}
          aria-label="Close quick revision dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-3 pr-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            Quick revision
          </div>
          <h2 id="quick-revision-title" className="text-xl font-semibold text-white">
            Quick revision
          </h2>
          <p id="quick-revision-description" className="text-sm text-zinc-300">
            {topicTitle ? (
              <>
                Record today’s revision for <span className="font-semibold text-white">{topicTitle}</span>. We’ll keep your scheduled reviews intact.
              </>
            ) : (
              "Record today’s revision without changing your upcoming schedule."
            )}
          </p>
          <p className="text-xs text-zinc-400">
            You can log one quick revision per topic each day. Use it when you squeeze in extra practice.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full rounded-2xl sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full rounded-2xl bg-emerald-500/80 text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
          >
            Log revision
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

