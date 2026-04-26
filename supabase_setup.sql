-- Tabela de Visitantes
CREATE TABLE visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Ativar RLS (Segurança em nível de linha)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer usuário autenticado veja todos os visitantes
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON visitors FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir que usuários autenticados criem novos registros
CREATE POLICY "Permitir inserção para usuários autenticados" 
ON visitors FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);
