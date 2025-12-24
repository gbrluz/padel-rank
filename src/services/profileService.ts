import { api } from '../lib/api';
import { Player, Category } from '../types';
import { mapProfileToPlayer, mapPlayerToProfile } from '../types/mappers';

export const profileService = {
  async getCurrentPlayer(): Promise<Player> {
    const { profile } = await api.profiles.get();
    if (!profile) {
      throw new Error('Jogador não encontrado');
    }
    return mapProfileToPlayer(profile);
  },

  async getPlayer(id: string): Promise<Player> {
    const { profile } = await api.profiles.get(id);
    if (!profile) {
      throw new Error('Jogador não encontrado');
    }
    return mapProfileToPlayer(profile);
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const dbUpdates = mapPlayerToProfile(updates);
    const { profile } = await api.profiles.update(id, dbUpdates);
    return mapProfileToPlayer(profile);
  },

  async updateCurrentPlayer(updates: Partial<Player>): Promise<Player> {
    const current = await this.getCurrentPlayer();
    return this.updatePlayer(current.id, updates);
  },

  async updateAvailability(id: string, availability: Record<string, string[]>): Promise<Player> {
    return this.updatePlayer(id, { availability });
  },

  isProvisional(player: Player): boolean {
    return player.isProvisional;
  },

  canJoinLeagues(player: Player): boolean {
    return !this.isProvisional(player);
  },

  getWinRate(player: Player): number {
    return player.winRate;
  },

  getCategoryFromPoints(points: number): Category {
    if (points < 200) return 'Iniciante';
    if (points < 400) return '7ª';
    if (points < 600) return '6ª';
    if (points < 800) return '5ª';
    if (points < 1000) return '4ª';
    if (points < 1200) return '3ª';
    if (points < 1400) return '2ª';
    return '1ª';
  },
};
