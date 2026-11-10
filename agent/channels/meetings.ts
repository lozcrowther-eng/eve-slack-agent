import { defineChannel, POST } from "eve/channels";
import { localDev, routeAuth, vercelOidc, vercelSubject } from "eve/channels/auth";
import { callSlackApi } from "eve/channels/slack";

import { findDeal } from "../lib/deals.ts";
import { saveMeeting } from "../lib/meetings.ts";
import { writePulseExport } from "../lib/pulse-export.ts";
import { seSlackUserId } from "../lib/se-directory.ts";
import { slackCredentials } from "../lib/slack-credentials.ts";
import slack from "./slack.ts";

const MAX_NOTES = 20_000;

// POST /deal-pulse/meetings: the dashboard logs a meeting's notes. The agent then reviews the
// deal in a Slack DM with its SE and proposes any change through the approval step.
export default defineChannel({
  routes: [
    POST("/deal-pulse/meetings", async (request, ctx) => {
      const auth = await routeAuth(request, [
        vercelOidc({ subjects: [vercelSubject({ teamSlug: "lawrencecrowther-5014", projectName: "se-sentiment-dashboard" })] }),
        localDev(),
      ]);
      if (auth instanceof Response) return auth;

      const body = (await request.json().catch(() => null)) as { dealId?: unknown; meetingDate?: unknown; notes?: unknown } | null;
      const deal = typeof body?.dealId === "string" ? findDeal(body.dealId) : undefined;
      const meetingDate = typeof body?.meetingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.meetingDate) ? body.meetingDate : null;
      const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
      if (!deal || deal.id !== body?.dealId) return Response.json({ error: "Unknown deal." }, { status: 400 });
      if (!meetingDate) return Response.json({ error: "meetingDate must be YYYY-MM-DD." }, { status: 400 });
      if (!notes || notes.length > MAX_NOTES) return Response.json({ error: `Notes must be 1-${MAX_NOTES} characters.` }, { status: 400 });

      await saveMeeting({ dealId: deal.id, meetingDate, notes, loggedAt: new Date().toISOString(), loggedBy: auth.principalId });
      await writePulseExport();

      const seUserId = seSlackUserId(deal);
      const dm = await callSlackApi({ botToken: slackCredentials.botToken, operation: "conversations.open", body: { users: seUserId } });
      const channelId = (dm as { channel?: { id?: string } }).channel?.id;
      if (!dm.ok || !channelId) {
        console.error("[meetings] could not open a DM with the SE", { error: dm.error, dealId: deal.id });
        return Response.json({ error: "Saved the notes, but could not open a Slack DM with the SE." }, { status: 502 });
      }

      ctx.waitUntil(
        ctx.to(slack, { channelId }).send(
          `New meeting notes were logged for ${deal.account} (deal ${deal.id}), from a meeting on ${meetingDate}. ` +
            `You are in a DM with the deal's SE (${deal.sa}). Review the deal following "When new meeting notes are logged".`,
          { auth },
        ),
      );
      return Response.json({ ok: true, dealId: deal.id, se: deal.sa }, { status: 202 });
    }),
  ],
});
