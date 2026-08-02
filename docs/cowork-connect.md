# Claude Cowork connect runbook

1. Deploy with `PUBLIC_BASE_URL` and `MCP_ALLOWED_HOSTS` matching the production host.
2. Set `OAUTH_TOKEN_SECRET` (≥32 chars), `OPERATOR_USERNAME`, `OPERATOR_PASSWORD`.
3. Set `POSTGRID_API_KEY` (prefer `test_…` first) and `POSTGRID_ENVIRONMENT=test`.
4. In Cowork → Add custom connector:
   - URL: `https://<host>/api/mcp`
   - Client ID/Secret: leave blank (CIMD)
   - Individual sign-in: on
5. Connect → operator login → enable connector → `postgrid_ping`.

## Acceptance checks

- Unauthenticated MCP call → HTTP 401 with `WWW-Authenticate` containing `resource_metadata=`
- OAuth metadata documents return JSON
- Token refresh works after access token expiry (1h)
- `postgrid_list_sub_orgs` and `postgrid_schema_probe` succeed under rate limits
