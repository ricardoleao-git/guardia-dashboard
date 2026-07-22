import { useState, useEffect, useCallback, useRef } from "react";
import { CameraEvent, FilterState, ConnectorStatus } from "@/lib/types";
import { generateMockEvents, mockConnectorStatus } from "@/lib/mock-data";
import { isSupabaseConfigured, fetchEventsFromSupabase, subscribeToNewEvents } from "@/lib/supabase";

const POLL_INTERVAL = 5000; // 5 segundos

export function useEvents(filters: FilterState) {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchEvents = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        // Buscar do Supabase real
        const data = await fetchEventsFromSupabase({
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

  useEffect(() => {
    fetchEvents();

    // Realtime subscription se Supabase estiver configurado
    let unsubscribe: (() => void) | undefined;
    if (isSupabaseConfigured) {
      unsubscribe = subscribeToNewEvents((newEvent) => {
        setEvents(prev => [newEvent as CameraEvent, ...prev].slice(0, 100));
      });
    } else {
      // Polling para mock mode
      const interval = setInterval(fetchEvents, POLL_INTERVAL);
      return () => clearInterval(interval);
    }

    return () => {
      unsubscribe?.();
    };
  }, [fetchEvents, filters.cameraSerial, filters.operator, filters.search, filters.dateFrom, filters.dateTo]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useConnectorStatus() {
  const [status, setStatus] = useState<ConnectorStatus>(mockConnectorStatus);

  useEffect(() => {
    if (!isSupabaseConfigured) {
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
