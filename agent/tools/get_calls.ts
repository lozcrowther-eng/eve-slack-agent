import { defineTool } from "eve/tools";
import { z } from "zod";

import { findDeal, getTranscript } from "../lib/deals.ts";

export default defineTool({
  description:
    "Get the technical call notes for a deal (attendees, buying signals, risks, next steps). Use before proposing a change to a deal's technical decision.",
  inputSchema: z.object({
    deal: z.string().min(1).describe("Deal id (e.g. kestrel-travel) or part of the account name."),
  }),
  label: { start: ({ deal }) => `Read call notes for ${deal}` },
  async execute({ deal }) {
    const match = findDeal(deal);
    if (!match) return { found: false, message: `No deal matches "${deal}".` };
    const notes = getTranscript(match.id);
    return notes
      ? { found: true, dealId: match.id, account: match.account, notes }
      : { found: true, dealId: match.id, account: match.account, notes: null, message: "No call notes on file for this deal." };
  },
});
