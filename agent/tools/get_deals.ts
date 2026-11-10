import { defineTool } from "eve/tools";
import { z } from "zod";

import { deals, getCurrentDecision, getTranscript, TECH_STATUSES } from "../lib/deals.ts";
import { listMeetings } from "../lib/meetings.ts";
import { getCachedSentiment } from "../lib/pulse-export.ts";

export default defineTool({
  description:
    "List APJ deals with their current technical-decision forecast (Win / Loss / Undecided), confidence, evidence and next step. Filter by region, competitor, status, SA, or a deal id / account name.",
  inputSchema: z.object({
    deal: z.string().optional().describe("Deal id (e.g. kestrel-travel) or part of the account name."),
    region: z.enum(["ANZ", "Singapore", "India", "Japan"]).optional(),
    competitor: z.enum(["AWS Amplify", "Netlify", "build on AWS"]).optional(),
    status: z.enum(TECH_STATUSES).optional(),
    sa: z.string().optional().describe("Solutions Architect name, or part of it."),
  }),
  label: {
    start: ({ deal, region, status }) => `Look up ${deal || [region, status].filter(Boolean).join(" ") || "all"} deals`,
  },
  async execute({ deal, region, competitor, status, sa }) {
    const needle = deal?.trim().toLowerCase();
    const matches = deals.filter(
      (d) =>
        (!needle || d.id === needle || d.account.toLowerCase().includes(needle)) &&
        (!region || d.region === region) &&
        (!competitor || d.competitor === competitor) &&
        (!sa || d.sa.toLowerCase().includes(sa.toLowerCase())),
    );

    const dealsWithMeetings = new Set((await listMeetings()).map((m) => m.dealId));
    const withDecisions = await Promise.all(
      matches.map(async (d) => {
        const { baseline: _baseline, ...rest } = d;
        return {
          ...rest,
          hasCallNotes: getTranscript(d.id) !== undefined || dealsWithMeetings.has(d.id),
          techDecision: await getCurrentDecision(d),
          // The last colour you recorded; a cache, so recompute it from the sources when reporting.
          lastRecordedSentiment: await getCachedSentiment(d.id),
        };
      }),
    );

    const filtered = status ? withDecisions.filter((d) => d.techDecision.status === status) : withDecisions;
    return { count: filtered.length, deals: filtered };
  },
});
