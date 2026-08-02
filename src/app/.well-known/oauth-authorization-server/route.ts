import { authorizationServerMetadata } from "@/lib/oauth/metadata";
import { assertAllowedHost, HostNotAllowedError } from "@/lib/env";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
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

  return Response.json(authorizationServerMetadata(req), {
    headers: {
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
