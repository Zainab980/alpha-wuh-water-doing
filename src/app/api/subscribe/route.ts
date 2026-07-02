/**
 * Subscribe API route.
 *
 * Receives a sign-up { email, area }, saves the person as "pending" (handling
 * duplicates), then emails them a confirmation link. They become "confirmed"
 * only when they click that link (see /confirm).
 *
 * "area" arrives as "" for All of Barbados (stored as "all"), else a parish slug.
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { sendConfirmEmail } from "@/lib/email";
import { areaLabelFor, PARISHES } from "@/lib/parishes";
import { getOrigin } from "@/lib/url";

const CONFIRM_MESSAGE =
  "Almost done. Check your email and click the link to confirm.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_AREAS = new Set(["", ...PARISHES.map((p) => p.value)]);

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, area } = (body ?? {}) as { email?: unknown; area?: unknown };

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return Response.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }
  if (typeof area !== "string" || !VALID_AREAS.has(area)) {
    return Response.json({ error: "Unknown area." }, { status: 400 });
  }

  const normEmail = email.toLowerCase();
  const normArea = area === "" ? "all" : area;

  let confirmToken: string;

  try {
    // Is this person already signed up for this area?
    const [existing] = await db
      .select()
      .from(subscribers)
      .where(
        and(eq(subscribers.email, normEmail), eq(subscribers.area, normArea)),
      )
      .limit(1);

    if (existing?.status === "confirmed") {
      // Already fully signed up — no duplicate, no email, just reassure.
      return Response.json({
        ok: true,
        message: "You're already getting alerts for this area.",
      });
    }

    if (existing?.status === "unsubscribed") {
      // They left before; let them back in with a fresh confirm code.
      confirmToken = randomUUID();
      await db
        .update(subscribers)
        .set({ status: "pending", confirmToken, confirmedAt: null })
        .where(eq(subscribers.id, existing.id));
    } else if (existing) {
      // status === "pending": reuse their existing code and re-send the email.
      confirmToken = existing.confirmToken;
    } else {
      // Brand new sign-up.
      confirmToken = randomUUID();
      await db.insert(subscribers).values({
        email: normEmail,
        area: normArea,
        confirmToken,
        unsubscribeToken: randomUUID(),
      });
    }
  } catch (err) {
    // Backstop: if two identical sign-ups raced, the unique rule rejects the
    // second. Treat that as "already signed up", not an error.
    if (String(err).includes("subscribers_email_area_unique")) {
      return Response.json({ ok: true, message: CONFIRM_MESSAGE });
    }
    return Response.json(
      { error: "Could not save your sign-up. Please try again." },
      { status: 500 },
    );
  }

  // Send the confirmation email (never throws — failure just logs).
  await sendConfirmEmail({
    to: normEmail,
    areaLabel: areaLabelFor(normArea),
    confirmUrl: `${getOrigin(req)}/api/confirm/${confirmToken}`,
  });

  return Response.json({ ok: true, message: CONFIRM_MESSAGE });
}
