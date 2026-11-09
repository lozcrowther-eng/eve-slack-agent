import { get, put } from "@vercel/blob";

import seedDeals from "../../data/deals.json" with { type: "json" };
import harbourlineBank from "../../data/transcripts/harbourline-bank.md" with { type: "text" };
import indusMart from "../../data/transcripts/indus-mart.md" with { type: "text" };
import kestrelTravel from "../../data/transcripts/kestrel-travel.md" with { type: "text" };
import merlionLogistics from "../../data/transcripts/merlion-logistics.md" with { type: "text" };
import sakuraMobility from "../../data/transcripts/sakura-mobility.md" with { type: "text" };

export const TECH_STATUSES = ["Win", "Loss", "Undecided"] as const;
export type TechStatus = (typeof TECH_STATUSES)[number];

export interface TechDecision {
  status: TechStatus;
  /** 0-100: how confident the SA is in the status. */
  confidence: number;
  evidence: string[];
  nextStep: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Deal {
  id: string;
  account: string;
  region: "ANZ" | "Singapore" | "India" | "Japan";
  country: string;
  city: string;
  industry: string;
  opportunityArrUsd: number;
  salesStage: string;
  closeQuarter: string;
  competitor: "AWS Amplify" | "Netlify" | "build on AWS";
  useCase: string;
  sa: string;
  ae: string;
  baseline: TechDecision;
}

interface StoredDecisions {
  current: TechDecision;
  history: TechDecision[];
}

export const deals = seedDeals as Deal[];

// The bundler inlines text imports as a base64 data URL; accept plain text too.
function decodeTextModule(value: string): string {
  const match = /^data:[^,]*;base64,/.exec(value);
  return match ? Buffer.from(value.slice(match[0].length), "base64").toString("utf8") : value;
}

const transcripts: Record<string, string> = Object.fromEntries(
  Object.entries({
    "harbourline-bank": harbourlineBank,
    "indus-mart": indusMart,
    "kestrel-travel": kestrelTravel,
    "merlion-logistics": merlionLogistics,
    "sakura-mobility": sakuraMobility,
  }).map(([id, text]) => [id, decodeTextModule(text)]),
);

export function findDeal(idOrName: string): Deal | undefined {
  const needle = idOrName.trim().toLowerCase();
  return (
    deals.find((deal) => deal.id === needle) ??
    deals.find((deal) => deal.account.toLowerCase().includes(needle))
  );
}

export function getTranscript(dealId: string): string | undefined {
  return transcripts[dealId];
}

function decisionPath(dealId: string): string {
  return `tech-decisions/${dealId}.json`;
}

async function readStored(dealId: string): Promise<StoredDecisions | null> {
  try {
    const result = await get(decisionPath(dealId), { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return JSON.parse(await new Response(result.stream).text()) as StoredDecisions;
  } catch (error) {
    if (error instanceof Error && error.name === "BlobNotFoundError") return null;
    throw error;
  }
}

/** The latest decision for a deal: the stored one if an SA has updated it, else the seed. */
export async function getCurrentDecision(deal: Deal): Promise<TechDecision & { source: "blob" | "seed" }> {
  const stored = await readStored(deal.id);
  return stored ? { ...stored.current, source: "blob" } : { ...deal.baseline, source: "seed" };
}

export async function saveDecision(deal: Deal, decision: TechDecision): Promise<void> {
  const stored = await readStored(deal.id);
  const previous = stored?.current ?? deal.baseline;
  const body: StoredDecisions = {
    current: decision,
    history: [...(stored?.history ?? []), previous],
  };
  await put(decisionPath(deal.id), JSON.stringify(body, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
