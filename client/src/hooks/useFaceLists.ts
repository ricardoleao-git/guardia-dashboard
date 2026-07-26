import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest-mode";
const supabase = supabaseClient!;

export interface FaceListEntry {
  id: string;
  face_id: string;
  person_name: string;
  face_list: string;
  document: string | null;
  unit: string | null;
  role: string | null;
  photo_url: string | null;
  camera_serial: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFaceLists() {
  const [entries, setEntries] = useState<FaceListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("face_lists")
        .select("*")
        .order("person_name", { ascending: true });
      if (error) throw error;
      setEntries(data as FaceListEntry[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();

    if (!isSupabaseConfigured || isGuestSession()) return;

    // Realtime subscription
    const channel = supabase
      .channel("face_lists_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "face_lists" }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  const addEntry = useCallback(async (entry: Partial<FaceListEntry>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível cadastrar pessoas" };
    const { data, error } = await supabase.from("face_lists").insert(entry).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const updateEntry = useCallback(async (id: string, updates: Partial<FaceListEntry>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível editar pessoas" };
    const { data, error } = await supabase.from("face_lists").update(updates).eq("id", id).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível excluir pessoas" };
    const { error } = await supabase.from("face_lists").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  }, []);

  return { entries, loading, error, refetch: fetchEntries, addEntry, updateEntry, deleteEntry };
}
