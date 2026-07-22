/**
 * Outages API route — powers the map and list.
 *
 * Returns the parsed BWA notices as JSON. If the feed can't be reached, returns
 * a 503 (no-store) rather than fake data — the app then shows an honest
 * "can't reach BWA" state.
 */
import { fetchOutages } from "@/lib/bwa";

export async function GET(): Promise<Response> {
  try {
    const outages = await fetchOutages();
    return Response.json({ outages, checkedAt: new Date().toISOString() });
  } catch {
    console.warn("Could not reach the BWA feed; returning 503 (unavailable)");
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
