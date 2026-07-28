import { useState, useEffect, useCallback } from "react";
import { data } from "@/lib/data";

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
    try {
      const rows = await data.devices.list({
        orderBy: { column: "device_type", ascending: true },
      });
      setDevices(rows as Device[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    return data.devices.subscribe(fetchDevices);
  }, [fetchDevices]);

  // Antes desta camada esta mutação não tinha guarda de modo demo e chamava
  // `supabase.from()` com o cliente nulo — estourava TypeError. Agora o
  // adaptador local recusa com mensagem.
  const updateDevice = useCallback(
    (id: string, updates: Partial<Device>) => data.devices.update(id, updates),
    []
  );

  return { devices, loading, error, refetch: fetchDevices, updateDevice };
}
