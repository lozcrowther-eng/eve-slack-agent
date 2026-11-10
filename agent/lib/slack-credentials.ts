import { connectSlackCredentials } from "@vercel/connect/eve";

// SLACK_CONNECTOR is provisioned by the "Deploy with Vercel" button. To set it
// up yourself, create a connector with `vercel connect create slack --triggers`
// and put its UID in SLACK_CONNECTOR (or replace the fallback below).
export const slackCredentials = connectSlackCredentials(process.env.SLACK_CONNECTOR ?? "slack/my-agent");
