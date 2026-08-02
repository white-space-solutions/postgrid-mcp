import { staticOAuthClient } from "@/lib/env";
import type { ClientMetadata } from "./types";
import { CLAUDE_CALLBACK } from "./types";

const CIMD_CACHE = new Map<string, { at: number; meta: ClientMetadata }>();
const CIMD_TTL_MS = 5 * 60 * 1000;

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Resolve a client_id: static env client, or CIMD HTTPS URL. */
export async function resolveClient(
  clientId: string
): Promise<ClientMetadata | null> {
  const staticClient = staticOAuthClient();
  if (staticClient && staticClient.clientId === clientId) {
    return {
      client_id: clientId,
      redirect_uris: [CLAUDE_CALLBACK],
      token_endpoint_auth_method: staticClient.clientSecret ? "client_secret_post" : "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
  }

  if (!isHttpsUrl(clientId)) return null;

  const cached = CIMD_CACHE.get(clientId);
  if (cached && Date.now() - cached.at < CIMD_TTL_MS) return cached.meta;

  const res = await fetch(clientId, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ClientMetadata;
  if (json.client_id && json.client_id !== clientId) return null;
  if (!Array.isArray(json.redirect_uris) || json.redirect_uris.length === 0) {
    return null;
  }
  const meta: ClientMetadata = {
    client_id: clientId,
    client_name: json.client_name,
    redirect_uris: json.redirect_uris,
    grant_types: json.grant_types,
    response_types: json.response_types,
    token_endpoint_auth_method: json.token_endpoint_auth_method ?? "none",
  };
  CIMD_CACHE.set(clientId, { at: Date.now(), meta });
  return meta;
}

export function redirectAllowed(
  meta: ClientMetadata,
  redirectUri: string
): boolean {
  return meta.redirect_uris.includes(redirectUri);
}
