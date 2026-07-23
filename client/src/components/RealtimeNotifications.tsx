/**
 * RealtimeNotifications — Pop-ups de alerta em tempo real com ações rápidas.
 * Monitora novos eventos e exibe toasts animados por severidade.
 * Ações: Reconhecer, Ignorar, Escalar.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info, Eye, EyeOff, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotifSeverity = "critical" | "warning" | "info" | "success";

export interface PushNotification {
  id: string;
  severity: NotifSeverity;
  title: string;
  message: string;
  camera?: string;
  timestamp: Date;
  actions?: ("recognize" | "ignore" | "escalate")[];
}

interface RealtimeNotificationsProps {
  /** External feed of new events to trigger notifications */
  newEventCount?: number;
  /** Callback when an action is taken on a notification */
  onAction?: (notifId: string, action: string) => void;
}

// Simulated notification generator for demo mode
const generateDemoNotification = (): PushNotification => {
  const scenarios = [
    {
      severity: "critical" as const,
      title: "Rosto não reconhecido",
      message: "Pessoa não identificada detectada",
      camera: "D2 — Corredor",
      actions: ["recognize", "ignore", "escalate"] as const,
    },
    {
      severity: "warning" as const,
      title: "Match facial baixo (45%)",
      message: "Score abaixo do threshold configurado",
      camera: "D3 — Recepção",
      actions: ["recognize", "ignore"] as const,
    },
    {
      severity: "critical" as const,
      title: "Movimento fora de horário",
      message: "Detecção após horário permitido",
      camera: "D5 — Portão",
      actions: ["recognize", "ignore", "escalate"] as const,
    },
    {
      severity: "info" as const,
      title: "Veículo autorizado entrou",
      message: "Placa ABC1D23 — Lista Branca",
      camera: "D1 — Portaria",
      actions: ["ignore"] as const,
    },
    {
      severity: "success" as const,
      title: "Pessoa reconhecida",
      message: "João Silva — Lista Branca (98%)",
      camera: "D2 — Corredor",
      actions: ["ignore"] as const,
    },
    {
      severity: "warning" as const,
      title: "Lista Negra detectada",
      message: "Match 92% com cadastro de alerta",
      camera: "D4 — AI IPC",
      actions: ["recognize", "escalate"] as const,
    },
  ];
    const s = scenarios[Math.floor(Math.random() * scenarios.length)];
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      severity: s.severity,
      title: s.title,
      message: s.message,
      camera: s.camera,
      actions: [...s.actions],
      timestamp: new Date(),
    };
};

const severityConfig = {
  critical: {
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    ring: "ring-red-500/20",
    glow: "shadow-red-500/20",
    label: "CRÍTICO",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    ring: "ring-amber-500/20",
    glow: "shadow-amber-500/20",
    label: "ALERTA",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    ring: "ring-blue-500/20",
    glow: "shadow-blue-500/20",
    label: "INFO",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    ring: "ring-green-500/20",
    glow: "shadow-green-500/20",
    label: "OK",
  },
};

const actionConfig = {
  recognize: { icon: Eye, label: "Reconhecer", color: "text-blue-400 hover:bg-blue-500/15" },
  ignore: { icon: EyeOff, label: "Ignorar", color: "text-muted-foreground hover:bg-muted" },
  escalate: { icon: ArrowUpCircle, label: "Escalar", color: "text-red-400 hover:bg-red-500/15" },
};

export default function RealtimeNotifications({ newEventCount, onAction }: RealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastEventCountRef = useRef(newEventCount || 0);

  const dismissNotif = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((notifId: string, action: string) => {
    onAction?.(notifId, action);
    dismissNotif(notifId);
  }, [onAction, dismissNotif]);

  // Auto-dismiss after 10 seconds for non-critical
  useEffect(() => {
    const timers = notifications.map(n => {
      if (n.severity === "critical") return null; // Critical stays until dismissed
      return setTimeout(() => dismissNotif(n.id), 10000);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [notifications, dismissNotif]);

  // Generate demo notifications periodically
  useEffect(() => {
    // Initial notification after 3s
    const initialTimer = setTimeout(() => {
      setNotifications(prev => [generateDemoNotification(), ...prev].slice(0, 5));
    }, 3000);

    // Periodic notifications every 15-30s
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        setNotifications(prev => [generateDemoNotification(), ...prev].slice(0, 5));
      }
    }, 15000 + Math.random() * 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // React to external event count changes
  useEffect(() => {
    if (newEventCount && newEventCount > lastEventCountRef.current) {
      const diff = newEventCount - lastEventCountRef.current;
      if (diff > 0 && Math.random() > 0.3) {
        setNotifications(prev => [generateDemoNotification(), ...prev].slice(0, 5));
      }
    }
    lastEventCountRef.current = newEventCount || 0;
  }, [newEventCount]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const cfg = severityConfig[notif.severity];
        const Icon = cfg.icon;
        return (
          <div
            key={notif.id}
            className={cn(
              "pointer-events-auto rounded-lg border bg-card/95 backdrop-blur-xl shadow-2xl",
              "animate-in slide-in-from-right-full duration-300 ease-out",
              cfg.border, cfg.glow
            )}
            style={{ animation: "slideInRight 0.3s cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            {/* Header */}
            <div className={cn("flex items-start gap-3 p-3.5", cfg.bg)}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.bg, "ring-1", cfg.ring)}>
                <Icon className={cn("h-5 w-5", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-bold tracking-wider", cfg.color)}>{cfg.label}</span>
                  <span className="text-[9px] text-muted-foreground font-mono-tech">
                    {notif.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{notif.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                {notif.camera && (
                  <p className="text-[10px] text-muted-foreground/70 font-mono-tech mt-1">{notif.camera}</p>
                )}
              </div>
              <button
                onClick={() => dismissNotif(notif.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            {notif.actions && notif.actions.length > 0 && (
              <div className="flex items-center gap-1 px-3.5 py-2 border-t border-border/50">
                {notif.actions.map((actionKey) => {
                  const acfg = actionConfig[actionKey];
                  const AIcon = acfg.icon;
                  return (
                    <button
                      key={actionKey}
                      onClick={() => handleAction(notif.id, actionKey)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 active:scale-95",
                        acfg.color
                      )}
                    >
                      <AIcon className="h-3 w-3" />
                      {acfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
