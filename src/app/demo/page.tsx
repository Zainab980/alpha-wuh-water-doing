"use client";

import { Button, Heading, StatusBanner, Text } from "@govtech-bb/react";
import { useState } from "react";

/**
 * Demo control page (for presentations).
 *
 * Publishes a mock BWA notice and runs the alert checker, so a presenter can
 * trigger an alert on demand instead of waiting for a real notice. Confirmed
 * subscribers for the affected area get an email; unsubscribed ones don't —
 * which is exactly what makes the "subscribe → alert → unsubscribe → no alert"
 * story land.
 */
type Outcome = { sent: number } | "error" | null;

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function createMockNotice() {
    setLoading(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/cron/check-alerts?demo=1");
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { sent?: number };
      setOutcome({ sent: data.sent ?? 0 });
    } catch {
      setOutcome("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-yellow-00 border-b-4 bg-yellow-100">
      <div className="container">
        <div className="max-w-prose space-y-4 py-10">
          <Heading as="h1">Demo controls</Heading>
          <Text as="p">
            Press the button to publish a mock water notice. Everyone who has
            confirmed alerts for their area gets an email. People who have
            unsubscribed get nothing.
          </Text>

          <Button disabled={loading} onClick={createMockNotice} variant="primary">
            {loading ? "Publishing…" : "Create a mock water notice"}
          </Button>

          {outcome === "error" && (
            <StatusBanner variant="service-issue">
              <Text as="p">
                Couldn&apos;t publish. If this is deployed with a CRON_SECRET,
                the demo button only works locally (where it&apos;s unset).
              </Text>
            </StatusBanner>
          )}

          {outcome && outcome !== "error" && outcome.sent > 0 && (
            <div className="rounded-md border-2 border-green-40 bg-green-10 p-6">
              <Text as="p">
                <span className="font-bold">Notice published.</span>{" "}
                {outcome.sent} alert email{outcome.sent === 1 ? "" : "s"} sent —
                check the inbox.
              </Text>
            </div>
          )}

          {outcome && outcome !== "error" && outcome.sent === 0 && (
            <div className="rounded-md border-2 border-blue-40 bg-blue-10 p-6">
              <Text as="p">
                <span className="font-bold">Notice published.</span> No confirmed
                subscribers matched, so no email was sent. (Expected right after
                unsubscribing.)
              </Text>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
