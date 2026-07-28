/**
 * Adaptador de eventos de câmera.
 *
 * ⚠️ Esta é a costura onde o vocabulário de fabricante deveria morrer.
 *
 * A tabela `camera_events` carrega cinco colunas de vocabulário P6S —
 * `face_list`, `person_name`, `face_score`, `recognize_image`,
 * `capture_image` (`CLAUDE.md` §9 item 4). O mapeamento abaixo já as traduz,
 * mas para uma forma intermediária (`payload.data.name`, `.score`,
 * `.faceList`), não para o catálogo canônico de `contracts/events/`.
 *
 * Concluir a tradução aqui é o que permite trocar `camera_events` pelo schema
 * canônico sem tocar em nenhuma das 32 telas. Não está feito: depende da
 * PND-16 (nome da tabela e coluna de tenancy) e da PND-02 (chaves de
 * correlação). Ver `docs/spec/05_Roadmap-e-Fases.md` §6.
 */
import { supabase } from "@/lib/supabase";

export interface EventFilters {
  cameraSerial?: string | null;
  operator?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
}

function client() {
  if (!supabase) throw new Error("Supabase não configurado");
  return supabase;
}

/** Linha da tabela → forma que a UI consome. Mapeamento preservado do original. */
function toUiEvent(row: any) {
  return {
    id: row.event_id,
    event_id: row.event_id,
    camera_serial: row.camera_serial,
    operator: row.event_type || "FaceReco",
    payload: {
      data: {
        name: row.person_name,
        score: row.face_score,
        faceList: row.face_list,
        cameraName: row.camera_name,
        recognizeImage: row.recognize_image,
        captureImage: row.capture_image,
      },
      attributes: row.attributes || {},
    },
    media_urls: row.recognize_image
      ? { recognize: row.recognize_image, capture: row.capture_image }
      : null,
    annotations: row.annotations || null,
    connector_id: "connector-bancada-01",
    org_id: "zenite-tech",
    timestamp: row.event_time || row.created_at,
    created_at: row.created_at,
  };
}

export async function fetchEvents(filters: EventFilters) {
  let query = client()
    .from("camera_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit || 100);

  if (filters.cameraSerial) query = query.eq("camera_serial", filters.cameraSerial);
  if (filters.operator) query = query.eq("operator", filters.operator);
  if (filters.dateFrom) query = query.gte("timestamp", filters.dateFrom);
  if (filters.dateTo) query = query.lte("timestamp", filters.dateTo);
  if (filters.search) {
    query = query.or(
      `event_id.ilike.%${filters.search}%,camera_serial.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toUiEvent);
}

export async function fetchConnectorStatus() {
  const { data, error } = await client()
    .from("connector_status")
    .select("*")
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function saveAnnotations(eventId: string, annotations: any[]): Promise<void> {
  const { error } = await client()
    .from("camera_events")
    .update({ annotations })
    .eq("event_id", eventId);
  if (error) throw error;
}

export async function loadAnnotations(eventId: string): Promise<any[] | null> {
  const { data, error } = await client()
    .from("camera_events")
    .select("annotations")
    .eq("event_id", eventId)
    .single();
  if (error) throw error;
  return data?.annotations || null;
}

export function subscribeToNewEvents(callback: (event: any) => void) {
  if (!supabase) return () => {};

  // Binding local: sem ele o TS não consegue provar que `supabase` continua
  // não-nulo dentro do closure de cancelamento.
  const c = supabase;
  const channel = c.channel("camera_events_changes");
  channel.on(
    "postgres_changes" as any,
    { event: "INSERT", table: "camera_events" } as any,
    (payload: any) => callback(toUiEvent(payload.new))
  );
  channel.subscribe();

  return () => {
    c.removeChannel(channel);
  };
}
