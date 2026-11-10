// Tail production Agent Runs: print new sessions, status changes, and each new message and
// tool call as it appears. Uses the Vercel CLI's login (vercel agent-runs).
//
// Usage: node scripts/tail-runs.mjs [--interval 5] [--since 15m]
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCOPE = "lawrencecrowther-5014";
const PROJECT = "eve-slack-agent";
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const intervalMs = Number(arg("interval", "5")) * 1000;
const since = arg("since", "15m");

async function vercel(args) {
  const { stdout } = await run("vercel", ["--scope", SCOPE, ...args, "--project", PROJECT, "--json"], { maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(stdout);
}

const time = (iso) => new Date(iso).toLocaleTimeString("en-AU", { hour12: false });
const clip = (value, n = 160) => {
  const text = (typeof value === "string" ? value : JSON.stringify(value) ?? "").replace(/\s+/g, " ").trim();
  return text.length > n ? `${text.slice(0, n)}…` : text;
};
const userText = (content) => clip(/<content>([\s\S]*?)<\/content>/.exec(content ?? "")?.[1] ?? content);

const runs = new Map(); // runId -> { status, updatedAt }
const seen = new Set(); // message / tool-call ids already printed

async function printTrace(runId) {
  const { trace } = await vercel(["agent-runs", "trace", runId, "--since", "1d"]);
  for (const turn of trace?.eve?.turns ?? []) {
    const items = [
      ...(turn.messages ?? []).filter((m) => m.role !== "system").map((m) => ({ id: `m:${m.id}`, at: m.createdAt, line: m.role === "user" ? `  ← ${userText(m.content)}` : `  → ${clip(m.content)}` })),
      ...(turn.toolCalls ?? []).map((c) => ({ id: `t:${c.id}:${c.status}`, at: c.startedAt, line: `  ⚙ ${c.name} [${c.status}] ${clip(c.input, 120)}` })),
    ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      console.log(item.line);
    }
  }
}

async function poll(first) {
  const { runs: list } = await vercel(["agent-runs", "list", "--since", since, "--limit", "50"]);
  for (const r of [...list].reverse()) {
    const prev = runs.get(r.id);
    if (prev && prev.status === r.status && prev.updatedAt === r.updatedAt) continue;
    runs.set(r.id, { status: r.status, updatedAt: r.updatedAt });
    const label = `${time(r.updatedAt ?? r.createdAt)} ${r.id} ${r.trigger?.label ?? r.trigger?.type ?? "?"} ${prev ? `${prev.status} → ${r.status}` : r.status}`;
    console.log(first ? label : `\n${label}`);
    if (!first) await printTrace(r.id).catch((e) => console.log(`  (trace not ready: ${e.message.split("\n")[0]})`));
    else await printTrace(r.id).catch(() => {});
  }
}

console.log(`Tailing Agent Runs for ${PROJECT} (every ${intervalMs / 1000}s, Ctrl+C to stop)…`);
await poll(true);
for (;;) {
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  await poll(false).catch((e) => console.error(`poll failed: ${e.message.split("\n")[0]}`));
}
