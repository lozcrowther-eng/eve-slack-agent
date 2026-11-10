import { defineTool } from "eve/tools";
import { z } from "zod";

import { findDeal, getCurrentDecision, SENTIMENTS } from "../lib/deals.ts";
import { getCachedSentiment, recordSentiment, writePulseExport } from "../lib/pulse-export.ts";

export default defineTool({
  description:
    "Cache the POC sentiment colours you just computed so the Deal Pulse dashboard can show them. Call it once with every deal you assessed in this turn. It does not change the forecast.",
  inputSchema: z.object({
    assessments: z
      .array(
        z.object({
          deal: z.string().min(1).describe("Deal id (e.g. kestrel-travel)."),
          sentiment: z.enum(SENTIMENTS),
          reason: z.string().min(1).describe("One sentence: the gap and workaround, the blocker, or why it is clean."),
          source: z.string().min(1).describe('Where it came from, e.g. "call notes 2026-11-04", "deal record", "SA update".'),
        }),
      )
      .min(1),
  }),
  label: {
    start: ({ assessments }) => `Record POC sentiment for ${assessments.length === 1 ? assessments[0].deal : `${assessments.length} deals`}`,
  },
  async execute({ assessments }) {
    const assessedAt = new Date().toISOString();
    const resolved = await Promise.all(
      assessments.map(async (a) => {
        const deal = findDeal(a.deal);
        if (!deal) return null;
        const [decision, previous] = await Promise.all([getCurrentDecision(deal), getCachedSentiment(deal.id)]);
        return {
          dealId: deal.id,
          sentiment: a.sentiment,
          reason: a.reason,
          source: a.source,
          assessedAt,
          basedOnDecisionAt: decision.updatedAt,
          previousSentiment: previous?.sentiment ?? null,
        };
      }),
    );
    const valid = resolved.filter((a) => a !== null);
    await recordSentiment(valid);
    await writePulseExport();
    return { recorded: valid.map((a) => `${a.dealId}: ${a.sentiment}`), unknownDeals: assessments.filter((_, i) => !resolved[i]).map((a) => a.deal) };
  },
});
