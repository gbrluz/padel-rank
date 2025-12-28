import {
  Player,
  Match,
  League,
  LeagueParticipant,
  LeagueRanking,
  RegionalRanking,
  GlobalRanking,
  RankingHistory,
  QueueEntry,
  SystemStats,
  Gender,
  Category,
  LeagueStatus,
  MatchStatus,
  Team,
  PreferredSide
} from './domain';

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PlayerResponse {
  player: Player;
}

export interface PlayersResponse {
  players: Player[];
}

export interface UpdatePlayerRequest {
  full_name?: string;
  phone?: string;
  gender?: Gender;
  birth_date?: string;
  state?: string;
  city?: string;
  preferred_side?: PreferredSide;
  availability?: Record<string, string[]>;
  photo_url?: string;
}

export interface MatchesResponse {
  matches: Match[];
}

export interface MatchResponse {
  match: Match;
}

export interface ScheduleMatchRequest {
  scheduled_date: string;
  scheduled_time: string;
  location: string;
}

export interface UpdateAvailabilityRequest {
  availability: Record<string, string[]>;
}

export interface CompleteMatchRequest {
  matchId: string;
  team_a_score: number;
  team_b_score: number;
  winner_team: Team;
  sets: Array<{
    set_number: number;
    team_a_score: number;
    team_b_score: number;
  }>;
}

export interface ApproveMatchRequest {
  matchId: string;
  approved: boolean;
}

export interface LeaguesResponse {
  leagues: League[];
}

export interface LeagueResponse {
  league: League;
}

export interface CreateLeagueRequest {
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

export interface UpdateLeagueRequest extends Partial<CreateLeagueRequest> {}

export interface JoinLeagueRequest {
  message?: string;
}

export interface JoinLeagueResponse {
  pending_approval: boolean;
}

export interface LeagueMembersResponse {
  members: LeagueParticipant[];
}

export interface LeagueRankingResponse {
  ranking: LeagueRanking[];
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

export interface LeagueJoinRequestsResponse {
  requests: LeagueJoinRequest[];
}

export interface DuoSortingConfig {
  type: 'all_together' | 'by_groups';
  groups?: Array<{ name: string; count: number }>;
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

export interface WeeklyEventsResponse {
  events: WeeklyEvent[];
}

export interface WeeklyEventResponse {
  event: WeeklyEvent;
}

export interface CreateWeeklyEventRequest {
  event_date: string;
  duo_sorting_config?: DuoSortingConfig;
}

export interface WeeklyEventAttendanceResponse {
  attendance: WeeklyEventAttendance[];
}

export interface ConfirmAttendanceRequest {
  duo_partner_id?: string;
}

export interface GenerateDuosResponse {
  success: boolean;
  duos_count: number;
  duos: Array<{ duo_group: number; player1_id: string; player2_id: string }>;
  odd_player?: string;
}

export interface WeeklyScoreData {
  player_id?: string;
  victories: number;
  defeats: number;
  bbq_participated: boolean;
}

export interface SubmitScoreResponse {
  success: boolean;
  total_points: number;
  breakdown: Record<string, number>;
}

export interface UpdateStatusRequest {
  status: string;
}

export interface RegionalRankingResponse {
  ranking: RegionalRanking[];
}

export interface GlobalRankingResponse {
  ranking: GlobalRanking[];
}

export interface RankingHistoryResponse {
  history: RankingHistory[];
}

export interface QueueStatusResponse {
  queueEntry: QueueEntry | null;
}

export interface JoinQueueRequest {
  partnerId?: string;
  gender: Gender;
  preferredSide?: PreferredSide;
}

export interface QueueResponse {
  queueEntry: QueueEntry;
}

export interface FindMatchRequest {
  partnerId?: string;
  gender: Gender;
  preferredSide?: PreferredSide;
}

export interface FindMatchResponse {
  match?: Match;
  message: string;
}

export interface AdminStatsResponse {
  stats: SystemStats;
}
