import { create } from 'zustand';

export interface UiState {
  brushRange: [Date, Date] | null;
  hoveredQuakeId: string | null;
  pinnedQuakeId: string | null;
  hiddenSeries: Set<string>; // magnitude-bucket keys hidden via legend
  setBrushRange: (r: [Date, Date] | null) => void;
  clearBrush: () => void;
  setHoveredQuakeId: (id: string | null) => void;
  setPinnedQuakeId: (id: string | null) => void;
  toggleSeries: (key: string) => void; // add if absent, remove if present
}

export const useUiStore = create<UiState>()((set) => ({
  brushRange: null,
  hoveredQuakeId: null,
  pinnedQuakeId: null,
  hiddenSeries: new Set<string>(),
  setBrushRange: (r) => set({ brushRange: r }),
  clearBrush: () => set({ brushRange: null }),
  setHoveredQuakeId: (id) => set({ hoveredQuakeId: id }),
  setPinnedQuakeId: (id) => set({ pinnedQuakeId: id }),
  toggleSeries: (key) =>
    set((state) => {
      const next = new Set(state.hiddenSeries);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { hiddenSeries: next };
    }),
}));
