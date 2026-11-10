import { defineHook } from "eve/hooks";

// One "[pulse]" log line per agent step, so runtime logs show what the agent is doing within
// seconds (Agent Runs lags because traces are exported and processed after the work).
// Tail them with `node scripts/tail-logs.mjs`. Content is left out when
// RECORD_AGENT_CONTENT=false.
const withContent = process.env.RECORD_AGENT_CONTENT !== "false";
const clip = (value: unknown, n = 240) => {
  if (!withContent) return undefined;
  const text = (typeof value === "string" ? value : JSON.stringify(value) ?? "").replace(/\s+/g, " ").trim();
  return text.length > n ? `${text.slice(0, n)}…` : text;
};

function log(kind: string, sessionId: string, channel: string | undefined, fields: Record<string, unknown>) {
  console.info(`[pulse] ${JSON.stringify({ kind, session: sessionId, channel, ...fields })}`);
}

export default defineHook({
  events: {
    "message.received"(event, ctx) {
      log("message", ctx.session.id, ctx.channel.kind, { text: clip(event.data.message) });
    },
    "actions.requested"(event, ctx) {
      for (const action of event.data.actions) {
        log("tool.call", ctx.session.id, ctx.channel.kind, { tool: "toolName" in action ? action.toolName : action.kind, input: clip(action.input, 300) });
      }
    },
    "action.result"(event, ctx) {
      const result = event.data.result as { toolName?: string; output?: unknown; isError?: boolean };
      log("tool.result", ctx.session.id, ctx.channel.kind, { tool: result.toolName, error: result.isError || undefined, output: clip(result.output, 200) });
    },
    "input.requested"(event, ctx) {
      for (const request of event.data.requests) {
        log("approval.requested", ctx.session.id, ctx.channel.kind, { kind: request.kind, tool: request.action?.toolName, prompt: request.prompt });
      }
    },
    "input.resolved"(event, ctx) {
      for (const resolution of event.data.resolutions) {
        log("approval.resolved", ctx.session.id, ctx.channel.kind, { outcome: resolution.outcome });
      }
    },
    "message.completed"(event, ctx) {
      if (event.data.finishReason === "tool-calls" && !event.data.message?.trim()) return;
      log(event.data.finishReason === "tool-calls" ? "narration" : "reply", ctx.session.id, ctx.channel.kind, { text: clip(event.data.message, 400) });
    },
    "turn.completed"(_event, ctx) {
      log("turn.completed", ctx.session.id, ctx.channel.kind, {});
    },
    "turn.failed"(event, ctx) {
      log("turn.failed", ctx.session.id, ctx.channel.kind, { code: event.data.code, error: event.data.message });
    },
  },
});
