/**
 * Cron endpoint — the scheduled trigger for the REAL alert checker.
 *
 * Reads the live BWA feed, matches confirmed subscribers, and emails each new
 * notice once (real branded template). Called by the GitHub Actions workflow
 * (.github/workflows/water-alerts.yml). CRON_SECRET-protected: the workflow
 * sends `Authorization: Bearer <CRON_SECRET>`; if the secret is unset the
 * endpoint is open (dev only).
 *
 * For demos, use /api/demo instead (a labelled demo notice + demo template).
 *
 *   ?dryRun=1 → show who WOULD be emailed, without sending.
 */
import { runAlertCheck } from "@/lib/checker";
import { sendOpsAlert } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  try {
    const summary = await runAlertCheck({ dryRun });
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
