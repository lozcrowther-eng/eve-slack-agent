import type { ChannelAudience } from "eve/channels";

// Agent Runs records session content (messages, tool inputs and outputs) only for "public"
// sessions; private ones show metadata only. Deal Pulse runs on mock demo data, so dashboard
// sessions and agent-started Slack posts are recorded. Set RECORD_AGENT_CONTENT=false to keep
// them private. This affects observability only, not who can reach the agent.
// (Slack DMs a person starts are always private; the Slack channel classifies those itself.)
export const recordedAudience: ChannelAudience = process.env.RECORD_AGENT_CONTENT === "false" ? "private" : "public";
