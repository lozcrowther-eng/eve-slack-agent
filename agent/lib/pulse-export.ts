import { del, get, list, put } from "@vercel/blob";

import { deals, getTranscript, type TechDecision } from "./deals.ts";

// The dashboard reads this blob (PULSE_DATA_URL). Same schema as scripts/export-pulse.mjs.
export const PULSE_EXPORT_PATH = "exports/pulse-sample.json";
const DECISIONS_PREFIX = "tech-decisions/";
const PENDING_PREFIX = "pending-approvals/";

export interface PendingApproval {
  requestId: string;
  runId: string;
  turnId: string | null;
  callId: string;
  toolName: "set_tech_decision";
  callStatus: "awaiting-approval";
  trigger: string | null;
  requestedBy: string | null;
  requestedAt: string;
  dealId: string | null;
  proposed: Record<string, unknown>;
}

interface StoredDecisions {
  current: TechDecision;
  history: TechDecision[];
}

async function readJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  return result?.statusCode === 200 ? ((await new Response(result.stream).json()) as T) : null;
}

async function listAll(prefix: string) {
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function putJson(pathname: string, value: unknown) {
  return put(pathname, JSON.stringify(value, null, 2) + "\n", {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function recordPendingApproval(approval: PendingApproval): Promise<void> {
  await putJson(`${PENDING_PREFIX}${approval.requestId}.json`, approval);
}

export async function clearPendingApproval(requestId: string): Promise<void> {
  await del(`${PENDING_PREFIX}${requestId}.json`);
}

/** Rebuild exports/pulse-sample.json from the seed deals, stored decisions and pending approvals. */
export async function writePulseExport(): Promise<void> {
  const [decisionBlobs, pendingBlobs] = await Promise.all([listAll(DECISIONS_PREFIX), listAll(PENDING_PREFIX)]);

  const stored = new Map<string, StoredDecisions & { blobPathname: string; blobUploadedAt: string }>();
  await Promise.all(
    decisionBlobs.map(async (blob) => {
      const record = await readJson<StoredDecisions>(blob.pathname);
      if (!record) return;
      const dealId = blob.pathname.slice(DECISIONS_PREFIX.length).replace(/\.json$/, "");
      stored.set(dealId, { ...record, blobPathname: blob.pathname, blobUploadedAt: blob.uploadedAt.toISOString() });
    }),
  );

  const pendingApprovals = (await Promise.all(pendingBlobs.map((blob) => readJson<PendingApproval>(blob.pathname))))
    .filter((p): p is PendingApproval => p !== null)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  const exportedDeals = deals.map((deal) => {
    const record = stored.get(deal.id);
    return {
      ...deal,
      hasCallNotes: getTranscript(deal.id) !== undefined,
      currentDecision: record ? { ...record.current, source: "blob" as const } : { ...deal.baseline, source: "seed" as const },
      history: record?.history ?? [],
      storage: record ? { blobPathname: record.blobPathname, blobUploadedAt: record.blobUploadedAt } : null,
      pendingApprovals: pendingApprovals.filter((p) => p.dealId === deal.id),
    };
  });

  const byStatus = Object.fromEntries(
    (["Win", "Undecided", "Loss"] as const).map((status) => {
      const matching = exportedDeals.filter((d) => d.currentDecision.status === status);
      return [status, { count: matching.length, arrUsd: matching.reduce((sum, d) => sum + d.opportunityArrUsd, 0) }];
    }),
  );

  await putJson(PULSE_EXPORT_PATH, {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: {
      vercelProject: "eve-slack-agent",
      environment: process.env.VERCEL_ENV ?? "development",
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
  });
}
