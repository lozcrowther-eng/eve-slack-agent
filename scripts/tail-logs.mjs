// Near-real-time view of the production agent: prints the "[pulse]" step lines written by
// agent/hooks/live_log.ts, plus any runtime errors, a second or two after they happen.
// (Agent Runs has the full detail but lags: use scripts/tail-runs.mjs for that.)
//
// Usage: node scripts/tail-logs.mjs [--interval 2] [--since 5m]
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const exec = promisify(execFile);
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const intervalMs = Number(arg("interval", "2")) * 1000;
const tty = process.stdout.isTTY;
const color = (code, text) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text);
const KIND_COLOR = { message: "1", reply: "32", narration: "2", "tool.call": "36", "tool.result": "2", "approval.requested": "33", "approval.resolved": "33", "turn.completed": "2", "turn.failed": "31" };

const seen = new Set();
let since = arg("since", "5m");

function describe(entry) {
  const { kind, session, channel, ...fields } = entry;
  const who = color("2", `${session?.slice(-8) ?? "?"} ${channel ?? ""}`.trim());
  const body = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => (k === "text" || k === "output" || k === "input" ? String(v) : `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`))
    .join(" ");
  return `${who} ${color(KIND_COLOR[kind] ?? "0", kind.padEnd(18))} ${body}`;
}

async function poll() {
  const started = new Date();
  const { stdout } = await exec(
    "vercel",
    ["logs", "--project", "eve-slack-agent", "-e", "production", "--since", since, "-n", "1000", "--json"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const lines = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (record.type !== "log") continue;
    const { timestamp, message, level } = record.data;
    const key = createHash("sha1").update(`${timestamp}|${message}`).digest("hex");
    if (seen.has(key)) continue;
    seen.add(key);
    const time = new Date(timestamp).toLocaleTimeString("en-AU", { hour12: false });
    const pulse = /\[pulse\] (\{.*\})/s.exec(message ?? "");
    if (pulse) lines.push([timestamp, `${time} ${describe(JSON.parse(pulse[1]))}`]);
    else if (level === "error" && !/reasoning parts/.test(message)) lines.push([timestamp, `${time} ${color("31", "ERROR")} ${String(message).replace(/\s+/g, " ").slice(0, 400)}`]);
  }
  for (const [, text] of lines.sort((a, b) => a[0].localeCompare(b[0]))) console.log(text);
  // Re-read a small overlap so late-arriving lines aren't missed; `seen` drops duplicates.
  since = new Date(started.getTime() - 15_000).toISOString();
}

console.log(`Tailing production agent logs every ${intervalMs / 1000}s (Ctrl+C to stop)…`);
for (;;) {
  await poll().catch((e) => console.error(color("31", `poll failed: ${e.message.split("\n")[0]}`)));
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
