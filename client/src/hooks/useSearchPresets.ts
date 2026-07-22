import { useState, useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface SearchPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY = "guardia:search-presets";

export function useSearchPresets() {
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"local" | "cloud">("local");

  // Load presets on mount — from Supabase if configured, otherwise from localStorage
  useEffect(() => {
    let cancelled = false;

    async function loadPresets() {
      setLoading(true);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("search_presets")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;

          if (!cancelled && data) {
            const mapped: SearchPreset[] = data.map((row: any) => ({
              id: row.id,
              name: row.name,
              filters: row.filters || {},
              createdAt: row.created_at,
            }));
            setPresets(mapped);
            setSource("cloud");
          }
        } catch (err) {
          // Fallback to localStorage if Supabase fails
          console.warn("Failed to load presets from Supabase, falling back to localStorage:", err);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }

      if (!cancelled) setLoading(false);
    }

    function loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPresets(JSON.parse(stored));
        }
        setSource("local");
      } catch {
        setPresets([]);
        setSource("local");
      }
    }

    loadPresets();

    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to realtime changes when Supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("search_presets_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "search_presets" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            setPresets((prev) => {
              if (prev.find((p) => p.id === row.id)) return prev;
              return [
                {
                  id: row.id,
                  name: row.name,
                  filters: row.filters || {},
                  createdAt: row.created_at,
                },
                ...prev,
              ];
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old;
            setPresets((prev) => prev.filter((p) => p.id !== row.id));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new;
            setPresets((prev) =>
              prev.map((p) =>
                p.id === row.id
                  ? { id: row.id, name: row.name, filters: row.filters || {}, createdAt: row.created_at }
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

  // Persist to localStorage (always, as a backup)
  const persistLocal = useCallback((updated: SearchPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const savePreset = useCallback(
    async (name: string, filters: Record<string, any>): Promise<SearchPreset> => {
      const preset: SearchPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from("search_presets").insert({
            id: preset.id,
            name: preset.name,
            filters: preset.filters,
            created_by: "operator",
          });
          if (error) throw error;
        } catch (err) {
          console.error("Failed to save preset to Supabase:", err);
          // Fallback: save locally
        }
      }

      const updated = [preset, ...presets];
      setPresets(updated);
      persistLocal(updated);
      return preset;
    },
    [presets, persistLocal]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from("search_presets").delete().eq("id", id);
          if (error) throw error;
        } catch (err) {
          console.error("Failed to delete preset from Supabase:", err);
        }
      }

      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      persistLocal(updated);
    },
    [presets, persistLocal]
  );

  const updatePreset = useCallback(
    async (id: string, name: string, filters: Record<string, any>) => {
      const updatedPreset = { name, filters, createdAt: new Date().toISOString() };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from("search_presets")
            .update({ name, filters: updatedPreset.filters })
            .eq("id", id);
          if (error) throw error;
        } catch (err) {
          console.error("Failed to update preset in Supabase:", err);
        }
      }

      const updated = presets.map((p) =>
        p.id === id ? { ...p, ...updatedPreset } : p
      );
      setPresets(updated);
      persistLocal(updated);
    },
    [presets, persistLocal]
  );

  return {
    presets,
    savePreset,
    deletePreset,
    updatePreset,
    loading,
    source,
  };
}
