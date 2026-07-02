/**
 * Confirm endpoint — opened by the link in the confirmation email:
 *   /api/confirm/<token>
 *
 * Flips the matching subscriber from "pending" to "confirmed", then redirects
 * to a clean home URL ("/"). The outcome is carried in a short-lived "flash"
 * cookie (read once, then cleared) rather than a query string, so we don't
 * leak status flags into the address bar.
 */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { getOrigin } from "@/lib/url";

async function confirmByToken(
  token: string,
): Promise<"done" | "already" | "invalid"> {
  const [updated] = await db
    .update(subscribers)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(
      and(eq(subscribers.confirmToken, token), eq(subscribers.status, "pending")),
    )
    .returning({ id: subscribers.id });

  if (updated) return "done";

  const [existing] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.confirmToken, token))
    .limit(1);

  return existing?.status === "confirmed" ? "already" : "invalid";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const result = await confirmByToken(token);

  const res = NextResponse.redirect(`${getOrigin(req)}/`, 303);
  res.cookies.set("flash", `confirm:${result}`, {
    path: "/",
    maxAge: 60, // short backstop; the page clears it after showing it once
    sameSite: "lax",
  });
  return res;
}
