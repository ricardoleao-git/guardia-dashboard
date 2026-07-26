import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest-mode";
const supabase = supabaseClient!;

export interface SystemConfigEntry {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
  updated_by: string | null;
  updated_at: string;
}

export function useSystemConfig() {
  const [entries, setEntries] = useState<SystemConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      setEntries((data as SystemConfigEntry[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();

    if (!isSupabaseConfigured || isGuestSession()) return;

    const channel = supabase
      .channel("system_config_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_config" }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  const getValue = useCallback(
    <T = any>(key: string, fallback?: T): T | undefined =>
      entries.find((e) => e.key === key)?.value ?? fallback,
    [entries]
  );

  const setValue = useCallback(async (key: string, value: any, description?: string, category = "general") => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível alterar configurações" };
    const { data, error } = await supabase
      .from("system_config")
      .upsert({ key, value, description, category }, { onConflict: "key" })
      .select()
      .single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  return { entries, loading, error, refetch: fetchEntries, getValue, setValue };
}

export interface ConnectorStatusRow {
  connector_id: string;
  online: boolean;
  pending_events: number;
  total_events: number;
  cameras_status: Record<string, any>;
  last_sync: string | null;
}

export function useConnectorStatus() {
  const [status, setStatus] = useState<ConnectorStatusRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("connector_status")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setStatus((data as ConnectorStatusRow) || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    if (!isSupabaseConfigured || isGuestSession()) return;

    const channel = supabase
      .channel("connector_status_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "connector_status" }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
