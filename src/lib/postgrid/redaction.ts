const URL_KEYS = new Set([
  "url",
  "pdf",
  "previewUrl",
  "uploadedPDF",
  "outputURL",
  "signedUrl",
  "downloadUrl",
]);

function looksLikeSignedUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!/^https?:\/\//i.test(value)) return false;
  return /[?&](X-Amz-|Signature|token|Expires=)/i.test(value) || value.includes("?");
}

/** Deep-clone and redact signed / query-bearing URLs before persist or log. */
export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactSensitive);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (URL_KEYS.has(k) || looksLikeSignedUrl(v)) {
        out[k] = "[redacted-url]";
      } else if (k === "html" || k === "addressPlacement") {
        out[k] = "[redacted]";
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out;
  }
  if (looksLikeSignedUrl(input)) return "[redacted-url]";
  return input;
}
