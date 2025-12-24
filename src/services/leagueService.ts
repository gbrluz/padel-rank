import { api } from '../lib/api';

export type LeagueStatus = 'open' | 'in_progress' | 'completed';

export interface League {
  id: string;
  name: string;
  description: string | null;
  gender: 'male' | 'female';
  category: string | null;
  status: LeagueStatus;
  start_date: string;
  end_date: string | null;
  max_participants: number | null;
  min_matches: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueParticipant {
  id: string;
  league_id: string;
  player_id: string;
  joined_at: string;
}

export interface LeagueRanking {
  id: string;
  league_id: string;
  player_id: string;
  points: number;
  matches_played: number;
  matches_won: number;
  position: number;
}

export interface CreateLeagueData {
  name: string;
  description?: string;
  gender: 'male' | 'female';
  category?: string;
  start_date: string;
  end_date?: string;
  max_participants?: number;
  min_matches?: number;
}

export const leagueService = {
  async listLeagues(filters?: { status?: LeagueStatus; gender?: string }): Promise<League[]> {
    const { leagues } = await api.leagues.list(filters);
    return leagues || [];
  },

  async getOpenLeagues(): Promise<League[]> {
    return this.listLeagues({ status: 'open' });
  },

  async getActiveLeagues(): Promise<League[]> {
    return this.listLeagues({ status: 'in_progress' });
  },

  async getLeagueById(id: string): Promise<League> {
    const { league } = await api.leagues.get(id);
    if (!league) {
      throw new Error('Liga não encontrada');
    }
    return league;
  },

  async getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]> {
    const { participants } = await api.leagues.getParticipants(leagueId);
    return participants || [];
  },

  async getLeagueRanking(leagueId: string): Promise<LeagueRanking[]> {
    const { ranking } = await api.leagues.getRanking(leagueId);
    return ranking || [];
  },

  async createLeague(data: CreateLeagueData): Promise<League> {
    const { league } = await api.leagues.create(data);
    return league;
  },

  async updateLeague(id: string, updates: Partial<League>): Promise<League> {
    const { league } = await api.leagues.update(id, updates);
    return league;
  },

  async joinLeague(leagueId: string): Promise<LeagueParticipant> {
    const { participant } = await api.leagues.join(leagueId);
    return participant;
  },

  async leaveLeague(leagueId: string): Promise<void> {
    await api.leagues.leave(leagueId);
  },

  async isParticipant(leagueId: string, playerId: string): Promise<boolean> {
    try {
      const participants = await this.getLeagueParticipants(leagueId);
      return participants.some(p => p.player_id === playerId);
    } catch {
      return false;
    }
  },

  canJoin(league: League, participants: LeagueParticipant[]): boolean {
    if (league.status !== 'open') return false;
    if (league.max_participants && participants.length >= league.max_participants) {
      return false;
    }
    return true;
  },

  isActive(league: League): boolean {
    return league.status === 'in_progress';
  },

  isOpen(league: League): boolean {
    return league.status === 'open';
  },

  isCompleted(league: League): boolean {
    return league.status === 'completed';
  },

  validateLeagueData(data: CreateLeagueData): string | null {
    if (!data.name || data.name.trim().length === 0) {
      return 'Nome da liga é obrigatório';
    }

    if (data.name.length > 100) {
      return 'Nome da liga muito longo (máximo 100 caracteres)';
    }

    const startDate = new Date(data.start_date);
    if (isNaN(startDate.getTime())) {
      return 'Data de início inválida';
    }

    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (isNaN(endDate.getTime())) {
        return 'Data de término inválida';
      }
      if (endDate <= startDate) {
        return 'Data de término deve ser posterior à data de início';
      }
    }

    if (data.max_participants && data.max_participants < 2) {
      return 'Número mínimo de participantes é 2';
    }

    if (data.min_matches && data.min_matches < 1) {
      return 'Número mínimo de partidas deve ser pelo menos 1';
    }

    return null;
  },
};
