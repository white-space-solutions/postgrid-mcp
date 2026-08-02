# PostGrid MCP

Standalone Vercel-native [Model Context Protocol](https://modelcontextprotocol.io) server for **read-only PostGrid Print & Mail** access. It exposes a small set of constrained tools over PostGrid's live API. No database, no external services beyond PostGrid itself.

Designed for **Claude Cowork** custom connectors (OAuth Individual sign-in).

## What this is (and is not)

| This MCP | PostGrid hosted MCP (`postgrid.readme.io/mcp`) |
| --- | --- |
| Constrained read-only tools | Arbitrary API executor |
| Server-held PostGrid key + Cowork OAuth | Pass-your-key patterns |

**Non-goals (v1):** send/cancel mail, Address Verification, arbitrary raw GET, pricing/commission logic, data persistence.

## Tools

- `postgrid_ping`
- `postgrid_list_sub_orgs`
- `postgrid_schema_probe`

## Quick start (local)

```bash
npm install
cp .env.example .env.local
# fill OAUTH_TOKEN_SECRET, OPERATOR_PASSWORD, POSTGRID_API_KEY
npm run dev
```

- App: `http://localhost:3000`
- MCP: `http://localhost:3000/api/mcp`

## Claude Cowork connect

1. Deploy to Vercel and set env vars from `.env.example` (`PUBLIC_BASE_URL`, `MCP_ALLOWED_HOSTS`, secrets).
2. In Claude Cowork: **Settings → Connectors → Add custom connector**
3. **Remote MCP server URL:** `https://<your-deployment>/api/mcp`
4. Leave OAuth Client ID / Secret blank (CIMD). Enable **Individual sign-in**.
5. Click **Connect** → sign in with `OPERATOR_USERNAME` / `OPERATOR_PASSWORD`.
6. Enable the connector in a Cowork conversation and run `postgrid_ping`.

Callback used by Claude: `https://claude.ai/api/mcp/auth_callback`.

## Security

- OAuth access tokens are HMAC-signed; MCP route returns `401` + `WWW-Authenticate` when unauthenticated.
- PostGrid key never leaves the server.
- Sub-org impersonation can be constrained with `POSTGRID_ALLOWED_ORG_IDS`.
- Signed URLs are redacted before responses/logs.
- PostGrid list calls are throttled in-process (about 10/min per instance) to respect PostGrid's GET List rate limit.

See [SECURITY.md](SECURITY.md).

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run lint
```

## License

MIT (see [LICENSE](LICENSE)). Keep private rate cards and customer data out of this repository.
