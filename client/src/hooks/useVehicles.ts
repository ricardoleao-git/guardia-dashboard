import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest-mode";
const supabase = supabaseClient!;

export interface Vehicle {
  id: string;
  plate: string;
  model: string | null;
  color: string | null;
  owner_name: string | null;
  owner_id: string | null;
  unit: string | null;
  access_type: string;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("plate", { ascending: true });
      if (error) throw error;
      setVehicles((data as Vehicle[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();

    if (!isSupabaseConfigured || isGuestSession()) return;

    const channel = supabase
      .channel("vehicles_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => {
        fetchVehicles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVehicles]);

  const addVehicle = useCallback(async (vehicle: Partial<Vehicle>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível cadastrar veículos" };
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const updateVehicle = useCallback(async (id: string, updates: Partial<Vehicle>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível editar veículos" };
    const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível excluir veículos" };
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  }, []);

  return { vehicles, loading, error, refetch: fetchVehicles, addVehicle, updateVehicle, deleteVehicle };
}
