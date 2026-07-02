"use client";

import { Button, Heading, Text } from "@govtech-bb/react";
import { useEffect } from "react";
import type { Result } from "@/lib/result";

const GREEN = "#1fbf84"; // green-100
const RED = "#ff6b6b"; // red-100

/**
 * Inline notice shown in the sign-up slot after a confirm/unsubscribe action,
 * instead of the "Get email alerts" banner. It clears the flash cookie on mount
 * so the state lasts for this page load only — a refresh resets it.
 */
export function SubscriptionNotice({
  result,
  onDismiss,
}: {
  result: Result;
  onDismiss: () => void;
}) {
  useEffect(() => {
    document.cookie = "flash=; Max-Age=0; path=/";
  }, []);

  const accent =
    result.tone === "success" ? "border-green-40 bg-green-10" : "border-red-40 bg-red-10";

  return (
    <div className={`rounded-md border-2 p-6 ${accent}`}>
      <div className="flex items-start gap-4">
        {result.tone === "success" ? <CheckIcon /> : <CrossIcon />}
        <div className="flex-1">
          <Heading as="h2">{result.title}</Heading>
          <Text as="p" className="mt-1">
            {result.body}
          </Text>
          <div className="mt-4">
            <Button onClick={onDismiss} variant="secondary">
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="result-pop shrink-0" height="56" viewBox="0 0 52 52" width="56">
      <circle
        className="result-draw"
        cx="26"
        cy="26"
        fill="none"
        r="24"
        stroke={GREEN}
        strokeWidth="3"
        style={{ strokeDasharray: 166, strokeDashoffset: 166 }}
      />
      <path
        className="result-draw"
        d="M15 27 l7 7 l15 -16"
        fill="none"
        stroke={GREEN}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        style={{ strokeDasharray: 48, strokeDashoffset: 48, animationDelay: "0.25s" }}
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg aria-hidden="true" className="result-pop shrink-0" height="56" viewBox="0 0 52 52" width="56">
      <circle
        className="result-draw"
        cx="26"
        cy="26"
        fill="none"
        r="24"
        stroke={RED}
        strokeWidth="3"
        style={{ strokeDasharray: 166, strokeDashoffset: 166 }}
      />
      <path
        className="result-draw"
        d="M18 18 l16 16"
        fill="none"
        stroke={RED}
        strokeLinecap="round"
        strokeWidth="4"
        style={{ strokeDasharray: 24, strokeDashoffset: 24, animationDelay: "0.25s" }}
      />
      <path
        className="result-draw"
        d="M34 18 l-16 16"
        fill="none"
        stroke={RED}
        strokeLinecap="round"
        strokeWidth="4"
        style={{ strokeDasharray: 24, strokeDashoffset: 24, animationDelay: "0.4s" }}
      />
    </svg>
  );
}
