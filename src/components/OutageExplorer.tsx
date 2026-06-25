"use client";

import {
  Button,
  Heading,
  Link,
  Select,
  ShowHide,
  StatusBanner,
  Text,
} from "@govtech-bb/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  freshnessLabel,
  isCurrentConcern,
  isPast,
  type Outage,
  OUTAGE_TYPE_LABEL,
  type OutageType,
} from "@/lib/outages";
import { findParish, PARISHES } from "@/lib/parishes";

const OutageMap = dynamic(() => import("./OutageMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-blue-10">
      <Text as="p" className="text-grey-100">
        Loading map…
      </Text>
    </div>
  ),
});

const TYPE_BADGE: Record<OutageType, string> = {
  emergency: "bg-red-100 text-black-00",
  planned: "bg-teal-100 text-white-00",
  repair: "bg-yellow-100 text-black-00",
  notice: "bg-blue-10 text-blue-100",
};

export function OutageExplorer() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [source, setSource] = useState<"bwa" | "seed" | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/outages")
      .then((r) => r.json())
      .then((data: { outages: Outage[]; source: "bwa" | "seed" }) => {
        if (!live) return;
        setOutages(data.outages);
        setSource(data.source);
        setNow(Date.now());
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  // Split into still-relevant vs. already-over.
  const active = useMemo(
    () => (now == null ? [] : outages.filter((o) => !isPast(o, now))),
    [outages, now],
  );
  const past = useMemo(
    () => (now == null ? [] : outages.filter((o) => isPast(o, now))),
    [outages, now],
  );

  // Map counts use ACTIVE notices only, so old ones don't light up an area.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of active) {
      for (const parish of o.parishes) {
        map[parish] = (map[parish] ?? 0) + 1;
      }
    }
    return map;
  }, [active]);

  const byArea = (list: Outage[]) =>
    selected ? list.filter((o) => o.parishes.includes(selected)) : list;

  const visibleActive = byArea(active);
  const visiblePast = byArea(past);
  const unmatched = active.filter((o) => o.parishes.length === 0);

  const selectedLabel = selected ? findParish(selected)?.label : null;

  // "Store water" only for a CURRENT concern (today/upcoming, not over).
  const showStoreWater =
    !!selected &&
    now != null &&
    visibleActive.some((o) => o.type !== "notice" && isCurrentConcern(o, now));

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestParish(pos.coords.latitude, pos.coords.longitude);
        if (nearest) setSelected(nearest);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="Choose your area"
            onChange={(e) => setSelected(e.target.value)}
            value={selected}
          >
            <option value="">All of Barbados</option>
            {PARISHES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
                {counts[p.value] ? ` (${counts[p.value]})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <Button disabled={locating} onClick={useMyLocation} variant="secondary">
          {locating ? "Finding you…" : "Use my location"}
        </Button>
      </div>

      {/* Map */}
      <div className="h-[420px] overflow-hidden rounded-md border-2 border-grey-00">
        <OutageMap counts={counts} onSelect={setSelected} selected={selected} />
      </div>

      {/* Store-water alert */}
      {showStoreWater && (
        <StatusBanner variant="service-issue">
          <Text as="p">
            <span className="font-bold">Store water now.</span> There is planned
            or emergency work that may stop the water in {selectedLabel}.
          </Text>
        </StatusBanner>
      )}

      {/* Source + status line */}
      {loading ? (
        <Text as="p" className="text-grey-100">
          Loading the latest notices…
        </Text>
      ) : failed ? (
        <StatusBanner variant="service-issue">
          <Text as="p">
            We could not load the notices right now. Please try again later.
          </Text>
        </StatusBanner>
      ) : (
        <Text as="p" className="text-grey-100" size="caption">
          {source === "bwa"
            ? "Live from the Barbados Water Authority."
            : "Showing example notices (we could not reach the BWA just now)."}
        </Text>
      )}

      {/* List */}
      {!loading && now != null && (
        <div className="space-y-4">
          <Heading as="h2">
            {selectedLabel
              ? `Notices for ${selectedLabel}`
              : "Current notices"}
          </Heading>

          {visibleActive.length === 0 ? (
            <div className="rounded-md bg-green-10 p-6">
              <Text as="p">
                Good news. There are no current water notices
                {selectedLabel ? ` for ${selectedLabel}` : ""}.
              </Text>
            </div>
          ) : (
            visibleActive.map((o) => (
              <OutageCard key={o.id} now={now} outage={o} />
            ))
          )}

          {/* Notices with no single parish, only when not filtering */}
          {!selected && unmatched.length > 0 && (
            <>
              <Heading as="h3">Other notices</Heading>
              <Text as="p" className="text-grey-100" size="caption">
                These notices did not name a single parish.
              </Text>
              {unmatched.map((o) => (
                <OutageCard key={o.id} now={now} outage={o} />
              ))}
            </>
          )}

          {/* Already-over notices, tucked away */}
          {visiblePast.length > 0 && (
            <ShowHide
              summary={`Older notices that are already over (${visiblePast.length})`}
            >
              <div className="space-y-4 pt-2">
                {visiblePast.map((o) => (
                  <OutageCard key={o.id} now={now} outage={o} />
                ))}
              </div>
            </ShowHide>
          )}
        </div>
      )}
    </div>
  );
}

function OutageCard({ outage, now }: { outage: Outage; now: number }) {
  const fresh = freshnessLabel(outage, now);
  const over = fresh === "Over";

  return (
    <div
      className={`rounded-md border-2 border-grey-00 bg-white-00 p-5 shadow-sm ${over ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold ${TYPE_BADGE[outage.type]}`}
        >
          {OUTAGE_TYPE_LABEL[outage.type]}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold ${over ? "bg-blue-10 text-grey-100" : "bg-green-10 text-green-100"}`}
        >
          {fresh}
        </span>
        <Text as="span" className="text-grey-100" size="caption">
          Posted {formatDate(outage.published)}
        </Text>
      </div>
      <Heading as="h3" className="mt-2">
        {outage.title}
      </Heading>
      {outage.summary && (
        <Text as="p" className="mt-2">
          {outage.summary}
        </Text>
      )}
      <div className="mt-3">
        <Link external href={outage.link} variant="secondary">
          Read the BWA notice
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function nearestParish(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const p of PARISHES) {
    const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p.value;
    }
  }
  return best;
}
