import { api } from '../lib/api';
import { Player, Category } from '../types';

export const profileService = {
  async getCurrentPlayer(): Promise<Player> {
    const { player } = await api.players.get();
    if (!player) {
      throw new Error('Jogador não encontrado');
    }
    return player;
  },

  async getPlayer(id: string): Promise<Player | null> {
    const { player } = await api.players.get(id);
    if (!player) {
      return null;
    }
    return player;
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const { player } = await api.players.update(id, updates);
    return player;
  },

  async updateCurrentPlayer(updates: Partial<Player>): Promise<Player> {
    const current = await this.getCurrentPlayer();
    return this.updatePlayer(current.id, updates);
  },

  async updateAvailability(id: string, availability: Record<string, string[]>): Promise<Player> {
    return this.updatePlayer(id, { availability });
  },

  isProvisional(player: Player): boolean {
    return player.is_provisional;
  },

  canJoinLeagues(player: Player): boolean {
    return !this.isProvisional(player);
  },

  getWinRate(player: Player): number {
    return player.win_rate;
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
