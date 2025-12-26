import { api } from '../lib/api';
import { Player, SystemStats } from '../types';

export interface AdminPlayer extends Player {
  email: string;
}

export const adminService = {
  async getAllPlayers(search?: string): Promise<AdminPlayer[]> {
    const { players } = await api.admin.getPlayers(search);
    return players || [];
  },

  async searchPlayers(query: string): Promise<AdminPlayer[]> {
    return this.getAllPlayers(query);
  },

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<AdminPlayer> {
    const { player } = await api.admin.updatePlayer(playerId, updates);
    return player;
  },

  async getSystemStats(): Promise<SystemStats> {
    const { stats } = await api.admin.getStats();
    return stats;
  },

  async makeAdmin(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { is_admin: true });
  },

  async removeAdmin(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { is_admin: false });
  },

  async updatePlayerPoints(playerId: string, points: number): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { ranking_points: points });
  },

  async resetPlayerStats(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, {
      ranking_points: 1000,
      total_matches: 0,
      total_wins: 0,
      win_rate: 0,
    });
  },

  validatePlayerUpdate(updates: Partial<Player>): string | null {
    if (updates.ranking_points !== undefined && updates.ranking_points < 0) {
      return 'Pontos de ranking não podem ser negativos';
    }

    if (updates.total_matches !== undefined && updates.total_matches < 0) {
      return 'Total de partidas não pode ser negativo';
    }

    if (updates.total_wins !== undefined && updates.total_wins < 0) {
      return 'Total de vitórias não pode ser negativo';
    }

    if (
      updates.total_wins !== undefined &&
      updates.total_matches !== undefined &&
      updates.total_wins > updates.total_matches
    ) {
      return 'Total de vitórias não pode ser maior que total de partidas';
    }

    if (updates.full_name && updates.full_name.trim().length === 0) {
      return 'Nome não pode ser vazio';
    }

    if (updates.full_name && updates.full_name.length > 100) {
      return 'Nome muito longo (máximo 100 caracteres)';
    }

    return null;
  },

  formatStats(stats: SystemStats): string[] {
    return [
      `${stats.totalPlayers} jogadores cadastrados`,
      `${stats.totalMatches} partidas realizadas`,
      `${stats.totalLeagues} ligas criadas`,
      `${stats.activeQueueEntries} jogadores na fila`,
    ];
  },

  getPlayerStatus(player: Player): 'active' | 'inactive' | 'provisional' {
    if (player.is_provisional) return 'provisional';
    if (player.total_matches === 0) return 'inactive';
    return 'active';
  },

  getPlayerStatusColor(status: 'active' | 'inactive' | 'provisional'): string {
    const colors = {
      active: '#10B981',
      inactive: '#6B7280',
      provisional: '#F59E0B',
    };
    return colors[status];
  },

  getPlayerStatusLabel(status: 'active' | 'inactive' | 'provisional'): string {
    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      provisional: 'Provisório',
    };
    return labels[status];
  },
};
