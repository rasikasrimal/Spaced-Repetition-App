"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  extraActions
}) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {icon ? <span className="mt-1 rounded-2xl bg-white/10 p-2 text-accent">{icon}</span> : null}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm text-zinc-300">{description}</p>
                {warning ? <p className="text-xs font-semibold text-amber-200">{warning}</p> : null}
              </div>
            </div>
            {extraActions && extraActions.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                <p className="font-semibold text-white">Quick preferences</p>
                {extraActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="w-full rounded-xl border border-white/10 px-3 py-2 text-left transition hover:border-accent/40 hover:text-accent"
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
                    ? "bg-rose-500/80 hover:bg-rose-500 text-white"
                    : confirmTone === "warning"
                    ? "bg-amber-500/80 hover:bg-amber-500 text-slate-900"
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
};
