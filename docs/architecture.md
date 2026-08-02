# Architecture

```text
Claude Cowork → Anthropic cloud → https://<deploy>/api/mcp
                     │
                     ├─ OAuth (this app): /.well-known/*, /authorize, /token
                     └─ Bearer access token → MCP tools
                                              ├─ PostGrid GET (allowlisted)
                                              └─ Supabase postgrid_recon.*
```

- **Compute:** synchronous Vercel Node functions only.
- **Auth:** self-hosted OAuth AS + MCP resource server on the same origin.
- **Ingest:** bounded list pagination with signed continuation tokens; Enhanced Reports can be added later behind the same tools.
- **Storage:** checkpoints, work items, and normalized mail snapshots in Supabase.
