/**
 * The alert checker — the heart of the feature.
 *
 * For each current BWA notice, email the confirmed subscribers for that area
 * (plus "all of Barbados") exactly once, using claimAlert() so the same notice
 * never reaches the same person twice.
 *
 * Design notes:
 * - `notices` is injectable so tests and demos can drive it without the live
 *   feed. Defaults to fetchOutages() (throws if the feed is unreachable).
 * - `dryRun` computes who WOULD be emailed without claiming or sending.
 * - Sending is unified with retry: we claim every (notice, subscriber) pair,
 *   then send everything still unsent for active notices — so a send that
 *   failed on a previous run is retried on the next one, with no duplicates.
 * - Sends run in small batches (limited concurrency) to respect rate limits.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sentAlerts, subscribers } from "@/db/schema";
import { claimAlert, markAlertSent } from "@/lib/alerts";
import { fetchOutages } from "@/lib/bwa";
import { sendAlertEmail } from "@/lib/email";
import { isPast, type Outage } from "@/lib/outages";
import { areaLabelFor } from "@/lib/parishes";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SEND_BATCH = 10;

export type CheckSummary = {
  activeNotices: number;
  recipients: number; // matched (notice, subscriber) pairs
  attempted: number; // emails tried this run (new + retries)
  sent: number;
  failed: number;
  dryRun?: boolean;
  plan?: Array<{ notice: string; recipients: string[] }>;
};

function matchingSubscribers(notice: Outage) {
  // A parish notice goes to that parish AND "all"; an untagged notice → "all".
  const areas = notice.parishes.length ? [...notice.parishes, "all"] : ["all"];
  return db
    .select()
    .from(subscribers)
    .where(
      and(eq(subscribers.status, "confirmed"), inArray(subscribers.area, areas)),
    );
}

export async function runAlertCheck(
  opts: { notices?: Outage[]; dryRun?: boolean } = {},
): Promise<CheckSummary> {
  const now = Date.now();
  const notices = opts.notices ?? (await fetchOutages());
  const active = notices.filter((o) => !isPast(o, now));
  const noticeById = new Map(active.map((n) => [n.id, n]));

  // Phase 1: work out recipients, and (unless dry run) claim each pair.
  let recipients = 0;
  const plan: Array<{ notice: string; recipients: string[] }> = [];

  for (const notice of active) {
    const subs = await matchingSubscribers(notice);
    recipients += subs.length;

    if (opts.dryRun) {
      plan.push({ notice: notice.title, recipients: subs.map((s) => s.email) });
      continue;
    }
    for (const sub of subs) {
      await claimAlert(notice.id, sub.id); // idempotent — safe to repeat
    }
  }

  if (opts.dryRun) {
    return {
      activeNotices: active.length,
      recipients,
      attempted: 0,
      sent: 0,
      failed: 0,
      dryRun: true,
      plan,
    };
  }

  // Phase 2: send everything still unsent for active notices. This naturally
  // covers both brand-new claims and ones that failed on a previous run.
  const activeIds = [...noticeById.keys()];
  const pending = activeIds.length
    ? await db
        .select({
          noticeId: sentAlerts.noticeId,
          subscriberId: sentAlerts.subscriberId,
          email: subscribers.email,
          area: subscribers.area,
          unsubscribeToken: subscribers.unsubscribeToken,
        })
        .from(sentAlerts)
        .innerJoin(subscribers, eq(subscribers.id, sentAlerts.subscriberId))
        .where(
          and(eq(sentAlerts.sent, false), inArray(sentAlerts.noticeId, activeIds)),
        )
    : [];

  let sent = 0;
  let failed = 0;

  // Send in small batches to respect the email provider's rate limits.
  for (let i = 0; i < pending.length; i += SEND_BATCH) {
    const batch = pending.slice(i, i + SEND_BATCH);
    const results = await Promise.allSettled(
      batch.map((row) => sendOne(row, noticeById)),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  return { activeNotices: active.length, recipients, attempted: pending.length, sent, failed };
}

type PendingRow = {
  noticeId: string;
  subscriberId: number;
  email: string;
  area: string;
  unsubscribeToken: string;
};

async function sendOne(
  row: PendingRow,
  noticeById: Map<string, Outage>,
): Promise<boolean> {
  const notice = noticeById.get(row.noticeId);
  if (!notice) return false;

  const ok = await sendAlertEmail({
    to: row.email,
    areaLabel: areaLabelFor(row.area),
    notice,
    unsubscribeUrl: `${APP_URL}/api/unsubscribe/${row.unsubscribeToken}`,
  });
  if (ok) await markAlertSent(row.noticeId, row.subscriberId);
  return ok;
}
