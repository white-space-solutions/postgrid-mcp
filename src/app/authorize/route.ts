import { resolveClient, redirectAllowed } from "@/lib/oauth/clients";
import { issueAuthCode } from "@/lib/oauth/tokens";
import { operatorCredentials, assertAllowedHost, HostNotAllowedError } from "@/lib/env";
import { credentialsMatch } from "@/lib/oauth/password";
import { MCP_SCOPES } from "@/lib/oauth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlPage(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>PostGrid MCP Sign-in</title>
<style>
  :root { color-scheme: light; --ink:#1a1f1c; --muted:#5c6b63; --bg:#eef3ef; --card:#fff; --accent:#1f6f4a; }
  body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#d7e8dc,transparent),var(--bg);color:var(--ink);min-height:100vh;display:grid;place-items:center;padding:24px}
  main{width:min(420px,100%);background:var(--card);border:1px solid #d5e0d8;border-radius:16px;padding:28px;box-shadow:0 12px 40px rgba(20,40,30,.08)}
  h1{font-size:1.25rem;margin:0 0 6px} p{margin:0 0 18px;color:var(--muted);font-size:.95rem;line-height:1.45}
  label{display:block;font-size:.85rem;margin:12px 0 6px} input{width:100%;padding:10px 12px;border:1px solid #c9d5cd;border-radius:10px;font:inherit}
  button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
  .err{background:#fdecea;color:#8a1f17;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:.9rem}
</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(req: Request) {
  try {
    assertAllowedHost(req);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      return htmlPage(`<div class="err">${e.message}</div>`, 403);
    }
    throw e;
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state");
  const scope = url.searchParams.get("scope") ?? MCP_SCOPES.join(" ");

  if (!clientId || !redirectUri || responseType !== "code") {
    return htmlPage(
      `<div class="err">Invalid authorization request.</div><p>Missing client_id, redirect_uri, or response_type=code.</p>`,
      400
    );
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return htmlPage(
      `<div class="err">PKCE S256 is required.</div>`,
      400
    );
  }

  const client = await resolveClient(clientId);
  if (!client || !redirectAllowed(client, redirectUri)) {
    return htmlPage(
      `<div class="err">Unknown client or redirect_uri not allowed.</div>`,
      400
    );
  }

  const fields = [
    ["client_id", clientId],
    ["redirect_uri", redirectUri],
    ["code_challenge", codeChallenge],
    ["scope", scope],
    ["state", state ?? ""],
  ]
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${String(v)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")}"/>`
    )
    .join("");

  return htmlPage(`
    <h1>PostGrid MCP</h1>
    <p>Sign in to authorize Claude Cowork to use this reconciliation connector. Read-only PostGrid access.</p>
    <form method="POST" action="/authorize">
      ${fields}
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Authorize</button>
    </form>
  `);
}

export async function POST(req: Request) {
  try {
    assertAllowedHost(req);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      return htmlPage(`<div class="err">${e.message}</div>`, 403);
    }
    throw e;
  }

  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const scope = String(form.get("scope") ?? MCP_SCOPES.join(" "));
  const state = String(form.get("state") ?? "");
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  const client = await resolveClient(clientId);
  if (!client || !redirectAllowed(client, redirectUri)) {
    return htmlPage(`<div class="err">Invalid client.</div>`, 400);
  }

  const expected = operatorCredentials();
  if (
    !credentialsMatch(
      username,
      password,
      expected.username,
      expected.password
    )
  ) {
    return htmlPage(
      `<div class="err">Invalid username or password.</div>
       <p><a href="/authorize?${new URLSearchParams({
         client_id: clientId,
         redirect_uri: redirectUri,
         response_type: "code",
         code_challenge: codeChallenge,
         code_challenge_method: "S256",
         scope,
         state,
       }).toString()}">Try again</a></p>`,
      401
    );
  }

  const code = issueAuthCode({
    sub: expected.username,
    clientId,
    redirectUri,
    codeChallenge,
    scope,
  });

  const dest = new URL(redirectUri);
  dest.searchParams.set("code", code);
  if (state) dest.searchParams.set("state", state);
  return Response.redirect(dest.toString(), 302);
}
