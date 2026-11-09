import { defineSchedule } from "eve/schedules";

import slack from "../channels/slack.ts";

// #tech-forecast-channel in the Deal Pulse Demo workspace.
const TECH_FORECAST_CHANNEL_ID = process.env.TECH_FORECAST_CHANNEL_ID ?? "C0CG2THD9SQ";

export default defineSchedule({
  // Mondays 08:00 Sydney time during daylight saving (AEDT, UTC+11). Vercel cron runs in UTC,
  // so this lands at 07:00 Sydney once daylight saving ends (AEST, UTC+10).
  cron: "0 21 * * 0",
  async run({ to, waitUntil, appAuth }) {
    waitUntil(
      to(slack, { channelId: TECH_FORECAST_CHANNEL_ID }).send(
        "Post the weekly technical-decision forecast digest for the APJ SA team.",
        { auth: appAuth },
      ),
    );
  },
});
