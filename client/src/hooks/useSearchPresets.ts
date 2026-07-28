import { useState, useCallback, useEffect } from "react";
import { data, isLiveBackend, SEARCH_PRESETS_STORAGE_KEY } from "@/lib/data";

export interface SearchPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY = SEARCH_PRESETS_STORAGE_KEY;

/** A linha do backend usa snake_case; a UI usa camelCase. */
function toPreset(row: any): SearchPreset {
  return {
    id: row.id,
    name: row.name,
    filters: row.filters || {},
    createdAt: row.created_at ?? row.createdAt,
  };
}

/**
 * Backup local mantido mesmo quando há backend — comportamento que este hook
 * já tinha antes da camada de dados e que vale a pena preservar: preset é
 * barato de guardar e caro de perder.
 */
function persistLocal(presets: SearchPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* cota estourada — silencioso, como antes */
  }
}

export function useSearchPresets() {
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"local" | "cloud">("local");

  const load = useCallback(async () => {
    try {
      const rows = await data.searchPresets.list({
        orderBy: { column: "created_at", ascending: false },
      });
      setPresets(rows.map(toPreset));
      setSource(isLiveBackend() ? "cloud" : "local");
    } catch (err) {
      // Backend caiu: o adaptador local já tem o backup do localStorage.
      console.warn("Presets: falha no backend, usando cópia local:", err);
      const local = await data.searchPresets.list();
      setPresets(local.map(toPreset));
      setSource("local");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Realtime: antes o payload era aplicado incrementalmente por evento;
    // agora recarrega. Uma requisição a mais por mudança, em troca de uma
    // única fonte de verdade — o estado não pode divergir do backend.
    return data.searchPresets.subscribe(load);
  }, [load]);

  const savePreset = useCallback(
    async (name: string, filters: Record<string, any>): Promise<SearchPreset> => {
      const preset: SearchPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };

      const res = await data.searchPresets.insert({
        id: preset.id,
        name: preset.name,
        filters: preset.filters,
        created_by: "operator",
      } as any);
      if (res.error) console.error("Falha ao salvar preset:", res.error);

      const updated = [preset, ...presets];
      setPresets(updated);
      persistLocal(updated);
      return preset;
    },
    [presets]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const res = await data.searchPresets.remove(id);
      if (res.error) console.error("Falha ao excluir preset:", res.error);

      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      persistLocal(updated);
    },
    [presets]
  );

  const updatePreset = useCallback(
    async (id: string, name: string, filters: Record<string, any>) => {
      const res = await data.searchPresets.update(id, { name, filters } as any);
      if (res.error) console.error("Falha ao atualizar preset:", res.error);

      const updated = presets.map((p) =>
        p.id === id ? { ...p, name, filters, createdAt: new Date().toISOString() } : p
      );
      setPresets(updated);
      persistLocal(updated);
    },
    [presets]
  );

  return { presets, savePreset, deletePreset, updatePreset, loading, source };
}
