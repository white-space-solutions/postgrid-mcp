function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is not set`);
  return v.trim();
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function publicBaseUrl(req?: Request): string {
  const fromEnv = optional("PUBLIC_BASE_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? new URL(req.url).host;
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  throw new Error("PUBLIC_BASE_URL is not set");
}

export function allowedHosts(): string[] {
  const raw = optional("MCP_ALLOWED_HOSTS") ?? "localhost:3000";
  return raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export function assertAllowedHost(req: Request): void {
  const host = (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const allow = allowedHosts();
  if (!allow.includes(host)) {
    throw new HostNotAllowedError(host);
  }
}

export class HostNotAllowedError extends Error {
  constructor(host: string) {
    super(`Host not allowed: ${host || "(empty)"}`);
    this.name = "HostNotAllowedError";
  }
}

export function oauthTokenSecret(): string {
  const s = required("OAUTH_TOKEN_SECRET");
  if (s.length < 32) {
    throw new Error("OAUTH_TOKEN_SECRET must be at least 32 characters");
  }
  return s;
}

export function operatorCredentials(): { username: string; password: string } {
  return {
    username: optional("OPERATOR_USERNAME") ?? "operator",
    password: required("OPERATOR_PASSWORD"),
  };
}

export function postgridConfig() {
  const environment = (optional("POSTGRID_ENVIRONMENT") ?? "test") as
    | "test"
    | "live";
  if (environment !== "test" && environment !== "live") {
    throw new Error("POSTGRID_ENVIRONMENT must be 'test' or 'live'");
  }
  const allowed = optional("POSTGRID_ALLOWED_ORG_IDS");
  return {
    apiKey: required("POSTGRID_API_KEY"),
    environment,
    allowedOrgIds: allowed
      ? allowed.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
  };
}

export function staticOAuthClient():
  | { clientId: string; clientSecret?: string }
  | undefined {
  const clientId = optional("OAUTH_CLIENT_ID");
  if (!clientId) return undefined;
  return {
    clientId,
    clientSecret: optional("OAUTH_CLIENT_SECRET"),
  };
}
