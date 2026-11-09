// Rebuild exports/pulse-sample.json in Vercel Blob (and a local pulse-sample.json copy).
//
// The deployed agent rewrites this export itself after every approval request, approval
// and saved decision (agent/hooks/pulse_export.ts). Use this script to rebuild it by hand,
// e.g. after editing data/deals.json or clearing test data.
//
// Usage: node --env-file=.env.local scripts/export-pulse.mjs
// Keep the document shape in sync with agent/lib/pulse-export.ts.
import { readFileSync, writeFileSync } from "node:fs";

import { get, list, put } from "@vercel/blob";

const EXPORT_PATH = "exports/pulse-sample.json";
const DECISIONS_PREFIX = "tech-decisions/";
const PENDING_PREFIX = "pending-approvals/";

const deals = JSON.parse(readFileSync(new URL("../data/deals.json", import.meta.url), "utf8"));
const transcriptIds = new Set(["coral-coast-insurance", "harbourline-bank", "indus-mart", "kestrel-travel", "merlion-logistics", "sakura-mobility"]);

async function readJson(pathname) {
  const result = await get(pathname, { access: "private", useCache: false });
  return result?.statusCode === 200 ? new Response(result.stream).json() : null;
}

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

const stored = new Map();
for (const blob of await listAll(DECISIONS_PREFIX)) {
  const record = await readJson(blob.pathname);
  if (!record) continue;
  const dealId = blob.pathname.slice(DECISIONS_PREFIX.length).replace(/\.json$/, "");
  stored.set(dealId, { ...record, blobPathname: blob.pathname, blobUploadedAt: blob.uploadedAt.toISOString() });
}

const pendingApprovals = (await Promise.all((await listAll(PENDING_PREFIX)).map((blob) => readJson(blob.pathname))))
  .filter(Boolean)
  .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

const exportedDeals = deals.map((deal) => {
  const record = stored.get(deal.id);
  return {
    ...deal,
    hasCallNotes: transcriptIds.has(deal.id),
    currentDecision: record ? { ...record.current, source: "blob" } : { ...deal.baseline, source: "seed" },
    history: record?.history ?? [],
    storage: record ? { blobPathname: record.blobPathname, blobUploadedAt: record.blobUploadedAt } : null,
    pendingApprovals: pendingApprovals.filter((p) => p.dealId === deal.id),
  };
});

const byStatus = Object.fromEntries(
  ["Win", "Undecided", "Loss"].map((status) => {
    const matching = exportedDeals.filter((d) => d.currentDecision.status === status);
    return [status, { count: matching.length, arrUsd: matching.reduce((sum, d) => sum + d.opportunityArrUsd, 0) }];
  }),
);

const exportDoc = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  source: {
    vercelProject: "eve-slack-agent",
    environment: "manual",
    seedFile: "data/deals.json",
    blobStore: {
      name: "deal-pulse-decisions",
      region: "syd1",
      access: "private",
      decisionsPrefix: DECISIONS_PREFIX,
      pendingApprovalsPrefix: PENDING_PREFIX,
    },
  },
  summary: {
    dealCount: exportedDeals.length,
    byStatus,
    storedDecisionCount: stored.size,
    pendingApprovalCount: pendingApprovals.length,
  },
  deals: exportedDeals,
  pendingApprovals,
};

const json = JSON.stringify(exportDoc, null, 2) + "\n";
writeFileSync(new URL("../pulse-sample.json", import.meta.url), json);
const uploaded = await put(EXPORT_PATH, json, {
  access: "private",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
});
console.log(JSON.stringify({ local: "pulse-sample.json", blobUrl: uploaded.url, summary: exportDoc.summary }, null, 2));
