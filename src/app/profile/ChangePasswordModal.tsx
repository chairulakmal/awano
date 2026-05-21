"use client";

import { useCallback, useEffect, useState } from "react";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function ChangePasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const close = useCallback(() => {
    if (isDirty && !window.confirm("Discard changes?")) return;
    setIsDirty(false);
    setIsOpen(false);
  }, [isDirty]);

  const open = () => {
    setIsDirty(false);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  return (
    <>
      <button
        onClick={open}
        className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
      >
        Change password →
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />

          <div className="relative w-full max-w-md rounded-xl shadow-panel bg-white p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Change password</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Minimum 15 characters</p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none text-lg"
              >
                ✕
              </button>
            </div>

            <ChangePasswordForm onDirtyChange={setIsDirty} />
          </div>
        </div>
      )}
    </>
  );
}
