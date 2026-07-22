import { useState, useCallback, useEffect } from "react";

export interface SearchPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY = "guardia:search-presets";

export function useSearchPresets() {
  const [presets, setPresets] = useState<SearchPreset[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist to localStorage whenever presets change
  const persist = useCallback((updated: SearchPreset[]) => {
    setPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }, []);

  const savePreset = useCallback(
    (name: string, filters: Record<string, any>): SearchPreset => {
      const preset: SearchPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };
      const updated = [...presets, preset];
      persist(updated);
      return preset;
    },
    [presets, persist]
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      persist(updated);
    },
    [presets, persist]
  );

  const updatePreset = useCallback(
    (id: string, name: string, filters: Record<string, any>) => {
      const updated = presets.map((p) =>
        p.id === id ? { ...p, name, filters, createdAt: new Date().toISOString() } : p
      );
      persist(updated);
    },
    [presets, persist]
  );

  return {
    presets,
    savePreset,
    deletePreset,
    updatePreset,
  };
}
