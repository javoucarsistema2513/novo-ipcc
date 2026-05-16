-- SCRIPT COMPLETO PARA O SUPABASE (SQL EDITOR)
-- Copie e cole todo este código no SQL Editor do seu projeto Supabase e clique em 'Run'

-- 1. Criar a tabela se não existir (ou atualizar se houver novos campos)
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  age INTEGER,
  gender TEXT,
  birth_date DATE,
  invited_by TEXT,
  participates_in_cell TEXT,
  cell_leader TEXT,
  category TEXT,
  is_married_or_lives_together TEXT,
  prayer_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 2. Garantir que todas as colunas existem (caso a tabela já tenha sido criada antes)
DO $$ 
BEGIN 
  -- Lista de colunas para verificar/adicionar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='invited_by') THEN
    ALTER TABLE public.visitors ADD COLUMN invited_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='age') THEN
    ALTER TABLE public.visitors ADD COLUMN age INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='gender') THEN
    ALTER TABLE public.visitors ADD COLUMN gender TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='birth_date') THEN
    ALTER TABLE public.visitors ADD COLUMN birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='participates_in_cell') THEN
    ALTER TABLE public.visitors ADD COLUMN participates_in_cell TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='cell_leader') THEN
    ALTER TABLE public.visitors ADD COLUMN cell_leader TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='category') THEN
    ALTER TABLE public.visitors ADD COLUMN category TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='is_married_or_lives_together') THEN
    ALTER TABLE public.visitors ADD COLUMN is_married_or_lives_together TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='prayer_request') THEN
    ALTER TABLE public.visitors ADD COLUMN prayer_request TEXT;
  END IF;
END $$;

-- 3. Habilitar Segurança (RLS)
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 4. Criar as Políticas de Acesso
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON visitors;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON visitors;
DROP POLICY IF EXISTS "Permitir deleção para quem criou" ON visitors;
DROP POLICY IF EXISTS "Permitir atualização para quem criou" ON visitors;

CREATE POLICY "Permitir leitura para usuários autenticados" ON visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção para usuários autenticados" ON visitors FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Permitir deleção para quem criou" ON visitors FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Permitir atualização para quem criou" ON visitors FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
