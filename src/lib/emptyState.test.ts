import { describe, it, expect } from 'vitest';
import { emptyReason } from './emptyState';
import { MAG_BUCKETS } from './scales';

const ALL_KEYS = MAG_BUCKETS.map((b) => b.key);
const NOW = new Date('2026-07-15T12:00:00Z');
const RANGE: [Date, Date] = [new Date(NOW.getTime() - 3600_000), NOW];

describe('emptyReason', () => {
  it('returns null when the panel has something to render', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 7,
        brushRange: null,
        hiddenSeries: new Set(),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBeNull();
  });

  it('returns null even with a brush and hidden series when the count is > 0', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 3,
        brushRange: RANGE,
        hiddenSeries: new Set([ALL_KEYS[0]]),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBeNull();
  });

  it('reports no-data when the feed itself is empty', () => {
    expect(
      emptyReason({
        hasData: false,
        filteredCount: 0,
        brushRange: null,
        hiddenSeries: new Set(),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('no-data');
  });

  it('prefers no-data over legend/brush reasons when the feed is empty', () => {
    // Nothing the user does to the legend or brush would surface data.
    expect(
      emptyReason({
        hasData: false,
        filteredCount: 0,
        brushRange: RANGE,
        hiddenSeries: new Set(ALL_KEYS),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('no-data');
  });

  it('reports all-hidden when every bucket key is hidden', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 0,
        brushRange: null,
        hiddenSeries: new Set(ALL_KEYS),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('all-hidden');
  });

  it('prefers all-hidden over brush-empty when both apply', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 0,
        brushRange: RANGE,
        hiddenSeries: new Set(ALL_KEYS),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('all-hidden');
  });

  it('does not report all-hidden when only some buckets are hidden', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 0,
        brushRange: null,
        hiddenSeries: new Set([ALL_KEYS[0], ALL_KEYS[1]]),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('no-data');
  });

  it('reports brush-empty when a brush window excludes everything', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 0,
        brushRange: RANGE,
        hiddenSeries: new Set(),
        allBucketKeys: ALL_KEYS,
      }),
    ).toBe('brush-empty');
  });

  it('never reports all-hidden when the bucket-key list is empty (vacuous guard)', () => {
    expect(
      emptyReason({
        hasData: true,
        filteredCount: 0,
        brushRange: null,
        hiddenSeries: new Set(),
        allBucketKeys: [],
      }),
    ).toBe('no-data');
  });
});
