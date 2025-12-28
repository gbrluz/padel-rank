/*
  # Adiciona campo de telefone aos jogadores

  1. Alteracoes
    - Adiciona coluna `phone` (text) na tabela `players`
    - Campo opcional para armazenar telefone com DDD

  2. Notas
    - Formato esperado: (XX) XXXXX-XXXX
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'phone' AND table_schema = 'public'
  ) THEN
    ALTER TABLE players ADD COLUMN phone text;
  END IF;
END $$;