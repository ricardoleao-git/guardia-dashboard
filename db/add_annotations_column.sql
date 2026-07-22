-- Migration: Adiciona coluna de anotações na tabela camera_events
-- Executar no SQL Editor do Supabase

-- Adiciona coluna annotations como JSONB (array de objetos de anotação)
ALTER TABLE camera_events
ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN camera_events.annotations IS 'Array de anotações feitas pelos operadores no visualizador de imagens. Cada anotação tem: id, type (rect|circle|highlight), x, y, width, height (normalizados 0-1), color, label, points? (para highlight)';

-- Índice para permitir busca por eventos que têm anotações
CREATE INDEX IF NOT EXISTS idx_camera_events_has_annotations
ON camera_events (event_id)
WHERE annotations IS NOT NULL;
