-- Script para configurar o banco de dados no Supabase (SQL Editor)

-- 1. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  birth_date DATE,
  invited_by TEXT, -- Novo campo: Quem fez o convite
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 2. Adicionar a coluna caso a tabela já exista (prevenção de erro 42P07)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='invited_by') THEN
    ALTER TABLE visitors ADD COLUMN invited_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='age') THEN
    ALTER TABLE visitors ADD COLUMN age INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='gender') THEN
    ALTER TABLE visitors ADD COLUMN gender TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='birth_date') THEN
    ALTER TABLE visitors ADD COLUMN birth_date DATE;
  END IF;
END $$;

-- 3. Ativar RLS (Segurança em nível de linha)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Cria apenas se não existirem)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura para usuários autenticados') THEN
        CREATE POLICY "Permitir leitura para usuários autenticados" ON visitors FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir inserção para usuários autenticados') THEN
        CREATE POLICY "Permitir inserção para usuários autenticados" ON visitors FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
    END IF;
END $$;
