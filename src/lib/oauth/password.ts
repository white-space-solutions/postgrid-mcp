import { createHmac, timingSafeEqual } from "node:crypto";
import { oauthTokenSecret } from "@/lib/env";

/** Constant-time credential compare (length-independent via HMAC). */
export function credentialsMatch(
  presentedUser: string,
  presentedPass: string,
  expectedUser: string,
  expectedPass: string
): boolean {
  const secret = oauthTokenSecret();
  const a = createHmac("sha256", secret)
    .update(`u:${presentedUser}\0p:${presentedPass}`)
    .digest();
  const b = createHmac("sha256", secret)
    .update(`u:${expectedUser}\0p:${expectedPass}`)
    .digest();
  return timingSafeEqual(a, b);
}
