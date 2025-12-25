export type Gender = 'male' | 'female';
export type PreferredSide = 'left' | 'right' | 'both';
export type Category = 'Iniciante' | '7ª' | '6ª' | '5ª' | '4ª' | '3ª' | '2ª' | '1ª';

export interface Player {
  id: string;
  fullName: string;
  gender: Gender;
  state: string;
  city: string;
  category: Category;
  rankingPoints: number;
  preferredSide: PreferredSide | null;
  availability: Record<string, string[]>;
  totalMatches: number;
  totalWins: number;
  winRate: number;
  isProvisional: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export type MatchStatus = 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';
export type SchedulingStatus = 'pending' | 'captain_assigned' | 'awaiting_availability' | 'scheduled';
export type Team = 'team_a' | 'team_b';

export interface MatchSet {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
}

export interface Match {
  id: string;
  leagueId: string | null;

  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;

  teamAPlayer1Side: PreferredSide | null;
  teamAPlayer2Side: PreferredSide | null;
  teamBPlayer1Side: PreferredSide | null;
  teamBPlayer2Side: PreferredSide | null;

  status: MatchStatus;
  schedulingStatus: SchedulingStatus;

  scheduledDate: string | null;
  scheduledTime: string | null;
  location: string | null;

  captainId: string | null;
  commonAvailability: Record<string, string[]> | null;
  playerAvailability: Record<string, Record<string, string[]>> | null;

  teamAScore: number | null;
  teamBScore: number | null;
  winnerTeam: Team | null;
  sets: MatchSet[];

  teamAPoints: number | null;
  teamBPoints: number | null;

  createdAt: string;
  completedAt: string | null;
}

export type LeagueStatus = 'open' | 'in_progress' | 'completed';
export type LeagueFormat = 'free' | 'weekly' | 'monthly';

export interface League {
  id: string;
  name: string;
  description: string | null;
  gender: Gender;
  category: Category | null;
  status: LeagueStatus;
  format: LeagueFormat;
  startDate: string;
  endDate: string | null;
  maxParticipants: number | null;
  minMatches: number;
  allowProvisionalPlayers: boolean;
  requireCaptains: boolean;
  requireScheduling: boolean;
  weeklyDay: number | null;
  weeklyTime: string | null;
  attendanceDeadlineHours: number | null;
  monthlyMinMatches: number | null;
  createdBy: string;
  createdAt: string;
}

export type AttendanceStatus = 'confirmed' | 'declined' | 'no_response';

export interface LeagueAttendance {
  id: string;
  leagueId: string;
  playerId: string;
  weekDate: string;
  status: AttendanceStatus;
  confirmedAt: string | null;
  createdAt: string;
}

export interface LeagueParticipant {
  id: string;
  leagueId: string;
  playerId: string;
  joinedAt: string;
}

export interface LeagueRanking {
  leagueId: string;
  playerId: string;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  position: number;
}

export interface RegionalRanking {
  playerId: string;
  fullName: string;
  state: string;
  city: string;
  gender: Gender;
  category: Category;
  rankingPoints: number;
  totalMatches: number;
  totalWins: number;
  position: number;
}

export interface GlobalRanking {
  playerId: string;
  fullName: string;
  state: string;
  city: string;
  category: Category;
  regionalPosition: number;
  regionalPoints: number;
  globalPosition: number;
  globalPoints: number;
}

export interface RankingHistory {
  id: string;
  playerId: string;
  rankingPoints: number;
  category: Category;
  totalMatches: number;
  totalWins: number;
  recordedAt: string;
}

export type QueueStatus = 'active' | 'matched' | 'cancelled';

export interface QueueEntry {
  id: string;
  playerId: string;
  partnerId: string | null;
  gender: Gender;
  preferredSide: PreferredSide | null;
  status: QueueStatus;
  createdAt: string;
}

export interface SystemStats {
  totalPlayers: number;
  totalMatches: number;
  totalLeagues: number;
  activeQueueEntries: number;
}
