/**
 * Turns the short-lived "flash" cookie value (e.g. "confirm:done") into the
 * message the subscription notice should show. Pure and shared.
 */
export type ResultTone = "success" | "error";

export type Result = {
  tone: ResultTone;
  title: string;
  body: string;
};

const RESULTS: Record<string, Result> = {
  "confirm:done": {
    tone: "success",
    title: "You're subscribed",
    body: "Your email subscription has been confirmed. We'll email you whenever water is affected in your area.",
  },
  "confirm:already": {
    tone: "success",
    title: "Already subscribed",
    body: "You're already set up for alerts in this area. Nothing more to do.",
  },
  "confirm:invalid": {
    tone: "error",
    title: "This link didn't work",
    body: "The confirmation link is invalid or has expired. You can sign up again below.",
  },
  "unsubscribe:done": {
    tone: "success",
    title: "You're unsubscribed",
    body: "You won't get any more water alerts. You can sign up again anytime.",
  },
  "unsubscribe:already": {
    tone: "success",
    title: "Already unsubscribed",
    body: "You're not receiving alerts. Nothing more to do.",
  },
  "unsubscribe:invalid": {
    tone: "error",
    title: "This link didn't work",
    body: "The unsubscribe link is invalid or has expired.",
  },
};

export function resultFromFlash(flash: string | undefined): Result | null {
  return flash ? (RESULTS[flash] ?? null) : null;
}
