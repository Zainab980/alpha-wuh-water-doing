/**
 * Outages API route.
 *
 * Fetches the Barbados Water Authority "Service Disruptions" RSS feed
 * (server-side, to avoid browser CORS), parses each notice, and tags it with
 * the parishes it affects and the kind of work, returning clean JSON.
 *
 * If the feed can't be reached, it returns a 503 (service unavailable) rather
 * than fake data — the app then shows an honest "can't reach BWA" state. We
 * never present sample notices as if they were real.
 *
 * No API key required. RSS is a stable, public contract.
 */
import { XMLParser } from "fast-xml-parser";
import {
  classifyType,
  matchParishes,
  type Outage,
  parseEventWindow,
  stripHtml,
} from "@/lib/outages";

const FEED_URL =
  "https://barbadoswaterauthority.com/category/service-disruptions/feed/";

// Re-fetch the upstream feed at most every 10 minutes.
const REVALIDATE_SECONDS = 600;

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  "content:encoded"?: string;
  guid?: string | { "#text"?: string };
};

function toOutage(item: RssItem, index: number): Outage {
  const title = typeof item.title === "string" ? item.title : "Water service notice";
  const body = stripHtml(
    `${item.description ?? ""} ${item["content:encoded"] ?? ""}`,
  );
  const haystack = `${title} ${body}`;
  const published = item.pubDate
    ? new Date(item.pubDate).toISOString()
    : new Date().toISOString();
  const guid =
    typeof item.guid === "object" ? item.guid["#text"] : item.guid;
  const { eventDay, endsAt } = parseEventWindow(haystack, published);

  return {
    id: guid || item.link || `bwa-${index}`,
    title: stripHtml(title),
    link: item.link ?? FEED_URL,
    published,
    summary: body.slice(0, 280),
    parishes: matchParishes(haystack),
    type: classifyType(haystack),
    eventDay,
    endsAt,
  };
}

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(FEED_URL, {
      headers: {
        // A normal UA; some hosts reject empty/agent-less requests.
        "User-Agent": "WuhWaterDoing/0.1 (+alpha.gov.bb prototype)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`Feed responded ${res.status}`);

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items: RssItem[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    // An empty feed is a valid "no current notices" answer, not an error.
    const outages = items.map(toOutage);
    return Response.json({ outages });
  } catch {
    console.warn("Could not reach the BWA feed; returning 503 (unavailable)");
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
