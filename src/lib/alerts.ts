/**
 * The "email not sent twice" guarantee.
 *
 * Before sending an alert email, the checker calls claimAlert(). It tries to
 * write one row into sent_alerts for the (notice, subscriber) pair. Because
 * that pair is UNIQUE in the database, only the FIRST caller can insert it —
 * any later (or simultaneous) caller gets nothing back and must skip.
 *
 * Usage in the future checker:
 *   if (await claimAlert(notice.id, sub.id)) {
 *     await sendEmail(...);
 *     await markAlertSent(notice.id, sub.id);
 *   }
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sentAlerts } from "@/db/schema";

/**
 * Claim the right to email this subscriber about this notice.
 * @returns true  → we just claimed it, the caller should send the email.
 *          false → it was already claimed, the caller must NOT send.
 */
export async function claimAlert(
  noticeId: string,
  subscriberId: number,
): Promise<boolean> {
  const inserted = await db
    .insert(sentAlerts)
    .values({ noticeId, subscriberId })
    .onConflictDoNothing() // if the pair already exists, do nothing
    .returning({ id: sentAlerts.id });

  // returning() gives us the new row only when an insert actually happened.
  return inserted.length > 0;
}

/** Mark a claimed alert as truly sent, once the email has gone out. */
export async function markAlertSent(
  noticeId: string,
  subscriberId: number,
): Promise<void> {
  await db
    .update(sentAlerts)
    .set({ sent: true })
    .where(
      and(
        eq(sentAlerts.noticeId, noticeId),
        eq(sentAlerts.subscriberId, subscriberId),
      ),
    );
}
