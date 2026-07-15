/**
 * Why a panel that finished loading still has nothing to show. Kept as a tiny
 * pure function (no React, no store) so the reason logic is unit-testable and
 * shared identically by every panel:
 *  - `all-hidden`  — every magnitude series is toggled off via the legend.
 *  - `brush-empty` — a brush selection is active but no events fall inside it.
 *  - `no-data`     — the feed itself returned nothing to display.
 *  - `null`        — there IS something to render; show the chart, not a state.
 */
export type EmptyReason = 'all-hidden' | 'brush-empty' | 'no-data' | null;

export interface EmptyReasonInput {
  /** Whether the raw feed returned any earthquakes at all. */
  hasData: boolean;
  /** Count after series-visibility ∩ brush filtering (what the panel would draw). */
  filteredCount: number;
  /** The active brush window, or null when nothing is brushed. */
  brushRange: [Date, Date] | null;
  /** Magnitude-bucket keys currently hidden via the legend. */
  hiddenSeries: ReadonlySet<string>;
  /** Every magnitude-bucket key (MAG_BUCKETS keys) for the all-hidden check. */
  allBucketKeys: readonly string[];
}

/**
 * Decide the context-aware empty reason for a panel. Returns null when the panel
 * has data to render. Precedence is deliberate: a genuinely empty feed wins
 * first (no legend/brush action would help), then all-series-hidden (the most
 * directly actionable — re-enable a series), then an empty brush window.
 */
export function emptyReason({
  hasData,
  filteredCount,
  brushRange,
  hiddenSeries,
  allBucketKeys,
}: EmptyReasonInput): EmptyReason {
  if (filteredCount > 0) {
    return null;
  }
  if (!hasData) {
    return 'no-data';
  }
  const allHidden =
    allBucketKeys.length > 0 && allBucketKeys.every((k) => hiddenSeries.has(k));
  if (allHidden) {
    return 'all-hidden';
  }
  if (brushRange !== null) {
    return 'brush-empty';
  }
  return 'no-data';
}
