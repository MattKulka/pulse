import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

const initialState = {
  brushRange: null,
  hoveredQuakeId: null,
  pinnedQuakeId: null,
  hiddenSeries: new Set<string>(),
};

beforeEach(() => {
  useUiStore.setState(initialState);
});

describe('uiStore', () => {
  it('setBrushRange sets the range', () => {
    const range: [Date, Date] = [new Date('2024-01-01'), new Date('2024-01-02')];
    useUiStore.getState().setBrushRange(range);
    expect(useUiStore.getState().brushRange).toBe(range);
  });

  it('clearBrush nulls the range', () => {
    useUiStore.getState().setBrushRange([new Date('2024-01-01'), new Date('2024-01-02')]);
    useUiStore.getState().clearBrush();
    expect(useUiStore.getState().brushRange).toBeNull();
  });

  it('setHoveredQuakeId sets and clears the hovered id', () => {
    useUiStore.getState().setHoveredQuakeId('abc');
    expect(useUiStore.getState().hoveredQuakeId).toBe('abc');
    useUiStore.getState().setHoveredQuakeId(null);
    expect(useUiStore.getState().hoveredQuakeId).toBeNull();
  });

  it('setPinnedQuakeId sets and clears the pinned id', () => {
    useUiStore.getState().setPinnedQuakeId('xyz');
    expect(useUiStore.getState().pinnedQuakeId).toBe('xyz');
    useUiStore.getState().setPinnedQuakeId(null);
    expect(useUiStore.getState().pinnedQuakeId).toBeNull();
  });

  it('toggleSeries adds a key when absent then removes it when present', () => {
    useUiStore.getState().toggleSeries('3-4');
    expect(useUiStore.getState().hiddenSeries.has('3-4')).toBe(true);
    useUiStore.getState().toggleSeries('3-4');
    expect(useUiStore.getState().hiddenSeries.has('3-4')).toBe(false);
  });

  it('toggleSeries produces a new Set (immutable update)', () => {
    const before = useUiStore.getState().hiddenSeries;
    useUiStore.getState().toggleSeries('5-6');
    expect(useUiStore.getState().hiddenSeries).not.toBe(before);
  });

  it('toggling one key does not affect another', () => {
    useUiStore.getState().toggleSeries('1-2');
    useUiStore.getState().toggleSeries('4-5');
    expect(useUiStore.getState().hiddenSeries.has('1-2')).toBe(true);
    useUiStore.getState().toggleSeries('1-2');
    expect(useUiStore.getState().hiddenSeries.has('1-2')).toBe(false);
    expect(useUiStore.getState().hiddenSeries.has('4-5')).toBe(true);
  });
});
