import { describe, it, expect } from 'vitest';
import {
  usgsEventUrl,
  formatMag,
  formatDepth,
  formatLatLng,
  formatEventCount,
  formatRelativeTime,
} from './format';

describe('usgsEventUrl', () => {
  it('builds the USGS event page url from an id', () => {
    expect(usgsEventUrl('nc73872510')).toBe(
      'https://earthquake.usgs.gov/earthquakes/eventpage/nc73872510',
    );
  });
});

describe('formatMag', () => {
  it('formats to one decimal with an M prefix', () => {
    expect(formatMag(4.2)).toBe('M 4.2');
    expect(formatMag(5)).toBe('M 5.0');
  });
  it('handles non-finite magnitudes', () => {
    expect(formatMag(Number.NaN)).toBe('M —');
  });
});

describe('formatDepth', () => {
  it('formats depth to one decimal km', () => {
    expect(formatDepth(12.44)).toBe('12.4 km');
    expect(formatDepth(10)).toBe('10.0 km');
  });
});

describe('formatLatLng', () => {
  it('formats a signed lat/lng pair to three decimals', () => {
    expect(formatLatLng(34.0522, -118.2437)).toBe('34.052°, -118.244°');
  });
});

describe('formatEventCount', () => {
  it('pluralizes correctly', () => {
    expect(formatEventCount(1)).toBe('1 event');
    expect(formatEventCount(0)).toBe('0 events');
    expect(formatEventCount(4)).toBe('4 events');
  });
});

describe('formatRelativeTime', () => {
  it('clamps sub-5s and negative deltas to "just now"', () => {
    expect(formatRelativeTime(0)).toBe('just now');
    expect(formatRelativeTime(4999)).toBe('just now');
    expect(formatRelativeTime(-5000)).toBe('just now');
  });
  it('formats seconds under a minute', () => {
    expect(formatRelativeTime(5000)).toBe('5s ago');
    expect(formatRelativeTime(45_000)).toBe('45s ago');
  });
  it('formats whole minutes under an hour', () => {
    expect(formatRelativeTime(60_000)).toBe('1m ago');
    expect(formatRelativeTime(3 * 60_000 + 999)).toBe('3m ago');
  });
  it('formats hours past an hour', () => {
    expect(formatRelativeTime(60 * 60_000)).toBe('1h ago');
    expect(formatRelativeTime(150 * 60_000)).toBe('2h ago');
  });
});
