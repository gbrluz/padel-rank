import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { api } from './api';
export * from '../services';

export type Profile = {
  id: string;
  full_name: string;
  gender: 'male' | 'female';
  birth_date: string;
  preferred_side: 'left' | 'right' | 'both';
  category: string;
  state: string;
  city: string;
  availability: Record<string, string[]>;
  photo_url: string | null;
  ranking_points: number;
  total_matches: number;
  total_wins: number;
  win_rate: string | number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  gender: 'male' | 'female';
  status: 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';
  team_a_player1_id: string;
  team_a_player2_id: string;
  team_b_player1_id: string;
  team_b_player2_id: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_team: 'team_a' | 'team_b' | null;
  team_a_was_duo: boolean;
  team_b_was_duo: boolean;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QueueEntry = {
  id: string;
  player_id: string;
  partner_id: string | null;
  gender: 'male' | 'female';
  status: 'active' | 'matched' | 'cancelled';
  average_ranking: number;
  created_at: string;
  updated_at: string;
};

export type MatchApproval = {
  id: string;
  match_id: string;
  player_id: string;
  approved: boolean | null;
  approved_at: string | null;
  created_at: string;
};

export function getCategoryFromPoints(points: number): string {
  if (points < 200) return 'Iniciante';
  if (points < 400) return '7ª';
  if (points < 600) return '6ª';
  if (points < 800) return '5ª';
  if (points < 1000) return '4ª';
  if (points < 1200) return '3ª';
  if (points < 1400) return '2ª';
  return '1ª';
}
