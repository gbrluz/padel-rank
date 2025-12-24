import { api } from '../lib/api';
import { Profile } from '../lib/supabase';

export interface AdminProfile extends Profile {
  email: string;
}

export interface SystemStats {
  totalProfiles: number;
  totalMatches: number;
  totalLeagues: number;
  activeQueueEntries: number;
}

export const adminService = {
  async getAllProfiles(search?: string): Promise<AdminProfile[]> {
    const { profiles } = await api.admin.getProfiles(search);
    return profiles || [];
  },

  async searchProfiles(query: string): Promise<AdminProfile[]> {
    return this.getAllProfiles(query);
  },

  async updateProfile(profileId: string, updates: Partial<Profile>): Promise<AdminProfile> {
    const { profile } = await api.admin.updateProfile(profileId, updates);
    return profile;
  },

  async getSystemStats(): Promise<SystemStats> {
    const { stats } = await api.admin.getStats();
    return stats;
  },

  async makeAdmin(profileId: string): Promise<AdminProfile> {
    return this.updateProfile(profileId, { is_admin: true });
  },

  async removeAdmin(profileId: string): Promise<AdminProfile> {
    return this.updateProfile(profileId, { is_admin: false });
  },

  async updatePlayerPoints(profileId: string, points: number): Promise<AdminProfile> {
    return this.updateProfile(profileId, { ranking_points: points });
  },

  async resetPlayerStats(profileId: string): Promise<AdminProfile> {
    return this.updateProfile(profileId, {
      ranking_points: 1000,
      total_matches: 0,
      total_wins: 0,
      win_rate: 0,
    });
  },

  validateProfileUpdate(updates: Partial<Profile>): string | null {
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
      `${stats.totalProfiles} jogadores cadastrados`,
      `${stats.totalMatches} partidas realizadas`,
      `${stats.totalLeagues} ligas criadas`,
      `${stats.activeQueueEntries} jogadores na fila`,
    ];
  },

  getPlayerStatus(profile: Profile): 'active' | 'inactive' | 'provisional' {
    if (profile.total_matches < 5) return 'provisional';
    if (profile.total_matches === 0) return 'inactive';
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
