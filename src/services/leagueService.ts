import { api } from '../lib/api';
import {
  League,
  LeagueStatus,
  LeagueParticipant,
  LeagueRanking,
  Gender,
  Category,
} from '../types';
import {
  mapDBLeagueToLeague,
  mapDBLeagueParticipantToParticipant,
  mapDBLeagueRankingToRanking,
} from '../types/mappers';

export interface CreateLeagueData {
  name: string;
  description?: string;
  gender: Gender;
  category?: Category;
  start_date: string;
  end_date?: string;
  max_participants?: number;
  min_matches?: number;
  allow_provisional_players?: boolean;
  require_captains?: boolean;
  require_scheduling?: boolean;
}

export const leagueService = {
  async listLeagues(filters?: { status?: LeagueStatus; gender?: string }): Promise<League[]> {
    const { leagues } = await api.leagues.list(filters);
    return (leagues || []).map(mapDBLeagueToLeague);
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
    return mapDBLeagueToLeague(league);
  },

  async getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]> {
    const { participants } = await api.leagues.getParticipants(leagueId);
    return (participants || []).map(mapDBLeagueParticipantToParticipant);
  },

  async getLeagueRanking(leagueId: string): Promise<LeagueRanking[]> {
    const { ranking } = await api.leagues.getRanking(leagueId);
    return (ranking || []).map(mapDBLeagueRankingToRanking);
  },

  async createLeague(data: CreateLeagueData): Promise<League> {
    const { league } = await api.leagues.create(data);
    return mapDBLeagueToLeague(league);
  },

  async updateLeague(id: string, updates: Partial<League>): Promise<League> {
    const { league } = await api.leagues.update(id, updates);
    return mapDBLeagueToLeague(league);
  },

  async joinLeague(leagueId: string): Promise<LeagueParticipant> {
    const { participant } = await api.leagues.join(leagueId);
    return mapDBLeagueParticipantToParticipant(participant);
  },

  async leaveLeague(leagueId: string): Promise<void> {
    await api.leagues.leave(leagueId);
  },

  async isParticipant(leagueId: string, playerId: string): Promise<boolean> {
    try {
      const participants = await this.getLeagueParticipants(leagueId);
      return participants.some(p => p.playerId === playerId);
    } catch {
      return false;
    }
  },

  canJoin(league: League, participants: LeagueParticipant[]): boolean {
    if (league.status !== 'open') return false;
    if (league.maxParticipants && participants.length >= league.maxParticipants) {
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
