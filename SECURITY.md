# Security Policy

## Scope

This project is a read-only PostGrid reconciliation MCP. It holds a PostGrid API key server-side and exposes OAuth-gated tools that sync mail volume into Supabase.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository, or email the maintainer listed in the repository. Do not file public issues that include secrets, PostGrid keys, or sample production payloads with PII.

## Operator responsibilities

- Deploy as a single-tenant instance. Do not share one deployment across untrusted organizations.
- Store `POSTGRID_API_KEY`, `OAUTH_TOKEN_SECRET`, `OPERATOR_PASSWORD`, and Supabase service-role keys only in the host secret store (e.g. Vercel Environment Variables).
- Prefer PostGrid **test** keys until Cowork OAuth and sync canaries pass.
- Rotate `OAUTH_TOKEN_SECRET` and operator credentials if a connector URL or token is exposed.
- Restrict production Host allowlists via `MCP_ALLOWED_HOSTS`.
- Never commit `.env`, rate cards, invoices, or customer mail content.

## Data handling

- Signed preview/export URLs are redacted before logging or snapshot persistence.
- Continuation tokens are HMAC-signed, filter-bound, and short-lived.
- Do not put secrets in the Cowork connector URL query string.
