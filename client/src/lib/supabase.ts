import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase para o frontend
// Usa a ANON KEY (não a service role) por segurança no browser

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ycqrgrczrunvyivxfnch.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_6ulf03swTJNZdt7DYPqjvg_KJ9z2ckh";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Função helper para buscar eventos
export async function fetchEventsFromSupabase(filters: {
  cameraSerial?: string | null;
  operator?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
}) {
  if (!supabase) throw new Error("Supabase não configurado");

  let query = supabase
    .from("camera_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit || 100);

  if (filters.cameraSerial) {
    query = query.eq("camera_serial", filters.cameraSerial);
  }
  if (filters.operator) {
    query = query.eq("operator", filters.operator);
  }
  if (filters.dateFrom) {
    query = query.gte("timestamp", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("timestamp", filters.dateTo);
  }
  if (filters.search) {
    query = query.or(`event_id.ilike.%${filters.search}%,camera_serial.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Map DB columns to CameraEvent shape expected by the UI
  return (data || []).map((row: any) => ({
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
  }));
}

// Função para buscar status do connector
export async function fetchConnectorStatus() {
  if (!supabase) throw new Error("Supabase não configurado");

  const { data, error } = await supabase
    .from("connector_status")
    .select("*")
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

// Salvar anotações de um evento no Supabase
export async function saveAnnotations(eventId: string, annotations: any[]): Promise<void> {
  if (!supabase) throw new Error("Supabase não configurado");

  const { error } = await supabase
    .from("camera_events")
    .update({ annotations })
    .eq("event_id", eventId);

  if (error) throw error;
}

// Carregar anotações de um evento do Supabase
export async function loadAnnotations(eventId: string): Promise<any[] | null> {
  if (!supabase) throw new Error("Supabase não configurado");

  const { data, error } = await supabase
    .from("camera_events")
    .select("annotations")
    .eq("event_id", eventId)
    .single();

  if (error) throw error;
  return data?.annotations || null;
}

// Setup realtime subscription para novos eventos
export function subscribeToNewEvents(callback: (event: any) => void) {
  if (!supabase) return () => {};

  const channel = supabase.channel("camera_events_changes");
  channel.on(
    "postgres_changes" as any,
    { event: "INSERT", table: "camera_events" } as any,
    (payload: any) => {
      const row = payload.new;
      const mapped = {
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
      callback(mapped);
    }
  );
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
