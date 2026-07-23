-- ============================================================
-- GuardIA Dashboard — Setup Completo do Banco de Dados
-- Execute TODO este script no SQL Editor do Supabase
-- Ordem: camera_events → annotations → profiles → search_presets → audit_logs
-- ============================================================

-- ============================================================
-- 1. Tabela principal: camera_events
--    (eventos de reconhecimento facial das câmeras P6S)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.camera_events (
  event_id        TEXT PRIMARY KEY,
  camera_serial   TEXT NOT NULL,
  camera_name     TEXT,
  event_type      TEXT NOT NULL DEFAULT 'face',
  face_list       TEXT,
  person_name     TEXT,
  face_score      INTEGER,
  recognize_image TEXT,
  capture_image   TEXT,
  event_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attributes      JSONB DEFAULT '{}',
  annotations     JSONB DEFAULT NULL
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_camera_events_time ON public.camera_events (event_time DESC);
CREATE INDEX IF NOT EXISTS idx_camera_events_camera ON public.camera_events (camera_serial);
CREATE INDEX IF NOT EXISTS idx_camera_events_face_list ON public.camera_events (face_list);
CREATE INDEX IF NOT EXISTS idx_camera_events_has_annotations
  ON public.camera_events (event_id) WHERE annotations IS NOT NULL;

-- RLS: operadores autenticados podem ler; inserção via service_role (connector)
ALTER TABLE public.camera_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camera_events_read_authenticated" ON public.camera_events
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "camera_events_insert_service" ON public.camera_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "camera_events_update_authenticated" ON public.camera_events
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_events;

-- ============================================================
-- 2. Profiles (estende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-criar profile quando um novo usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. Search presets (presets de busca compartilhados)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.search_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_by TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_presets_name ON public.search_presets (name);

ALTER TABLE public.search_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_presets_read_all" ON public.search_presets FOR SELECT USING (true);
CREATE POLICY "search_presets_insert_all" ON public.search_presets FOR INSERT WITH CHECK (true);
CREATE POLICY "search_presets_update_all" ON public.search_presets FOR UPDATE USING (true);
CREATE POLICY "search_presets_delete_all" ON public.search_presets FOR DELETE USING (true);

DROP TRIGGER IF EXISTS search_presets_updated_at ON public.search_presets;
CREATE TRIGGER search_presets_updated_at
  BEFORE UPDATE ON public.search_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.search_presets;

-- ============================================================
-- 4. Audit logs (rastreabilidade de operadores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT NOT NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  details       JSONB DEFAULT '{}',
  ip_address    TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_read_all" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "audit_logs_delete_admin" ON public.audit_logs
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Auto-cleanup: manter últimos 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE timestamp < now() - INTERVAL '90 days';
END;
$$;

-- ============================================================
-- 5. Storage bucket para imagens (capturas e cadastros)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: operadores autenticados podem ler imagens
CREATE POLICY "event_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

-- Policy: connector (service_role) pode inserir imagens
CREATE POLICY "event_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-images');

-- ============================================================
-- PRONTO! O banco está configurado.
-- Próximos passos:
-- 1. Criar usuário admin no Supabase Auth (Authentication > Users > Add user)
-- 2. Configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
-- 3. Reiniciar o servidor
-- ============================================================
