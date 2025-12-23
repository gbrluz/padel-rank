/*
  # Adicionar pontos ganhos/perdidos às partidas

  1. Alterações
    - Adiciona coluna `team_a_points_change` à tabela `matches`
      - Armazena os pontos ganhos (positivo) ou perdidos (negativo) pelo Time A
    - Adiciona coluna `team_b_points_change` à tabela `matches`
      - Armazena os pontos ganhos (positivo) ou perdidos (negativo) pelo Time B
    
  2. Notas
    - Essas colunas permitem exibir na interface quantos pontos cada jogador ganhou ou perdeu
    - Os valores são definidos quando a partida é finalizada pela edge function complete-match
*/

-- Adicionar colunas de pontos às partidas
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS team_a_points_change integer,
ADD COLUMN IF NOT EXISTS team_b_points_change integer;