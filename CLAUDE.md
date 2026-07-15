# CLAUDE.md — Pulse

Live earthquake analytics dashboard. See `README.md` for the case study and
`docs/plans/` for the original design + implementation plan.

## Commands (pnpm only — npm is not used here)

```bash
pnpm dev         # Vite dev server on http://localhost:5175 (port is pinned)
pnpm test        # Vitest unit tests (src/**)
pnpm test:e2e    # Playwright e2e (e2e/) — reuses a running dev server on 5175
pnpm typecheck   # tsc -b --noEmit (strict)
pnpm lint        # eslint
pnpm build       # tsc -b && vite build
```

## Stack

React 18/19 + TypeScript **strict** · Vite (port **5175**) · TanStack Query
(fetch/cache/refetch) · Zustand (cross-panel UI state) · **D3 for math only**,
rendered into React-controlled SVG · Tailwind (class-based dark mode) ·
Vitest + Playwright.

## Non-negotiable conventions

- **No `any`.** Strict TypeScript throughout.
- **D3-in-React:** D3 computes (scales, projections, geoPath, ticks); **React owns
  and renders every SVG node as JSX.** Never `d3.select().append()` on a
  React-managed tree. New charts must follow this.
- **pnpm only.** Do not run npm.
- Bars/points animate via CSS `transform` (e.g. `scaleY` on full-height rects),
  not the SVG `y`/`height` attributes — WebKit/Safari won't transition those.
- All motion is gated behind `@media (prefers-reduced-motion: no-preference)` /
  Tailwind `motion-safe:`; check `src/lib/motion.ts`.
- Colours come from CSS variables/theme tokens (`--c-1..--c-6`, surface/text/
  border) and must read in both light and dark. Magnitude is encoded by size AND
  colour — never colour alone.

## Architecture map

- Data: `src/lib/usgs.ts` (fetch + `normalizeQuakes`), `src/hooks/useQuakes.ts`
  (TanStack Query, 60s refetch). Types in `src/types/quake.ts`.
- Filter composition: `src/hooks/useVisibleQuakes.ts` (data − legend-hidden
  buckets) → `src/hooks/useFilteredQuakes.ts` (visible ∩ brush). Filtering panels
  read `useFilteredQuakes`; the time-series reads `useVisibleQuakes` to keep full
  time context for the brush.
- Cross-panel UI state: `src/store/uiStore.ts` (Zustand — `brushRange`,
  `hoveredQuakeId`, `pinnedQuakeId`, `hiddenSeries`), kept separate from the
  TanStack server cache so selections survive refetches.
- Pure logic (unit-tested): `src/lib/{transforms,scales,format,emptyState,brush,
  tableRows}.ts`.
- Charts: `src/components/charts/` (`TimeSeriesChart`, `MagnitudeHistogram`,
  `GeoScatter`, `Legend`, `primitives/{Axis,Brush,Crosshair,Tooltip}`).
- States: `src/components/states/` (Skeleton, ErrorState, EmptyState,
  StaleIndicator). A11y: `src/components/a11y/DataTable.tsx`.

## Verifying visual changes

The in-app browser preview can drive the dev server but can't reliably raster-
capture it; `scripts/*.mjs` (Playwright) are the verification helpers —
`shot.mjs` (light/dark/mobile screenshots), `brush-proof.mjs`, `hover-pin-proof.mjs`,
`legend-proof.mjs`, `states-proof.mjs`, and `record-gif.mjs` (README GIF). Always
confirm a **normal loaded** dashboard renders (charts non-blank), not only forced
states, before claiming done.
