/**
 * Barbados Water Authority feed reader.
 *
 * Fetches the BWA "Service Disruptions" RSS feed, parses it, and tags each
 * notice with parishes, type, and dates. Shared by the outages API (for the
 * map) and the alert checker (for emails). Throws if the feed is unreachable.
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
export const FEED_REVALIDATE_SECONDS = 600;

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  "content:encoded"?: string;
  guid?: string | { "#text"?: string };
};

function toOutage(item: RssItem, index: number): Outage {
  const title =
    typeof item.title === "string" ? item.title : "Water service notice";
  const body = stripHtml(
    `${item.description ?? ""} ${item["content:encoded"] ?? ""}`,
  );
  const haystack = `${title} ${body}`;
  const published = item.pubDate
    ? new Date(item.pubDate).toISOString()
    : new Date().toISOString();
  const guid = typeof item.guid === "object" ? item.guid["#text"] : item.guid;
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

export async function fetchOutages(): Promise<Outage[]> {
  const res = await fetch(FEED_URL, {
    headers: {
      "User-Agent": "WuhWaterDoing/0.1 (+alpha.gov.bb prototype)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    next: { revalidate: FEED_REVALIDATE_SECONDS },
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

  return items.map(toOutage);
}
