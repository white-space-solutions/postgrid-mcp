import { z } from "zod";

export const COLLATERAL = [
  "letters",
  "postcards",
  "self_mailers",
  "snap_packs",
  "cheques",
  "boxes",
] as const;

export type Collateral = (typeof COLLATERAL)[number];

export const listEnvelopeSchema = z.object({
  object: z.string().optional(),
  data: z.array(z.record(z.string(), z.unknown())),
  totalCount: z.number().int().nonnegative().optional(),
  skip: z.number().int().optional(),
  limit: z.number().int().optional(),
});

export type ListEnvelope = z.infer<typeof listEnvelopeSchema>;

export const PRICING_FIELDS = [
  "size",
  "mailingClass",
  "color",
  "doubleSided",
  "express",
  "pageCount",
  "status",
] as const;

export function normalizeMailPiece(raw: Record<string, unknown>) {
  return {
    piece_id: String(raw.id ?? ""),
    send_date: (raw.sendDate as string | null | undefined) ?? null,
    created_at: (raw.createdAt as string | null | undefined) ?? null,
    status: (raw.status as string | null | undefined) ?? null,
    size: (raw.size as string | null | undefined) ?? null,
    mailing_class: (raw.mailingClass as string | null | undefined) ?? null,
    color: typeof raw.color === "boolean" ? raw.color : null,
    double_sided: typeof raw.doubleSided === "boolean" ? raw.doubleSided : null,
    express: typeof raw.express === "boolean" ? raw.express : null,
    page_count: typeof raw.pageCount === "number" ? raw.pageCount : null,
    description:
      typeof raw.description === "string"
        ? raw.description.slice(0, 500)
        : null,
  };
}
