"use client";

import { Button, Heading, Input, StatusBanner, Text } from "@govtech-bb/react";
import { useState } from "react";

/**
 * Demo control page (for presentations).
 *
 * Publishes a labelled DEMO notice and runs the checker against it (demo email
 * template), so a presenter can trigger an alert on demand — including on the
 * hosted app. Confirmed subscribers for their area get the demo email;
 * unsubscribed ones don't, which sells the "subscribe → alert → unsubscribe →
 * no alert" story.
 *
 * On the hosted app the demo endpoint is protected by CRON_SECRET, so paste it
 * into the access-key field below (it's sent as a header, never bundled). Left
 * blank works locally where the secret is unset.
 */
type Outcome = { sent: number } | "unauthorized" | "error" | null;

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function createMockNotice() {
    setLoading(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/demo", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 401) {
        setOutcome("unauthorized");
        return;
      }
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
            Press the button to publish a clearly-labelled demo water notice.
            Everyone who has confirmed alerts for their area gets a demo email.
            People who have unsubscribed get nothing.
          </Text>

          <Input
            description="Only needed on the deployed site — paste the CRON_SECRET. Leave blank when running locally."
            label="Demo access key"
            onChange={(e) => setToken(e.target.value)}
            type="password"
            value={token}
          />

          <Button disabled={loading} onClick={createMockNotice} variant="primary">
            {loading ? "Publishing…" : "Create a mock water notice"}
          </Button>

          {outcome === "unauthorized" && (
            <StatusBanner variant="service-issue">
              <Text as="p">
                Access key missing or wrong. Paste the CRON_SECRET into the field
                above and try again.
              </Text>
            </StatusBanner>
          )}

          {outcome === "error" && (
            <StatusBanner variant="service-issue">
              <Text as="p">
                Something went wrong publishing the demo notice. Please try again.
              </Text>
            </StatusBanner>
          )}

          {outcome && typeof outcome === "object" && outcome.sent > 0 && (
            <div className="rounded-md border-2 border-green-40 bg-green-10 p-6">
              <Text as="p">
                <span className="font-bold">Demo notice published.</span>{" "}
                {outcome.sent} demo email{outcome.sent === 1 ? "" : "s"} sent —
                check the inbox.
              </Text>
            </div>
          )}

          {outcome && typeof outcome === "object" && outcome.sent === 0 && (
            <div className="rounded-md border-2 border-blue-40 bg-blue-10 p-6">
              <Text as="p">
                <span className="font-bold">Demo notice published.</span> No
                confirmed subscribers matched, so no email was sent. (Expected
                right after unsubscribing.)
              </Text>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
