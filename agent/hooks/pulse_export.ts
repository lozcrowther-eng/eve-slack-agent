import { defineHook } from "eve/hooks";
import { toolResultFrom } from "eve/tools";

import { clearPendingApproval, recordPendingApproval, writePulseExport } from "../lib/pulse-export.ts";
import setTechDecision from "../tools/set_tech_decision.ts";

// Keeps exports/pulse-sample.json (the dashboard's data) in sync: pending approvals are
// tracked as they are requested and resolved, and the export is rebuilt after each change.
export default defineHook({
  events: {
    async "input.requested"(event, ctx) {
      const approvals = event.data.requests.filter(
        (request) => request.kind === "tool-approval" && request.action?.toolName === "set_tech_decision",
      );
      if (approvals.length === 0) return;

      await Promise.all(
        approvals.map((request) => {
          const proposed = (request.action?.input ?? {}) as Record<string, unknown>;
          return recordPendingApproval({
            requestId: request.requestId,
            runId: ctx.session.id,
            turnId: event.data.turnId ?? null,
            callId: request.action?.callId ?? "",
            toolName: "set_tech_decision",
            callStatus: "awaiting-approval",
            trigger: ctx.channel.kind ?? null,
            requestedBy: ctx.session.auth.current?.principalId ?? null,
            requestedAt: event.meta.at,
            dealId: typeof proposed.deal === "string" ? proposed.deal : null,
            proposed,
          });
        }),
      );
      await writePulseExport();
    },

    async "input.resolved"(event) {
      const resolved = event.data.resolutions.filter((resolution) => resolution.kind === "tool-approval");
      if (resolved.length === 0) return;
      await Promise.all(resolved.map((resolution) => clearPendingApproval(resolution.requestId)));
      await writePulseExport();
    },

    async "action.result"(event) {
      if (toolResultFrom(event.data.result, setTechDecision)) await writePulseExport();
    },
  },
});
