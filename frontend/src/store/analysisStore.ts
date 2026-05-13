import { create } from 'zustand';
import type { AnalysisResult, ProgressEvent, AlertLevel } from '../types';

interface Filters {
  levels: AlertLevel[];
  typeQuery: string;
}

interface AnalysisStore {
  result: AnalysisResult | null;
  isRunning: boolean;
  isDemoMode: boolean;
  progress: ProgressEvent[];
  error: string | null;
  filters: Filters;

  setResult: (r: AnalysisResult) => void;
  addProgress: (p: ProgressEvent) => void;
  setRunning: (v: boolean) => void;
  setError: (e: string | null) => void;
  setFilters: (f: Partial<Filters>) => void;
  clearProgress: () => void;
  loadDemo: () => Promise<void>;
  reset: () => void;
}

const defaultFilters: Filters = {
  levels: ['CRITICAL', 'HIGH', 'MEDIUM'],
  typeQuery: '',
};

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  result: null,
  isRunning: false,
  isDemoMode: false,
  progress: [],
  error: null,
  filters: defaultFilters,

  setResult: (result) => set({ result, isDemoMode: false }),
  addProgress: (event) =>
    set((state) => ({
      progress: [...state.progress, event],
    })),
  setRunning: (isRunning) => set({ isRunning }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  clearProgress: () => set({ progress: [] }),
  loadDemo: async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${base}demo-data.json`);
      const data: AnalysisResult = await res.json();
      set({ result: data, isDemoMode: true, error: null });
    } catch {
      set({ error: 'Não foi possível carregar dados demo.' });
    }
  },
  reset: () =>
    set({
      result: null,
      isRunning: false,
      isDemoMode: false,
      progress: [],
      error: null,
      filters: defaultFilters,
    }),
}));
