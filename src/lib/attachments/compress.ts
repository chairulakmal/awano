// Browser-only. Uses Canvas API and createImageBitmap — do not import from server code.
//
// Error handling: validateFile() returns an error string the UI can display directly.
// compressImage() throws on decode failure — callers should catch.
// The service layer enforces TARGET_BYTES independently as a final server-side guard.

// ── Accepted types (app policy) ──────────────────────────────────────────────

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
export const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"] as const;

/** Drop into <input accept={ACCEPT_ATTR}> to filter the OS file picker. */
export const ACCEPT_ATTR = "image/png,image/jpeg,application/pdf";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB — images are compressed after
export const MAX_PDF_BYTES = 1 * 1024 * 1024; // 1 MB — PDFs are stored as-is

/**
 * Validate a file before upload. Returns a user-facing error string, or null
 * if the file is acceptable.
 */
export function validateFile(file: File): string | null {
  const accepted = (ACCEPTED_TYPES as readonly string[]).includes(file.type);
  if (!accepted) return "Only PNG, JPG, and PDF files are accepted.";
  if (file.type === "application/pdf" && file.size > MAX_PDF_BYTES)
    return "PDF files must be under 1 MB.";
  if (file.type !== "application/pdf" && file.size > MAX_IMAGE_BYTES)
    return "Image files must be under 2 MB.";
  return null;
}

// ── Compression ───────────────────────────────────────────────────────────────

// Slightly under the 1 MB DB hard limit to leave headroom.
const TARGET_BYTES = 950_000;

// Image types that carry an alpha channel — composited over white before
// lossy encoding so transparency doesn't render as black.
const HAS_ALPHA = new Set(["image/png", "image/webp", "image/avif"]);

// Detect WebP canvas-output support once and cache. Safari supports displaying
// WebP but canvas.toBlob('image/webp') silently falls back to PNG there —
// checking the returned MIME type is the reliable probe.
let _outputMime: "image/webp" | "image/jpeg" | null = null;

async function getOutputMime(): Promise<"image/webp" | "image/jpeg"> {
  if (_outputMime !== null) return _outputMime;
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  probe.getContext("2d")!.fillRect(0, 0, 1, 1);
  const supported = await new Promise<boolean>((resolve) =>
    probe.toBlob((b) => resolve(b?.type === "image/webp"), "image/webp")
  );
  _outputMime = supported ? "image/webp" : "image/jpeg";
  return _outputMime;
}

/**
 * Compress any image File to under 1 MB.
 *
 * Accepts any image/* MIME type — app-level type restrictions are handled
 * separately by validateFile(). PDFs are returned unchanged.
 *
 * Output format: WebP where the browser supports canvas.toBlob('image/webp')
 * (Chrome, Firefox, Edge); JPEG elsewhere (Safari). WebP is chosen because it
 * is consistently smaller than JPEG at equivalent quality, minimising bytea
 * storage. The output MIME type and file extension always match.
 *
 * Strategy: binary-search the highest quality that fits TARGET_BYTES at the
 * original resolution. If no quality fits, halve the dimensions and retry
 * (up to 3 additional passes: ½ → ¼ → ⅛ of original pixels).
 *
 * PNG/WebP/AVIF transparency is composited over white before lossy encoding.
 * Files already under TARGET_BYTES are returned unchanged.
 *
 * Throws if createImageBitmap cannot decode the file (corrupted, unsupported
 * format on this browser). Callers are responsible for catching.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= TARGET_BYTES) return file;

  const mime = await getOutputMime();
  const ext = mime === "image/webp" ? ".webp" : ".jpg";
  const outputName = file.name.replace(/\.[^.]+$/, "") + ext;

  const bitmap = await createImageBitmap(file); // throws on decode failure
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const alpha = HAS_ALPHA.has(file.type);

  const render = (w: number, h: number, quality: number): Promise<Blob> => {
    canvas.width = w;
    canvas.height = h;
    if (alpha) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), mime, quality));
  };

  let width = bitmap.width;
  let height = bitmap.height;

  for (let pass = 0; pass < 4; pass++) {
    // Binary-search the highest quality that fits TARGET_BYTES at this resolution.
    let lo = 0.05,
      hi = 0.92,
      best: Blob | null = null;

    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const blob = await render(width, height, q);
      if (blob.size <= TARGET_BYTES) {
        best = blob;
        lo = q;
      } else hi = q;
    }

    if (best) return new File([best], outputName, { type: mime });

    // Still too large — halve dimensions and retry.
    width = Math.round(width / 2);
    height = Math.round(height / 2);
  }

  // Absolute fallback: floor quality at the smallest resolution reached.
  const blob = await render(width, height, 0.05);
  return new File([blob], outputName, { type: mime });
}
