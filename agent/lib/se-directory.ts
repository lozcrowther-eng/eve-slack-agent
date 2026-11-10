import type { SessionAuthContext } from "eve/context";

import type { Deal } from "./deals.ts";

// The demo SEs are fictional, so every SE maps to one Slack user in the Deal Pulse Demo
// workspace (override with DEMO_SE_SLACK_USER_ID). Replace with a real name -> Slack user
// map to route DMs to each SE.
const SLACK_TEAM_ID = process.env.SLACK_TEAM_ID ?? "T0CGTHTJVLG";
const DEMO_SE_SLACK_USER_ID = process.env.DEMO_SE_SLACK_USER_ID ?? "U0CFZ1ET466";

export function seSlackUserId(_deal: Deal): string {
  return DEMO_SE_SLACK_USER_ID;
}

/** True when a principal is the deal's SE as authenticated by the Slack channel. */
export function isDealSe(principal: SessionAuthContext | null | undefined, deal: Deal): boolean {
  return principal?.principalId === `slack:${SLACK_TEAM_ID}:${seSlackUserId(deal)}`;
}
