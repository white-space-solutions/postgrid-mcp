import { signPayload, verifyPayload, randomToken, sha256Base64Url } from "@/lib/crypto";
import { oauthTokenSecret, publicBaseUrl } from "@/lib/env";
import type {
  AccessTokenPayload,
  AuthCodePayload,
  RefreshTokenPayload,
} from "./types";
import { MCP_SCOPES } from "./types";

const ACCESS_TTL_SEC = 60 * 60; // 1h
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30d
const CODE_TTL_SEC = 10 * 60; // 10m

export function issueAuthCode(input: {
  sub: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthCodePayload = {
    typ: "code",
    sub: input.sub,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: input.scope ?? MCP_SCOPES.join(" "),
    iat: now,
    exp: now + CODE_TTL_SEC,
  };
  return signPayload(oauthTokenSecret(), payload);
}

export function verifyAuthCode(code: string): AuthCodePayload | null {
  const p = verifyPayload<AuthCodePayload>(oauthTokenSecret(), code);
  if (!p || p.typ !== "code") return null;
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

export function issueAccessToken(input: {
  sub: string;
  clientId: string;
  audience: string;
  scope?: string;
}): { token: string; expiresIn: number; payload: AccessTokenPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    typ: "access",
    sub: input.sub,
    client_id: input.clientId,
    scope: input.scope ?? MCP_SCOPES.join(" "),
    aud: input.audience,
    iat: now,
    exp: now + ACCESS_TTL_SEC,
  };
  return {
    token: signPayload(oauthTokenSecret(), payload),
    expiresIn: ACCESS_TTL_SEC,
    payload,
  };
}

export function issueRefreshToken(input: {
  sub: string;
  clientId: string;
  audience: string;
  scope?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: RefreshTokenPayload = {
    typ: "refresh",
    sub: input.sub,
    client_id: input.clientId,
    scope: input.scope ?? MCP_SCOPES.join(" "),
    aud: input.audience,
    iat: now,
    exp: now + REFRESH_TTL_SEC,
    jti: randomToken(16),
  };
  return signPayload(oauthTokenSecret(), payload);
}

export function verifyRefreshToken(
  token: string
): RefreshTokenPayload | null {
  const p = verifyPayload<RefreshTokenPayload>(oauthTokenSecret(), token);
  if (!p || p.typ !== "refresh") return null;
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

export function verifyAccessToken(
  token: string,
  expectedAudience: string
): AccessTokenPayload | null {
  const p = verifyPayload<AccessTokenPayload>(oauthTokenSecret(), token);
  if (!p || p.typ !== "access") return null;
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  if (p.aud !== expectedAudience) return null;
  return p;
}

export function verifyPkce(codeVerifier: string, challenge: string): boolean {
  return sha256Base64Url(codeVerifier) === challenge;
}

export function mcpResourceAudience(req?: Request): string {
  return `${publicBaseUrl(req)}/api/mcp`;
}
