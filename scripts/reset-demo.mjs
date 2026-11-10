// Reset Deal Pulse to its demo starting point.
//
//   node --env-file=.env.local scripts/reset-demo.mjs            reset to the baseline
//   node --env-file=.env.local scripts/reset-demo.mjs --capture  save the current sentiment as the baseline
//
// Reset deletes saved decisions, pending approvals and logged meetings, restores the baseline
// sentiment colours (scripts/demo-baseline-sentiment.json), and rebuilds the pulse export.
// Slack messages are not deleted; approval cards left in Slack stay clickable until answered.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { del, get, list, put } from "@vercel/blob";

const BASELINE = new URL("./demo-baseline-sentiment.json", import.meta.url);
const deals = JSON.parse(readFileSync(new URL("../data/deals.json", import.meta.url), "utf8"));

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readJson(pathname) {
  const result = await get(pathname, { access: "private", useCache: false });
  return result?.statusCode === 200 ? new Response(result.stream).json() : null;
}

if (process.argv.includes("--capture")) {
  const cached = (await Promise.all((await listAll("sentiment/")).map((b) => readJson(b.pathname)))).filter(Boolean);
  const baseline = cached
    .map(({ dealId, sentiment, reason, source }) => ({ dealId, sentiment, reason, source }))
    .sort((a, b) => a.dealId.localeCompare(b.dealId));
  writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`Captured ${baseline.length} sentiment colours as the demo baseline.`);
  process.exit(0);
}

// Baseline colours are overwritten in place (below), so the dashboard never sees a gap; only
// sentiment for deals missing from the baseline is deleted.
const hasBaseline = existsSync(BASELINE);
for (const prefix of ["tech-decisions/", "pending-approvals/", "call-notes/", ...(hasBaseline ? [] : ["sentiment/"])]) {
  const blobs = await listAll(prefix);
  if (blobs.length) await del(blobs.map((b) => b.url));
  console.log(`Deleted ${blobs.length} blob(s) under ${prefix}`);
}

if (hasBaseline) {
  const assessedAt = new Date().toISOString();
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  await Promise.all(
    baseline.map((entry) => {
      const deal = deals.find((d) => d.id === entry.dealId);
      if (!deal) return null;
      const record = { ...entry, assessedAt, basedOnDecisionAt: deal.baseline.updatedAt, previousSentiment: null };
      return put(`sentiment/${entry.dealId}.json`, JSON.stringify(record, null, 2) + "\n", {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    }),
  );
  const keep = new Set(baseline.map((entry) => `sentiment/${entry.dealId}.json`));
  const extra = (await listAll("sentiment/")).filter((b) => !keep.has(b.pathname));
  if (extra.length) await del(extra.map((b) => b.url));
  console.log(`Restored ${baseline.length} baseline sentiment colours.`);
} else {
  console.log("No baseline captured yet; the dashboard will ask the agent to assess every deal.");
}

execFileSync(process.execPath, [new URL("./export-pulse.mjs", import.meta.url).pathname], { stdio: ["ignore", "ignore", "inherit"] });
console.log("Rebuilt exports/pulse-sample.json. Demo reset complete.");
