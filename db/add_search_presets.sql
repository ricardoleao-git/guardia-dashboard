-- Migration: Adiciona tabela de presets de busca compartilhados
-- Executar no SQL Editor do Supabase

-- Tabela de presets de busca (compartilhados entre operadores)
CREATE TABLE IF NOT EXISTS search_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_by TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_search_presets_name ON search_presets (name);

-- RLS (Row Level Security) - permite leitura para todos, escrita para autenticados
ALTER TABLE search_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler (dashboard é interno)
CREATE POLICY "Anyone can read search presets" ON search_presets
  FOR SELECT USING (true);

-- Policy: Qualquer um pode inserir (sem auth no MVP)
CREATE POLICY "Anyone can insert search presets" ON search_presets
  FOR INSERT WITH CHECK (true);

-- Policy: Qualquer um pode atualizar
CREATE POLICY "Anyone can update search presets" ON search_presets
  FOR UPDATE USING (true);

-- Policy: Qualquer um pode deletar
CREATE POLICY "Anyone can delete search presets" ON search_presets
  FOR DELETE USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS search_presets_updated_at ON search_presets;
CREATE TRIGGER search_presets_updated_at
  BEFORE UPDATE ON search_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
