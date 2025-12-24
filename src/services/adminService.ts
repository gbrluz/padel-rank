import { api } from '../lib/api';
import { Player, SystemStats } from '../types';
import { mapProfileToPlayer, mapPlayerToProfile } from '../types/mappers';

export interface AdminPlayer extends Player {
  email: string;
}

export const adminService = {
  async getAllPlayers(search?: string): Promise<AdminPlayer[]> {
    const { profiles } = await api.admin.getProfiles(search);
    return (profiles || []).map((p: any) => ({
      ...mapProfileToPlayer(p),
      email: p.email,
    }));
  },

  async searchPlayers(query: string): Promise<AdminPlayer[]> {
    return this.getAllPlayers(query);
  },

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<AdminPlayer> {
    const dbUpdates = mapPlayerToProfile(updates);
    const { profile } = await api.admin.updateProfile(playerId, dbUpdates);
    return {
      ...mapProfileToPlayer(profile),
      email: (profile as any).email,
    };
  },

  async getSystemStats(): Promise<SystemStats> {
    const { stats } = await api.admin.getStats();
    return stats;
  },

  async makeAdmin(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { isAdmin: true });
  },

  async removeAdmin(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { isAdmin: false });
  },

  async updatePlayerPoints(playerId: string, points: number): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, { rankingPoints: points });
  },

  async resetPlayerStats(playerId: string): Promise<AdminPlayer> {
    return this.updatePlayer(playerId, {
      rankingPoints: 1000,
      totalMatches: 0,
      totalWins: 0,
      winRate: 0,
    });
  },

  validatePlayerUpdate(updates: Partial<Player>): string | null {
    if (updates.rankingPoints !== undefined && updates.rankingPoints < 0) {
      return 'Pontos de ranking não podem ser negativos';
    }

    if (updates.totalMatches !== undefined && updates.totalMatches < 0) {
      return 'Total de partidas não pode ser negativo';
    }

    if (updates.totalWins !== undefined && updates.totalWins < 0) {
      return 'Total de vitórias não pode ser negativo';
    }

    if (
      updates.totalWins !== undefined &&
      updates.totalMatches !== undefined &&
      updates.totalWins > updates.totalMatches
    ) {
      return 'Total de vitórias não pode ser maior que total de partidas';
    }

    if (updates.fullName && updates.fullName.trim().length === 0) {
      return 'Nome não pode ser vazio';
    }

    if (updates.fullName && updates.fullName.length > 100) {
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
    if (player.isProvisional) return 'provisional';
    if (player.totalMatches === 0) return 'inactive';
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
