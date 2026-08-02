import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

export function hmacSign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Compact signed JSON token: base64url(payload).base64url(sig) */
export function signPayload<T extends object>(
  secret: string,
  payload: T
): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = hmacSign(secret, body);
  return `${body}.${sig}`;
}

export function verifyPayload<T extends object>(
  secret: string,
  token: string
): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmacSign(secret, body);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
