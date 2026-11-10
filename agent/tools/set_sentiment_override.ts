import { defineTool } from "eve/tools";
import { z } from "zod";

import { findDeal, getCurrentDecision, SENTIMENTS } from "../lib/deals.ts";
import { getCachedSentiment, recordSentiment, writePulseExport, type SentimentAssessment } from "../lib/pulse-export.ts";

export default defineTool({
  description:
    "Set a deal's POC sentiment colour by hand when an SE explicitly asks for it, or clear their override to go back to your computed colour. Only use it on an SE's explicit request. The override holds until the deal's decision changes or a new meeting is logged.",
  inputSchema: z.object({
    deal: z.string().min(1).describe("Deal id (e.g. harbourline-bank)."),
    sentiment: z.enum(SENTIMENTS).optional().describe("The colour the SE asked for. Omit when clearing."),
    reason: z.string().optional().describe("The SE's reason, in their words if they gave one."),
    clear: z.boolean().optional().describe("True to remove the SE override and use your computed colour again."),
  }),
  // Only a person can override: an SE in Slack, the dashboard chat, or local dev. Schedules and
  // agent-started meeting reviews run as the app principal and are refused.
  approval: ({ session }) => {
    const caller = session.auth.current;
    const person = caller?.principalType === "user" || caller?.principalType === "local-dev" || caller?.principalId.includes("project:se-sentiment-dashboard");
    return person ? "not-applicable" : { type: "denied", reason: "Only an SE can override a deal's sentiment." };
  },
  label: {
    start: ({ deal, sentiment, clear }) => (clear ? `Clear the sentiment override for ${deal}` : `Set ${deal} to ${sentiment} (SE override)`),
  },
  async execute({ deal, sentiment, reason, clear }, ctx) {
    const match = findDeal(deal);
    if (!match) throw new Error(`No deal matches "${deal}".`);
    const [decision, existing] = await Promise.all([getCurrentDecision(match), getCachedSentiment(match.id)]);
    const now = new Date().toISOString();

    if (clear) {
      if (existing?.setBy !== "se") return { cleared: false, message: "There is no SE override on this deal." };
      const computed = existing.computed;
      if (!computed) throw new Error("No computed colour is stored yet: assess the deal, then call record_sentiment.");
      await recordSentiment([
        { dealId: match.id, ...computed, basedOnDecisionAt: decision.updatedAt, previousSentiment: existing.sentiment, setBy: "agent" },
      ]);
      await writePulseExport();
      return { cleared: true, dealId: match.id, sentiment: computed.sentiment, reason: computed.reason };
    }

    if (!sentiment) throw new Error("Pass the colour the SE asked for, or clear: true.");
    const record: SentimentAssessment = {
      dealId: match.id,
      sentiment,
      reason: reason?.trim() || "Set by the SE.",
      source: "SE override",
      assessedAt: now,
      basedOnDecisionAt: decision.updatedAt,
      previousSentiment: existing?.sentiment ?? null,
      setBy: "se",
      overriddenBy: ctx.session.auth.current?.principalId ?? "unknown",
      overriddenAt: now,
      // Keep the agent's own view next to the override.
      computed:
        existing?.setBy === "se"
          ? (existing.computed ?? null)
          : existing
            ? { sentiment: existing.sentiment, reason: existing.reason, source: existing.source, assessedAt: existing.assessedAt }
            : null,
    };
    await recordSentiment([record]);
    await writePulseExport();
    return { overridden: true, dealId: match.id, sentiment, computed: record.computed };
  },
});
