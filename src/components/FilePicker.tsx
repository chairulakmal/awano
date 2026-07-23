"use client";

import { useState, useRef, useEffect } from "react";
import { ACCEPT_ATTR, validateFile, compressImage } from "@/lib/attachments/compress";

type Props = {
  onFiles: (files: File[]) => void;
};

export function FilePicker({ onFiles }: Props) {
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear display state when the parent <form> fires its reset event so
  // the parent's useEffect only needs to call form.reset() — no setState needed there.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const handleReset = () => {
      setNames([]);
      setError(null);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const raw = Array.from(e.target.files ?? []);
    if (raw.length === 0) {
      setNames([]);
      onFiles([]);
      return;
    }

    setProcessing(true);
    const processed: File[] = [];
    for (const file of raw) {
      const err = validateFile(file);
      if (err) {
        setError(err);
        setNames([]);
        onFiles([]);
        e.target.value = "";
        setProcessing(false);
        return;
      }
      try {
        const compressed = await compressImage(file);
        processed.push(compressed);
      } catch {
        setError("Could not process the image. Please try a different file.");
        setNames([]);
        onFiles([]);
        e.target.value = "";
        setProcessing(false);
        return;
      }
    }

    setNames(processed.map((f) => f.name));
    onFiles(processed);
    setProcessing(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer w-fit">
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
          />
        </svg>
        {processing ? "Processing…" : names.length > 0 ? names.join(", ") : "Attach files"}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="sr-only"
          onChange={handleChange}
          disabled={processing}
        />
      </label>
      {error && <p className="text-xs text-danger-text">{error}</p>}
      {!error && names.length > 0 && (
        <p className="text-xs text-fg-subtle">
          {names.length} file{names.length > 1 ? "s" : ""} ready
        </p>
      )}
    </div>
  );
}
