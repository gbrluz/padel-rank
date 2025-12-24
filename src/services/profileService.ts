import { api } from '../lib/api';
import { Profile } from '../lib/supabase';

export const profileService = {
  async getCurrentProfile(): Promise<Profile> {
    const { profile } = await api.profiles.get();
    if (!profile) {
      throw new Error('Perfil não encontrado');
    }
    return profile;
  },

  async getProfileById(id: string): Promise<Profile> {
    const { profile } = await api.profiles.get(id);
    if (!profile) {
      throw new Error('Perfil não encontrado');
    }
    return profile;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { profile } = await api.profiles.update(id, updates);
    return profile;
  },

  async updateCurrentProfile(updates: Partial<Profile>): Promise<Profile> {
    const current = await this.getCurrentProfile();
    return this.updateProfile(current.id, updates);
  },

  async updateAvailability(id: string, availability: Record<string, string[]>): Promise<Profile> {
    return this.updateProfile(id, { availability });
  },

  isProvisional(profile: Profile): boolean {
    return profile.total_matches < 5;
  },

  canJoinLeagues(profile: Profile): boolean {
    return !this.isProvisional(profile);
  },

  getWinRate(profile: Profile): number {
    if (profile.total_matches === 0) return 0;
    return (profile.total_wins / profile.total_matches) * 100;
  },

  getCategoryFromPoints(points: number): string {
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
