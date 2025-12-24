import { api } from '../lib/api';
import { Profile } from '../lib/supabase';

export interface RankingFilters {
  state?: string;
  city?: string;
  gender?: string;
  category?: string;
}

export interface GlobalRankingEntry {
  player_id: string;
  full_name: string;
  state: string;
  city: string;
  category: string;
  regional_position: number;
  regional_points: number;
  global_position: number;
  global_points: number;
}

export interface RankingHistory {
  id: string;
  player_id: string;
  ranking_points: number;
  category: string;
  total_matches: number;
  total_wins: number;
  created_at: string;
}

export const rankingService = {
  async getRegionalRanking(filters?: RankingFilters): Promise<Profile[]> {
    const { ranking } = await api.rankings.getRegional(filters);
    return ranking || [];
  },

  async getGlobalRanking(gender?: string): Promise<GlobalRankingEntry[]> {
    const { ranking } = await api.rankings.getGlobal(gender);
    return ranking || [];
  },

  async getPlayerHistory(playerId?: string): Promise<RankingHistory[]> {
    const { history } = await api.rankings.getHistory(playerId);
    return history || [];
  },

  async getStateRanking(state: string, gender?: string): Promise<Profile[]> {
    return this.getRegionalRanking({ state, gender });
  },

  async getCityRanking(state: string, city: string, gender?: string): Promise<Profile[]> {
    return this.getRegionalRanking({ state, city, gender });
  },

  async getCategoryRanking(category: string, gender?: string): Promise<Profile[]> {
    return this.getRegionalRanking({ category, gender });
  },

  findPlayerPosition(ranking: Profile[], playerId: string): number {
    const index = ranking.findIndex(p => p.id === playerId);
    return index !== -1 ? index + 1 : 0;
  },

  findGlobalPlayerPosition(ranking: GlobalRankingEntry[], playerId: string): number {
    const index = ranking.findIndex(p => p.player_id === playerId);
    return index !== -1 ? index + 1 : 0;
  },

  getTopPlayers(ranking: Profile[], count: number = 10): Profile[] {
    return ranking.slice(0, count);
  },

  getPlayersInRange(ranking: Profile[], startPos: number, endPos: number): Profile[] {
    return ranking.slice(startPos - 1, endPos);
  },

  calculatePointsChange(history: RankingHistory[]): number {
    if (history.length < 2) return 0;
    const latest = history[0];
    const previous = history[1];
    return latest.ranking_points - previous.ranking_points;
  },

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Iniciante': '#9CA3AF',
      '7ª': '#8B5CF6',
      '6ª': '#3B82F6',
      '5ª': '#10B981',
      '4ª': '#F59E0B',
      '3ª': '#EF4444',
      '2ª': '#DC2626',
      '1ª': '#7C3AED',
    };
    return colors[category] || '#6B7280';
  },

  formatRankingPosition(position: number): string {
    if (position === 0) return '-';
    if (position === 1) return '1º';
    if (position === 2) return '2º';
    if (position === 3) return '3º';
    return `${position}º`;
  },

  formatPointsChange(change: number): string {
    if (change === 0) return '±0';
    if (change > 0) return `+${change}`;
    return `${change}`;
  },
};
