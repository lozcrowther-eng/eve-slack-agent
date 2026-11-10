import type { SessionAuthContext } from "eve/context";
import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { findDeal, getCurrentDecision, saveDecision, TECH_STATUSES } from "../lib/deals.ts";
import { isDealSe } from "../lib/se-directory.ts";

function samePrincipal(a: SessionAuthContext, b: SessionAuthContext): boolean {
  return a.authenticator === b.authenticator && a.issuer === b.issuer && a.principalType === b.principalType && a.principalId === b.principalId;
}

export default defineTool({
  description:
    "Record a deal's technical-decision forecast (Win / Loss / Undecided) with confidence, the top 3 evidence points and the next step. Requires human approval before it is saved.",
  inputSchema: z.object({
    deal: z.string().min(1).describe("Deal id (e.g. kestrel-travel)."),
    status: z.enum(TECH_STATUSES),
    confidence: z.number().int().min(0).max(100).describe("0-100 confidence in the status."),
    evidence: z
      .array(z.string().min(1))
      .length(3)
      .describe("Exactly 3 evidence points, strongest first, grounded in the SA update or call notes."),
    nextStep: z.string().min(1).describe("The single most important next step, with an owner and date if known."),
  }),
  approval: {
    request: always(),
    // Whoever asked for the change can settle it (the SA in Slack, or the dashboard chat), and
    // so can the deal's SE: meeting reviews are started by the agent and DM'd to the SE.
    response: ({ request, response }) => {
      const deal = findDeal(String(request.toolInput?.deal ?? ""));
      const isRequester = request.principal !== null && samePrincipal(response.principal, request.principal);
      return isRequester || (deal !== undefined && isDealSe(response.principal, deal))
        ? { status: "allowed" }
        : { status: "rejected", reason: "Only the deal's SE or the person who asked for this change can approve it." };
    },
  },
  label: {
    start: ({ deal, status, confidence }) => `Set ${deal} to ${status} (${confidence}% confidence)`,
  },
  async execute({ deal, status, confidence, evidence, nextStep }, ctx) {
    const match = findDeal(deal);
    if (!match) throw new Error(`No deal matches "${deal}". Call get_deals to find the deal id.`);

    const previous = await getCurrentDecision(match);
    const decision = {
      status,
      confidence,
      evidence,
      nextStep,
      updatedAt: new Date().toISOString(),
      updatedBy: ctx.session.auth.current?.principalId ?? "unknown",
    };
    await saveDecision(match, decision);

    return {
      saved: true,
      dealId: match.id,
      account: match.account,
      previous: { status: previous.status, confidence: previous.confidence },
      current: decision,
    };
  },
});
