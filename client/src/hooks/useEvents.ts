import { useState, useEffect, useCallback, useRef } from "react";
import { CameraEvent, FilterState, ConnectorStatus } from "@/lib/types";
import { generateMockEvents, mockConnectorStatus } from "@/lib/mock-data";
import {
  fetchEvents as fetchEventsFromBackend,
  isBackendConfigured,
  isLiveBackend,
  subscribeToNewEvents,
} from "@/lib/data";

const POLL_INTERVAL = 5000; // 5 segundos

export function useEvents(filters: FilterState, activeView?: string) {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchEvents = useCallback(async () => {
    try {
      if (isLiveBackend()) {
        // Buscar do Supabase real (apenas usuários autenticados, não guests)
        const data = await fetchEventsFromBackend({
          cameraSerial: filtersRef.current.cameraSerial,
          operator: filtersRef.current.operator,
          search: filtersRef.current.search,
          dateFrom: filtersRef.current.dateFrom,
          dateTo: filtersRef.current.dateTo,
          limit: 100,
        });
        setEvents(data as CameraEvent[]);
      } else {
        // Mock mode para desenvolvimento
        let mockData = generateMockEvents(50);

        const f = filtersRef.current;
        if (f.cameraSerial) {
          mockData = mockData.filter(e => e.camera_serial === f.cameraSerial);
        }
        if (f.operator) {
          mockData = mockData.filter(e => e.operator === f.operator);
        }
        if (f.search) {
          const search = f.search.toLowerCase();
          mockData = mockData.filter(e =>
            e.event_id.toLowerCase().includes(search) ||
            e.camera_serial.toLowerCase().includes(search) ||
            e.payload?.data?.name?.toLowerCase().includes(search)
          );
        }
        if (f.dateFrom) {
          const fromTime = new Date(f.dateFrom).getTime();
          mockData = mockData.filter(e => new Date(e.timestamp).getTime() >= fromTime);
        }
        if (f.dateTo) {
          const toTime = new Date(f.dateTo).getTime();
          mockData = mockData.filter(e => new Date(e.timestamp).getTime() <= toTime);
        }

        setEvents(mockData);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar eventos");
      // Fallback para mock em caso de erro
      setEvents(generateMockEvents(50));
    } finally {
      setLoading(false);
    }
  }, []);

  // Only run mock realtime interval on dashboard/events views to avoid re-render storms
  const shouldPoll = !activeView || activeView === "dashboard" || activeView === "events" || activeView === "alerts" || activeView === "cameras";

  // Batch realtime events to prevent re-render storms when Supabase fires
  // many INSERT events on initial subscription (known Supabase behavior)
  const pendingEventsRef = useRef<CameraEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchEvents();

    // Realtime subscription se Supabase estiver configurado
    let unsubscribe: (() => void) | undefined;
    if (isLiveBackend()) {
      unsubscribe = subscribeToNewEvents((newEvent) => {
        // Batch events and flush every 500ms to avoid re-render storm
        pendingEventsRef.current.push(newEvent as CameraEvent);
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
          const batch = pendingEventsRef.current;
          pendingEventsRef.current = [];
          if (batch.length > 0) {
            setEvents(prev => {
              // Deduplicate by event_id
              const existingIds = new Set(prev.map(e => e.event_id));
              const newOnes = batch.filter(e => !existingIds.has(e.event_id));
              return [...newOnes, ...prev].slice(0, 100);
            });
          }
        }, 500);
      });
    } else if (shouldPoll) {
      // Mock mode: simulate periodic new events for realtime feel
      const interval = setInterval(() => {
        setEvents(prev => {
          const newEvent = generateMockEvents(1)[0];
          // Only add if not already present
          if (prev.some(e => e.event_id === newEvent.event_id)) return prev;
          return [newEvent, ...prev].slice(0, 100);
        });
      }, POLL_INTERVAL);
      return () => clearInterval(interval);
    }

    return () => {
      unsubscribe?.();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [fetchEvents, filters.cameraSerial, filters.operator, filters.search, filters.dateFrom, filters.dateTo, shouldPoll]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useConnectorStatus() {
  const [status, setStatus] = useState<ConnectorStatus>(mockConnectorStatus);

  useEffect(() => {
    if (!isBackendConfigured()) {
      // Mock: simula atualizações periódicas
      const interval = setInterval(() => {
        setStatus(prev => ({
          ...prev,
          lastSync: new Date().toISOString(),
          totalEvents: prev.totalEvents + Math.floor(Math.random() * 3),
        }));
      }, POLL_INTERVAL);
      return () => clearInterval(interval);
    }

    // TODO: Buscar status real do connector do Supabase
  }, []);

  return status;
}
