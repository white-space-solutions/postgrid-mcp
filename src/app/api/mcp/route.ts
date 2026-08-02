import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  assertAllowedHost,
  HostNotAllowedError,
  publicBaseUrl,
} from "@/lib/env";
import { verifyAccessToken, mcpResourceAudience } from "@/lib/oauth/tokens";
import { MCP_SCOPES } from "@/lib/oauth/types";
import { registerTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: "postgrid-recon-mcp",
      version: "0.1.0",
    },
  }
);

async function verifyToken(
  req: Request,
  bearer?: string
): Promise<AuthInfo | undefined> {
  if (!bearer) return undefined;
  try {
    const audience = mcpResourceAudience(req);
    const payload = verifyAccessToken(bearer, audience);
    if (!payload) return undefined;
    const scopes = payload.scope.split(/\s+/).filter(Boolean);
    if (!scopes.includes("postgrid:read")) return undefined;
    return {
      token: bearer,
      clientId: payload.client_id,
      scopes,
      expiresAt: payload.exp,
      extra: { sub: payload.sub },
    };
  } catch {
    return undefined;
  }
}

async function gated(req: Request): Promise<Response> {
  try {
    assertAllowedHost(req);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  }

  // withMcpAuth concatenates resourceUrl + resourceMetadataPath for the
  // WWW-Authenticate resource_metadata URL. Pass the public origin only.
  const base = publicBaseUrl(req);
  const wrapped = withMcpAuth(handler, verifyToken, {
    required: true,
    requiredScopes: [...MCP_SCOPES],
    resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
    resourceUrl: base,
  });
  return wrapped(req);
}

export { gated as GET, gated as POST };
