-- ============================================================
-- GuardIA — Migration: connector_status
-- Cria a tabela de heartbeat do Connector Python (referenciada em
-- connector/src/supabase_sink.py e client/src/lib/supabase.ts, mas
-- ainda sem migration própria).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connector_status (
  connector_id    TEXT PRIMARY KEY,
  online          BOOLEAN NOT NULL DEFAULT false,
  pending_events  INTEGER NOT NULL DEFAULT 0,
  total_events    INTEGER NOT NULL DEFAULT 0,
  cameras_status  JSONB DEFAULT '{}',
  last_sync       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: operadores autenticados podem ler; upsert via anon key (connector on-prem)
ALTER TABLE public.connector_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connector_status_read_authenticated" ON public.connector_status
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "connector_status_upsert_service" ON public.connector_status
  FOR INSERT WITH CHECK (true);
CREATE POLICY "connector_status_update_service" ON public.connector_status
  FOR UPDATE USING (true);

-- Realtime
ALTER TABLE public.connector_status REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_status;
