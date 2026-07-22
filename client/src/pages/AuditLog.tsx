/**
 * AuditLog — Página de auditoria de operadores.
 *
 * Design Philosophy: NVR Dark Theme — timeline vertical com ícones coloridos
 * por tipo de ação, filtros por operador e tipo de ação, exportação.
 *
 * Exibe rastreabilidade completa de quem fez o quê, quando e em qual recurso.
 */
import { useState, useMemo } from "react";
import {
  ScrollText,
  Search,
  Download,
  Edit2,
  Save,
  Trash2,
  FileDown,
  Layers,
  UserPlus,
  UserCog,
  Settings,
  LogIn,
  LogOut,
  Camera,
  Eye,
  Radio,
  Filter,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLog, AuditLogEntry, AuditAction } from "@/hooks/useAuditLog";
import { toast } from "sonner";

const actionConfig: Record<string, { label: string; icon: typeof Edit2; color: string; bg: string }> = {
  annotation_create: { label: "Anotação criada", icon: Edit2, color: "text-blue-400", bg: "bg-blue-500/10" },
  annotation_update: { label: "Anotação editada", icon: Edit2, color: "text-blue-400", bg: "bg-blue-500/10" },
  annotation_clear: { label: "Anotações limpas", icon: Trash2, color: "text-orange-400", bg: "bg-orange-500/10" },
  preset_save: { label: "Preset salvo", icon: Save, color: "text-green-400", bg: "bg-green-500/10" },
  preset_delete: { label: "Preset deletado", icon: Trash2, color: "text-red-400", bg: "bg-red-500/10" },
  preset_apply: { label: "Preset aplicado", icon: Filter, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  report_export: { label: "Relatório exportado", icon: FileDown, color: "text-purple-400", bg: "bg-purple-500/10" },
  batch_action: { label: "Ação em lote", icon: Layers, color: "text-amber-400", bg: "bg-amber-500/10" },
  device_add: { label: "Dispositivo adicionado", icon: Camera, color: "text-green-400", bg: "bg-green-500/10" },
  device_delete: { label: "Dispositivo removido", icon: Trash2, color: "text-red-400", bg: "bg-red-500/10" },
  device_update: { label: "Dispositivo atualizado", icon: Settings, color: "text-blue-400", bg: "bg-blue-500/10" },
  user_invite: { label: "Operador convidado", icon: UserPlus, color: "text-green-400", bg: "bg-green-500/10" },
  user_update: { label: "Operador editado", icon: UserCog, color: "text-blue-400", bg: "bg-blue-500/10" },
  user_delete: { label: "Acesso revogado", icon: Trash2, color: "text-red-400", bg: "bg-red-500/10" },
  user_role_change: { label: "Role alterada", icon: UserCog, color: "text-amber-400", bg: "bg-amber-500/10" },
  config_change: { label: "Config. alterada", icon: Settings, color: "text-orange-400", bg: "bg-orange-500/10" },
  auth_login: { label: "Login", icon: LogIn, color: "text-green-400", bg: "bg-green-500/10" },
  auth_logout: { label: "Logout", icon: LogOut, color: "text-gray-400", bg: "bg-gray-500/10" },
  camera_view: { label: "Câmera visualizada", icon: Camera, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  event_view: { label: "Evento visualizado", icon: Eye, color: "text-gray-400", bg: "bg-gray-500/10" },
  stream_connect: { label: "Stream conectado", icon: Radio, color: "text-green-400", bg: "bg-green-500/10" },
};

function getActionConfig(action: string) {
  return actionConfig[action] || { label: action, icon: ScrollText, color: "text-muted-foreground", bg: "bg-muted/20" };
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Agora";
  if (mins < 60) return `há ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLog() {
  const { logs, loading } = useAuditLog();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    logs.forEach((log) => {
      if (!users.has(log.user_email)) {
        users.set(log.user_email, log.user_email);
      }
    });
    return Array.from(users.entries());
  }, [logs]);

  // Get unique action types for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach((log) => actions.add(log.action));
    return Array.from(actions);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (userFilter !== "all" && log.user_email !== userFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          log.user_email.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.resource_id.toLowerCase().includes(q) ||
          log.resource_type.toLowerCase().includes(q) ||
          JSON.stringify(log.details).toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, userFilter]);

  const handleExport = () => {
    const headers = ["Timestamp", "Usuário", "Ação", "Tipo de Recurso", "ID do Recurso", "Detalhes"];
    const rows = filteredLogs.map((log) => [
      formatFullTimestamp(log.timestamp),
      log.user_email,
      getActionConfig(log.action).label,
      log.resource_type,
      log.resource_id,
      JSON.stringify(log.details),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-guardia-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Auditoria exportada: ${filteredLogs.length} registros`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Auditoria de Operadores
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rastreabilidade completa de ações no sistema
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na auditoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo de ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {uniqueActions.sort().map((action) => {
              const config = getActionConfig(action);
              return (
                <SelectItem key={action} value={action}>
                  {config.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os operadores</SelectItem>
            {uniqueUsers.map(([email]) => (
              <SelectItem key={email} value={email}>
                {email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Registros</p>
          <p className="text-xl font-bold font-display mt-1">{filteredLogs.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Operadores Ativos</p>
          <p className="text-xl font-bold font-display mt-1">
            {new Set(filteredLogs.map((l) => l.user_email)).size}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Últimas 24h</p>
          <p className="text-xl font-bold font-display mt-1">
            {filteredLogs.filter((l) => Date.now() - new Date(l.timestamp).getTime() < 86400000).length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ações Críticas</p>
          <p className="text-xl font-bold font-display mt-1">
            {filteredLogs.filter((l) =>
              ["user_delete", "user_role_change", "config_change", "device_delete", "batch_action"].includes(l.action)
            ).length}
          </p>
        </div>
      </div>

      {/* Audit timeline */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando auditoria...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className={cn("px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer", isExpanded && "bg-accent/20")}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Action icon */}
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{config.label}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0">
                            {log.resource_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 font-mono-tech">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold shrink-0">
                          {log.user_email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{log.user_email}</span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground font-mono-tech truncate">{log.resource_id}</span>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 rounded-md border border-border bg-background/50 p-3 space-y-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Timestamp Completo</p>
                            <p className="text-xs font-mono-tech">{formatFullTimestamp(log.timestamp)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Detalhes</p>
                            <pre className="text-xs font-mono-tech text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                          {log.ip_address && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">IP</p>
                              <p className="text-xs font-mono-tech">{log.ip_address}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
