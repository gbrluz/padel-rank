import { Profile, Match as DBMatch, QueueEntry as DBQueueEntry } from '../lib/supabase';
import {
  Player,
  Match,
  QueueEntry,
  Category,
  PreferredSide,
  Gender,
} from './domain';

export const mapProfileToPlayer = (profile: Profile): Player => ({
  id: profile.id,
  fullName: profile.full_name,
  gender: profile.gender as Gender,
  state: profile.state,
  city: profile.city,
  category: profile.category as Category,
  rankingPoints: profile.ranking_points,
  preferredSide: profile.preferred_side as PreferredSide | null,
  availability: profile.availability || {},
  totalMatches: profile.total_matches,
  totalWins: profile.total_wins,
  winRate: profile.win_rate,
  isProvisional: profile.total_matches < 5,
  isAdmin: profile.is_admin,
  avatarUrl: profile.avatar_url,
  createdAt: profile.created_at,
});

export const mapPlayerToProfile = (player: Partial<Player>): Partial<Profile> => ({
  ...(player.fullName && { full_name: player.fullName }),
  ...(player.gender && { gender: player.gender }),
  ...(player.state && { state: player.state }),
  ...(player.city && { city: player.city }),
  ...(player.category && { category: player.category }),
  ...(player.rankingPoints !== undefined && { ranking_points: player.rankingPoints }),
  ...(player.preferredSide !== undefined && { preferred_side: player.preferredSide }),
  ...(player.availability && { availability: player.availability }),
  ...(player.totalMatches !== undefined && { total_matches: player.totalMatches }),
  ...(player.totalWins !== undefined && { total_wins: player.totalWins }),
  ...(player.winRate !== undefined && { win_rate: player.winRate }),
  ...(player.isAdmin !== undefined && { is_admin: player.isAdmin }),
  ...(player.avatarUrl !== undefined && { avatar_url: player.avatarUrl }),
});

export const mapDBMatchToMatch = (dbMatch: DBMatch): Match => ({
  id: dbMatch.id,
  leagueId: dbMatch.league_id,

  teamAPlayer1Id: dbMatch.team_a_player1_id,
  teamAPlayer2Id: dbMatch.team_a_player2_id,
  teamBPlayer1Id: dbMatch.team_b_player1_id,
  teamBPlayer2Id: dbMatch.team_b_player2_id,

  teamAPlayer1Side: dbMatch.team_a_player1_side as PreferredSide | null,
  teamAPlayer2Side: dbMatch.team_a_player2_side as PreferredSide | null,
  teamBPlayer1Side: dbMatch.team_b_player1_side as PreferredSide | null,
  teamBPlayer2Side: dbMatch.team_b_player2_side as PreferredSide | null,

  status: dbMatch.status as any,
  schedulingStatus: dbMatch.scheduling_status as any,

  scheduledDate: dbMatch.scheduled_date,
  scheduledTime: dbMatch.scheduled_time,
  location: dbMatch.location,

  captainId: dbMatch.captain_id,
  commonAvailability: dbMatch.common_availability,
  playerAvailability: dbMatch.player_availability,

  teamAScore: dbMatch.team_a_score,
  teamBScore: dbMatch.team_b_score,
  winnerTeam: dbMatch.winner_team as any,
  sets: (dbMatch.sets || []).map((s: any) => ({
    setNumber: s.set_number,
    teamAScore: s.team_a_score,
    teamBScore: s.team_b_score,
  })),

  teamAPoints: dbMatch.team_a_points,
  teamBPoints: dbMatch.team_b_points,

  createdAt: dbMatch.created_at,
  completedAt: dbMatch.completed_at,
});

export const mapDBQueueToQueue = (dbQueue: DBQueueEntry): QueueEntry => ({
  id: dbQueue.id,
  playerId: dbQueue.player_id,
  partnerId: dbQueue.partner_id,
  gender: dbQueue.gender as Gender,
  preferredSide: dbQueue.preferred_side as PreferredSide | null,
  status: dbQueue.status as any,
  createdAt: dbQueue.created_at,
});

export const mapDBLeagueToLeague = (dbLeague: any): any => ({
  id: dbLeague.id,
  name: dbLeague.name,
  description: dbLeague.description,
  gender: dbLeague.gender,
  category: dbLeague.category,
  status: dbLeague.status,
  startDate: dbLeague.start_date,
  endDate: dbLeague.end_date,
  maxParticipants: dbLeague.max_participants,
  minMatches: dbLeague.min_matches,
  allowProvisionalPlayers: dbLeague.allow_provisional_players || false,
  requireCaptains: dbLeague.require_captains || false,
  requireScheduling: dbLeague.require_scheduling || false,
  createdBy: dbLeague.created_by,
  createdAt: dbLeague.created_at,
});

export const mapDBLeagueParticipantToParticipant = (dbParticipant: any): any => ({
  id: dbParticipant.id,
  leagueId: dbParticipant.league_id,
  playerId: dbParticipant.player_id,
  joinedAt: dbParticipant.joined_at,
});

export const mapDBLeagueRankingToRanking = (dbRanking: any): any => ({
  leagueId: dbRanking.league_id,
  playerId: dbRanking.player_id,
  points: dbRanking.points,
  matchesPlayed: dbRanking.matches_played,
  matchesWon: dbRanking.matches_won,
  position: dbRanking.position,
});

export const mapDBGlobalRankingToGlobal = (dbRanking: any): any => ({
  playerId: dbRanking.player_id,
  fullName: dbRanking.full_name,
  state: dbRanking.state,
  city: dbRanking.city,
  category: dbRanking.category,
  regionalPosition: dbRanking.regional_position,
  regionalPoints: dbRanking.regional_points,
  globalPosition: dbRanking.global_position,
  globalPoints: dbRanking.global_points,
});

export const mapDBRankingHistoryToHistory = (dbHistory: any): any => ({
  id: dbHistory.id,
  playerId: dbHistory.player_id,
  rankingPoints: dbHistory.ranking_points,
  category: dbHistory.category,
  totalMatches: dbHistory.total_matches,
  totalWins: dbHistory.total_wins,
  recordedAt: dbHistory.created_at,
});
