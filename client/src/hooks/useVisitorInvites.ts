import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest-mode";
const supabase = supabaseClient!;

export interface VisitorInvite {
  id: string;
  visitor_name: string;
  visitor_doc: string | null;
  visitor_phone: string | null;
  invited_by: string;
  invited_by_id: string | null;
  unit: string | null;
  purpose: string | null;
  expected_arrival: string | null;
  expected_departure: string | null;
  status: string;
  qr_code: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useVisitorInvites() {
  const [invites, setInvites] = useState<VisitorInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("visitor_invites")
        .select("*")
        .order("expected_arrival", { ascending: false });
      if (error) throw error;
      setInvites((data as VisitorInvite[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();

    if (!isSupabaseConfigured || isGuestSession()) return;

    const channel = supabase
      .channel("visitor_invites_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitor_invites" }, () => {
        fetchInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvites]);

  const addInvite = useCallback(async (invite: Partial<VisitorInvite>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível criar convites" };
    const { data, error } = await supabase.from("visitor_invites").insert(invite).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const updateInvite = useCallback(async (id: string, updates: Partial<VisitorInvite>) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível editar convites" };
    const { data, error } = await supabase.from("visitor_invites").update(updates).eq("id", id).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const deleteInvite = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || isGuestSession()) return { error: "Modo demonstração: não é possível excluir convites" };
    const { error } = await supabase.from("visitor_invites").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  }, []);

  return { invites, loading, error, refetch: fetchInvites, addInvite, updateInvite, deleteInvite };
}
