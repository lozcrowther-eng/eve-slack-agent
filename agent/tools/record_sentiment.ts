import { defineTool } from "eve/tools";
import { z } from "zod";

import { findDeal, getCurrentDecision, SENTIMENTS } from "../lib/deals.ts";
import { listMeetings } from "../lib/meetings.ts";
import { getCachedSentiment, isActiveOverride, recordSentiment, writePulseExport, type SentimentAssessment } from "../lib/pulse-export.ts";

export default defineTool({
  description:
    "Cache the POC sentiment colours you just computed so the Deal Pulse dashboard can show them. Call it once with every deal you assessed in this turn. It does not change the forecast. A colour an SE set by hand stays in place until there is new evidence; your assessment is stored next to it.",
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
    const meetings = await listMeetings();
    const resolved = await Promise.all(
      assessments.map(async (a): Promise<{ record: SentimentAssessment; keptOverride: boolean } | null> => {
        const deal = findDeal(a.deal);
        if (!deal) return null;
        const [decision, existing] = await Promise.all([getCurrentDecision(deal), getCachedSentiment(deal.id)]);
        const computed = { sentiment: a.sentiment, reason: a.reason, source: a.source, assessedAt };
        const latestMeeting = meetings.filter((m) => m.dealId === deal.id).at(-1)?.loggedAt;
        if (existing && isActiveOverride(existing, decision.updatedAt, latestMeeting)) {
          return { record: { ...existing, computed }, keptOverride: true };
        }
        return {
          record: {
            dealId: deal.id,
            ...computed,
            basedOnDecisionAt: decision.updatedAt,
            previousSentiment: existing?.sentiment ?? null,
            setBy: "agent",
          },
          keptOverride: false,
        };
      }),
    );
    const valid = resolved.filter((r) => r !== null);
    await recordSentiment(valid.map((r) => r.record));
    await writePulseExport();
    return {
      recorded: valid.map((r) => `${r.record.dealId}: ${r.record.sentiment}${r.keptOverride ? ` (SE override kept; your assessment: ${r.record.computed?.sentiment})` : ""}`),
      unknownDeals: assessments.filter((_, i) => !resolved[i]).map((a) => a.deal),
    };
  },
});
