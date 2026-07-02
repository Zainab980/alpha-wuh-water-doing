/**
 * Unsubscribe endpoint — opened by the link in every alert email:
 *   /api/unsubscribe/<token>
 *
 * Sets the matching subscriber to "unsubscribed" (we keep the row so they can
 * come back), then redirects to a clean "/" with a short-lived flash cookie.
 */
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { getOrigin } from "@/lib/url";

async function unsubscribeByToken(
  token: string,
): Promise<"done" | "already" | "invalid"> {
  const [updated] = await db
    .update(subscribers)
    .set({ status: "unsubscribed" })
    .where(
      and(
        eq(subscribers.unsubscribeToken, token),
        ne(subscribers.status, "unsubscribed"),
      ),
    )
    .returning({ id: subscribers.id });

  if (updated) return "done";

  const [existing] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  return existing?.status === "unsubscribed" ? "already" : "invalid";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const result = await unsubscribeByToken(token);

  const res = NextResponse.redirect(`${getOrigin(req)}/`, 303);
  res.cookies.set("flash", `unsubscribe:${result}`, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
  return res;
}

/**
 * One-click unsubscribe (RFC 8058). Mailbox providers POST here directly from
 * the "Unsubscribe" button in the email header — no page visit. Returns 200.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  await unsubscribeByToken(token);
  return new Response(null, { status: 200 });
}
