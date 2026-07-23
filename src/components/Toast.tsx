"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: ToastVariant };
type ToastContextValue = { toast: (message: string, variant?: ToastVariant) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const VARIANT_TINT: Record<ToastVariant, string> = {
  success: "text-status-resolved",
  error: "text-danger-text",
  info: "text-fg-secondary",
};

// Monotonic id source: avoids Date.now()/Math.random() for stable keys.
let nextId = 0;

/*
 * App-wide toast host. Mount once (root layout). Any client component calls
 * `useToast().toast(message, variant)`, crucially with the exact string a
 * server action returned, so the feedback never contradicts the outcome.
 * Toasts auto-dismiss after 4s and are announced via an aria-live region.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(20rem,calc(100vw-2rem))]"
      >
        {toasts.map(({ id, message, variant }) => {
          const Icon = VARIANT_ICON[variant];
          return (
            <div
              key={id}
              role="status"
              className="flex items-start gap-2.5 rounded-lg bg-surface shadow-panel px-3.5 py-2.5 text-sm"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${VARIANT_TINT[variant]}`} />
              <p className="flex-1 text-fg">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-fg-subtle hover:text-fg-strong transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
