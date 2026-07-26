import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
const supabase = supabaseClient!;

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  condition: string | null;
  condition_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  enabled: boolean;
  trigger_count_today: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRules(data as AutomationRule[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel("automation_rules_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_rules" }, () => fetchRules())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRules]);

  const addRule = useCallback(async (rule: Partial<AutomationRule>) => {
    const { data, error } = await supabase.from("automation_rules").insert(rule).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<AutomationRule>) => {
    const { data, error } = await supabase.from("automation_rules").update(updates).eq("id", id).select().single();
    if (error) return { error: error.message };
    return { data };
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  }, []);

  return { rules, loading, error, refetch: fetchRules, addRule, updateRule, deleteRule };
}
