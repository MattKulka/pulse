# Pulse — Live Data Dashboard: Design

Date: 2026-07-15
Status: Approved

## Summary

A fluid, animated analytics dashboard built on the **live USGS earthquake feed**
(`all_day.geojson`, no auth). The differentiator is interaction and motion: linked
charts, brush-to-filter cross-filtering, a synchronized crosshair, and smooth D3
transitions when data updates. Reference-quality frontend work, not fake numbers.

## Stack (from the brief, locked)

- **Vite + React 18 + TypeScript (strict)** — dev server pinned to **port 5175**
  (`server.port = 5175` in `vite.config.ts`).
- **TanStack Query** — fetch, cache, auto-refetch of the USGS feed.
- **D3** (scales, shapes, transitions) rendering into **React-controlled SVG**.
  D3 computes geometry; React owns the DOM. No Chart.js. No drop-in chart lib.
- **Geographic view: D3 geo-scatter** on an equirectangular projection from a
  bundled `world-110m` TopoJSON. No MapLibre, no tile token, fully self-contained.
- **Zustand** — cross-chart UI state.
- **Tailwind CSS** — styling, `class` dark-mode strategy.
- **Vitest** (data-transform/scale helpers) + **Playwright** (render + brush cross-filter).

## Data pipeline

```
fetch USGS all_day.geojson
  → normalize GeoJSON features → Quake[]  (id, time, mag, depth, lat, lng, place)
  → Zustand brush/hover/pin state
  → memoized filteredQuakes selector
  → feeds KPI tiles + every chart
```

One source of truth for "what is selected"; everything downstream reacts.

## Linked-interaction model (the hard part)

Single Zustand store:

- `brushRange: [Date, Date] | null` — selected time window
- `hoveredQuakeId: string | null`
- `pinnedQuakeId: string | null`
- `hiddenSeries: Set<string>`

Behaviors:

- **Brushing** the time-series writes `brushRange` → `filteredQuakes` recomputes →
  histogram, geo-scatter, and KPI tiles re-render filtered, with D3 transitions
  (never a hard cut).
- **Crosshair/tooltip**: hovering any panel writes `hoveredQuakeId`; every panel
  reads it and highlights the same datum.
- **Pinning**: clicking a map point writes `pinnedQuakeId`; a detail card stays open.
- **Legend toggles** flip membership in `hiddenSeries`.

## Charts (custom D3-in-React)

- **TimeSeriesChart** — events binned over 24h; animated enter/update/exit on
  refresh; drag-brush overlay for selection.
- **MagnitudeHistogram** — distribution of magnitudes; animated bars.
- **GeoScatter** — D3 equirectangular world; points sized/colored by magnitude;
  clickable to pin.

Shared SVG primitives: `Axis`, `Brush`, `Crosshair`, `Tooltip`.

## File structure

```
pulse/
  CLAUDE.md  README.md  index.html  vite.config.ts (port 5175)
  tailwind.config.ts  eslint + prettier configs
  public/world-110m.json            # bundled TopoJSON, no network map dep
  src/
    types/quake.ts
    lib/usgs.ts                      # fetch + normalize
    lib/transforms.ts                # binning, histogram, KPI math   (Vitest)
    lib/scales.ts  lib/format.ts     #                                (Vitest)
    hooks/useQuakes.ts (TanStack)  useResizeObserver  useCountUp
    store/uiStore.ts                 # Zustand: brush, hover, pin, series
    components/
      layout/ (Header, DashboardGrid)
      kpi/ (KpiRow, KpiTile — count-up)
      charts/ (TimeSeriesChart, MagnitudeHistogram, GeoScatter)
      charts/primitives/ (Axis, Brush, Crosshair, Tooltip)
      states/ (Skeleton, ErrorState, EmptyState, StaleIndicator)
      a11y/DataTableFallback.tsx      # keyboard-navigable fallback
  e2e/                                # Playwright: render + brush cross-filter
```

## Definition of Done (cross-cutting)

- **Performance**: 60fps interactions on the full live dataset; instant brushing.
- **Responsive**: charts reflow, grid stacks, touch works for tooltip/brush.
- **Dark mode**: full light/dark with an accessible categorical chart palette
  (designed, not inverted), driven by CSS variables.
- **Accessibility**: ARIA roles/labels, keyboard-navigable data-table fallback,
  color never the only signal, visible focus.
- **States**: loading skeletons, empty, error-with-retry, stale-data indicator.
- **Code quality**: TS strict, no `any`, ESLint/Prettier clean, no console errors.
- **Docs**: README case study — GIF of brushing/cross-filtering, data-pipeline
  notes, the D3-in-React rendering approach, and the linked-interaction architecture.

## Milestones (commit after each)

0. Scaffold (Vite+TS+Tailwind, port 5175, CLAUDE.md) + data fetch + KPI tiles
1. Time-series chart with animated updates
2. Distribution + geographic views
3. Brushing → cross-filter across all panels
4. Synchronized crosshair/tooltip + point pinning + legend toggles
5. Auto-refresh + skeletons + error/empty states
6. Polish pass (every DoD item) + case-study README

Each milestone verified before commit: build + lint (fix all) → dev server on 5175
→ screenshot each chart and, critically, **mid-brush** to confirm the other panels
filter → confirm no console errors → commit.

## Non-goals

No backend, no auth, no writing data back, no CSV upload. One live source,
beautifully visualized and deeply interactive.
