import { defineTool } from "eve/tools";
import { z } from "zod";

import { findDeal, getTranscript } from "../lib/deals.ts";
import { formatMeeting, listMeetings } from "../lib/meetings.ts";

export default defineTool({
  description:
    "Get the technical call notes for a deal (attendees, buying signals, risks, next steps), oldest first, including meetings logged since the original notes. Use before proposing a change to a deal's technical decision.",
  inputSchema: z.object({
    deal: z.string().min(1).describe("Deal id (e.g. kestrel-travel) or part of the account name."),
  }),
  label: { start: ({ deal }) => `Read call notes for ${deal}` },
  async execute({ deal }) {
    const match = findDeal(deal);
    if (!match) return { found: false, message: `No deal matches "${deal}".` };
    const logged = await listMeetings(match.id);
    const notes = [getTranscript(match.id), ...logged.map(formatMeeting)].filter(Boolean).join("\n");
    return notes
      ? { found: true, dealId: match.id, account: match.account, notes, latestMeeting: logged.at(-1)?.meetingDate ?? null }
      : { found: true, dealId: match.id, account: match.account, notes: null, message: "No call notes on file for this deal." };
  },
});
