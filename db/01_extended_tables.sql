-- ============================================================
-- GuardIA — Migration 01: Tabelas Estendidas
-- Cria: automation_rules, face_lists, attendance, vehicles,
--        vehicle_access, visitor_invites, devices, system_config
-- ============================================================

-- 1. automation_rules — Regras de automação
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,          -- facial=estranho, off-duty, ausencia_facial, alarm
  trigger_config JSONB DEFAULT '{}',   -- config do gatilho
  condition   TEXT,                     -- descrição da condição
  condition_config JSONB DEFAULT '{}', -- config da condição (horário, duração, etc)
  action_type TEXT NOT NULL,           -- whatsapp, notificacao, sirene, snapshot
  action_config JSONB DEFAULT '{}',    -- config da ação
  enabled     BOOLEAN DEFAULT true,
  trigger_count_today INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON public.automation_rules(enabled);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_rules_read" ON public.automation_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "automation_rules_write" ON public.automation_rules FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. face_lists — Cadastro de pessoas (biblioteca facial)
CREATE TABLE IF NOT EXISTS public.face_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id      TEXT UNIQUE NOT NULL,   -- ID na câmera P6S
  person_name  TEXT NOT NULL,
  face_list    TEXT NOT NULL DEFAULT 'WhiteList', -- WhiteList, BlackList, Stranger, Visitor
  document     TEXT,                    -- CPF/RG/matricula
  unit         TEXT,                    -- Unidade/Apartamento/Turma
  role         TEXT,                    -- Aluno, Professor, Funcionário, Visitante, etc
  photo_url    TEXT,                    -- URL da foto no Storage
  camera_serial TEXT,                   -- Câmera onde foi cadastrado
  status       TEXT DEFAULT 'active',   -- active, inactive, blocked
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_face_lists_name ON public.face_lists(person_name);
CREATE INDEX IF NOT EXISTS idx_face_lists_list ON public.face_lists(face_list);
CREATE INDEX IF NOT EXISTS idx_face_lists_status ON public.face_lists(status);
ALTER TABLE public.face_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "face_lists_read" ON public.face_lists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "face_lists_write" ON public.face_lists FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. attendance — Registro de presença (ponto eletrônico)
CREATE TABLE IF NOT EXISTS public.attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    UUID REFERENCES public.face_lists(id),
  person_name  TEXT NOT NULL,
  event_id     TEXT,                    -- Referência ao camera_events.event_id
  camera_serial TEXT,
  direction    TEXT DEFAULT 'entry',    -- entry, exit
  event_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_person ON public.attendance(person_name);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_person_date ON public.attendance(person_name, date);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_read" ON public.attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "attendance_write" ON public.attendance FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. vehicles — Cadastro de veículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate        TEXT UNIQUE NOT NULL,    -- Placa do veículo
  model        TEXT,                    -- Modelo
  color        TEXT,                    -- Cor
  owner_name   TEXT,                    -- Nome do proprietário
  owner_id     UUID REFERENCES public.face_lists(id),
  unit         TEXT,                    -- Unidade/Apartamento
  access_type  TEXT DEFAULT 'authorized', -- authorized, visitor, blocked
  valid_from   DATE,
  valid_until  DATE,
  status       TEXT DEFAULT 'active',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_read" ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vehicles_write" ON public.vehicles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. vehicle_access — Log de acesso veicular
CREATE TABLE IF NOT EXISTS public.vehicle_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate        TEXT NOT NULL,
  vehicle_id   UUID REFERENCES public.vehicles(id),
  camera_serial TEXT,
  event_type   TEXT NOT NULL DEFAULT 'plate_detected', -- plate_detected, access_granted, access_denied
  event_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url    TEXT,
  granted      BOOLEAN DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_time ON public.vehicle_access(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_plate ON public.vehicle_access(plate);
ALTER TABLE public.vehicle_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_access_read" ON public.vehicle_access FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vehicle_access_write" ON public.vehicle_access FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 6. visitor_invites — Convites de visitantes
CREATE TABLE IF NOT EXISTS public.visitor_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name TEXT NOT NULL,
  visitor_doc  TEXT,                    -- CPF/RG
  visitor_phone TEXT,
  invited_by   TEXT NOT NULL,           -- Nome de quem convidou
  invited_by_id UUID REFERENCES auth.users(id),
  unit         TEXT,                    -- Unidade a visitar
  purpose      TEXT,                    -- Motivo da visita
  expected_arrival TIMESTAMPTZ,
  expected_departure TIMESTAMPTZ,
  status       TEXT DEFAULT 'pending',  -- pending, approved, arrived, departed, expired, rejected
  qr_code      TEXT,                    -- QR code para acesso
  photo_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visitor_invites_status ON public.visitor_invites(status);
CREATE INDEX IF NOT EXISTS idx_visitor_invites_name ON public.visitor_invites(visitor_name);
ALTER TABLE public.visitor_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitor_invites_read" ON public.visitor_invites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "visitor_invites_write" ON public.visitor_invites FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 7. devices — Dispositivos conectados
CREATE TABLE IF NOT EXISTS public.devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type  TEXT NOT NULL,           -- camera, nvr, ai_box, elevator, connector
  serial       TEXT,                    -- Serial do dispositivo
  name         TEXT NOT NULL,
  ip_address   TEXT,
  model        TEXT,
  location     TEXT,
  firmware     TEXT,
  status       TEXT DEFAULT 'offline',  -- online, offline, error, maintenance
  last_seen    TIMESTAMPTZ,
  config       JSONB DEFAULT '{}',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_type ON public.devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices(status);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices_read" ON public.devices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "devices_write" ON public.devices FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 8. system_config — Configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT UNIQUE NOT NULL,
  value        JSONB NOT NULL DEFAULT '{}',
  description  TEXT,
  category     TEXT DEFAULT 'general',  -- general, security, notifications, integrations
  updated_by   UUID REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "system_config_write" ON public.system_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- DADOS DE EXEMPLO
-- ============================================================

-- Automation rules
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_config, condition, condition_config, action_type, action_config, enabled, trigger_count_today)
VALUES
('Estranho fora de horário', 'Detecta pessoa não cadastrada fora do horário comercial', 'facial', '{"face_list": "Stranger"}', 'fora 07h-18h', '{"start": "07:00", "end": "18:00"}', 'whatsapp', '{"message": "Pessoa não identificada detectada"}', true, 3),
('Portaria vazia', 'Alerta quando portaria fica sem movimento', 'off-duty', '{"camera": "D3"}', '>5min sem movimento', '{"minutes": 5}', 'notificacao', '{"target": "supervisor"}', true, 1),
('Aluno não chegou', 'Avisa se aluno não registrou presença até 08h', 'ausencia_facial', '{"face_list": "WhiteList"}', 'até 08h turma 6A', '{"deadline": "08:00", "group": "6A"}', 'notificacao', '{"target": "responsavel"}', true, 0)
ON CONFLICT DO NOTHING;

-- Face lists (pessoas cadastradas)
INSERT INTO public.face_lists (face_id, person_name, face_list, document, unit, role, status)
VALUES
('FL001', 'João Silva', 'WhiteList', '12345678900', 'Sala 6A', 'Aluno', 'active'),
('FL002', 'Maria Santos', 'WhiteList', '98765432100', 'Sala 6B', 'Aluno', 'active'),
('FL003', 'Pedro Oliveira', 'WhiteList', '11122233344', 'Administração', 'Funcionário', 'active'),
('FL004', 'Ana Costa', 'WhiteList', '55566677788', 'Sala 6A', 'Professor', 'active'),
('FL005', 'Carlos Pereira', 'BlackList', '99988877766', 'N/A', 'Bloqueado', 'blocked'),
('FL006', 'Beatriz Lima', 'WhiteList', '44433322211', 'Sala 7A', 'Aluno', 'active'),
('FL007', 'Ricardo Souza', 'WhiteList', '77788899900', 'Portaria', 'Funcionário', 'active'),
('FL008', 'Fernanda Alves', 'Visitor', '22233344455', 'Bloco B Apto 12', 'Visitante', 'active')
ON CONFLICT DO NOTHING;

-- Attendance (presença)
INSERT INTO public.attendance (person_name, camera_serial, direction, event_time, date)
VALUES
('João Silva', 'D2', 'entry', '2026-07-23 07:15:00', '2026-07-23'),
('Maria Santos', 'D2', 'entry', '2026-07-23 07:22:00', '2026-07-23'),
('Pedro Oliveira', 'D3', 'entry', '2026-07-23 06:50:00', '2026-07-23'),
('Ana Costa', 'D2', 'entry', '2026-07-23 07:05:00', '2026-07-23'),
('Beatriz Lima', 'D2', 'entry', '2026-07-23 07:30:00', '2026-07-23'),
('Ricardo Souza', 'D3', 'entry', '2026-07-23 06:45:00', '2026-07-23'),
('João Silva', 'D2', 'exit', '2026-07-23 16:30:00', '2026-07-23'),
('Maria Santos', 'D2', 'exit', '2026-07-23 16:35:00', '2026-07-23')
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO public.vehicles (plate, model, color, owner_name, unit, access_type, status)
VALUES
('ABC1234', 'Honda Civic', 'Prata', 'Pedro Oliveira', 'Administração', 'authorized', 'active'),
('XYZ5678', 'Toyota Corolla', 'Branco', 'Ana Costa', 'Sala 6A', 'authorized', 'active'),
('DEF9012', 'Fiat Uno', 'Vermelho', 'Carlos Pereira', 'N/A', 'blocked', 'blocked'),
('GHI3456', 'Chevrolet Onix', 'Preto', 'Ricardo Souza', 'Portaria', 'authorized', 'active')
ON CONFLICT DO NOTHING;

-- Visitor invites
INSERT INTO public.visitor_invites (visitor_name, visitor_doc, visitor_phone, invited_by, unit, purpose, expected_arrival, expected_departure, status)
VALUES
('Fernanda Alves', '22233344455', '11988887777', 'Pedro Oliveira', 'Bloco B Apto 12', 'Visita pessoal', '2026-07-23 14:00:00', '2026-07-23 18:00:00', 'arrived'),
('Marcos Vieira', '33344455566', '11977776666', 'Ana Costa', 'Sala 6A', 'Reunião pedagógica', '2026-07-24 09:00:00', '2026-07-24 11:00:00', 'approved'),
('Juliana Rocha', '44455566677', '11966665555', 'Ricardo Souza', 'Portaria', 'Entrega de material', '2026-07-24 10:00:00', '2026-07-24 10:30:00', 'pending')
ON CONFLICT DO NOTHING;

-- Devices
INSERT INTO public.devices (device_type, serial, name, ip_address, model, location, status, last_seen)
VALUES
('camera', 'D1', 'D1 Portaria', '192.168.254.115', 'H5AI-50', 'Portaria', 'offline', '2026-07-22 18:00:00'),
('camera', 'D2', 'D2 Corredor', '192.168.254.206', 'F4C-T', 'Corredor', 'online', now()),
('camera', 'D3', 'D3 Recepção', '192.168.254.208', 'F4C-T', 'Recepção', 'online', now()),
('camera', 'D4', 'D4 AI IPC', '192.168.254.227', 'T5AI', 'AI IPC', 'online', now()),
('camera', 'D5', 'D5 COPA', '192.168.254.207', 'F4C-T', 'COPA', 'online', now()),
('camera', 'D6', 'D6 Estacionamento', '192.168.254.209', 'T5AI', 'Estacionamento', 'online', now()),
('connector', 'connector-bancada-01', 'Connector Bancada 01', '192.168.254.100', 'Raspberry Pi 4', 'Bancada', 'online', now())
ON CONFLICT DO NOTHING;

-- System config
INSERT INTO public.system_config (key, value, description, category)
VALUES
('org_name', '"Zênite Tech - GuardIA"', 'Nome da organização', 'general'),
('timezone', '"America/Sao_Paulo"', 'Fuso horário', 'general'),
('alert_sound', 'true', 'Som de alerta habilitado', 'notifications'),
('whatsapp_enabled', 'false', 'WhatsApp desativado', 'integrations'),
('backup_schedule', '"0 2 * * *"', 'Backup diário às 02h', 'general'),
('retention_days', '90', 'Retenção de eventos em dias', 'security')
ON CONFLICT DO NOTHING;

-- Enable realtime for new tables
ALTER TABLE public.automation_rules REPLICA IDENTITY FULL;
ALTER TABLE public.face_lists REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.visitor_invites REPLICA IDENTITY FULL;
