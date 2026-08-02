import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { pgListPage } from "@/lib/postgrid/client";
import { COLLATERAL, PRICING_FIELDS } from "@/lib/postgrid/schemas";
import { postgridConfig } from "@/lib/env";

const ok = (o: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(o, null, 2) }],
});
const fail = (m: string) => ({
  content: [{ type: "text" as const, text: `ERROR: ${m}` }],
  isError: true,
});

export function registerTools(server: McpServer) {
  server.registerTool(
    "postgrid_ping",
    {
      title: "PostGrid Ping",
      description:
        "Verify the server-held PostGrid API key works and report sub-organization visibility. Run this first.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { environment } = postgridConfig();
        const r = await pgListPage("/sub_organizations", {
          skip: 0,
          limit: 1,
        });
        return ok({
          reachable: true,
          environment,
          sub_org_total: r.totalCount ?? r.data.length,
          note: "Key is valid and sub-organizations are visible.",
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "postgrid_list_sub_orgs",
    {
      title: "List Sub-Organizations",
      description: "List child partner organizations.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const page = await pgListPage("/sub_organizations", {
          skip: 0,
          limit: 100,
        });
        const orgs = page.data.map((o) => ({
          id: String(o.id),
          name: (o.name ?? o.companyName ?? null) as string | null,
          createdAt: (o.createdAt ?? null) as string | null,
        }));

        return ok({
          count: orgs.length,
          totalCount: page.totalCount ?? orgs.length,
          truncated: (page.totalCount ?? orgs.length) > orgs.length,
          sub_orgs: orgs,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "postgrid_schema_probe",
    {
      title: "Schema Probe",
      description:
        "Sample pricing-relevant field value coverage across collateral types. Use before trusting match rules.",
      inputSchema: z.object({
        sample_per_endpoint: z.number().int().min(20).max(500).default(100),
        only_org: z.string().optional(),
      }),
    },
    async ({ sample_per_endpoint, only_org }) => {
      try {
        let orgIds: string[];
        if (only_org) {
          orgIds = [only_org];
        } else {
          const orgs = await pgListPage("/sub_organizations", {
            skip: 0,
            limit: 5,
          });
          orgIds = ["parent", ...orgs.data.slice(0, 3).map((o) => String(o.id))];
        }

        const counts: Record<string, Record<string, number>> = {};
        for (const org of orgIds) {
          for (const ctype of COLLATERAL) {
            const page = await pgListPage(`/${ctype}`, {
              org,
              skip: 0,
              limit: Math.min(sample_per_endpoint, 100),
            });
            for (const r of page.data) {
              for (const f of PRICING_FIELDS) {
                const k = `${ctype}.${f}`;
                const v = JSON.stringify(r[f] ?? null);
                counts[k] ??= {};
                counts[k][v] = (counts[k][v] ?? 0) + 1;
              }
            }
          }
        }
        return ok({
          orgs_sampled: orgIds.length,
          distinct_values: counts,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
