import { api } from '../lib/api';
import { Player, GlobalRanking, RankingHistory, Category } from '../types';

export interface RankingFilters {
  state?: string;
  city?: string;
  gender?: string;
  category?: string;
}

export const rankingService = {
  async getRegionalRanking(filters?: RankingFilters): Promise<Player[]> {
    const { ranking } = await api.rankings.getRegional(filters);
    return ranking || [];
  },

  async getGlobalRanking(gender?: string): Promise<GlobalRanking[]> {
    const { ranking } = await api.rankings.getGlobal(gender);
    return ranking || [];
  },

  async getPlayerHistory(playerId?: string): Promise<RankingHistory[]> {
    const { history } = await api.rankings.getHistory(playerId);
    return history || [];
  },

  async getStateRanking(state: string, gender?: string): Promise<Player[]> {
    return this.getRegionalRanking({ state, gender });
  },

  async getCityRanking(state: string, city: string, gender?: string): Promise<Player[]> {
    return this.getRegionalRanking({ state, city, gender });
  },

  async getCategoryRanking(category: string, gender?: string): Promise<Player[]> {
    return this.getRegionalRanking({ category, gender });
  },

  findPlayerPosition(ranking: Player[], playerId: string): number {
    const index = ranking.findIndex(p => p.id === playerId);
    return index !== -1 ? index + 1 : 0;
  },

  findGlobalPlayerPosition(ranking: GlobalRanking[], playerId: string): number {
    const index = ranking.findIndex(p => p.playerId === playerId);
    return index !== -1 ? index + 1 : 0;
  },

  getTopPlayers(ranking: Player[], count: number = 10): Player[] {
    return ranking.slice(0, count);
  },

  getPlayersInRange(ranking: Player[], startPos: number, endPos: number): Player[] {
    return ranking.slice(startPos - 1, endPos);
  },

  calculatePointsChange(history: RankingHistory[]): number {
    if (history.length < 2) return 0;
    const latest = history[0];
    const previous = history[1];
    return latest.rankingPoints - previous.rankingPoints;
  },

  getCategoryColor(category: Category): string {
    const colors: Record<Category, string> = {
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
