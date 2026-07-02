"use client";

import { Button, Input, Select, StatusBanner, Text } from "@govtech-bb/react";
import { useState } from "react";
import { PARISHES } from "@/lib/parishes";

// A simple email shape check. Real validation happens by sending the
// confirmation email — if it bounces, the address was wrong.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AlertSignup({
  selectedArea,
  selectedLabel,
}: {
  selectedArea: string; // "" means "All of Barbados"
  selectedLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [area, setArea] = useState(selectedArea);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [doneMessage, setDoneMessage] = useState("");

  const headlinePlace = selectedLabel
    ? `in ${selectedLabel}`
    : "anywhere in Barbados";

  function openForm() {
    setArea(selectedArea); // start from whatever they're viewing
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(undefined);
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, area }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message?: string };
        setDoneMessage(
          data.message ??
            "Almost done. Check your email and click the link to confirm.",
        );
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  // Success state: we've taken the request, now they must confirm by email.
  if (status === "done") {
    return (
      <div className="rounded-md border-2 border-green-40 bg-green-10 p-6">
        <Text as="p">{doneMessage}</Text>
      </div>
    );
  }

  // Closed state: just the invitation card.
  if (!open) {
    return (
      <div className="rounded-md border-2 border-blue-40 bg-blue-10 p-6">
        <Text as="p" className="font-semibold">
          Get an email when water is affected {headlinePlace}.
        </Text>
        <Text as="p" className="mt-1 text-grey-100" size="caption">
          We only keep your email and chosen area, and you can unsubscribe from
          any alert. No login needed.
        </Text>
        <div className="mt-4">
          <Button onClick={openForm} variant="primary">
            Get email alerts
          </Button>
        </div>
      </div>
    );
  }

  // Open state: the form.
  return (
    <form
      className="space-y-4 rounded-md border-2 border-blue-40 bg-blue-10 p-6"
      onSubmit={handleSubmit}
    >
      <Text as="p" className="font-semibold">
        Get email alerts
      </Text>

      <Input
        error={emailError}
        label="Your email address"
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        value={email}
      />

      <Select
        label="Which area?"
        onChange={(e) => setArea(e.target.value)}
        value={area}
      >
        <option value="">All of Barbados</option>
        {PARISHES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>

      {status === "error" && (
        <StatusBanner variant="service-issue">
          <Text as="p">
            Something went wrong. Please try again in a moment.
          </Text>
        </StatusBanner>
      )}

      <div className="flex gap-3">
        <Button disabled={status === "sending"} type="submit" variant="primary">
          {status === "sending" ? "Sending…" : "Send me alerts"}
        </Button>
        <Button onClick={() => setOpen(false)} type="button" variant="tertiary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
