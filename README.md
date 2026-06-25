# Wuh Water Doing?

A standalone prototype for the Government of Barbados alpha platform.

**Where's the water gone, and when's it back?** When the Barbados Water
Authority (BWA) cuts supply for a repair or planned work, it's hard for
residents to know if *their* area is affected. This app pulls every BWA service
disruption notice into one place: a map of the parishes plus a searchable list.
Pick your area (or use your location) to see current outages, what kind of work
it is, and a "store water now" alert when a planned shut-off is coming.

- **No login, no personal data, no API keys.**
- **Real data via an open feed.** Notices come from the BWA
  [Service Disruptions RSS feed](https://barbadoswaterauthority.com/category/service-disruptions/feed/),
  fetched and parsed server-side (RSS is a stable public contract, not fragile
  HTML scraping). If the feed can't be reached, the app shows realistic seed
  notices so it always works.
- **Map** uses [Leaflet](https://leafletjs.com) + OpenStreetMap tiles (free, no key).

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Leaflet / react-leaflet ·
`@govtech-bb/design` + `@govtech-bb/react` design system. Mirrors the other
alpha prototypes so it drops cleanly into a `gov-bb` branch.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

```
src/
  app/
    layout.tsx              # GovTech header + footer chrome
    page.tsx                # hero + the explorer
    globals.css             # design-system imports + Leaflet sizing
    api/outages/route.ts    # fetch + parse BWA RSS feed -> JSON (seed fallback)
  components/
    OutageExplorer.tsx      # area picker, map, store-water alert, notice list
    OutageMap.tsx           # Leaflet map (client-only, dynamic import)
    layout/                 # header + footer (design-system components)
  lib/
    parishes.ts             # 11 parishes -> coordinates
    outages.ts              # types, parish matching, classification, seed data
```

## Next step (not in this prototype)

Browser/area push notifications ("your area's water is going off in 1 hour")
need a small backend that polls the feed and pushes when you're *not* on the
page. That's the natural follow-on once the data shape here is agreed.
