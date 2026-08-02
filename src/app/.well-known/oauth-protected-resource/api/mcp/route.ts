import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";
import { authServerIssuer } from "@/lib/oauth/metadata";
import { assertAllowedHost, HostNotAllowedError, publicBaseUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handler(req: Request): Response {
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

  const issuer = authServerIssuer(req);
  const resourceUrl = `${publicBaseUrl(req)}/api/mcp`;
  return protectedResourceHandler({
    authServerUrls: [issuer],
    resourceUrl,
  })(req);
}

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
