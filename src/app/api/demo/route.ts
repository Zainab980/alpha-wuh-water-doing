/**
 * Demo endpoint — publishes ONE clearly-labelled demo notice and runs the
 * checker against it, using the DEMO email template. Lets you test the whole
 * alert flow on demand (including on the hosted app) without waiting for a real
 * BWA notice.
 *
 * Protected by CRON_SECRET (the same secret as the cron endpoint): the /demo
 * page collects it from you and sends it as a Bearer header, so this works on
 * the deployed site without exposing the secret in client code. If CRON_SECRET
 * is unset (local dev), it's open.
 */
import { runAlertCheck } from "@/lib/checker";
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
    // Cover every parish so the demo reaches whatever area the subscriber chose.
    parishes: PARISHES.map((p) => p.value),
    type: "emergency",
  };
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runAlertCheck({
      notices: [demoNotice()],
      demo: true,
    });
    console.log("[demo] published:", summary);
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[demo] failed:", err);
    return Response.json({ ok: false, error: "demo failed" }, { status: 500 });
  }
}
