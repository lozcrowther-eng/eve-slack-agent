import { get, list, put } from "@vercel/blob";

// Meeting notes logged after the seed data was written (e.g. from the dashboard's "Log meeting").
// get_calls returns them after the bundled transcripts.
const MEETINGS_PREFIX = "call-notes/";

export interface LoggedMeeting {
  dealId: string;
  meetingDate: string; // YYYY-MM-DD
  notes: string;
  loggedAt: string;
  loggedBy: string;
}

export async function saveMeeting(meeting: LoggedMeeting): Promise<void> {
  await put(`${MEETINGS_PREFIX}${meeting.dealId}/${meeting.loggedAt.replace(/[:.]/g, "-")}.json`, JSON.stringify(meeting, null, 2) + "\n", {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function listMeetings(dealId?: string): Promise<LoggedMeeting[]> {
  const { blobs } = await list({ prefix: dealId ? `${MEETINGS_PREFIX}${dealId}/` : MEETINGS_PREFIX });
  const meetings = await Promise.all(
    blobs.map(async (blob) => {
      const result = await get(blob.pathname, { access: "private", useCache: false });
      return result?.statusCode === 200 ? ((await new Response(result.stream).json()) as LoggedMeeting) : null;
    }),
  );
  return meetings
    .filter((m): m is LoggedMeeting => m !== null)
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate) || a.loggedAt.localeCompare(b.loggedAt));
}

export function formatMeeting(meeting: LoggedMeeting): string {
  return `## ${meeting.meetingDate}: Meeting notes (logged ${meeting.loggedAt.slice(0, 10)})\n\n${meeting.notes.trim()}\n`;
}
