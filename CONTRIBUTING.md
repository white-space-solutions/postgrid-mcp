# Contributing

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

MCP endpoint (local): `http://localhost:3000/api/mcp`

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Guidelines

- Keep tools read-only against PostGrid. No send/cancel/create.
- Do not add an arbitrary raw GET escape hatch.
- Do not hard-code org names, rate cards, tiers, or private contract terms.
- Prefer Enhanced Reports when available; otherwise bounded list pagination with continuation.
- Respect PostGrid GET List rate limits (10/min) via the shared Supabase throttle.
