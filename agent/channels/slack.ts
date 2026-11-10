import { defineSlackRenderer, slackChannel } from "eve/channels/slack";

import { findDeal, getCurrentDecision } from "../lib/deals.ts";
import { getCachedSentiment } from "../lib/pulse-export.ts";
import { slackCredentials } from "../lib/slack-credentials.ts";

const DOT = { Green: "🟢", Yellow: "🟡", Red: "🔴" } as const;

// Deal Pulse's Slack presentation:
// - Text the agent writes before proposing a change (e.g. a meeting review) is narration, which
//   eve does not post by default; post it so the SE sees the summary above the approval.
// - Show set_tech_decision proposals as a readable card above eve's Approve / Cancel controls.
const dealPulse = defineSlackRenderer({
  events: {
    async "message.completed"(event, channel, _ctx, next) {
      if (event.finishReason === "tool-calls" && event.message?.trim()) {
        await channel.thread.post({ markdown: event.message });
      }
      await next();
    },

    async "input.requested"(event, channel, _ctx, next) {
      for (const request of event.requests) {
        if (request.kind !== "tool-approval" || request.action?.toolName !== "set_tech_decision") continue;
        const input = (request.action.input ?? {}) as { deal?: string; status?: string; confidence?: number; evidence?: string[]; nextStep?: string };
        const deal = input.deal ? findDeal(input.deal) : undefined;
        if (!deal) continue;
        try {
          const [current, sentiment] = await Promise.all([getCurrentDecision(deal), getCachedSentiment(deal.id)]);
          const sentimentLine = sentiment
            ? `*Sentiment:* ${sentiment.previousSentiment && sentiment.previousSentiment !== sentiment.sentiment ? `${DOT[sentiment.previousSentiment]} ${sentiment.previousSentiment} → ` : ""}${DOT[sentiment.sentiment]} ${sentiment.sentiment}: ${sentiment.reason}`
            : null;
          const lines = [
            `*Proposed change: ${deal.account}*`,
            `*Status:* ${current.status} → ${input.status}   *Confidence:* ${current.confidence}% → ${input.confidence}%`,
            sentimentLine,
            ...(input.evidence ?? []).map((item) => `• ${item}`),
            input.nextStep ? `*Next step:* ${input.nextStep}` : null,
          ].filter(Boolean);
          await channel.thread.post({
            blocks: [{ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } }],
            text: `Proposed change for ${deal.account}: ${input.status} (${input.confidence}%)`,
          });
        } catch (error) {
          console.error("[slack] could not post the proposal summary", error);
        }
      }
      await next();
    },
  },
});

export default slackChannel({
  credentials: slackCredentials,
  renderers: [dealPulse],
});
