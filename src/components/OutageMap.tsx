"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { PARISHES } from "@/lib/parishes";

// Design-system token hexes (SVG paths can't take Tailwind classes).
const BLUE_100 = "#00267f";
const BLUE_40 = "#99a8cc";
const RED_100 = "#ff6b6b";

export default function OutageMap({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <MapContainer
      center={[13.19, -59.54]}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      zoom={11}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {PARISHES.map((p) => {
        const count = counts[p.value] ?? 0;
        const active = count > 0;
        const isSelected = selected === p.value;
        return (
          <CircleMarker
            center={[p.lat, p.lon]}
            eventHandlers={{ click: () => onSelect(p.value) }}
            key={p.value}
            pathOptions={{
              color: isSelected ? BLUE_100 : active ? RED_100 : BLUE_40,
              weight: isSelected ? 4 : 2,
              fillColor: active ? RED_100 : BLUE_40,
              fillOpacity: active ? 0.7 : 0.4,
            }}
            radius={active ? 11 + Math.min(count, 4) * 2 : 8}
          >
            <Tooltip>
              {p.label}: {count} {count === 1 ? "notice" : "notices"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
