/**
 * useAuditLog — Hook para registro e consulta de auditoria de operadores.
 *
 * Rastreia todas as ações realizadas por operadores no sistema:
 * - Anotações criadas/editadas/limpas em eventos
 * - Presets de busca salvos/deletados
 * - Exportação de relatórios
 * - Ações em lote (dispositivos)
 * - Login/logout
 * - Alterações de configuração
 * - Convite/remoção de operadores
 *
 * Em modo demo, registra em localStorage. Com Supabase, usa tabela audit_logs.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type AuditAction =
  | "annotation_create"
  | "annotation_update"
  | "annotation_clear"
  | "preset_save"
  | "preset_delete"
  | "preset_apply"
  | "report_export"
  | "batch_action"
  | "device_add"
  | "device_delete"
  | "device_update"
  | "user_invite"
  | "user_update"
  | "user_delete"
  | "user_role_change"
  | "config_change"
  | "auth_login"
  | "auth_logout"
  | "camera_view"
  | "event_view"
  | "stream_connect"
  | string;

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
}

const STORAGE_KEY = "guardia_audit_logs";

// Mock audit entries for demo mode
const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-001",
    user_id: "demo-1",
    user_email: "ricardo@zenitetech.com",
    action: "auth_login",
    resource_type: "system",
    resource_id: "guardia-dashboard",
    details: { method: "password", demo: true },
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-002",
    user_id: "demo-2",
    user_email: "operador1@escola.com.br",
    action: "annotation_create",
    resource_type: "event",
    resource_id: "EVT000123",
    details: { type: "rectangle", color: "red", count: 2 },
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-003",
    user_id: "demo-2",
    user_email: "operador1@escola.com.br",
    action: "preset_save",
    resource_type: "search_preset",
    resource_id: "preset-abc",
    details: { name: "Rostos não reconhecidos hoje", filters: { operator: "FaceReco", timeRange: "24h" } },
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-004",
    user_id: "demo-3",
    user_email: "portaria@condominio.com.br",
    action: "report_export",
    resource_type: "events",
    resource_id: "report-2026-07",
    details: { format: "PDF", event_count: 47, filters: { operator: "VehicleReco" } },
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-005",
    user_id: "demo-1",
    user_email: "ricardo@zenitetech.com",
    action: "user_invite",
    resource_type: "user",
    resource_id: "novo.operador@escola.com.br",
    details: { role: "operator", name: "Juliana Ferreira" },
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-006",
    user_id: "demo-2",
    user_email: "operador1@escola.com.br",
    action: "annotation_update",
    resource_type: "event",
    resource_id: "EVT000118",
    details: { added: 1, removed: 0, total: 3 },
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-007",
    user_id: "demo-3",
    user_email: "portaria@condominio.com.br",
    action: "batch_action",
    resource_type: "devices",
    resource_id: "batch-restart",
    details: { action: "restart", device_count: 3, devices: ["D2", "D3", "D4"] },
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-008",
    user_id: "demo-1",
    user_email: "ricardo@zenitetech.com",
    action: "config_change",
    resource_type: "system_config",
    resource_id: "rtsp-port",
    details: { field: "rtspPort", old_value: 554, new_value: 8554 },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-009",
    user_id: "demo-4",
    user_email: "diretor@escola.com.br",
    action: "event_view",
    resource_type: "event",
    resource_id: "EVT000095",
    details: { camera: "F4C-T-D2", operator: "FaceReco" },
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-010",
    user_id: "demo-2",
    user_email: "operador1@escola.com.br",
    action: "preset_delete",
    resource_type: "search_preset",
    resource_id: "preset-old",
    details: { name: "Filtro antigo" },
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-011",
    user_id: "demo-1",
    user_email: "ricardo@zenitetech.com",
    action: "user_role_change",
    resource_type: "user",
    resource_id: "demo-4",
    details: { user: "diretor@escola.com.br", old_role: "operator", new_role: "viewer" },
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "audit-012",
    user_id: "demo-3",
    user_email: "portaria@condominio.com.br",
    action: "stream_connect",
    resource_type: "camera",
    resource_id: "F4C-T-D4",
    details: { protocol: "webrtc", camera_name: "Portão" },
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export function useAuditLog() {
  const { user, isDemoMode } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load audit logs
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200)
        .then(({ data, error }) => {
          if (!error && data) {
            setLogs(data as AuditLogEntry[]);
          } else {
            // Fallback to mock + local
            setLogs([...getLocalLogs(), ...mockAuditLogs]);
          }
          setLoading(false);
        });
    } else {
      // Demo mode — use mock + localStorage
      setLogs([...getLocalLogs(), ...mockAuditLogs]);
      setLoading(false);
    }
  }, []);

  // Log an action
  const logAction = useCallback(
    async (
      action: AuditAction,
      resourceType: string,
      resourceId: string,
      details: Record<string, any> = {}
    ) => {
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user_id: user?.id || (isDemoMode ? "demo-current" : null),
        user_email: user?.email || (isDemoMode ? "demo@guardia.local" : "sistema"),
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        timestamp: new Date().toISOString(),
      };

      // Add to local state immediately
      setLogs((prev) => [entry, ...prev]);

      // Persist
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("audit_logs").insert({
            user_id: entry.user_id,
            user_email: entry.user_email,
            action: entry.action,
            resource_type: entry.resource_type,
            resource_id: entry.resource_id,
            details: entry.details,
            timestamp: entry.timestamp,
          });
        } catch (err) {
          console.error("Erro ao registrar auditoria:", err);
          // Fallback to localStorage
          saveLocalLog(entry);
        }
      } else {
        saveLocalLog(entry);
      }

      return entry;
    },
    [user, isDemoMode]
  );

  return { logs, loading, logAction };
}

// --- localStorage helpers for demo mode ---
function getLocalLogs(): AuditLogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuditLogEntry[];
      // Only keep last 50 local logs
      return parsed.slice(0, 50);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLog(entry: AuditLogEntry) {
  try {
    const existing = getLocalLogs();
    const updated = [entry, ...existing].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
