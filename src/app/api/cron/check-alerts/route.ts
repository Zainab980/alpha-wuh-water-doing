/**
 * Cron endpoint — the scheduled trigger for the alert checker.
 *
 * Vercel Cron calls this on a schedule (see vercel.json). If CRON_SECRET is
 * set, the request must carry it, so nobody else can trigger a mass send.
 *
 * Query flags (for testing / demos, same auth):
 *   ?dryRun=1  → show who WOULD be emailed, without sending or claiming.
 *   ?demo=1    → run against a single, clearly-labelled demo notice instead of
 *                the live BWA feed, so a demo always has something to send.
 */
import { runAlertCheck } from "@/lib/checker";
import { sendOpsAlert } from "@/lib/email";
import type { Outage } from "@/lib/outages";
import { PARISHES } from "@/lib/parishes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function demoNotice(): Outage {
  return {
    id: `demo-${Date.now()}`,
    title: "DEMO — Emergency water outage in your area",
    link: "https://barbadoswaterauthority.com/service-disruptions/",
    published: new Date().toISOString(),
    summary:
      "This is a demonstration notice for the alerts feature. Crews are responding to a burst main. Water may be out for several hours.",
    // Cover every parish so the demo reaches whatever area the subscriber chose
    // (subscribers on "all of Barbados" match any notice too).
    parishes: PARISHES.map((p) => p.value),
    type: "emergency",
  };
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const demo = url.searchParams.get("demo") === "1";

  try {
    const summary = await runAlertCheck({
      dryRun,
      notices: demo ? [demoNotice()] : undefined,
    });
    console.log("[cron] alert check:", summary);

    if (summary.failed > 0) {
      console.error(`[cron] ALERT: ${summary.failed} failed send(s)`);
      await sendOpsAlert(
        `Wuh Water Doing: ${summary.failed} alert send(s) failed`,
        JSON.stringify(summary, null, 2),
      );
    }
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron] alert check failed:", err);
    await sendOpsAlert("Wuh Water Doing: alert checker crashed", String(err));
    return Response.json({ ok: false, error: "check failed" }, { status: 500 });
  }
}
