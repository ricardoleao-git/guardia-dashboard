import { useState, useEffect, useCallback } from "react";
import { data } from "@/lib/data";

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
    try {
      const rows = await data.automationRules.list({
        orderBy: { column: "created_at", ascending: true },
      });
      setRules(rows as AutomationRule[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    return data.automationRules.subscribe(fetchRules);
  }, [fetchRules]);

  // As três mutações abaixo não tinham guarda de modo demo antes desta camada
  // e chamavam `supabase.from()` com o cliente nulo — estouravam TypeError.
  const addRule = useCallback(
    (rule: Partial<AutomationRule>) => data.automationRules.insert(rule),
    []
  );

  const updateRule = useCallback(
    (id: string, updates: Partial<AutomationRule>) => data.automationRules.update(id, updates),
    []
  );

  const deleteRule = useCallback((id: string) => data.automationRules.remove(id), []);

  return { rules, loading, error, refetch: fetchRules, addRule, updateRule, deleteRule };
}
