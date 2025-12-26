import { api, DuoSortingConfig, WeeklyScoreData } from '../lib/api';
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
  type?: 'club' | 'friends' | 'official';
  format?: 'weekly' | 'monthly' | 'season';
  gender: Gender;
  category?: Category;
  start_date: string;
  end_date?: string;
  max_participants?: number;
  min_matches?: number;
  allow_provisional_players?: boolean;
  require_captains?: boolean;
  require_scheduling?: boolean;
  duo_mode?: 'random' | 'formed' | 'mixed';
  requires_approval?: boolean;
  scoring_config?: {
    attendance_points: number;
    bbq_points: number;
    victory_points: number;
    defeat_points: number;
  };
  event_start_time?: string;
  event_day_of_week?: number;
}

export interface LeagueJoinRequest {
  id: string;
  leagueId: string;
  playerId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  player?: {
    id: string;
    fullName: string;
    nickname?: string;
    avatarUrl?: string;
    rankingPoints: number;
    category: string;
  };
}

export interface WeeklyEvent {
  id: string;
  leagueId: string;
  eventDate: string;
  status: 'scheduled' | 'attendance_open' | 'in_progress' | 'scoring_open' | 'completed' | 'cancelled';
  duoSortingConfig: DuoSortingConfig;
  duosGenerated: boolean;
  createdAt: string;
  league?: {
    id: string;
    name: string;
    duoMode: string;
    scoringConfig: Record<string, number>;
    eventStartTime: string;
    createdBy: string;
  };
}

export interface WeeklyEventAttendance {
  id: string;
  eventId: string;
  playerId: string;
  confirmed: boolean;
  confirmedAt?: string;
  duoPartnerId?: string;
  duoFormed: boolean;
  assignedDuoGroup?: number;
  bbqParticipated: boolean;
  victories: number;
  defeats: number;
  totalPoints: number;
  pointsSubmitted: boolean;
  player?: {
    id: string;
    fullName: string;
    nickname?: string;
    avatarUrl?: string;
    rankingPoints: number;
    category: string;
  };
  duoPartner?: {
    id: string;
    fullName: string;
    nickname?: string;
  };
}

function mapJoinRequest(data: any): LeagueJoinRequest {
  return {
    id: data.id,
    leagueId: data.league_id,
    playerId: data.player_id,
    status: data.status,
    message: data.message,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
    player: data.player ? {
      id: data.player.id,
      fullName: data.player.full_name,
      nickname: data.player.nickname,
      avatarUrl: data.player.avatar_url,
      rankingPoints: data.player.ranking_points,
      category: data.player.category,
    } : undefined,
  };
}

function mapWeeklyEvent(data: any): WeeklyEvent {
  return {
    id: data.id,
    leagueId: data.league_id,
    eventDate: data.event_date,
    status: data.status,
    duoSortingConfig: data.duo_sorting_config,
    duosGenerated: data.duos_generated,
    createdAt: data.created_at,
    league: data.league ? {
      id: data.league.id,
      name: data.league.name,
      duoMode: data.league.duo_mode,
      scoringConfig: data.league.scoring_config,
      eventStartTime: data.league.event_start_time,
      createdBy: data.league.created_by,
    } : undefined,
  };
}

function mapAttendance(data: any): WeeklyEventAttendance {
  return {
    id: data.id,
    eventId: data.event_id,
    playerId: data.player_id,
    confirmed: data.confirmed,
    confirmedAt: data.confirmed_at,
    duoPartnerId: data.duo_partner_id,
    duoFormed: data.duo_formed,
    assignedDuoGroup: data.assigned_duo_group,
    bbqParticipated: data.bbq_participated,
    victories: data.victories,
    defeats: data.defeats,
    totalPoints: data.total_points,
    pointsSubmitted: data.points_submitted,
    player: data.player ? {
      id: data.player.id,
      fullName: data.player.full_name,
      nickname: data.player.nickname,
      avatarUrl: data.player.avatar_url,
      rankingPoints: data.player.ranking_points,
      category: data.player.category,
    } : undefined,
    duoPartner: data.duo_partner ? {
      id: data.duo_partner.id,
      fullName: data.duo_partner.full_name,
      nickname: data.duo_partner.nickname,
    } : undefined,
  };
}

export const leagueService = {
  async listLeagues(filters?: { status?: LeagueStatus; gender?: string; myLeagues?: boolean }): Promise<League[]> {
    const { leagues } = await api.leagues.list({
      status: filters?.status,
      gender: filters?.gender,
      my_leagues: filters?.myLeagues,
    });
    return (leagues || []).map(mapDBLeagueToLeague);
  },

  async getMyLeagues(): Promise<League[]> {
    return this.listLeagues({ myLeagues: true });
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
      throw new Error('Liga nao encontrada');
    }
    return mapDBLeagueToLeague(league);
  },

  async getLeagueMembers(leagueId: string): Promise<LeagueParticipant[]> {
    const { members } = await api.leagues.getMembers(leagueId);
    return (members || []).map(mapDBLeagueParticipantToParticipant);
  },

  async getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]> {
    return this.getLeagueMembers(leagueId);
  },

  async getLeagueRanking(leagueId: string): Promise<LeagueRanking[]> {
    const { ranking } = await api.leagues.getRanking(leagueId);
    return (ranking || []).map(mapDBLeagueRankingToRanking);
  },

  async createLeague(data: CreateLeagueData): Promise<League> {
    const { league } = await api.leagues.create(data);
    return mapDBLeagueToLeague(league);
  },

  async updateLeague(id: string, updates: Partial<CreateLeagueData>): Promise<League> {
    const { league } = await api.leagues.update(id, updates);
    return mapDBLeagueToLeague(league);
  },

  async joinLeague(leagueId: string, message?: string): Promise<{ pendingApproval: boolean }> {
    const result = await api.leagues.join(leagueId, message);
    return { pendingApproval: result.pending_approval || false };
  },

  async leaveLeague(leagueId: string): Promise<void> {
    await api.leagues.leave(leagueId);
  },

  async getJoinRequests(leagueId: string, status?: string): Promise<LeagueJoinRequest[]> {
    const { requests } = await api.leagues.getJoinRequests(leagueId, status);
    return (requests || []).map(mapJoinRequest);
  },

  async approveJoinRequest(leagueId: string, requestId: string): Promise<void> {
    await api.leagues.approveJoinRequest(leagueId, requestId);
  },

  async rejectJoinRequest(leagueId: string, requestId: string): Promise<void> {
    await api.leagues.rejectJoinRequest(leagueId, requestId);
  },

  async getWeeklyEvents(leagueId: string): Promise<WeeklyEvent[]> {
    const { events } = await api.leagues.getEvents(leagueId);
    return (events || []).map(mapWeeklyEvent);
  },

  async createWeeklyEvent(leagueId: string, eventDate: string, sortingConfig?: DuoSortingConfig): Promise<WeeklyEvent> {
    const { event } = await api.leagues.createEvent(leagueId, {
      event_date: eventDate,
      duo_sorting_config: sortingConfig,
    });
    return mapWeeklyEvent(event);
  },

  async getWeeklyEventDetails(eventId: string): Promise<WeeklyEvent> {
    const { event } = await api.weeklyEvents.get(eventId);
    return mapWeeklyEvent(event);
  },

  async getEventAttendance(eventId: string): Promise<WeeklyEventAttendance[]> {
    const { attendance } = await api.weeklyEvents.getAttendance(eventId);
    return (attendance || []).map(mapAttendance);
  },

  async confirmEventAttendance(eventId: string, duoPartnerId?: string): Promise<void> {
    await api.weeklyEvents.confirmAttendance(eventId, duoPartnerId);
  },

  async cancelEventAttendance(eventId: string): Promise<void> {
    await api.weeklyEvents.cancelAttendance(eventId);
  },

  async generateEventDuos(eventId: string, sortingConfig?: DuoSortingConfig): Promise<{
    success: boolean;
    duosCount: number;
    duos: Array<{ duoGroup: number; player1Id: string; player2Id: string }>;
    oddPlayer?: string;
  }> {
    const result = await api.weeklyEvents.generateDuos(eventId, sortingConfig);
    return {
      success: result.success,
      duosCount: result.duos_count,
      duos: (result.duos || []).map((d: any) => ({
        duoGroup: d.duo_group,
        player1Id: d.player1_id,
        player2Id: d.player2_id,
      })),
      oddPlayer: result.odd_player,
    };
  },

  async submitEventScore(eventId: string, data: WeeklyScoreData): Promise<{
    success: boolean;
    totalPoints: number;
    breakdown: Record<string, number>;
  }> {
    const result = await api.weeklyEvents.submitScore(eventId, data);
    return {
      success: result.success,
      totalPoints: result.total_points,
      breakdown: result.breakdown,
    };
  },

  async updateEventStatus(eventId: string, status: string): Promise<void> {
    await api.weeklyEvents.updateStatus(eventId, status);
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
      return 'Nome da liga e obrigatorio';
    }

    if (data.name.length > 100) {
      return 'Nome da liga muito longo (maximo 100 caracteres)';
    }

    const startDate = new Date(data.start_date);
    if (isNaN(startDate.getTime())) {
      return 'Data de inicio invalida';
    }

    if (data.end_date) {
      const endDate = new Date(data.end_date);
      if (isNaN(endDate.getTime())) {
        return 'Data de termino invalida';
      }
      if (endDate <= startDate) {
        return 'Data de termino deve ser posterior a data de inicio';
      }
    }

    if (data.max_participants && data.max_participants < 2) {
      return 'Numero minimo de participantes e 2';
    }

    if (data.min_matches && data.min_matches < 1) {
      return 'Numero minimo de partidas deve ser pelo menos 1';
    }

    return null;
  },
};
