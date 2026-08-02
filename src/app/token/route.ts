import { resolveClient, redirectAllowed } from "@/lib/oauth/clients";
import {
  verifyAuthCode,
  verifyPkce,
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  mcpResourceAudience,
} from "@/lib/oauth/tokens";
import {
  assertAllowedHost,
  HostNotAllowedError,
  staticOAuthClient,
} from "@/lib/env";
import { timingSafeEqualStr } from "@/lib/crypto";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

async function assertClientAuth(
  clientId: string,
  clientSecret: string | null
): Promise<boolean> {
  const staticClient = staticOAuthClient();
  if (staticClient && staticClient.clientId === clientId) {
    if (!staticClient.clientSecret) return true;
    if (!clientSecret) return false;
    return timingSafeEqualStr(clientSecret, staticClient.clientSecret);
  }
  // CIMD clients use token_endpoint_auth_method: none
  const meta = await resolveClient(clientId);
  if (!meta) return false;
  if ((meta.token_endpoint_auth_method ?? "none") === "none") return true;
  return Boolean(clientSecret);
}

export async function POST(req: Request) {
  try {
    assertAllowedHost(req);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      return oauthError("access_denied", e.message, 403);
    }
    throw e;
  }

  const contentType = req.headers.get("content-type") ?? "";
  let params: URLSearchParams;
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, string>;
    params = new URLSearchParams(body);
  } else {
    params = new URLSearchParams(await req.text());
  }

  const grantType = params.get("grant_type");
  const clientId = params.get("client_id") ?? "";
  const clientSecret = params.get("client_secret");
  const audience = mcpResourceAudience(req);

  if (!(await assertClientAuth(clientId, clientSecret))) {
    return oauthError("invalid_client", "Client authentication failed", 401);
  }

  if (grantType === "authorization_code") {
    const code = params.get("code") ?? "";
    const redirectUri = params.get("redirect_uri") ?? "";
    const codeVerifier = params.get("code_verifier") ?? "";

    const authCode = verifyAuthCode(code);
    if (!authCode) {
      return oauthError("invalid_grant", "Invalid or expired authorization code");
    }
    if (authCode.client_id !== clientId) {
      return oauthError("invalid_grant", "client_id mismatch");
    }
    if (authCode.redirect_uri !== redirectUri) {
      return oauthError("invalid_grant", "redirect_uri mismatch");
    }
    const client = await resolveClient(clientId);
    if (!client || !redirectAllowed(client, redirectUri)) {
      return oauthError("invalid_grant", "redirect_uri not allowed");
    }
    if (!verifyPkce(codeVerifier, authCode.code_challenge)) {
      return oauthError("invalid_grant", "PKCE verification failed");
    }

    const access = issueAccessToken({
      sub: authCode.sub,
      clientId,
      audience,
      scope: authCode.scope,
    });
    const refresh = issueRefreshToken({
      sub: authCode.sub,
      clientId,
      audience,
      scope: authCode.scope,
    });

    return Response.json(
      {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        refresh_token: refresh,
        scope: authCode.scope,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token") ?? "";
    const payload = verifyRefreshToken(refreshToken);
    if (!payload || payload.client_id !== clientId) {
      return oauthError("invalid_grant", "Invalid refresh token");
    }
    if (payload.aud !== audience) {
      return oauthError("invalid_grant", "audience mismatch");
    }

    const access = issueAccessToken({
      sub: payload.sub,
      clientId,
      audience,
      scope: payload.scope,
    });
    const nextRefresh = issueRefreshToken({
      sub: payload.sub,
      clientId,
      audience,
      scope: payload.scope,
    });

    return Response.json(
      {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        refresh_token: nextRefresh,
        scope: payload.scope,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
