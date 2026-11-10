// Tail production Agent Runs: new sessions, status changes, each message, each tool call
// (input, output, duration), per-turn tokens and cost, and the runtime error behind a failure.
// Uses the Vercel CLI's login (vercel agent-runs / vercel logs).
//
// Usage: node scripts/tail-runs.mjs [--interval 5] [--since 15m] [--full]
//   --full  print messages and tool payloads without truncating them
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const SCOPE = "lawrencecrowther-5014";
const PROJECT = "eve-slack-agent";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const intervalMs = Number(arg("interval", "5")) * 1000;
const since = arg("since", "15m");
const full = process.argv.includes("--full");

const c = { dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", reset: "\x1b[0m" };
const paint = (color, text) => (process.stdout.isTTY ? `${c[color]}${text}${c.reset}` : text);

async function vercel(args) {
  const { stdout } = await exec("vercel", ["--scope", SCOPE, ...args, "--project", PROJECT, "--json"], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}
const vercelJson = async (args) => JSON.parse(await vercel(args));

const time = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-AU", { hour12: false }) : "--:--:--");
const ms = (a, b) => (a && b ? `${((Date.parse(b) - Date.parse(a)) / 1000).toFixed(1)}s` : "");
const text = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return JSON.stringify(value);
  try {
    return JSON.stringify(JSON.parse(value)); // compact JSON strings
  } catch {
    return value;
  }
};
const clip = (value, n) => {
  const t = text(value).replace(/\s+/g, " ").trim();
  return full || t.length <= n ? t : `${t.slice(0, n)}…`;
};
const userText = (content) => /<content>([\s\S]*?)<\/content>/.exec(content ?? "")?.[1] ?? content;
const statusColor = (s) => (s === "failed" ? "red" : s === "completed" ? "green" : s === "waiting" ? "yellow" : "cyan");

const runs = new Map(); // runId -> { status, updatedAt }
const seen = new Set(); // ids already printed

async function printTrace(runId) {
  const { trace, meta } = await vercelJson(["agent-runs", "trace", runId, "--since", "1d"]);
  let hidden = Boolean(meta?.contentOmitted);
  for (const turn of trace?.eve?.turns ?? []) {
    const items = [];
    for (const m of turn.messages ?? []) {
      if (m.role === "system") continue;
      if (m.content === undefined || m.content === null || m.content === "") hidden = true;
      const body = m.role === "user" ? userText(m.content) : m.content;
      items.push({ id: `m:${m.id}`, at: m.createdAt, line: m.role === "user" ? `  ${paint("bold", "←")} ${clip(body, 300)}` : `  ${paint("bold", "→")} ${clip(body, 600)}` });
    }
    for (const call of turn.toolCalls ?? []) {
      if (call.input === undefined && call.output === undefined) hidden = true;
      const head = `  ⚙ ${paint("cyan", call.name)} ${paint(statusColor(call.status), `[${call.status}]`)} ${paint("dim", ms(call.startedAt, call.completedAt))}`;
      const io = [call.input !== undefined ? `\n      in:  ${clip(call.input, 220)}` : "", call.output !== undefined ? `\n      out: ${clip(call.output, 260)}` : ""].join("");
      items.push({ id: `t:${call.id}:${call.status}`, at: call.startedAt, line: head + io });
    }
    items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      console.log(item.line);
    }
    const doneKey = `turn:${runId}:${turn.id}:${turn.status}`;
    if (turn.status !== "running" && !seen.has(doneKey)) {
      seen.add(doneKey);
      const u = turn.usage ?? {};
      const cost = turn.costUsd ?? u.costUsd;
      console.log(
        paint("dim", `  ${turn.id} ${turn.status} · ${ms(turn.startedAt, turn.completedAt)} · ${u.totalTokens ?? "?"} tokens${cost !== undefined ? ` · $${Number(cost).toFixed(4)}` : ""}`),
      );
    }
  }
  if (hidden && !seen.has(`hidden:${runId}`)) {
    seen.add(`hidden:${runId}`);
    console.log(paint("dim", "  (content hidden: private session, e.g. a Slack DM a person started)"));
  }
}

async function printErrors(runId) {
  // Hobby keeps runtime logs ~30 minutes.
  const out = await vercel(["logs", "-e", "production", "--since", "30m", "-n", "1000"]).catch(() => "");
  for (const line of out.split("\n")) {
    if (!line.includes(runId)) continue;
    const entry = JSON.parse(line);
    if (entry.type !== "log" || !["error", "warning", "warn"].includes(entry.data.level)) continue;
    console.log(`  ${paint("red", "✖")} ${clip(entry.data.message, full ? Infinity : 500)}`);
  }
}

async function poll(first) {
  const { runs: list } = await vercelJson(["agent-runs", "list", "--since", since, "--limit", "50"]);
  for (const r of [...list].reverse()) {
    const prev = runs.get(r.id);
    if (prev && prev.status === r.status && prev.updatedAt === r.updatedAt) continue;
    runs.set(r.id, { status: r.status, updatedAt: r.updatedAt });
    const change = prev && prev.status !== r.status ? `${prev.status} → ${r.status}` : r.status;
    const label = `${time(r.updatedAt ?? r.createdAt)} ${r.id} ${r.trigger?.label ?? r.trigger?.type ?? "?"} ${paint(statusColor(r.status), change)}`;
    console.log(first ? label : `\n${label}`);
    await printTrace(r.id).catch((e) => console.log(paint("dim", `  (trace not ready: ${e.message.split("\n")[0]})`)));
    if (r.status === "failed" && !seen.has(`errors:${r.id}`)) {
      seen.add(`errors:${r.id}`);
      await printErrors(r.id);
    }
  }
}

console.log(`Tailing Agent Runs for ${PROJECT} (every ${intervalMs / 1000}s${full ? ", full output" : ""}, Ctrl+C to stop)…`);
await poll(true);
for (;;) {
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  await poll(false).catch((e) => console.error(`poll failed: ${e.message.split("\n")[0]}`));
}
