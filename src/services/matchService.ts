import { api } from '../lib/api';
import { Match } from '../lib/supabase';

export type MatchStatus = 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';
export type SchedulingStatus = 'pending' | 'captain_assigned' | 'awaiting_availability' | 'scheduled';

export interface ScheduleMatchData {
  scheduled_date: string;
  scheduled_time: string;
  location: string;
}

export interface CompleteMatchData {
  team_a_score: number;
  team_b_score: number;
  winner_team: 'team_a' | 'team_b';
  sets: Array<{
    set_number: number;
    team_a_score: number;
    team_b_score: number;
  }>;
}

export const matchService = {
  async listMatches(filters?: { status?: MatchStatus; league_id?: string }): Promise<Match[]> {
    const { matches } = await api.matches.list(filters);
    return matches || [];
  },

  async getPendingApprovalMatches(): Promise<Match[]> {
    return this.listMatches({ status: 'pending_approval' });
  },

  async getScheduledMatches(): Promise<Match[]> {
    return this.listMatches({ status: 'scheduled' });
  },

  async getCompletedMatches(): Promise<Match[]> {
    return this.listMatches({ status: 'completed' });
  },

  async getLeagueMatches(leagueId: string): Promise<Match[]> {
    return this.listMatches({ league_id: leagueId });
  },

  async scheduleMatch(matchId: string, data: ScheduleMatchData): Promise<Match> {
    const { match } = await api.matches.schedule(matchId, data);
    return match;
  },

  async updateAvailability(matchId: string, availability: Record<string, string[]>): Promise<Match> {
    const { match } = await api.matches.updateAvailability(matchId, availability);
    return match;
  },

  async completeMatch(matchId: string, data: CompleteMatchData): Promise<void> {
    await api.matches.complete(matchId, data);
  },

  async approveMatch(matchId: string): Promise<void> {
    await api.matches.approve(matchId, true);
  },

  async rejectMatch(matchId: string): Promise<void> {
    await api.matches.approve(matchId, false);
  },

  isPlayerInMatch(match: Match, playerId: string): boolean {
    return [
      match.team_a_player1_id,
      match.team_a_player2_id,
      match.team_b_player1_id,
      match.team_b_player2_id,
    ].includes(playerId);
  },

  getPlayerTeam(match: Match, playerId: string): 'team_a' | 'team_b' | null {
    if (match.team_a_player1_id === playerId || match.team_a_player2_id === playerId) {
      return 'team_a';
    }
    if (match.team_b_player1_id === playerId || match.team_b_player2_id === playerId) {
      return 'team_b';
    }
    return null;
  },

  didPlayerWin(match: Match, playerId: string): boolean {
    const team = this.getPlayerTeam(match, playerId);
    return team === match.winner_team;
  },

  calculatePointsForMatch(
    playerRanking: number,
    opponentAvgRanking: number,
    won: boolean
  ): number {
    const basePoints = 50;
    const rankingDiff = opponentAvgRanking - playerRanking;
    const diffMultiplier = Math.max(0.5, Math.min(2, 1 + rankingDiff / 500));

    return won
      ? Math.round(basePoints * diffMultiplier)
      : Math.round(-basePoints * (2 - diffMultiplier) * 0.5);
  },

  validateMatchResult(data: CompleteMatchData): string | null {
    if (data.team_a_score === data.team_b_score) {
      return 'O placar não pode ser empate';
    }

    const maxSets = Math.max(data.team_a_score, data.team_b_score);
    if (maxSets < 2) {
      return 'A partida deve ter pelo menos 2 sets vencidos';
    }

    if (data.sets.length !== data.team_a_score + data.team_b_score) {
      return 'O número de sets informados não corresponde ao placar';
    }

    const teamAWins = data.sets.filter(s => s.team_a_score > s.team_b_score).length;
    const teamBWins = data.sets.filter(s => s.team_b_score > s.team_a_score).length;

    if (teamAWins !== data.team_a_score || teamBWins !== data.team_b_score) {
      return 'Os resultados dos sets não correspondem ao placar final';
    }

    return null;
  },
};
