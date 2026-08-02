import { postgridConfig } from "@/lib/env";
import { listEnvelopeSchema, type ListEnvelope, COLLATERAL } from "./schemas";
import { acquireListPermit, RateLimitedError } from "./rate-limit";
import { redactSensitive } from "./redaction";

const BASE = "https://api.postgrid.com/print-mail/v1";
const PAGE = 100;
const MAX_RETRIES = 4;

export class PostGridError extends Error {
  status: number;
  path: string;
  correlationId: string;
  constructor(
    status: number,
    path: string,
    message: string,
    correlationId: string
  ) {
    super(message);
    this.name = "PostGridError";
    this.status = status;
    this.path = path;
    this.correlationId = correlationId;
  }
}

function correlationId(): string {
  return `pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function assertOrgAllowed(org: string | undefined): void {
  if (!org || org === "parent") return;
  const { allowedOrgIds } = postgridConfig();
  if (allowedOrgIds && !allowedOrgIds.includes(org)) {
    throw new Error(`Org ${org} is not in POSTGRID_ALLOWED_ORG_IDS`);
  }
}

function assertAllowlistedPath(path: string): void {
  if (!path.startsWith("/")) throw new Error("path must start with /");
  const base = path.split("?")[0]!;
  const allowed = new Set<string>([
    "/sub_organizations",
    ...COLLATERAL.map((c) => `/${c}`),
  ]);
  // allow /letters/:id style only if we add later; v1 is list roots only
  if (!allowed.has(base)) {
    throw new Error(`Path not allowlisted for reconciliation: ${base}`);
  }
}

export async function pgGet(
  path: string,
  opts: {
    org?: string;
    params?: Record<string, string | number>;
    /** When true, skip the shared list throttle (non-list GETs). */
    skipListThrottle?: boolean;
  } = {}
): Promise<unknown> {
  assertAllowlistedPath(path);
  assertOrgAllowed(opts.org);

  if (!opts.skipListThrottle) {
    await acquireListPermit();
  }

  const { apiKey } = postgridConfig();
  const qs = opts.params
    ? "?" +
      new URLSearchParams(
        Object.entries(opts.params).map(([k, v]) => [k, String(v)])
      ).toString()
    : "";

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    Accept: "application/json",
  };
  if (opts.org && opts.org !== "parent") {
    headers["PostGrid-Org"] = opts.org;
  }

  const cid = correlationId();
  let delay = 800;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const res = await fetch(`${BASE}${path}${qs}`, {
      headers,
      method: "GET",
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const json = await res.json();
      return redactSensitive(json);
    }

    const body = await res.text().catch(() => "");
    const retryAfter = Number(res.headers.get("retry-after") ?? "0");

    if (res.status === 401) {
      throw new PostGridError(
        401,
        path,
        "PostGrid 401. Check POSTGRID_API_KEY (parent Admin key required for impersonation).",
        cid
      );
    }
    if (res.status === 403) {
      throw new PostGridError(
        403,
        path,
        `PostGrid 403 on ${path}${opts.org ? ` (org ${opts.org})` : ""}. Impersonation may be disabled. ${body.slice(0, 200)}`,
        cid
      );
    }
    if (res.status === 404) {
      // Never map unexpected 404 → empty list; surface explicitly.
      throw new PostGridError(
        404,
        path,
        `PostGrid 404 on ${path}. ${body.slice(0, 200)}`,
        cid
      );
    }
    if (res.status === 429 || res.status >= 500) {
      if (res.status === 429 && retryAfter > 0) {
        throw new RateLimitedError(retryAfter);
      }
      await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
      delay *= 2;
      continue;
    }
    throw new PostGridError(
      res.status,
      path,
      `PostGrid ${res.status} on ${path}: ${body.slice(0, 300)}`,
      cid
    );
  }
  throw new PostGridError(
    503,
    path,
    `PostGrid: gave up on ${path} after ${MAX_RETRIES} attempts.`,
    cid
  );
}

export async function pgListPage(
  path: string,
  opts: { org?: string; skip?: number; limit?: number } = {}
): Promise<ListEnvelope> {
  const raw = await pgGet(path, {
    org: opts.org,
    params: {
      skip: opts.skip ?? 0,
      limit: opts.limit ?? PAGE,
    },
  });
  const parsed = listEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Unexpected list envelope for ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

export { PAGE as POSTGRID_PAGE_SIZE, COLLATERAL };
