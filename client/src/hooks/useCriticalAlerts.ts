import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { CameraEvent } from "@/lib/types";
import { evaluateCriticalEvent, CriticalAlert } from "@/lib/critical-events";
import { operatorLabels } from "@/lib/mock-data";

/**
 * Hook que monitora novos eventos e dispara notificações toast
 * quando eventos críticos são detectados.
 *
 * Uso:
 *   const { checkEvent } = useCriticalAlerts(onEventClick);
 *   checkEvent(newEvent);
 */
export function useCriticalAlerts(onAlertClick?: (event: CameraEvent) => void) {
  // Track eventos já notificados para evitar duplicatas
  const notifiedIds = useRef<Set<string>>(new Set());

  // Limpa IDs antigos a cada 5 minutos para evitar memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      notifiedIds.current.clear();
    }, 5 * 60 * 1000);
    return () => clearInterval(cleanup);
  }, []);

  const checkEvent = useCallback(
    (event: CameraEvent) => {
      // Evita notificar o mesmo evento múltiplas vezes
      if (notifiedIds.current.has(event.event_id)) return;
      notifiedIds.current.add(event.event_id);

      const alert = evaluateCriticalEvent(event);
      if (!alert) return;

      const operatorLabel = operatorLabels[event.operator] || event.operator;
      const thumbnail = event.media_urls?.CaptureImage;

      // Configura a notificação baseada no nível
      switch (alert.level) {
        case "critical":
          toast.error(alert.title, {
            description: alert.message,
            duration: 8000,
            icon: "🚨",
            action: onAlertClick
              ? {
                  label: "Ver detalhes",
                  onClick: () => onAlertClick(event),
                }
              : undefined,
            // Sonner não suporta image nativamente, mas podemos usar custom UI
            className: "border-l-4 border-l-red-500",
          });
          break;

        case "warning":
          toast.warning(alert.title, {
            description: alert.message,
            duration: 5000,
            icon: "⚠️",
            action: onAlertClick
              ? {
                  label: "Ver detalhes",
                  onClick: () => onAlertClick(event),
                }
              : undefined,
            className: "border-l-4 border-l-amber-500",
          });
          break;

        case "info":
          toast.info(alert.title, {
            description: alert.message,
            duration: 3000,
            action: onAlertClick
              ? {
                  label: "Ver",
                  onClick: () => onAlertClick(event),
                }
              : undefined,
            className: "border-l-4 border-l-blue-500",
          });
          break;
      }
    },
    [onAlertClick]
  );

  return { checkEvent };
}

/**
 * Monitora uma lista de eventos e dispara alertas para novos eventos críticos.
 * Compara com a lista anterior para detectar apenas eventos novos.
 */
export function useEventAlerts(
  events: CameraEvent[],
  onAlertClick?: (event: CameraEvent) => void
) {
  const { checkEvent } = useCriticalAlerts(onAlertClick);
  const prevEventIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Na primeira carga, não dispara alertas (evita flood ao carregar histórico)
    if (isFirstLoad.current) {
      prevEventIds.current = new Set(events.map(e => e.event_id));
      isFirstLoad.current = false;
      return;
    }

    // Detecta apenas eventos novos
    const newEvents = events.filter(e => !prevEventIds.current.has(e.event_id));

    // Atualiza o set de IDs conhecidos
    prevEventIds.current = new Set(events.map(e => e.event_id));

    // Verifica cada evento novo
    newEvents.forEach(event => {
      checkEvent(event);
    });
  }, [events, checkEvent]);
}
