/**
 * RealtimeNotifications — Pop-ups de alerta em tempo real com ações rápidas.
 * Monitora novos eventos e exibe toasts animados por severidade.
 * Ações: Reconhecer, Ignorar, Escalar.
 * 
 * Features: som de alerta para críticos, favicon badge com contador,
 * toggle de som, i18n para labels.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info, Eye, EyeOff, ArrowUpCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { CameraEvent } from "@/lib/types";
import { evaluateCriticalEvent } from "@/lib/critical-events";

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
  newEventCount?: number;
  onAction?: (notifId: string, action: string) => void;
  events?: CameraEvent[];
}

// ===== Alert Sound (Web Audio API — no external file needed) =====
function playAlertSound(severity: NotifSeverity) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different tones per severity
    if (severity === "critical") {
      // Urgent double-beep: 880Hz then 660Hz
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } else if (severity === "warning") {
      // Single medium beep: 660Hz
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } else {
      // Soft chime: 523Hz (C5)
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    // AudioContext not available (e.g., before user interaction)
  }
}

// ===== Favicon Badge =====
function updateFaviconBadge(count: number) {
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (!favicon) return;

  // Create canvas badge
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Draw base icon (dark rounded square)
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 12);
  ctx.fill();

  // Draw shield icon (simplified)
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("G", size / 2, size / 2 - 2);

  // Draw badge if count > 0
  if (count > 0) {
    const badgeRadius = 14;
    const badgeX = size - badgeRadius - 2;
    const badgeY = badgeRadius + 2;

    // Red circle
    ctx.fillStyle = count > 0 ? "#ef4444" : "#22c55e";
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Count text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = count > 99 ? "99+" : String(count);
    ctx.fillText(text, badgeX, badgeY);
  }

  // Update favicon
  favicon.href = canvas.toDataURL("image/png");
}

// Simulated notification generator for demo mode
const generateDemoNotification = (t: (key: string) => string): PushNotification => {
  const scenarios = [
    {
      severity: "critical" as const,
      title: t("notif.scenario.unknown_face"),
      message: t("notif.scenario.unknown_face_msg"),
      camera: t("camera.d2"),
      actions: ["recognize", "ignore", "escalate"] as const,
    },
    {
      severity: "warning" as const,
      title: t("notif.scenario.low_match"),
      message: t("notif.scenario.low_match_msg"),
      camera: t("camera.d3"),
      actions: ["recognize", "ignore"] as const,
    },
    {
      severity: "critical" as const,
      title: t("notif.scenario.after_hours"),
      message: t("notif.scenario.after_hours_msg"),
      camera: t("camera.d5"),
      actions: ["recognize", "ignore", "escalate"] as const,
    },
    {
      severity: "info" as const,
      title: t("notif.scenario.vehicle_in"),
      message: t("notif.scenario.vehicle_in_msg"),
      camera: t("camera.d1"),
      actions: ["ignore"] as const,
    },
    {
      severity: "success" as const,
      title: t("notif.scenario.recognized"),
      message: t("notif.scenario.recognized_msg"),
      camera: t("camera.d2"),
      actions: ["ignore"] as const,
    },
    {
      severity: "warning" as const,
      title: t("notif.scenario.blacklist"),
      message: t("notif.scenario.blacklist_msg"),
      camera: t("camera.d4"),
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
    labelKey: "notif.severity.critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    ring: "ring-amber-500/20",
    glow: "shadow-amber-500/20",
    labelKey: "notif.severity.warning",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    ring: "ring-blue-500/20",
    glow: "shadow-blue-500/20",
    labelKey: "notif.severity.info",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    ring: "ring-green-500/20",
    glow: "shadow-green-500/20",
    labelKey: "notif.severity.success",
  },
};

export default function RealtimeNotifications({ newEventCount, onAction, events }: RealtimeNotificationsProps) {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastEventCountRef = useRef(newEventCount || 0);

  const actionConfig = {
    recognize: { icon: Eye, label: t("notif.recognize"), color: "text-blue-400 hover:bg-blue-500/15" },
    ignore: { icon: EyeOff, label: t("notif.ignore"), color: "text-muted-foreground hover:bg-muted" },
    escalate: { icon: ArrowUpCircle, label: t("notif.escalate"), color: "text-red-400 hover:bg-red-500/15" },
  };

  const dismissNotif = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleAction = useCallback((notifId: string, action: string) => {
    onAction?.(notifId, action);
    dismissNotif(notifId);
  }, [onAction, dismissNotif]);

  // Play sound + update favicon when new notification arrives
  const addNotification = useCallback((notif: PushNotification) => {
    setNotifications(prev => [notif, ...prev].slice(0, 5));
    setUnreadCount(prev => {
      const newCount = prev + 1;
      updateFaviconBadge(newCount);
      return newCount;
    });
    if (soundEnabled) {
      playAlertSound(notif.severity);
    }
  }, [soundEnabled]);

  // Auto-dismiss after 10 seconds for non-critical
  useEffect(() => {
    const timers = notifications.map(n => {
      if (n.severity === "critical") return null;
      return setTimeout(() => dismissNotif(n.id), 10000);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [notifications, dismissNotif]);

  // Generate real notifications from critical events
  const processedEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!events || events.length === 0) return;

    // Process new events that haven't been notified yet
    const newCriticalEvents = events.filter(
      (e) => !processedEventIds.current.has(e.event_id)
    );

    for (const event of newCriticalEvents) {
      processedEventIds.current.add(event.event_id);
      const alert = evaluateCriticalEvent(event);
      if (alert) {
        const notif: PushNotification = {
          id: `notif-${event.event_id}`,
          severity: alert.level === "info" ? "info" : alert.level,
          title: alert.title,
          message: alert.message,
          camera: event.camera_serial,
          timestamp: new Date(event.timestamp),
          actions: alert.level === "critical"
            ? ["recognize", "ignore", "escalate"]
            : alert.level === "warning"
            ? ["recognize", "ignore"]
            : ["ignore"],
        };
        addNotification(notif);
      }
    }

    // Keep processed set from growing unbounded
    if (processedEventIds.current.size > 500) {
      const recent = new Set(events.map((e) => e.event_id));
      processedEventIds.current = recent;
    }
  }, [events, addNotification]);

  // Fallback: demo notifications only when no real events
  useEffect(() => {
    if (events && events.length > 0) return;

    const initialTimer = setTimeout(() => {
      addNotification(generateDemoNotification(t));
    }, 10000);

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        addNotification(generateDemoNotification(t));
      }
    }, 20000 + Math.random() * 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [addNotification, t, events]);

  // Reset favicon when all notifications dismissed
  useEffect(() => {
    if (notifications.length === 0 && unreadCount === 0) {
      updateFaviconBadge(0);
    }
  }, [notifications, unreadCount]);

  // Cleanup favicon on unmount
  useEffect(() => {
    return () => updateFaviconBadge(0);
  }, []);

  return (
    <>
      {/* Sound toggle button (fixed top-right area, below header) */}
      <button
        onClick={() => setSoundEnabled(prev => !prev)}
        className={cn(
          "fixed top-16 right-4 z-[99] flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95",
          soundEnabled
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-border bg-card text-muted-foreground"
        )}
        title={soundEnabled ? t("notif.sound_on") : t("notif.sound_off")}
        aria-label="Toggle alert sound"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      {/* Notifications stack */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {notifications.map((notif) => {
            const cfg = severityConfig[notif.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={cn(
                  "pointer-events-auto rounded-lg border bg-card/95 backdrop-blur-xl shadow-2xl",
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
                      <span className={cn("text-[9px] font-bold tracking-wider", cfg.color)}>{t(cfg.labelKey)}</span>
                      <span className="text-[9px] text-muted-foreground font-mono-tech">
                        {notif.timestamp.toLocaleTimeString(lang === "zh" ? "zh-CN" : lang === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
      )}
    </>
  );
}
