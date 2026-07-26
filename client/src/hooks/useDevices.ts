import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
const supabase = supabaseClient!;

export interface Device {
  id: string;
  device_type: string;
  serial: string | null;
  name: string;
  ip_address: string | null;
  model: string | null;
  location: string | null;
  firmware: string | null;
  status: string;
  last_seen: string | null;
  config: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("device_type", { ascending: true });
      if (error) throw error;
      setDevices(data as Device[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel("devices_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => fetchDevices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDevices]);

  const updateDevice = useCallback(async (id: string, updates: Partial<Device>) => {
    const { data, error } = await supabase.from("devices").update(updates).eq("id", id).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  return { devices, loading, error, refetch: fetchDevices, updateDevice };
}
