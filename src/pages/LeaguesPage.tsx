import { useEffect, useState, useRef } from 'react';
import { Medal, Users, Trophy, TrendingUp, UserPlus, Clock, Check, Loader2, Shield, CheckCircle, XCircle, Trash2, Calendar, CalendarCheck, RotateCcw, AlertTriangle, Shuffle, Beef, Pencil, X, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Player as Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/leagueService';

interface LeaguesPageProps {
  onNavigate: (page: string) => void;
}

interface League {
  id: string;
  name: string;
  type: 'club' | 'friends' | 'official';
  format: 'free' | 'weekly' | 'monthly';
  description: string;
  affects_regional_ranking: boolean;
  is_active: boolean;
  requires_approval?: boolean;
  status?: string;
  weekly_day?: number | null;
  weekly_time?: string | null;
  attendance_deadline_hours?: number | null;
}

interface WeeklyAttendance {
  id: string;
  league_id: string;
  player_id: string;
  week_date: string;
  status: 'confirmed' | 'declined' | 'no_response' | 'bbq_only' | 'play_and_bbq';
}

interface LeagueRanking {
  player_id: string;
  points: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  blowouts: number;
  blowout_rate: number;
  blowouts_applied: number;
  blowout_applied_rate: number;
  player: Profile;
}

interface JoinRequest {
  id: string;
  league_id: string;
  player_id: string;
  status: string;
  message: string | null;
  created_at: string;
  player: Profile;
}

interface LeagueMember {
  id: string;
  league_id: string;
  player_id: string;
  player: Profile;
}

interface EventDraw {
  id: string;
  league_id: string;
  event_date: string;
  drawn_at: string;
  drawn_by: string;
}

interface EventPair {
  id: string;
  draw_id: string;
  player1_id: string;
  player2_id: string | null;
  pair_number: number;
  is_top_12: boolean;
  player1?: Profile;
  player2?: Profile;
}

interface EventMatch {
  id: string;
  draw_id: string;
  pair1_id: string;
  pair2_id: string;
  match_number: number;
  created_at: string;
}

export default function LeaguesPage({ onNavigate }: LeaguesPageProps) {
  const { player: profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const loadingLeagueRef = useRef<{ leagueId: string; loadedMemberData: boolean } | null>(null); // Track which league is currently loading
  const [leagueRankings, setLeagueRankings] = useState<LeagueRanking[]>([]);
  const [myLeagues, setMyLeagues] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [organizerLeagues, setOrganizerLeagues] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([]);
  const [allPlayers, setAllPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningLeague, setJoiningLeague] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showOrganizerPanel, setShowOrganizerPanel] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [myAttendance, setMyAttendance] = useState<WeeklyAttendance | null>(null);
  const [myLastEventAttendance, setMyLastEventAttendance] = useState<WeeklyAttendance | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [scoringVictories, setScoringVictories] = useState(0);
  const [scoringDefeats, setScoringDefeats] = useState(0);
  const [appliedBlowouts, setAppliedBlowouts] = useState(false);
  const [blowoutVictims, setBlowoutVictims] = useState<string[]>([]);
  const [myCurrentPair, setMyCurrentPair] = useState<EventPair | null>(null);
  const [victimPairs, setVictimPairs] = useState<EventPair[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [weeklyScore, setWeeklyScore] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<Record<string, WeeklyAttendance>>({});
  const [lastEventAttendances, setLastEventAttendances] = useState<Record<string, WeeklyAttendance>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [showBlowoutRanking, setShowBlowoutRanking] = useState(false);
  const [blowoutRankingType, setBlowoutRankingType] = useState<'received' | 'applied'>('received');
  const [currentDraw, setCurrentDraw] = useState<EventDraw | null>(null);
  const [currentPairs, setCurrentPairs] = useState<EventPair[]>([]);
  const [currentMatches, setCurrentMatches] = useState<EventMatch[]>([]);
  const [performingDraw, setPerformingDraw] = useState(false);
  const [scoreSubmissions, setScoreSubmissions] = useState<Record<string, boolean>>({});
  const [editingPlayerScore, setEditingPlayerScore] = useState<{ playerId: string; playerName: string } | null>(null);
  const [editVictories, setEditVictories] = useState(0);
  const [editDefeats, setEditDefeats] = useState(0);
  const [editAppliedBlowouts, setEditAppliedBlowouts] = useState(false);
  const [editBlowoutVictims, setEditBlowoutVictims] = useState<string[]>([]);
  const [editAttendanceConfirmed, setEditAttendanceConfirmed] = useState(true);
  const [editBbqParticipated, setEditBbqParticipated] = useState(false);
  const [submittingPlayerScore, setSubmittingPlayerScore] = useState(false);
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const [showManualBlowoutModal, setShowManualBlowoutModal] = useState(false);
  const [manualBlowoutAppliers, setManualBlowoutAppliers] = useState<string[]>([]);
  const [manualBlowoutVictims, setManualBlowoutVictims] = useState<string[]>([]);
  const [submittingManualBlowout, setSubmittingManualBlowout] = useState(false);

  useEffect(() => {
    loadLeagues();
    loadAllPlayers();
    if (profile) {
      loadMyLeagues();
      loadPendingRequests();
      loadOrganizerLeagues();
    }
  }, [profile]);

  // Auto-select first league that user participates in
  useEffect(() => {
    if (leagues.length > 0 && (myLeagues.length > 0 || organizerLeagues.length > 0)) {
      // If no league is selected, or selected league is not in user's leagues
      if (!selectedLeague ||
          (!myLeagues.includes(selectedLeague.id) && !organizerLeagues.includes(selectedLeague.id))) {
        // Find first league that user is member or organizer of
        const firstMyLeague = leagues.find(league =>
          myLeagues.includes(league.id) || organizerLeagues.includes(league.id)
        );
        if (firstMyLeague) {
          console.log('[Auto-select] Setting selected league to:', firstMyLeague.name);
          setSelectedLeague(firstMyLeague);
        }
      } else {
        console.log('[Auto-select] Keeping current league:', selectedLeague?.name);
      }
    }
  }, [leagues, myLeagues, organizerLeagues]);

  useEffect(() => {
    if (selectedLeague) {
      console.log('[Load Data] Effect triggered for league:', selectedLeague.name);

      const isOrganizer = organizerLeagues.includes(selectedLeague.id);
      const isMember = myLeagues.includes(selectedLeague.id);
      console.log('[Load Data] isOrganizer:', isOrganizer, 'isMember:', isMember);

      // Check if we're already loading this league
      if (loadingLeagueRef.current?.leagueId === selectedLeague.id) {
        // If we already loaded member data, skip entirely
        if (loadingLeagueRef.current.loadedMemberData) {
          console.log('[Load Data] Already loaded all data for this league, skipping');
          return;
        }
        // If we haven't loaded member data yet but now isMember is true, we need to load it
        if (!isMember) {
          console.log('[Load Data] Already loading this league, skipping');
          return;
        }
        console.log('[Load Data] Need to load member data that was skipped before');
      }

      // Track that we're loading this league
      if (!loadingLeagueRef.current || loadingLeagueRef.current.leagueId !== selectedLeague.id) {
        loadingLeagueRef.current = { leagueId: selectedLeague.id, loadedMemberData: false };
      }

      // Load all data in parallel instead of sequentially
      const promises: Promise<void>[] = [
        loadLeagueRankings(selectedLeague.id)
      ];

      if (isOrganizer) {
        promises.push(loadJoinRequests(selectedLeague.id));
      }

      if (selectedLeague.format === 'weekly') {
        promises.push(
          loadAllAttendances(selectedLeague.id),
          loadEventDraw(selectedLeague.id),
          loadScoreSubmissions(selectedLeague.id)
        );

        if (isMember) {
          console.log('[Load Data] Loading member-specific data (attendance)');
          promises.push(
            loadMyAttendance(selectedLeague.id),
            loadMyLastEventAttendance(selectedLeague.id),
            loadLeagueMembers(selectedLeague.id)
          );
        } else {
          console.log('[Load Data] NOT loading attendance - user is not a member');
        }
      } else if (isOrganizer) {
        promises.push(loadLeagueMembers(selectedLeague.id));
      }

      // Execute all queries in parallel
      Promise.all(promises).finally(() => {
        console.log('[Load Data] All queries completed');
        // Mark that we've loaded member data for this league
        if (loadingLeagueRef.current?.leagueId === selectedLeague.id) {
          loadingLeagueRef.current.loadedMemberData = isMember;
        }
      });
    }
  }, [selectedLeague, myLeagues, organizerLeagues]); // Need these deps because we use them inside

  useEffect(() => {
    if (selectedLeague && myLastEventAttendance && shouldShowScoringCard(selectedLeague)) {
      loadWeeklyScore();
    }
  }, [selectedLeague, myLastEventAttendance]);

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeagues(data || []);

      // Don't auto-select here - let the useEffect handle it after myLeagues loads
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyLeagues = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('league_memberships')
        .select('league_id')
        .eq('player_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;
      setMyLeagues(data?.map(m => m.league_id) || []);
    } catch (error) {
      console.error('Error loading my leagues:', error);
    }
  };

  const loadPendingRequests = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('league_join_requests')
        .select('league_id')
        .eq('player_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data?.map(r => r.league_id) || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadOrganizerLeagues = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('league_organizers')
        .select('league_id')
        .eq('player_id', profile.id);

      if (error) throw error;
      setOrganizerLeagues(data?.map(o => o.league_id) || []);
    } catch (error) {
      console.error('Error loading organizer leagues:', error);
    }
  };

  const loadJoinRequests = async (leagueId: string) => {
    try {
      const { data: members } = await supabase
        .from('league_memberships')
        .select('player_id')
        .eq('league_id', leagueId);

      const memberIds = new Set(members?.map(m => m.player_id) || []);

      const { data, error } = await supabase
        .from('league_join_requests')
        .select(`
          *,
          player:players!league_join_requests_player_id_fkey(*)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const filteredRequests = (data || []).filter(r => !memberIds.has(r.player_id));
      setJoinRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const loadLeagueMembers = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('league_memberships')
        .select(`
          *,
          player:players(*)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'active');

      if (error) throw error;
      setLeagueMembers(data || []);
    } catch (error) {
      console.error('Error loading league members:', error);
    }
  };

  const loadAllPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading all players:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, playerId: string) => {
    if (!selectedLeague || !profile) return;

    setProcessingRequest(requestId);
    try {
      const { error: updateError } = await supabase
        .from('league_join_requests')
        .update({
          status: 'approved',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const { error: memberError } = await supabase
        .from('league_memberships')
        .insert([{
          league_id: selectedLeague.id,
          player_id: playerId,
          status: 'active',
        }]);

      if (memberError) throw memberError;

      await loadJoinRequests(selectedLeague.id);
      await loadLeagueMembers(selectedLeague.id);
      await loadLeagueRankings(selectedLeague.id);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Erro ao aprovar solicitacao');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!selectedLeague || !profile) return;

    setProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from('league_join_requests')
        .update({
          status: 'rejected',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadJoinRequests(selectedLeague.id);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Erro ao rejeitar solicitacao');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAddMember = async (playerId: string) => {
    if (!selectedLeague) return;

    try {
      const { error } = await supabase
        .from('league_memberships')
        .insert([{
          league_id: selectedLeague.id,
          player_id: playerId,
          status: 'active',
        }]);

      if (error) throw error;

      await supabase
        .from('league_join_requests')
        .delete()
        .eq('league_id', selectedLeague.id)
        .eq('player_id', playerId)
        .eq('status', 'pending');

      await loadLeagueMembers(selectedLeague.id);
      await loadLeagueRankings(selectedLeague.id);
      await loadJoinRequests(selectedLeague.id);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Tem certeza que deseja remover este jogador da liga?')) return;

    try {
      const { error } = await supabase
        .from('league_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      if (selectedLeague) {
        await loadLeagueMembers(selectedLeague.id);
        await loadLeagueRankings(selectedLeague.id);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Erro ao remover membro');
    }
  };

  const handleResetPoints = async () => {
    if (!selectedLeague) return;

    setResettingPoints(true);
    try {
      const { data: events } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id);

      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);

        await supabase
          .from('weekly_event_blowouts')
          .delete()
          .in('event_id', eventIds);

        await supabase
          .from('weekly_event_attendance')
          .update({
            victories: 0,
            defeats: 0,
            blowouts_received: 0,
            blowouts_applied: 0,
            total_points: 0,
            points_submitted: false
          })
          .in('event_id', eventIds);
      }

      await loadLeagueRankings(selectedLeague.id);
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Error resetting points:', error);
      alert('Erro ao resetar pontos');
    } finally {
      setResettingPoints(false);
    }
  };

  const handleCancelRequest = async (leagueId: string) => {
    if (!profile) return;
    if (!confirm('Tem certeza que deseja cancelar sua solicitacao?')) return;

    setCancellingRequest(true);
    try {
      const { error } = await supabase
        .from('league_join_requests')
        .delete()
        .eq('league_id', leagueId)
        .eq('player_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      setPendingRequests(prev => prev.filter(id => id !== leagueId));
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Erro ao cancelar solicitacao');
    } finally {
      setCancellingRequest(false);
    }
  };

  const getNextWeeklyEventDate = (league: League): Date | null => {
    if (league.format !== 'weekly' || league.weekly_day === null || league.weekly_day === undefined) {
      return null;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const targetDay = league.weekly_day;

    let daysUntilEvent = targetDay - currentDay;

    if (daysUntilEvent === 0) {
      if (league.weekly_time) {
        const [hours, minutes] = league.weekly_time.split(':').map(Number);
        const eventTime = new Date(now);
        eventTime.setHours(hours, minutes, 0, 0);

        if (now >= eventTime) {
          daysUntilEvent = 7;
        }
      }
    } else if (daysUntilEvent < 0) {
      daysUntilEvent += 7;
    }

    const nextEvent = new Date(now);
    nextEvent.setDate(now.getDate() + daysUntilEvent);

    if (league.weekly_time) {
      const [hours, minutes] = league.weekly_time.split(':').map(Number);
      nextEvent.setHours(hours, minutes, 0, 0);
    } else {
      nextEvent.setHours(0, 0, 0, 0);
    }

    return nextEvent;
  };

  const shouldShowAttendanceCard = (league: League): boolean => {
    if (league.format !== 'weekly') return false;

    const nextEvent = getNextWeeklyEventDate(league);
    if (!nextEvent) return false;

    const now = new Date();
    const hoursUntilEvent = (nextEvent.getTime() - now.getTime()) / (1000 * 60 * 60);

    const maxHoursToShow = 3 * 24;
    return hoursUntilEvent <= maxHoursToShow && hoursUntilEvent > 0;
  };

  const isAttendanceDeadlinePassed = (league: League): boolean => {
    const deadline = getAttendanceDeadline(league);
    if (!deadline) return false;
    return new Date() >= deadline;
  };

  const loadMyAttendance = async (leagueId: string) => {
    if (!profile || !selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) {
      // No next event - keep current state
      console.log('[loadMyAttendance] No next event, keeping current state');
      return;
    }

    const weekDate = nextEvent.toISOString().split('T')[0];
    console.log('[loadMyAttendance] Loading attendance for', weekDate, 'league:', leagueId);

    try {
      const { data, error } = await supabase
        .from('league_attendance')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', profile.id)
        .eq('week_date', weekDate)
        .maybeSingle();

      if (error) {
        console.error('[loadMyAttendance] Error loading attendance:', error);
        return; // Don't clear state on error
      }

      console.log('[loadMyAttendance] Loaded attendance:', data);

      // Always update state with query result (null means no attendance yet)
      // This is correct behavior - null means user hasn't confirmed yet
      setMyAttendance(data);
    } catch (error) {
      console.error('[loadMyAttendance] Exception loading attendance:', error);
      // Don't clear state on error
    }
  };

  const loadMyLastEventAttendance = async (leagueId: string) => {
    if (!profile || !selectedLeague) return;

    const lastEvent = getLastEventDate(selectedLeague);
    if (!lastEvent) {
      // No last event - keep current state
      return;
    }

    const weekDate = lastEvent.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('league_attendance')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', profile.id)
        .eq('week_date', weekDate)
        .maybeSingle();

      if (error) {
        console.error('Error loading last event attendance:', error);
        return; // Don't clear state on error
      }

      // Only update state if data is valid (can be null if no attendance yet)
      setMyLastEventAttendance(data);
    } catch (error) {
      console.error('Error loading last event attendance:', error);
      // Don't clear state on error
    }
  };

  const loadAllAttendances = async (leagueId: string) => {
    if (!selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    const lastEvent = getLastEventDate(selectedLeague);

    // Load next event attendances
    if (nextEvent) {
      try {
        const weekDate = nextEvent.toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('league_attendance')
          .select('*')
          .eq('league_id', leagueId)
          .eq('week_date', weekDate);

        if (error) {
          console.error('Error loading next event attendances:', error);
          // Don't update state on error - preserve current state
        } else {
          // Only update state if query was successful
          const attendanceMap: Record<string, WeeklyAttendance> = {};
          if (data) {
            data.forEach((attendance) => {
              attendanceMap[attendance.player_id] = attendance;
            });
          }
          setAllAttendances(attendanceMap);
        }
      } catch (error) {
        console.error('Error loading next event attendances:', error);
        // Don't update state on error
      }
    }

    // Load last event attendances
    if (lastEvent) {
      try {
        const lastWeekDate = lastEvent.toISOString().split('T')[0];
        const { data: lastData, error: lastError } = await supabase
          .from('league_attendance')
          .select('*')
          .eq('league_id', leagueId)
          .eq('week_date', lastWeekDate);

        if (lastError) {
          console.error('Error loading last event attendances:', lastError);
          // Don't update state on error - preserve current state
        } else {
          // Only update state if query was successful
          const lastAttendanceMap: Record<string, WeeklyAttendance> = {};
          if (lastData) {
            lastData.forEach((attendance) => {
              lastAttendanceMap[attendance.player_id] = attendance;
            });
          }
          setLastEventAttendances(lastAttendanceMap);
        }
      } catch (error) {
        console.error('Error loading last event attendances:', error);
        // Don't update state on error
      }
    }
  };

  const loadEventDraw = async (leagueId: string) => {
    if (!selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    const lastEvent = getLastEventDate(selectedLeague);

    const eventDate = nextEvent?.toISOString().split('T')[0] || lastEvent?.toISOString().split('T')[0];
    if (!eventDate) return;

    try {
      const { data: drawData, error: drawError } = await supabase
        .from('weekly_event_draws')
        .select('*')
        .eq('league_id', leagueId)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (drawError) throw drawError;

      if (drawData) {
        setCurrentDraw(drawData);

        // Load pairs with player data using Supabase joins (more reliable than local allPlayers)
        const { data: pairsData, error: pairsError } = await supabase
          .from('weekly_event_pairs')
          .select(`
            *,
            player1:player1_id(id, full_name),
            player2:player2_id(id, full_name)
          `)
          .eq('draw_id', drawData.id)
          .order('pair_number');

        if (pairsError) throw pairsError;

        setCurrentPairs(pairsData || []);

        // Load matches (confrontos) for this draw
        const { data: matchesData, error: matchesError } = await supabase
          .from('weekly_event_matches')
          .select('*')
          .eq('draw_id', drawData.id)
          .order('match_number');

        if (matchesError) {
          console.error('Error loading matches:', matchesError);
          setCurrentMatches([]);
        } else {
          setCurrentMatches(matchesData || []);
        }
      } else {
        setCurrentDraw(null);
        setCurrentPairs([]);
        setCurrentMatches([]);
      }
    } catch (error) {
      console.error('Error loading event draw:', error);
    }
  };

  const canOrganizerPerformDraw = (league: League): boolean => {
    if (league.format !== 'weekly') return false;

    const nextEvent = getNextWeeklyEventDate(league);
    const deadline = getAttendanceDeadline(league);

    if (!nextEvent || !deadline) return false;

    const now = new Date();
    return now >= deadline && now < nextEvent;
  };

  const shouldShowDrawResults = (league: League): boolean => {
    if (league.format !== 'weekly') return false;
    if (!currentDraw) return false;

    const now = Date.now();
    const lastEvent = getLastEventDate(league);
    const nextEvent = getNextWeeklyEventDate(league);

    if (lastEvent) {
      const showEnd = lastEvent.getTime() + (48 * 60 * 60 * 1000);
      if (now >= lastEvent.getTime() && now < showEnd) {
        return true;
      }
    }

    if (nextEvent) {
      const deadline = getAttendanceDeadline(league);
      if (deadline && now >= deadline.getTime() && now < nextEvent.getTime()) {
        return true;
      }
    }

    return false;
  };

  const handlePerformDraw = async () => {
    if (!selectedLeague || !profile) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) return;

    const eventDate = nextEvent.toISOString().split('T')[0];

    setPerformingDraw(true);
    try {
      // CRITICAL: Create the weekly_event record first (if it doesn't exist)
      // This is required because attendance, draws, and scores all reference weekly_events.id
      const { data: existingEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!existingEvent) {
        const { error: eventError } = await supabase
          .from('weekly_events')
          .insert({
            league_id: selectedLeague.id,
            event_date: eventDate,
          });

        if (eventError) {
          console.error('Error creating weekly_event:', eventError);
          throw new Error('Erro ao criar evento semanal: ' + eventError.message);
        }
        console.log('✅ Created weekly_event for', eventDate);
      } else {
        console.log('✅ Weekly_event already exists for', eventDate);
      }

      const playingStatuses = ['confirmed', 'play_and_bbq'];
      const confirmedPlayers = Object.entries(allAttendances)
        .filter(([_, att]) => playingStatuses.includes(att.status))
        .map(([playerId]) => playerId);

      if (confirmedPlayers.length < 2) {
        alert('Sao necessarios pelo menos 2 jogadores confirmados para realizar o sorteio');
        return;
      }

      // Fisher-Yates shuffle algorithm
      const shuffleArray = (arr: string[]) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const playersWithPoints = confirmedPlayers.map(playerId => {
        const ranking = leagueRankings.find(r => r.player_id === playerId);
        return {
          playerId,
          points: ranking?.points || 0,
        };
      });

      // Sort by points (highest first)
      playersWithPoints.sort((a, b) => b.points - a.points);

      const allSamePoints = playersWithPoints.every(p => p.points === playersWithPoints[0].points);

      let sortedPlayerIds: string[];

      if (allSamePoints) {
        // CRITICAL: When all players have same points (e.g., all 0 at start),
        // shuffle randomly to avoid bias based on confirmation order
        sortedPlayerIds = shuffleArray(playersWithPoints.map(p => p.playerId));
        console.log(`🎲 All players have same points - shuffled randomly`);
      } else {
        // Sort by ranking (best players first)
        sortedPlayerIds = playersWithPoints.map(p => p.playerId);
        console.log(`📊 Sorted by ranking (best players first)`);
      }

      // Fetch previous event's pairs to avoid repeating them
      let previousPairs: Set<string> = new Set();
      try {
        const previousEventDate = getLastEventDate(selectedLeague);
        if (previousEventDate) {
          const prevDate = previousEventDate.toISOString().split('T')[0];

          const { data: prevDraw } = await supabase
            .from('weekly_event_draws')
            .select('id')
            .eq('league_id', selectedLeague.id)
            .eq('event_date', prevDate)
            .maybeSingle();

          if (prevDraw) {
            const { data: prevPairsData } = await supabase
              .from('weekly_event_pairs')
              .select('player1_id, player2_id')
              .eq('draw_id', prevDraw.id);

            if (prevPairsData) {
              prevPairsData.forEach(pair => {
                if (pair.player1_id && pair.player2_id) {
                  // Store both orderings to catch any combination
                  const key1 = [pair.player1_id, pair.player2_id].sort().join('-');
                  previousPairs.add(key1);
                }
              });
              console.log(`📋 Found ${previousPairs.size} pairs from previous event to avoid`);
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch previous pairs:', error);
      }

      // Function to create pairs while avoiding previous event's pairs
      const createPairsAvoidingRepeats = (players: string[]): { player1: string; player2: string | null }[] => {
        const pairs: { player1: string; player2: string | null }[] = [];
        const used = new Set<string>();
        const available = [...players];
        let attempts = 0;
        const maxAttempts = 100;

        while (available.length >= 2 && attempts < maxAttempts) {
          attempts++;
          let foundValidPair = false;

          for (let i = 0; i < available.length - 1; i++) {
            for (let j = i + 1; j < available.length; j++) {
              const player1 = available[i];
              const player2 = available[j];
              const pairKey = [player1, player2].sort().join('-');

              if (!previousPairs.has(pairKey) && !used.has(player1) && !used.has(player2)) {
                pairs.push({ player1, player2 });
                used.add(player1);
                used.add(player2);
                available.splice(j, 1); // Remove j first (higher index)
                available.splice(i, 1);
                foundValidPair = true;
                break;
              }
            }
            if (foundValidPair) break;
          }

          // If no valid pair found, just take first two available
          if (!foundValidPair && available.length >= 2) {
            const player1 = available.shift()!;
            const player2 = available.shift()!;
            pairs.push({ player1, player2 });
            used.add(player1);
            used.add(player2);
            console.warn('⚠️ Had to create a repeated pair due to constraints');
          }
        }

        // Handle remaining single player (wildcard)
        if (available.length === 1) {
          pairs.push({ player1: available[0], player2: null });
        }

        return pairs;
      };

      // CRITICAL: Divide PLAYERS by 2 first
      // If the result is odd, one more player goes to bottom half
      const halfCount = Math.floor(sortedPlayerIds.length / 2);

      let topPlayers: string[];
      let bottomPlayers: string[];

      if (halfCount % 2 === 1) {
        // halfCount is odd, move one player to bottom
        topPlayers = sortedPlayerIds.slice(0, halfCount - 1);
        bottomPlayers = sortedPlayerIds.slice(halfCount - 1);
        console.log(`📊 Half is odd (${halfCount}), adjusting: ${topPlayers.length} top, ${bottomPlayers.length} bottom`);
      } else {
        // halfCount is even, divide normally
        topPlayers = sortedPlayerIds.slice(0, halfCount);
        bottomPlayers = sortedPlayerIds.slice(halfCount);
        console.log(`📊 Half is even (${halfCount}): ${topPlayers.length} top, ${bottomPlayers.length} bottom`);
      }

      // Create pairs within each group
      const topPairs = createPairsAvoidingRepeats(topPlayers).map(pair => ({
        player1: pair.player1,
        player2: pair.player2,
        isTop12: true,
      }));

      const bottomPairs = createPairsAvoidingRepeats(bottomPlayers).map(pair => ({
        player1: pair.player1,
        player2: pair.player2,
        isTop12: false,
      }));

      const pairs = [...topPairs, ...bottomPairs];
      console.log(`✅ Created ${topPairs.length} top pairs and ${bottomPairs.length} bottom pairs (${pairs.length} total)`);

      await supabase
        .from('weekly_event_draws')
        .delete()
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate);

      const { data: newDraw, error: drawError } = await supabase
        .from('weekly_event_draws')
        .insert({
          league_id: selectedLeague.id,
          event_date: eventDate,
          drawn_by: profile.id,
        })
        .select()
        .single();

      if (drawError) throw drawError;

      const pairsToInsert = pairs.map((pair, index) => ({
        draw_id: newDraw.id,
        player1_id: pair.player1,
        player2_id: pair.player2,
        pair_number: index + 1,
        is_top_12: pair.isTop12,
      }));

      const { data: insertedPairs, error: pairsError } = await supabase
        .from('weekly_event_pairs')
        .insert(pairsToInsert)
        .select('id');

      if (pairsError) throw pairsError;

      // Generate match pairings (confrontos) - each pair plays 4 matches
      // CRITICAL: Top half plays only among themselves, bottom half plays only among themselves
      if (insertedPairs && insertedPairs.length >= 2) {
        console.log(`🎲 Generating matches for ${insertedPairs.length} pairs...`);

        // Separate pairs into top and bottom groups based on is_top_12 flag
        const topPairIds: string[] = [];
        const bottomPairIds: string[] = [];

        // We need to match insertedPairs with the original pairs array to get is_top_12 flag
        insertedPairs.forEach((insertedPair, index) => {
          if (pairs[index].isTop12) {
            topPairIds.push(insertedPair.id);
          } else {
            bottomPairIds.push(insertedPair.id);
          }
        });

        console.log(`📊 Match groups: ${topPairIds.length} top pairs, ${bottomPairIds.length} bottom pairs`);

        const matchesPerPair = 4;
        const allMatches: { pair1_id: string; pair2_id: string }[] = [];

        // Function to generate matches within a group
        const generateMatchesForGroup = (groupPairIds: string[], groupName: string) => {
          if (groupPairIds.length < 2) {
            console.log(`⚠️ ${groupName}: Not enough pairs (${groupPairIds.length}) to create matches`);
            return;
          }

          const matches: { pair1_id: string; pair2_id: string }[] = [];
          const pairMatchCounts = new Map<string, number>();

          // Initialize match counts
          groupPairIds.forEach(id => pairMatchCounts.set(id, 0));

          // Shuffle pairs for randomness
          const shuffledPairIds = [...groupPairIds].sort(() => Math.random() - 0.5);

          // Greedy algorithm: assign matches to pairs that need them most
          let attempts = 0;
          const maxAttempts = 1000;

          while (attempts < maxAttempts) {
            attempts++;
            let madeProgress = false;

            for (const pair1Id of shuffledPairIds) {
              const pair1Count = pairMatchCounts.get(pair1Id) || 0;
              if (pair1Count >= matchesPerPair) continue;

              // Find a suitable opponent WITHIN THE SAME GROUP
              for (const pair2Id of shuffledPairIds) {
                if (pair1Id === pair2Id) continue;

                const pair2Count = pairMatchCounts.get(pair2Id) || 0;
                if (pair2Count >= matchesPerPair) continue;

                // Check if these pairs already have a match
                const matchExists = matches.some(m =>
                  (m.pair1_id === pair1Id && m.pair2_id === pair2Id) ||
                  (m.pair1_id === pair2Id && m.pair2_id === pair1Id)
                );

                if (!matchExists) {
                  // Create match with consistent ordering (smaller ID first)
                  const [sortedPair1, sortedPair2] = [pair1Id, pair2Id].sort();
                  matches.push({ pair1_id: sortedPair1, pair2_id: sortedPair2 });
                  pairMatchCounts.set(pair1Id, pair1Count + 1);
                  pairMatchCounts.set(pair2Id, pair2Count + 1);
                  madeProgress = true;
                  break;
                }
              }
            }

            // Check if all pairs have enough matches
            const allPairsSatisfied = Array.from(pairMatchCounts.values()).every(count => count >= matchesPerPair);
            if (allPairsSatisfied || !madeProgress) break;
          }

          // Log results
          console.log(`✅ ${groupName}: Generated ${matches.length} matches`);
          pairMatchCounts.forEach((count, pairId) => {
            if (count < matchesPerPair) {
              console.warn(`⚠️ ${groupName} Pair ${pairId} only has ${count}/${matchesPerPair} matches`);
            }
          });

          return matches;
        };

        // Generate matches for top half
        const topMatches = generateMatchesForGroup(topPairIds, 'Top half');
        if (topMatches) allMatches.push(...topMatches);

        // Generate matches for bottom half
        const bottomMatches = generateMatchesForGroup(bottomPairIds, 'Bottom half');
        if (bottomMatches) allMatches.push(...bottomMatches);

        console.log(`✅ Total matches generated: ${allMatches.length}`);

        // Insert matches into database
        if (allMatches.length > 0) {
          const matchesToInsert = allMatches.map((match, index) => ({
            draw_id: newDraw.id,
            pair1_id: match.pair1_id,
            pair2_id: match.pair2_id,
            match_number: index + 1,
          }));

          const { error: matchesError } = await supabase
            .from('weekly_event_matches')
            .insert(matchesToInsert);

          if (matchesError) {
            console.error('Error creating matches:', matchesError);
            // Don't fail the whole draw if matches fail
          } else {
            console.log(`💾 Saved ${matchesToInsert.length} matches to database`);
          }
        }
      }

      await loadEventDraw(selectedLeague.id);
      alert('Sorteio realizado com sucesso!');
    } catch (error) {
      console.error('Error performing draw:', error);
      alert('Erro ao realizar sorteio');
    } finally {
      setPerformingDraw(false);
    }
  };

  const handleDeleteDraw = async () => {
    if (!selectedLeague || !currentDraw) return;
    if (!confirm('Tem certeza que deseja apagar o sorteio atual?')) return;

    try {
      await supabase
        .from('weekly_event_draws')
        .delete()
        .eq('id', currentDraw.id);

      setCurrentDraw(null);
      setCurrentPairs([]);
    } catch (error) {
      console.error('Error deleting draw:', error);
      alert('Erro ao apagar sorteio');
    }
  };

  const handleUpdateAttendance = async (status: 'confirmed' | 'declined' | 'bbq_only' | 'play_and_bbq') => {
    if (!profile || !selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) return;

    const weekDate = nextEvent.toISOString().split('T')[0];
    const isConfirming = status !== 'declined';

    setUpdatingAttendance(true);
    try {
      if (myAttendance) {
        const { error } = await supabase
          .from('league_attendance')
          .update({
            status,
            confirmed_at: isConfirming ? new Date().toISOString() : null,
          })
          .eq('id', myAttendance.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('league_attendance')
          .insert([{
            league_id: selectedLeague.id,
            player_id: profile.id,
            week_date: weekDate,
            status,
            confirmed_at: isConfirming ? new Date().toISOString() : null,
          }]);

        if (error) throw error;
      }

      await loadMyAttendance(selectedLeague.id);
      await loadAllAttendances(selectedLeague.id);
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Erro ao atualizar presenca');
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const getDayName = (day: number): string => {
    const days = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
    return days[day] || '';
  };

  const getAttendanceDeadline = (league: League): Date | null => {
    if (league.format !== 'weekly' || !league.attendance_deadline_hours) return null;

    const nextEvent = getNextWeeklyEventDate(league);
    if (!nextEvent) return null;

    const hoursBeforeEvent = league.attendance_deadline_hours;
    const deadline = new Date(nextEvent.getTime() - (hoursBeforeEvent * 60 * 60 * 1000));

    return deadline;
  };

  const formatDeadlineTime = (deadline: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    return deadline.toLocaleString('pt-BR', options);
  };

  const getLastEventDate = (league: League): Date | null => {
    if (league.format !== 'weekly' || league.weekly_day === null || league.weekly_day === undefined) return null;

    const now = new Date();
    const lastEvent = new Date(now);
    const currentDay = now.getDay();

    let daysBack = currentDay - league.weekly_day;
    if (daysBack < 0) {
      daysBack += 7;
    } else if (daysBack === 0) {
      if (league.weekly_time) {
        const [hours, minutes] = league.weekly_time.split(':').map(Number);
        const eventTime = new Date(now);
        eventTime.setHours(hours, minutes, 0, 0);
        if (now < eventTime) {
          daysBack = 7;
        }
      }
    }

    lastEvent.setDate(now.getDate() - daysBack);

    if (league.weekly_time) {
      const [hours, minutes] = league.weekly_time.split(':').map(Number);
      lastEvent.setHours(hours, minutes, 0, 0);
    } else {
      lastEvent.setHours(0, 0, 0, 0);
    }

    return lastEvent;
  };

const shouldShowScoringCard = (league: League): boolean => {
  if (league.format !== 'weekly') return false;
  const validStatuses = ['confirmed', 'bbq_only', 'play_and_bbq'];
  if (!myLastEventAttendance || !validStatuses.includes(myLastEventAttendance.status)) return false;

  const now = Date.now();
  const lastEvent = getLastEventDate(league);

  if (!lastEvent) return false;

  const scoringStart = lastEvent.getTime();
  const scoringEnd = scoringStart + (48 * 60 * 60 * 1000);

  return now >= scoringStart && now < scoringEnd;
};

const shouldShowEventLists = (league: League): boolean => {
  if (league.format !== 'weekly') return false;

  const deadline = getAttendanceDeadline(league);
  if (!deadline) return false;

  const now = Date.now();
  const lastEvent = getLastEventDate(league);

  if (!lastEvent) return false;

  const scoringEnd = lastEvent.getTime() + (48 * 60 * 60 * 1000);

  return now >= deadline.getTime() && now < scoringEnd;
};

  const loadWeeklyScore = async () => {
    console.log('🔵 CODE VERSION: 2026-01-03-v3 - FIXED: USE LAST EVENT FOR SCORING');

    if (!profile || !selectedLeague) return;

    // IMPORTANT: Score submission is for the CURRENT/PAST event, not the next one
    // So we prioritize lastEvent (which could be today or past) over nextEvent
    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    const lastEvent = getLastEventDate(selectedLeague);

    const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
    if (!eventDate) {
      console.warn('[loadWeeklyScore] No event date available (neither last nor next)');
      return;
    }

    console.log('[loadWeeklyScore] Looking for event on date:', eventDate, {
      nextEvent: nextEvent?.toISOString().split('T')[0],
      lastEvent: lastEvent?.toISOString().split('T')[0],
      using: lastEvent ? 'LAST EVENT (scoring for past/current)' : 'NEXT EVENT (fallback)'
    });

    try {
      const { data: weeklyEvent, error: eventError } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (eventError) throw eventError;

      console.log('[loadWeeklyScore] Weekly Event found:', weeklyEvent ? `Yes (id: ${weeklyEvent.id})` : 'NO - event does not exist in database!');

      if (weeklyEvent) {
        const { data: attendance, error: attendanceError } = await supabase
          .from('weekly_event_attendance')
          .select('*')
          .eq('event_id', weeklyEvent.id)
          .eq('player_id', profile.id)
          .maybeSingle();

        if (attendanceError) throw attendanceError;

        // Load pairs regardless of attendance status (needed for first-time score submission)
        const { data: drawData, error: drawError } = await supabase
          .from('weekly_event_draws')
          .select('id, event_date')
          .eq('league_id', selectedLeague.id)
          .eq('event_date', eventDate)
          .maybeSingle();

        if (drawError) {
          console.error('[loadWeeklyScore] Error fetching draw:', drawError);
        }

        console.log('[loadWeeklyScore] Draw data:', drawData);

        // If no draw found for calculated date, try to find ANY draw for this league
        if (!drawData) {
          console.warn('[loadWeeklyScore] No draw found for date', eventDate, '- searching for any draw for this league');
          const { data: anyDraw } = await supabase
            .from('weekly_event_draws')
            .select('id, event_date')
            .eq('league_id', selectedLeague.id)
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (anyDraw) {
            console.warn('[loadWeeklyScore] Found draw for different date:', anyDraw.event_date, '(expected:', eventDate, ')');
            console.warn('[loadWeeklyScore] This indicates a date calculation mismatch!');
          } else {
            console.error('[loadWeeklyScore] No draws found for this league at all');
          }
        }

        if (drawData) {
          // Load pairs with player data using Supabase joins (avoids race conditions with allPlayers)
          const { data: pairsData, error: pairsError } = await supabase
            .from('weekly_event_pairs')
            .select(`
              *,
              player1:player1_id(id, full_name),
              player2:player2_id(id, full_name)
            `)
            .eq('draw_id', drawData.id)
            .order('pair_number');

          if (pairsError) {
            console.error('[loadWeeklyScore] Error loading pairs:', pairsError);
          }

          console.log('[loadWeeklyScore] Raw pairs data from Supabase:', pairsData);

          const eventPairs = pairsData || [];
          console.log('[loadWeeklyScore] Event Pairs loaded:', eventPairs.length, 'pairs');
          console.log('[loadWeeklyScore] Current user profile.id:', profile.id);

          const myPair = eventPairs.find(p => p.player1_id === profile.id || p.player2_id === profile.id);
          console.log('[loadWeeklyScore] My Pair:', myPair ? `Pair #${myPair.pair_number}` : 'NOT FOUND');

          if (!myPair && eventPairs.length > 0) {
            console.warn('[loadWeeklyScore] User not found in pairs. Pairs player IDs:', eventPairs.map(p => ({
              pair_number: p.pair_number,
              player1_id: p.player1_id,
              player2_id: p.player2_id
            })));
          }

          setMyCurrentPair(myPair || null);

          if (myPair) {
            const { data: blowouts } = await supabase
              .from('weekly_event_blowouts')
              .select('victim_player_id')
              .eq('event_id', weeklyEvent.id)
              .eq('applier_pair_id', myPair.id);

            if (blowouts && blowouts.length > 0) {
              setAppliedBlowouts(true);
              setBlowoutVictims(blowouts.map(b => b.victim_player_id));
              console.log('[loadWeeklyScore] Loaded existing blowouts:', blowouts.length);
            } else {
              setAppliedBlowouts(false);
              setBlowoutVictims([]);
            }

            const otherPairs = eventPairs.filter(p => p.id !== myPair.id);
            console.log('[loadWeeklyScore] Victim Pairs (other pairs):', otherPairs.length, 'pairs');
            setVictimPairs(otherPairs);
          } else {
            console.warn('[loadWeeklyScore] User not in any pair - cannot select victims');
            setAppliedBlowouts(false);
            setBlowoutVictims([]);
            setVictimPairs([]);
          }
        } else {
          console.warn('[loadWeeklyScore] No draw found for this event');
          setAppliedBlowouts(false);
          setBlowoutVictims([]);
          setVictimPairs([]);
        }

        // Set attendance data if exists
        if (attendance) {
          setWeeklyScore(attendance);
          setScoringVictories(attendance.victories || 0);
          setScoringDefeats(attendance.defeats || 0);
        } else {
          setWeeklyScore(null);
          setScoringVictories(0);
          setScoringDefeats(0);
        }
      } else {
        console.warn('[loadWeeklyScore] ❌ No weekly_event found for this date - cannot load pairs!');
        console.warn('[loadWeeklyScore] The event may not have been created yet. Expected event_date:', eventDate);
        setWeeklyScore(null);
        setMyCurrentPair(null);
        setVictimPairs([]);
        setAppliedBlowouts(false);
        setBlowoutVictims([]);
      }
    } catch (error) {
      console.error('Error loading weekly score:', error);
      setWeeklyScore(null);
    }
  };

  const loadScoreSubmissions = async (leagueId: string) => {
    if (!selectedLeague) return;

    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) return;

      const { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', leagueId)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) {
        setScoreSubmissions({});
        return;
      }

      const { data: attendances, error } = await supabase
        .from('weekly_event_attendance')
        .select('player_id, points_submitted')
        .eq('event_id', weeklyEvent.id);

      if (error) throw error;

      const submissions: Record<string, boolean> = {};
      attendances?.forEach(att => {
        submissions[att.player_id] = att.points_submitted || false;
      });

      setScoreSubmissions(submissions);
    } catch (error) {
      console.error('Error loading score submissions:', error);
    }
  };

  const handleOrganizerSubmitScore = async () => {
    if (!selectedLeague || !editingPlayerScore) return;

    setSubmittingPlayerScore(true);
    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }

      let { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) {
        const { data: newEvent, error: eventError } = await supabase
          .from('weekly_events')
          .insert({
            league_id: selectedLeague.id,
            event_date: eventDate,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        weeklyEvent = newEvent;
      }

      const editorPair = currentPairs.find(p => p.player1_id === editingPlayerScore.playerId || p.player2_id === editingPlayerScore.playerId);

      if (editAppliedBlowouts && editBlowoutVictims.length > 0 && editorPair) {
        // CRITICAL: Delete only THIS PLAYER's blowouts, not the entire pair's
        console.log(`🗑️ Deleting blowouts for player ${editingPlayerScore.playerId} in event ${weeklyEvent.id}`);

        // First check what exists
        const { data: existingBlowouts, error: checkError } = await supabase
          .from('weekly_event_blowouts')
          .select('*')
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', editingPlayerScore.playerId);

        if (checkError) {
          console.error('Error checking existing blowouts:', checkError);
        } else {
          console.log(`📋 Found ${existingBlowouts?.length || 0} existing blowout(s) to delete`);
        }

        const { data: deletedData, error: deleteError } = await supabase
          .from('weekly_event_blowouts')
          .delete()
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', editingPlayerScore.playerId)
          .select();

        if (deleteError) {
          console.error('❌ Error deleting old blowouts:', deleteError);
          throw new Error(`Erro ao deletar pneus antigos: ${deleteError.message}. Verifique se você tem permissão como organizador.`);
        }

        console.log(`✅ Successfully deleted ${deletedData?.length || 0} blowout record(s)`);

        const blowoutRecords = editBlowoutVictims.map(victimId => ({
          event_id: weeklyEvent.id,
          applier_pair_id: editorPair.id,
          applier_player_id: editingPlayerScore.playerId,
          victim_player_id: victimId,
        }));

        console.log(`➕ Inserting ${blowoutRecords.length} new blowout record(s)`);

        const { error: blowoutError } = await supabase
          .from('weekly_event_blowouts')
          .insert(blowoutRecords);

        if (blowoutError) {
          console.error('❌ Error inserting blowouts:', blowoutError);
          throw new Error(`Erro ao inserir pneus: ${blowoutError.message}`);
        }

        console.log('✅ Blowouts inserted successfully');
      } else {
        // If unchecking blowouts, delete only this player's records
        const { error: deleteError } = await supabase
          .from('weekly_event_blowouts')
          .delete()
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', editingPlayerScore.playerId);

        if (deleteError) {
          console.error('Error deleting blowouts:', deleteError);
          throw new Error('Erro ao deletar pneus. Verifique se você tem permissão como organizador.');
        }
      }

      // CRITICAL: Recalculate blowout counts (same logic as handleSubmitScore)

      // 1. Count blowouts APPLIED by this player (deduplicate by victim pair)
      const { data: appliedBlowoutsData } = await supabase
        .from('weekly_event_blowouts')
        .select('victim_player_id')
        .eq('event_id', weeklyEvent.id)
        .eq('applier_player_id', editingPlayerScore.playerId);

      // Get draw to find victim pairs
      const { data: drawData } = await supabase
        .from('weekly_event_draws')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      let blowoutsApplied = 0;
      if (drawData && appliedBlowoutsData && appliedBlowoutsData.length > 0) {
        const { data: pairsData } = await supabase
          .from('weekly_event_pairs')
          .select('id, player1_id, player2_id')
          .eq('draw_id', drawData.id);

        const victimPairIds = appliedBlowoutsData.map(b => {
          const victimPair = pairsData?.find(p =>
            p.player1_id === b.victim_player_id || p.player2_id === b.victim_player_id
          );
          return victimPair?.id;
        }).filter(id => id !== undefined);

        const uniqueVictimPairs = new Set(victimPairIds);
        blowoutsApplied = uniqueVictimPairs.size;
      }

      // 2. Count blowouts RECEIVED (deduplicate by applier_pair_id)
      const { data: receivedBlowoutsData } = await supabase
        .from('weekly_event_blowouts')
        .select('applier_pair_id')
        .eq('event_id', weeklyEvent.id)
        .eq('victim_player_id', editingPlayerScore.playerId);

      const uniqueApplierPairs = new Set(receivedBlowoutsData?.map(b => b.applier_pair_id) || []);
      const blowoutsReceived = uniqueApplierPairs.size;

      // Use organizer-edited values for attendance and BBQ
      const bbqParticipated = editBbqParticipated;
      const attendanceConfirmed = editAttendanceConfirmed;

      const totalPoints =
        (attendanceConfirmed ? 2.5 : 0) +
        (bbqParticipated ? 2.5 : 0) +
        (editVictories * 2) +
        (blowoutsReceived * -3) +
        (blowoutsApplied * 3);

      const { error } = await supabase
        .from('weekly_event_attendance')
        .upsert({
          event_id: weeklyEvent.id,
          player_id: editingPlayerScore.playerId,
          confirmed: attendanceConfirmed,
          confirmed_at: new Date().toISOString(),
          victories: editVictories,
          defeats: editDefeats,
          bbq_participated: bbqParticipated,
          blowouts_received: blowoutsReceived,
          blowouts_applied: blowoutsApplied,
          total_points: totalPoints,
          points_submitted: attendanceConfirmed, // Only mark as submitted if confirmed
          points_submitted_at: attendanceConfirmed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,player_id'
        });

      if (error) throw error;

      // Also update league_attendance status
      const attendanceStatus = !attendanceConfirmed ? 'declined' :
                               (bbqParticipated ? 'play_and_bbq' : 'confirmed');

      await supabase
        .from('league_attendance')
        .upsert({
          league_id: selectedLeague.id,
          player_id: editingPlayerScore.playerId,
          week_date: eventDate,
          status: attendanceStatus,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'league_id,player_id,week_date'
        });

      if (error) throw error;

      // 3. Update victims' blowout counts (same as handleSubmitScore)
      if (editBlowoutVictims.length > 0) {
        for (const victimId of editBlowoutVictims) {
          const { data: victimBlowoutsData } = await supabase
            .from('weekly_event_blowouts')
            .select('applier_pair_id')
            .eq('event_id', weeklyEvent.id)
            .eq('victim_player_id', victimId);

          const uniqueVictimApplierPairs = new Set(victimBlowoutsData?.map(b => b.applier_pair_id) || []);
          const victimBlowoutsCount = uniqueVictimApplierPairs.size;

          const { data: victimAttendance } = await supabase
            .from('weekly_event_attendance')
            .select('*')
            .eq('event_id', weeklyEvent.id)
            .eq('player_id', victimId)
            .maybeSingle();

          if (victimAttendance) {
            const victimTotalPoints =
              (victimAttendance.confirmed ? 2.5 : 0) + // Only add game points if player confirmed game attendance
              (victimAttendance.bbq_participated ? 2.5 : 0) +
              (victimAttendance.victories * 2) +
              (victimBlowoutsCount * -3) +
              (victimAttendance.blowouts_applied * 3);

            await supabase
              .from('weekly_event_attendance')
              .update({
                blowouts_received: victimBlowoutsCount,
                total_points: victimTotalPoints,
                updated_at: new Date().toISOString(),
              })
              .eq('event_id', weeklyEvent.id)
              .eq('player_id', victimId);
          }
        }
      }

      alert(`Pontuacao de ${editingPlayerScore.playerName} enviada com sucesso!`);
      setEditingPlayerScore(null);
      setEditVictories(0);
      setEditDefeats(0);
      setEditAppliedBlowouts(false);
      setEditBlowoutVictims([]);
      setEditAttendanceConfirmed(true);
      setEditBbqParticipated(false);
      await loadScoreSubmissions(selectedLeague.id);
      await loadLeagueRankings(selectedLeague.id);
      await loadAllAttendances(selectedLeague.id);
    } catch (error) {
      console.error('Error submitting player score:', error);
      alert('Erro ao enviar pontuacao');
    } finally {
      setSubmittingPlayerScore(false);
    }
  };

  const handleSubmitManualBlowout = async () => {
    if (!selectedLeague || manualBlowoutAppliers.length === 0 || manualBlowoutVictims.length === 0) {
      alert('Selecione pelo menos um jogador que aplicou e um que recebeu o pneu');
      return;
    }

    setSubmittingManualBlowout(true);
    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }

      let { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) {
        const { data: newEvent, error: eventError } = await supabase
          .from('weekly_events')
          .insert({
            league_id: selectedLeague.id,
            event_date: eventDate,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        weeklyEvent = newEvent;
      }

      // Insert blowout records for each combination of applier and victim
      const blowoutRecords = [];
      for (const applierId of manualBlowoutAppliers) {
        for (const victimId of manualBlowoutVictims) {
          // Find the applier's pair (can be null for manual blowouts)
          const applierPair = currentPairs.find(p => p.player1_id === applierId || p.player2_id === applierId);

          blowoutRecords.push({
            event_id: weeklyEvent.id,
            applier_pair_id: applierPair?.id || null,
            applier_player_id: applierId,
            victim_player_id: victimId,
          });
        }
      }

      const { error: blowoutError } = await supabase
        .from('weekly_event_blowouts')
        .insert(blowoutRecords);

      if (blowoutError) {
        console.error('Error inserting manual blowouts:', blowoutError);
        throw new Error(`Erro ao inserir pneus: ${blowoutError.message}`);
      }

      // Update points for all affected players
      const affectedPlayers = [...new Set([...manualBlowoutAppliers, ...manualBlowoutVictims])];
      for (const playerId of affectedPlayers) {
        // Count blowouts APPLIED by this player
        const { data: appliedBlowoutsData } = await supabase
          .from('weekly_event_blowouts')
          .select('victim_player_id')
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', playerId);

        const blowoutsApplied = new Set(appliedBlowoutsData?.map(b => b.victim_player_id) || []).size;

        // Count blowouts RECEIVED (deduplicate by applier_pair_id)
        const { data: receivedBlowoutsData } = await supabase
          .from('weekly_event_blowouts')
          .select('applier_pair_id')
          .eq('event_id', weeklyEvent.id)
          .eq('victim_player_id', playerId);

        const uniqueApplierPairs = new Set(receivedBlowoutsData?.map(b => b.applier_pair_id).filter(id => id !== null) || []);
        const blowoutsReceived = uniqueApplierPairs.size;

        // Get current attendance data
        const { data: attendance } = await supabase
          .from('weekly_event_attendance')
          .select('*')
          .eq('event_id', weeklyEvent.id)
          .eq('player_id', playerId)
          .maybeSingle();

        if (attendance) {
          const totalPoints =
            (attendance.confirmed ? 2.5 : 0) + // Only add game points if player confirmed game attendance
            (attendance.bbq_participated ? 2.5 : 0) +
            (attendance.victories * 2) +
            (blowoutsReceived * -3) +
            (blowoutsApplied * 3);

          await supabase
            .from('weekly_event_attendance')
            .update({
              blowouts_received: blowoutsReceived,
              blowouts_applied: blowoutsApplied,
              total_points: totalPoints,
              updated_at: new Date().toISOString(),
            })
            .eq('event_id', weeklyEvent.id)
            .eq('player_id', playerId);
        }
      }

      alert('Pneu manual inserido com sucesso!');
      setShowManualBlowoutModal(false);
      setManualBlowoutAppliers([]);
      setManualBlowoutVictims([]);
      await loadLeagueRankings(selectedLeague.id);
    } catch (error) {
      console.error('Error submitting manual blowout:', error);
      alert('Erro ao inserir pneu manual');
    } finally {
      setSubmittingManualBlowout(false);
    }
  };

  const openPlayerScoreModal = async (playerId: string, playerName: string) => {
    setEditingPlayerScore({ playerId, playerName });
    setEditVictories(0);
    setEditDefeats(0);
    setEditAppliedBlowouts(false);
    setEditBlowoutVictims([]);
    setEditAttendanceConfirmed(true);
    setEditBbqParticipated(false);

    if (!selectedLeague) return;

    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) return;

      const { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) return;

      // Load attendance data
      const playerAttendance = lastEventAttendances[playerId];
      if (playerAttendance) {
        const bbqStatuses = ['play_and_bbq', 'bbq_only'];
        setEditBbqParticipated(bbqStatuses.includes(playerAttendance.status));
        // Attendance is confirmed only if status is 'confirmed' or 'play_and_bbq'
        // 'bbq_only' means they only participated in BBQ, not in the game
        const playStatuses = ['confirmed', 'play_and_bbq'];
        setEditAttendanceConfirmed(playStatuses.includes(playerAttendance.status));
      }

      const { data: drawData } = await supabase
        .from('weekly_event_draws')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!drawData) return;

      const { data: pairsData } = await supabase
        .from('weekly_event_pairs')
        .select(`
          *,
          player1:player1_id(id, full_name),
          player2:player2_id(id, full_name)
        `)
        .eq('draw_id', drawData.id)
        .order('pair_number');

      const eventPairs = pairsData || [];
      setCurrentPairs(eventPairs);

      const playerPair = eventPairs.find(p => p.player1_id === playerId || p.player2_id === playerId);

      if (playerPair) {
        const { data: blowouts } = await supabase
          .from('weekly_event_blowouts')
          .select('victim_player_id')
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', playerId);

        if (blowouts && blowouts.length > 0) {
          setEditAppliedBlowouts(true);
          setEditBlowoutVictims(blowouts.map(b => b.victim_player_id));
        }
      }
    } catch (error) {
      console.error('Error loading player score data:', error);
    }
  };

  const handleSubmitScore = async () => {
    if (!selectedLeague || !profile) return;

    setSubmittingScore(true);
    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }

      let { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) {
        const { data: newEvent, error: eventError } = await supabase
          .from('weekly_events')
          .insert({
            league_id: selectedLeague.id,
            event_date: eventDate,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        weeklyEvent = newEvent;
      }

      if (appliedBlowouts && blowoutVictims.length > 0 && myCurrentPair) {
        // CRITICAL: Delete only THIS PLAYER's blowouts, not the entire pair's
        // This allows both partners to independently mark their blowouts
        await supabase
          .from('weekly_event_blowouts')
          .delete()
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', profile.id);

        const blowoutRecords = blowoutVictims.map(victimId => ({
          event_id: weeklyEvent.id,
          applier_pair_id: myCurrentPair.id,
          applier_player_id: profile.id,
          victim_player_id: victimId,
        }));

        const { error: blowoutError } = await supabase
          .from('weekly_event_blowouts')
          .insert(blowoutRecords);

        if (blowoutError) throw blowoutError;
      } else {
        // If unchecking blowouts, delete only this player's records
        await supabase
          .from('weekly_event_blowouts')
          .delete()
          .eq('event_id', weeklyEvent.id)
          .eq('applier_player_id', profile.id);
      }

      // CRITICAL: Recalculate blowout counts for all affected players
      // After saving/deleting blowouts, we need to update the aggregated counts in attendance table

      // 1. Count blowouts APPLIED by current player
      // CRITICAL: Must deduplicate by victim PAIR, not individual victims
      // When player marks "Dupla 2" (2 victims), it creates 2 records but should count as 1 blowout applied
      const { data: appliedBlowoutsData } = await supabase
        .from('weekly_event_blowouts')
        .select('victim_player_id')
        .eq('event_id', weeklyEvent.id)
        .eq('applier_player_id', profile.id);

      // Get draw to find victim pairs
      const { data: drawData } = await supabase
        .from('weekly_event_draws')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      let blowoutsAppliedCount = 0;
      if (drawData && appliedBlowoutsData && appliedBlowoutsData.length > 0) {
        // Get all pairs for this draw to map victims to their pairs
        const { data: pairsData } = await supabase
          .from('weekly_event_pairs')
          .select('id, player1_id, player2_id')
          .eq('draw_id', drawData.id);

        // Map each victim to their pair_id
        const victimPairIds = appliedBlowoutsData.map(b => {
          const victimPair = pairsData?.find(p =>
            p.player1_id === b.victim_player_id || p.player2_id === b.victim_player_id
          );
          return victimPair?.id;
        }).filter(id => id !== undefined);

        // Count unique victim pairs
        const uniqueVictimPairs = new Set(victimPairIds);
        blowoutsAppliedCount = uniqueVictimPairs.size;
      }

      // 2. Count blowouts RECEIVED by current player
      // CRITICAL: Deduplicate by applier_pair_id to avoid double-counting
      // When both partners mark the same victim, it should count as 1 blowout, not 2
      const { data: receivedBlowoutsData } = await supabase
        .from('weekly_event_blowouts')
        .select('applier_pair_id')
        .eq('event_id', weeklyEvent.id)
        .eq('victim_player_id', profile.id);

      // Count unique applier pairs (deduplicate)
      const uniqueApplierPairs = new Set(receivedBlowoutsData?.map(b => b.applier_pair_id) || []);
      const blowoutsReceived = uniqueApplierPairs.size;

      const bbqParticipated = myLastEventAttendance?.status === 'play_and_bbq' || myLastEventAttendance?.status === 'bbq_only';
      const totalPoints =
        2.5 +
        (bbqParticipated ? 2.5 : 0) +
        ((scoringVictories ?? 0) * 2) +
        (blowoutsReceived * -3) +
        (blowoutsAppliedCount * 3);

      const { error } = await supabase
        .from('weekly_event_attendance')
        .upsert({
          event_id: weeklyEvent.id,
          player_id: profile.id,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          victories: scoringVictories ?? 0,
          defeats: scoringDefeats ?? 0,
          bbq_participated: bbqParticipated,
          blowouts_received: blowoutsReceived,
          blowouts_applied: blowoutsAppliedCount,
          total_points: totalPoints,
          points_submitted: true,
          points_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,player_id'
        });

      if (error) throw error;

      // 3. Update blowout counts for victim players
      // When player applies blowouts to others, victims' blowouts_received counts must also be updated
      if (blowoutVictims.length > 0) {
        for (const victimId of blowoutVictims) {
          // Count how many blowouts this victim received
          // CRITICAL: Deduplicate by applier_pair_id
          const { data: victimBlowoutsData } = await supabase
            .from('weekly_event_blowouts')
            .select('applier_pair_id')
            .eq('event_id', weeklyEvent.id)
            .eq('victim_player_id', victimId);

          // Deduplicate - if both partners from same pair marked this victim, count as 1
          const uniqueVictimApplierPairs = new Set(victimBlowoutsData?.map(b => b.applier_pair_id) || []);
          const victimBlowoutsCount = uniqueVictimApplierPairs.size;

          // Get victim's current attendance data
          const { data: victimAttendance } = await supabase
            .from('weekly_event_attendance')
            .select('*')
            .eq('event_id', weeklyEvent.id)
            .eq('player_id', victimId)
            .maybeSingle();

          if (victimAttendance) {
            // Recalculate victim's total points with updated blowout count
            const victimTotalPoints =
              (victimAttendance.confirmed ? 2.5 : 0) + // Only add game points if player confirmed game attendance
              (victimAttendance.bbq_participated ? 2.5 : 0) +
              (victimAttendance.victories * 2) +
              (victimBlowoutsCount * -3) +
              (victimAttendance.blowouts_applied * 3);

            // Update victim's attendance with new blowout count and total points
            await supabase
              .from('weekly_event_attendance')
              .update({
                blowouts_received: victimBlowoutsCount,
                total_points: victimTotalPoints,
                updated_at: new Date().toISOString(),
              })
              .eq('event_id', weeklyEvent.id)
              .eq('player_id', victimId);
          }
        }
      }

      alert('Pontuacao enviada com sucesso!');
      await loadWeeklyScore();
      if (selectedLeague) {
        await loadScoreSubmissions(selectedLeague.id);
        await loadLeagueRankings(selectedLeague.id);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Erro ao enviar pontuacao');
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleSubmitBbqOnly = async () => {
    if (!selectedLeague || !profile) return;

    setSubmittingScore(true);
    try {
      const nextEvent = getNextWeeklyEventDate(selectedLeague);
      const lastEvent = getLastEventDate(selectedLeague);
      const eventDate = lastEvent?.toISOString().split('T')[0] || nextEvent?.toISOString().split('T')[0];
      if (!eventDate) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }

      let { data: weeklyEvent } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (!weeklyEvent) {
        const { data: newEvent, error: eventError } = await supabase
          .from('weekly_events')
          .insert({
            league_id: selectedLeague.id,
            event_date: eventDate,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        weeklyEvent = newEvent;
      }

      const { error } = await supabase
        .from('weekly_event_attendance')
        .upsert({
          event_id: weeklyEvent.id,
          player_id: profile.id,
          confirmed: false, // BBQ only - did NOT play
          confirmed_at: new Date().toISOString(),
          victories: 0,
          defeats: 0,
          bbq_participated: true,
          blowouts_received: 0,
          blowouts_applied: 0,
          total_points: 2.5, // Only BBQ points
          points_submitted: true,
          points_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,player_id'
        });

      if (error) throw error;

      alert('Presenca no churrasco confirmada! +2,5 pontos');
      await loadWeeklyScore();
      if (selectedLeague) {
        await loadScoreSubmissions(selectedLeague.id);
      }
    } catch (error) {
      console.error('Error submitting BBQ score:', error);
      alert('Erro ao confirmar presenca no churrasco');
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleJoinLeague = async (leagueId: string) => {
    if (!profile) return;

    setJoiningLeague(leagueId);
    try {
      const result = await leagueService.joinLeague(leagueId, joinMessage || undefined);

      if (result.pendingApproval) {
        setPendingRequests(prev => [...prev, leagueId]);
      } else {
        setMyLeagues(prev => [...prev, leagueId]);
        if (selectedLeague?.id === leagueId) {
          loadLeagueRankings(leagueId);
        }
      }
      setJoinMessage('');
    } catch (error: any) {
      alert(error.message || 'Erro ao solicitar entrada na liga');
    } finally {
      setJoiningLeague(null);
    }
  };

  const loadLeagueRankings = async (leagueId: string) => {
    try {
      const { data: members, error: membersError } = await supabase
        .from('league_memberships')
        .select(`
          player_id,
          player:players(*)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const { data: events, error: eventsError } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', leagueId);

      if (eventsError) throw eventsError;

      const eventIds = events?.map(e => e.id) || [];

      let attendanceData: any[] = [];
      if (eventIds.length > 0) {
        const { data: attendance, error: attendanceError } = await supabase
          .from('weekly_event_attendance')
          .select('player_id, victories, defeats, total_points, bbq_participated, blowouts_received, blowouts_applied')
          .in('event_id', eventIds)
          .eq('points_submitted', true);

        if (attendanceError) throw attendanceError;
        attendanceData = attendance || [];
      }

      const statsMap = new Map<string, { points: number; wins: number; losses: number; blowouts: number; blowoutsApplied: number }>();
      attendanceData.forEach(att => {
        const existing = statsMap.get(att.player_id) || { points: 0, wins: 0, losses: 0, blowouts: 0, blowoutsApplied: 0 };
        statsMap.set(att.player_id, {
          points: existing.points + (att.total_points || 0),
          wins: existing.wins + (att.victories || 0),
          losses: existing.losses + (att.defeats || 0),
          blowouts: existing.blowouts + (att.blowouts_received || 0),
          blowoutsApplied: existing.blowoutsApplied + (att.blowouts_applied || 0),
        });
      });

      const combinedRankings = (members || []).map(member => {
        const stats = statsMap.get(member.player_id) || { points: 0, wins: 0, losses: 0, blowouts: 0, blowoutsApplied: 0 };
        const matchesPlayed = stats.wins + stats.losses;
        return {
          player_id: member.player_id,
          league_id: leagueId,
          points: stats.points,
          matches_played: matchesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          win_rate: matchesPlayed > 0 ? (stats.wins / matchesPlayed) * 100 : 0,
          blowouts: stats.blowouts,
          blowout_rate: matchesPlayed > 0 ? (stats.blowouts / matchesPlayed) * 100 : 0,
          blowouts_applied: stats.blowoutsApplied,
          blowout_applied_rate: matchesPlayed > 0 ? (stats.blowoutsApplied / matchesPlayed) * 100 : 0,
          player: member.player,
        };
      });

      combinedRankings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.player?.full_name?.localeCompare(b.player?.full_name || '') || 0;
      });

      setLeagueRankings(combinedRankings);
    } catch (error) {
      console.error('Error loading league rankings:', error);
    }
  };

  const getLeagueTypeName = (type: string) => {
    switch (type) {
      case 'club': return 'Clube';
      case 'friends': return 'Amigos';
      case 'official': return 'Oficial';
      default: return type;
    }
  };

  const getMyPosition = () => {
    if (!profile) return null;
    const index = leagueRankings.findIndex(r => r.player_id === profile.id);
    return index >= 0 ? index + 1 : null;
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-500"></div>
          <p className="mt-4 text-gray-600">Carregando ligas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-6 sm:py-8 px-3 sm:px-4 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start">
            <Medal className="w-8 h-8 mr-3 text-emerald-600" />
            Ligas
          </h1>
        </div>

        {leagues.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Medal className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma liga ativa</h2>
            <p className="text-gray-600">
              Não há ligas ativas no momento. Aguarde novos torneios!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 w-full">
            <div className="md:col-span-1 min-w-0">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {showAllLeagues ? 'Todas as Ligas' : 'Minhas Ligas'}
                </h2>
                <div className="space-y-3">
                  {leagues
                    .filter(league =>
                      showAllLeagues ||
                      myLeagues.includes(league.id) ||
                      organizerLeagues.includes(league.id)
                    )
                    .map((league) => (
                    <button
                      key={league.id}
                      onClick={() => {
                        setSelectedLeague(league);
                        setShowOrganizerPanel(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedLeague?.id === league.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {organizerLeagues.includes(league.id) && (
                          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        )}
                        {!organizerLeagues.includes(league.id) && myLeagues.includes(league.id) && (
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                        {!organizerLeagues.includes(league.id) && !myLeagues.includes(league.id) && pendingRequests.includes(league.id) && (
                          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{league.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {league.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {getLeagueTypeName(league.type)}
                            </span>
                            {league.affects_regional_ranking && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                Afeta Regional
                              </span>
                            )}
                            {organizerLeagues.includes(league.id) && (
                              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">
                                Organizador
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAllLeagues(!showAllLeagues)}
                  className="w-full mt-4 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {showAllLeagues ? (
                    <>
                      <Check className="w-4 h-4" />
                      Minhas Ligas
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Explorar Ligas
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 min-w-0">
              {selectedLeague && (
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLeague.name}</h2>
                      <p className="text-gray-600 mt-1">{selectedLeague.description}</p>
                    </div>
                    {organizerLeagues.includes(selectedLeague.id) && (
                      <button
                        onClick={() => setShowOrganizerPanel(!showOrganizerPanel)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          showOrganizerPanel
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Gerenciar
                        {joinRequests.length > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {joinRequests.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {showOrganizerPanel && organizerLeagues.includes(selectedLeague.id) && (
                    <div className="mb-6 space-y-4">
                      {joinRequests.length > 0 && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Solicitacoes Pendentes ({joinRequests.length})
                          </h3>
                          <div className="space-y-2">
                            {joinRequests.map((request) => (
                              <div
                                key={request.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                              >
                                <div>
                                  <p className="font-semibold text-gray-900">{request.player.full_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {request.player.ranking_points} pts • {request.player.category}
                                  </p>
                                  {request.message && (
                                    <p className="text-sm text-gray-500 italic mt-1">"{request.message}"</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveRequest(request.id, request.player_id)}
                                    disabled={processingRequest === request.id}
                                    className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                                    title="Aprovar"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(request.id)}
                                    disabled={processingRequest === request.id}
                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                    title="Rejeitar"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Membros da Liga ({leagueMembers.length})
                        </h3>

                        <div className="mb-4">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddMember(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Adicionar jogador...</option>
                            {allPlayers
                              .filter(p => !leagueMembers.some(m => m.player_id === p.id))
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.full_name} - {player.ranking_points} pts
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {leagueMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{member.player.full_name}</p>
                                <p className="text-sm text-gray-600">
                                  {member.player.ranking_points} pts • {member.player.category}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedLeague.format === 'weekly' && (
                        <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4">
                          <h3 className="font-bold text-cyan-900 mb-3 flex items-center gap-2">
                            <Shuffle className="w-5 h-5" />
                            Sorteio de Duplas
                          </h3>
                          {canOrganizerPerformDraw(selectedLeague) ? (
                            <>
                              <p className="text-sm text-cyan-700 mb-3">
                                Realize o sorteio das duplas para o proximo evento. O sorteio e feito primeiro entre os 12 melhores colocados confirmados, depois com os demais.
                              </p>
                              {currentDraw ? (
                                <div className="space-y-3">
                                  <div className="bg-cyan-100 rounded-lg p-3">
                                    <p className="text-sm text-cyan-800 font-medium">Sorteio ja realizado</p>
                                    <p className="text-xs text-cyan-600 mt-1">
                                      {currentPairs.length} dupla(s) sorteada(s)
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handlePerformDraw}
                                      disabled={performingDraw}
                                      className="flex-1 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      {performingDraw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                                      Refazer Sorteio
                                    </button>
                                    <button
                                      onClick={handleDeleteDraw}
                                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={handlePerformDraw}
                                  disabled={performingDraw}
                                  className="w-full py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {performingDraw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                                  Realizar Sorteio
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-cyan-600">
                              O sorteio pode ser realizado apos o prazo de confirmacao de presenca e antes do inicio do evento.
                            </p>
                          )}
                        </div>
                      )}

                      {selectedLeague.format === 'weekly' && shouldShowScoringCard(selectedLeague) && (
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                          <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                            <Beef className="w-5 h-5" />
                            Inserir Pneu Manual
                          </h3>
                          <p className="text-sm text-purple-700 mb-3">
                            Registre um pneu que aconteceu fora do sistema. Selecione jogadores individualmente.
                          </p>
                          <button
                            onClick={() => setShowManualBlowoutModal(true)}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                          >
                            Inserir Pneu Manual
                          </button>
                        </div>
                      )}

                      {selectedLeague.format === 'weekly' && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                          <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                            <RotateCcw className="w-5 h-5" />
                            Resetar Pontuacao
                          </h3>
                          <p className="text-sm text-red-700 mb-3">
                            Zera todas as pontuacoes da liga. Esta acao nao pode ser desfeita.
                          </p>
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                          >
                            Resetar Pontos da Liga
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {myLeagues.includes(selectedLeague.id) && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-emerald-900">
                            Voce esta participando desta liga!
                          </p>
                          {getMyPosition() && (
                            <p className="text-sm text-emerald-700 mt-1">
                              Posicao atual: #{getMyPosition()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {myLeagues.includes(selectedLeague.id) && shouldShowAttendanceCard(selectedLeague) && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 hidden sm:block" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-0">
                            <Calendar className="w-5 h-5 text-blue-600 sm:hidden" />
                            <p className="font-semibold text-blue-900">
                              Proximo evento semanal
                            </p>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            {getDayName(selectedLeague.weekly_day || 0)}, {getNextWeeklyEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                            {selectedLeague.weekly_time && ` as ${selectedLeague.weekly_time.slice(0, 5)}`}
                          </p>
                          {getAttendanceDeadline(selectedLeague) && (
                            isAttendanceDeadlinePassed(selectedLeague) ? (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-md w-fit">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Prazo de confirmacao encerrado</span>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md w-fit">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                  Confirmacao disponivel ate {formatDeadlineTime(getAttendanceDeadline(selectedLeague)!)}
                                </span>
                              </div>
                            )
                          )}

                          {myAttendance?.status === 'play_and_bbq' ? (
                            <div className="mt-3 flex items-center gap-2 text-cyan-700 bg-cyan-100 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block flex-shrink-0" />
                                <Beef className="w-5 h-5 flex-shrink-0 text-amber-600" />
                              </div>
                              <span className="font-medium">Vou jogar e participar do churrasco!</span>
                            </div>
                          ) : myAttendance?.status === 'confirmed' ? (
                            <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg">
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block flex-shrink-0" />
                              <span className="font-medium">Vou apenas jogar!</span>
                            </div>
                          ) : myAttendance?.status === 'bbq_only' ? (
                            <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                              <Beef className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Apenas churrasco confirmado!</span>
                            </div>
                          ) : myAttendance?.status === 'declined' ? (
                            <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                              <XCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Voce indicou que nao podera comparecer</span>
                            </div>
                          ) : isAttendanceDeadlinePassed(selectedLeague) ? (
                            <div className="mt-3 flex items-center gap-2 text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                              <XCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Presenca nao confirmada</span>
                            </div>
                          ) : (
                            <p className="text-sm text-blue-600 mt-2">
                              Confirme sua presenca para o proximo evento
                            </p>
                          )}

                          {!isAttendanceDeadlinePassed(selectedLeague) && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <button
                                onClick={() => handleUpdateAttendance('play_and_bbq')}
                                disabled={updatingAttendance || myAttendance?.status === 'play_and_bbq'}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  myAttendance?.status === 'play_and_bbq'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                                }`}
                              >
                                {updatingAttendance ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <div className="flex items-center gap-0.5">
                                    <span className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block flex-shrink-0" />
                                    <Beef className="w-4 h-4 flex-shrink-0" />
                                  </div>
                                )}
                                <span className="truncate">Jogar + Churrasco</span>
                              </button>
                              <button
                                onClick={() => handleUpdateAttendance('confirmed')}
                                disabled={updatingAttendance || myAttendance?.status === 'confirmed'}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  myAttendance?.status === 'confirmed'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                              >
                                {updatingAttendance ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block flex-shrink-0" />
                                )}
                                <span className="truncate">Apenas jogar</span>
                              </button>
                              <button
                                onClick={() => handleUpdateAttendance('bbq_only')}
                                disabled={updatingAttendance || myAttendance?.status === 'bbq_only'}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  myAttendance?.status === 'bbq_only'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                              >
                                {updatingAttendance ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Beef className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="truncate">Apenas churrasco</span>
                              </button>
                              <button
                                onClick={() => handleUpdateAttendance('declined')}
                                disabled={updatingAttendance || myAttendance?.status === 'declined'}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  myAttendance?.status === 'declined'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {updatingAttendance ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="truncate">Nao poderei ir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {myLeagues.includes(selectedLeague.id) && shouldShowDrawResults(selectedLeague) && currentPairs.length > 0 && (
                    <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Shuffle className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-cyan-900">
                            Duplas Sorteadas
                          </p>
                          <p className="text-sm text-cyan-700 mt-1">
                            {currentDraw?.event_date && new Date(currentDraw.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>

                          <div className="mt-4 space-y-4">
                            {/* Serie A - Top Half */}
                            {currentPairs.some(p => p.is_top_12) && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">A</span>
                                  </span>
                                  <h4 className="font-bold text-cyan-900">Série A</h4>
                                </div>
                                <div className="space-y-2">
                                  {currentPairs.filter(p => p.is_top_12).map((pair, index) => {
                                    const isMyPair = pair.player1_id === profile?.id || pair.player2_id === profile?.id;
                                    return (
                                      <div
                                        key={pair.id}
                                        className={`p-3 rounded-lg border ${
                                          isMyPair
                                            ? 'bg-cyan-100 border-cyan-300'
                                            : 'bg-white border-cyan-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-amber-500 text-white">
                                            {index + 1}
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className={`font-medium ${pair.player1_id === profile?.id ? 'text-cyan-700' : 'text-gray-900'}`}>
                                                {pair.player1?.full_name || 'Jogador'}
                                                {pair.player1_id === profile?.id && ' (Voce)'}
                                              </span>
                                              {pair.player2 ? (
                                                <>
                                                  <span className="text-gray-400">&</span>
                                                  <span className={`font-medium ${pair.player2_id === profile?.id ? 'text-cyan-700' : 'text-gray-900'}`}>
                                                    {pair.player2?.full_name || 'Jogador'}
                                                    {pair.player2_id === profile?.id && ' (Voce)'}
                                                  </span>
                                                </>
                                              ) : (
                                                <span className="text-amber-600 font-medium">(Coringa)</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Serie B - Bottom Half */}
                            {currentPairs.some(p => !p.is_top_12) && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">B</span>
                                  </span>
                                  <h4 className="font-bold text-cyan-900">Série B</h4>
                                </div>
                                <div className="space-y-2">
                                  {currentPairs.filter(p => !p.is_top_12).map((pair, index) => {
                                    const isMyPair = pair.player1_id === profile?.id || pair.player2_id === profile?.id;
                                    return (
                                      <div
                                        key={pair.id}
                                        className={`p-3 rounded-lg border ${
                                          isMyPair
                                            ? 'bg-cyan-100 border-cyan-300'
                                            : 'bg-white border-cyan-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-gray-500 text-white">
                                            {index + 1}
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className={`font-medium ${pair.player1_id === profile?.id ? 'text-cyan-700' : 'text-gray-900'}`}>
                                                {pair.player1?.full_name || 'Jogador'}
                                                {pair.player1_id === profile?.id && ' (Voce)'}
                                              </span>
                                              {pair.player2 ? (
                                                <>
                                                  <span className="text-gray-400">&</span>
                                                  <span className={`font-medium ${pair.player2_id === profile?.id ? 'text-cyan-700' : 'text-gray-900'}`}>
                                                    {pair.player2?.full_name || 'Jogador'}
                                                    {pair.player2_id === profile?.id && ' (Voce)'}
                                                  </span>
                                                </>
                                              ) : (
                                                <span className="text-amber-600 font-medium">(Coringa)</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {myLeagues.includes(selectedLeague.id) && shouldShowDrawResults(selectedLeague) && currentMatches.length > 0 && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 flex items-center justify-center bg-purple-600 rounded-full flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">vs</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-purple-900">
                            Confrontos (Jogos)
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
                            {currentDraw?.event_date && new Date(currentDraw.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>

                          <div className="mt-4 space-y-4">
                            {/* Serie A Matches */}
                            {(() => {
                              const serieAMatches = currentMatches.filter(match => {
                                const pair1 = currentPairs.find(p => p.id === match.pair1_id);
                                return pair1?.is_top_12;
                              });

                              if (serieAMatches.length === 0) return null;

                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">A</span>
                                    </span>
                                    <h4 className="font-bold text-purple-900">Série A</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {serieAMatches.map((match) => {
                                      const pair1 = currentPairs.find(p => p.id === match.pair1_id);
                                      const pair2 = currentPairs.find(p => p.id === match.pair2_id);

                                      if (!pair1 || !pair2) return null;

                                      const isMyMatch =
                                        pair1.player1_id === profile?.id ||
                                        pair1.player2_id === profile?.id ||
                                        pair2.player1_id === profile?.id ||
                                        pair2.player2_id === profile?.id;

                                      return (
                                        <div
                                          key={match.id}
                                          className={`p-3 rounded-lg border ${
                                            isMyMatch
                                              ? 'bg-purple-100 border-purple-300'
                                              : 'bg-white border-purple-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                                            <span className="font-bold">Jogo #{match.match_number}</span>
                                          </div>

                                          <div className="flex items-center gap-3">
                                            {/* Pair 1 */}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-amber-500 text-white">
                                                  {pair1.pair_number}
                                                </span>
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium text-gray-900">
                                                    {pair1.player1?.full_name || 'Jogador'}
                                                    {pair1.player1_id === profile?.id && ' (Você)'}
                                                  </div>
                                                  {pair1.player2 ? (
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {pair1.player2?.full_name || 'Jogador'}
                                                      {pair1.player2_id === profile?.id && ' (Você)'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-xs text-amber-600">(Coringa)</div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* VS indicator */}
                                            <div className="px-2">
                                              <span className="text-purple-600 font-bold text-sm">VS</span>
                                            </div>

                                            {/* Pair 2 */}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-amber-500 text-white">
                                                  {pair2.pair_number}
                                                </span>
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium text-gray-900">
                                                    {pair2.player1?.full_name || 'Jogador'}
                                                    {pair2.player1_id === profile?.id && ' (Você)'}
                                                  </div>
                                                  {pair2.player2 ? (
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {pair2.player2?.full_name || 'Jogador'}
                                                      {pair2.player2_id === profile?.id && ' (Você)'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-xs text-amber-600">(Coringa)</div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Serie B Matches */}
                            {(() => {
                              const serieBMatches = currentMatches.filter(match => {
                                const pair1 = currentPairs.find(p => p.id === match.pair1_id);
                                return !pair1?.is_top_12;
                              });

                              if (serieBMatches.length === 0) return null;

                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">B</span>
                                    </span>
                                    <h4 className="font-bold text-purple-900">Série B</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {serieBMatches.map((match) => {
                                      const pair1 = currentPairs.find(p => p.id === match.pair1_id);
                                      const pair2 = currentPairs.find(p => p.id === match.pair2_id);

                                      if (!pair1 || !pair2) return null;

                                      const isMyMatch =
                                        pair1.player1_id === profile?.id ||
                                        pair1.player2_id === profile?.id ||
                                        pair2.player1_id === profile?.id ||
                                        pair2.player2_id === profile?.id;

                                      return (
                                        <div
                                          key={match.id}
                                          className={`p-3 rounded-lg border ${
                                            isMyMatch
                                              ? 'bg-purple-100 border-purple-300'
                                              : 'bg-white border-purple-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                                            <span className="font-bold">Jogo #{match.match_number}</span>
                                          </div>

                                          <div className="flex items-center gap-3">
                                            {/* Pair 1 */}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
                                                  {pair1.pair_number}
                                                </span>
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium text-gray-900">
                                                    {pair1.player1?.full_name || 'Jogador'}
                                                    {pair1.player1_id === profile?.id && ' (Você)'}
                                                  </div>
                                                  {pair1.player2 ? (
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {pair1.player2?.full_name || 'Jogador'}
                                                      {pair1.player2_id === profile?.id && ' (Você)'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-xs text-amber-600">(Coringa)</div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* VS indicator */}
                                            <div className="px-2">
                                              <span className="text-purple-600 font-bold text-sm">VS</span>
                                            </div>

                                            {/* Pair 2 */}
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
                                                  {pair2.pair_number}
                                                </span>
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium text-gray-900">
                                                    {pair2.player1?.full_name || 'Jogador'}
                                                    {pair2.player1_id === profile?.id && ' (Você)'}
                                                  </div>
                                                  {pair2.player2 ? (
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {pair2.player2?.full_name || 'Jogador'}
                                                      {pair2.player2_id === profile?.id && ' (Você)'}
                                                    </div>
                                                  ) : (
                                                    <div className="text-xs text-amber-600">(Coringa)</div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {myLeagues.includes(selectedLeague.id) && shouldShowEventLists(selectedLeague) && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">
                            Listas do Evento
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            {getLastEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                          </p>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block flex-shrink-0" />
                                <p className="font-medium text-blue-900 text-sm">Jogadores Confirmados</p>
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq')
                                  .map(([playerId, _]) => {
                                    const playerData = leagueRankings.find(r => r.player_id === playerId)?.player;
                                    return playerData ? (
                                      <p key={playerId} className="text-sm text-gray-700">
                                        {playerData.full_name}
                                      </p>
                                    ) : null;
                                  })}
                                {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq')
                                  .length === 0 && (
                                  <p className="text-xs text-gray-500 italic">Nenhum jogador confirmado</p>
                                )}
                              </div>
                              <p className="text-xs text-blue-600 mt-2 font-medium">
                                Total: {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq')
                                  .length} jogador(es)
                              </p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-amber-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Beef className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <p className="font-medium text-amber-900 text-sm">Churrasco Confirmado</p>
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq')
                                  .map(([playerId, _]) => {
                                    const playerData = leagueRankings.find(r => r.player_id === playerId)?.player;
                                    return playerData ? (
                                      <p key={playerId} className="text-sm text-gray-700">
                                        {playerData.full_name}
                                      </p>
                                    ) : null;
                                  })}
                                {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq')
                                  .length === 0 && (
                                  <p className="text-xs text-gray-500 italic">Nenhuma confirmacao</p>
                                )}
                              </div>
                              <p className="text-xs text-amber-600 mt-2 font-medium">
                                Total: {Object.entries(lastEventAttendances)
                                  .filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq')
                                  .length} pessoa(s)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {shouldShowScoringCard(selectedLeague) && myLastEventAttendance?.status === 'bbq_only' && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900">
                            Pontuacao do Churrasco
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            {getLastEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                          </p>

                          {weeklyScore?.points_submitted ? (
                            <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                              <p className="text-sm text-amber-800 font-medium">
                                Pontuacao ja registrada
                              </p>
                              <p className="mt-1 text-amber-700">
                                <span className="font-medium">Total: {weeklyScore.total_points} pts</span> (apenas churrasco)
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                                <p className="text-sm text-amber-800">
                                  Voce selecionou <span className="font-semibold">apenas churrasco</span>. Ao confirmar, voce recebera automaticamente <span className="font-bold">2,5 pontos</span>.
                                </p>
                              </div>

                              <button
                                onClick={handleSubmitBbqOnly}
                                disabled={submittingScore}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                              >
                                {submittingScore ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Confirmando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Confirmar Presenca no Churrasco
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {shouldShowScoringCard(selectedLeague) && (myLastEventAttendance?.status === 'confirmed' || myLastEventAttendance?.status === 'play_and_bbq') && (
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-teal-900">
                            Cadastro de Pontuacao Semanal
                          </p>
                          <p className="text-sm text-teal-700 mt-1">
                            {getLastEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                          </p>

                          {weeklyScore?.points_submitted ? (
                            <div className="mt-3 p-3 bg-teal-100 rounded-lg">
                              <p className="text-sm text-teal-800 font-medium">
                                Pontuacao ja enviada
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-teal-700">
                                <span>Vitorias: {weeklyScore.victories}</span>
                                <span>Derrotas: {weeklyScore.defeats}</span>
                                {weeklyScore.blowouts_applied > 0 && (
                                  <span className="text-green-600">Pneus aplicados: {weeklyScore.blowouts_applied}</span>
                                )}
                                {weeklyScore.blowouts_received > 0 && (
                                  <span className="text-red-600">Pneus recebidos: {weeklyScore.blowouts_received}</span>
                                )}
                                <span className="font-medium">Total: {weeklyScore.total_points} pts</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-teal-800 mb-1">
                                      Vitorias
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={scoringVictories}
                                      onChange={(e) => setScoringVictories(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-teal-800 mb-1">
                                      Derrotas
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={scoringDefeats}
                                      onChange={(e) => setScoringDefeats(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="appliedBlowouts"
                                    checked={appliedBlowouts}
                                    onChange={(e) => {
                                      setAppliedBlowouts(e.target.checked);
                                      if (!e.target.checked) setBlowoutVictims([]);
                                    }}
                                    className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                                  />
                                  <label htmlFor="appliedBlowouts" className="text-sm font-medium text-teal-800">
                                    Apliquei pneu (6x0)
                                  </label>
                                </div>
                                {appliedBlowouts && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-800 mb-2">
                                      Selecione qual dupla tomou pneu:
                                    </label>
                                    {victimPairs.length === 0 && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                                        <p className="text-sm text-amber-800 font-medium">Nenhuma dupla disponível</p>
                                        <p className="text-xs text-amber-600 mt-1">
                                          {!myCurrentPair
                                            ? 'Você não está em nenhuma dupla no sorteio deste evento.'
                                            : 'Não há outras duplas além da sua neste evento.'}
                                        </p>
                                      </div>
                                    )}
                                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                      {victimPairs.map((pair) => {
                                        const player1 = pair.player1;
                                        const player2 = pair.player2;
                                        const pairLabel = player2
                                          ? `${player1?.full_name || 'Jogador 1'} + ${player2?.full_name || 'Jogador 2'}`
                                          : `${player1?.full_name || 'Jogador 1'} (Wildcard)`;

                                        const hasPlayer1 = player1 && blowoutVictims.includes(player1.id);
                                        const hasPlayer2 = player2 && blowoutVictims.includes(player2.id);
                                        const isPairSelected = hasPlayer1 || hasPlayer2;

                                        return (
                                          <label key={pair.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={isPairSelected}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  const newVictims = [...blowoutVictims];
                                                  if (player1 && !newVictims.includes(player1.id)) {
                                                    newVictims.push(player1.id);
                                                  }
                                                  if (player2 && !newVictims.includes(player2.id)) {
                                                    newVictims.push(player2.id);
                                                  }
                                                  setBlowoutVictims(newVictims);
                                                } else {
                                                  const newVictims = blowoutVictims.filter(id =>
                                                    id !== player1?.id && id !== player2?.id
                                                  );
                                                  setBlowoutVictims(newVictims);
                                                }
                                              }}
                                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm">{pairLabel}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="bg-teal-100 rounded-lg p-3 text-sm text-teal-800">
                                  <p className="font-medium mb-1">Previa da pontuacao:</p>
                                  <p>Presenca: +2,5 pts</p>
                                  {(myLastEventAttendance?.status === 'play_and_bbq' || myLastEventAttendance?.status === 'bbq_only') && <p>Churras: +2,5 pts</p>}
                                  {scoringVictories > 0 && <p>Vitorias: +{scoringVictories * 2} pts</p>}
                                  {appliedBlowouts && blowoutVictims.length > 0 && (() => {
                                    // Count how many pairs were selected (not individual players)
                                    const selectedPairsCount = victimPairs.filter(pair => {
                                      const hasPlayer1 = pair.player1 && blowoutVictims.includes(pair.player1.id);
                                      const hasPlayer2 = pair.player2 && blowoutVictims.includes(pair.player2.id);
                                      return hasPlayer1 || hasPlayer2;
                                    }).length;
                                    return <p className="text-green-700">Pneus aplicados ({selectedPairsCount} {selectedPairsCount === 1 ? 'dupla' : 'duplas'}): +{selectedPairsCount * 3} pts</p>;
                                  })()}
                                  <p className="font-bold mt-1 pt-1 border-t border-teal-200">
                                    Total: {(() => {
                                      const selectedPairsCount = victimPairs.filter(pair => {
                                        const hasPlayer1 = pair.player1 && blowoutVictims.includes(pair.player1.id);
                                        const hasPlayer2 = pair.player2 && blowoutVictims.includes(pair.player2.id);
                                        return hasPlayer1 || hasPlayer2;
                                      }).length;
                                      return (2.5 + ((myLastEventAttendance?.status === 'play_and_bbq' || myLastEventAttendance?.status === 'bbq_only') ? 2.5 : 0) + (scoringVictories * 2) + (appliedBlowouts ? selectedPairsCount * 3 : 0)).toFixed(1);
                                    })()} pts
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={handleSubmitScore}
                                disabled={submittingScore}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
                              >
                                {submittingScore ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Enviar Pontuacao
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!myLeagues.includes(selectedLeague.id) && pendingRequests.includes(selectedLeague.id) && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-6 h-6 text-amber-600" />
                          <div>
                            <p className="font-semibold text-amber-900">
                              Solicitacao pendente
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                              Aguardando aprovacao do organizador da liga
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelRequest(selectedLeague.id)}
                          disabled={cancellingRequest}
                          className="px-4 py-2 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {cancellingRequest ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {!myLeagues.includes(selectedLeague.id) && !pendingRequests.includes(selectedLeague.id) && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <UserPlus className="w-6 h-6 text-gray-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Deseja participar desta liga?
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedLeague.requires_approval
                                ? 'Esta liga requer aprovacao do organizador'
                                : 'Entre para competir com outros jogadores'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleJoinLeague(selectedLeague.id)}
                          disabled={joiningLeague === selectedLeague.id}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {joiningLeague === selectedLeague.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              {selectedLeague.requires_approval ? 'Solicitar Entrada' : 'Entrar na Liga'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {leagueRankings.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Nenhum jogador ainda nesta liga
                      </p>
                    </div>
                  ) : (
                    <div>
                      {selectedLeague?.format === 'weekly' && (
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => setShowBlowoutRanking(false)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                              !showBlowoutRanking
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Ranking de Pontos
                          </button>
                          <button
                            onClick={() => setShowBlowoutRanking(true)}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                              showBlowoutRanking
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Ranking de Pneus
                          </button>
                        </div>
                      )}

                      {showBlowoutRanking && selectedLeague?.format === 'weekly' ? (
                        <>
                          <div className="flex gap-2 mb-4">
                            <button
                              onClick={() => setBlowoutRankingType('received')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                blowoutRankingType === 'received'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Pneus Recebidos
                            </button>
                            <button
                              onClick={() => setBlowoutRankingType('applied')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                blowoutRankingType === 'applied'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Pneus Aplicados
                            </button>
                          </div>

                          {blowoutRankingType === 'received' ? (
                            <>
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Ranking de Pneus Recebidos (6x0)
                              </h3>
                              <div className="space-y-2">
                                {[...leagueRankings]
                                  .filter(r => r.blowouts > 0)
                                  .sort((a, b) => {
                                    if (b.blowout_rate !== a.blowout_rate) return b.blowout_rate - a.blowout_rate;
                                    return b.blowouts - a.blowouts;
                                  })
                                  .map((ranking, index) => {
                                    const isMe = ranking.player_id === profile?.id;
                                    return (
                                      <div
                                        key={ranking.player_id}
                                        className={`p-4 rounded-xl ${
                                          isMe
                                            ? 'bg-red-100 border-2 border-red-400'
                                            : 'bg-gray-50 border-2 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                              index === 0 ? 'bg-red-500 text-white' :
                                              index === 1 ? 'bg-red-400 text-white' :
                                              index === 2 ? 'bg-red-300 text-white' :
                                              'bg-gray-200 text-gray-700'
                                            }`}>
                                              {index + 1}
                                            </div>
                                            <div>
                                              <p className={`font-bold ${isMe ? 'text-red-900' : 'text-gray-900'}`}>
                                                {ranking.player.full_name}
                                                {isMe && ' (Voce)'}
                                              </p>
                                              <p className="text-sm text-gray-600">
                                                {ranking.matches_played} partidas jogadas
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className={`text-2xl font-bold ${isMe ? 'text-red-600' : 'text-red-500'}`}>
                                              {ranking.blowouts}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {ranking.blowout_rate.toFixed(0)}% dos jogos
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                {leagueRankings.filter(r => r.blowouts > 0).length === 0 && (
                                  <p className="text-center text-gray-500 py-4">
                                    Nenhum pneu recebido ainda
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-green-600" />
                                Ranking de Pneus Aplicados (6x0)
                              </h3>
                              <div className="space-y-2">
                                {[...leagueRankings]
                                  .filter(r => r.blowouts_applied > 0)
                                  .sort((a, b) => {
                                    if (b.blowout_applied_rate !== a.blowout_applied_rate) return b.blowout_applied_rate - a.blowout_applied_rate;
                                    return b.blowouts_applied - a.blowouts_applied;
                                  })
                                  .map((ranking, index) => {
                                    const isMe = ranking.player_id === profile?.id;
                                    return (
                                      <div
                                        key={ranking.player_id}
                                        className={`p-4 rounded-xl ${
                                          isMe
                                            ? 'bg-green-100 border-2 border-green-400'
                                            : 'bg-gray-50 border-2 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                              index === 0 ? 'bg-green-500 text-white' :
                                              index === 1 ? 'bg-green-400 text-white' :
                                              index === 2 ? 'bg-green-300 text-white' :
                                              'bg-gray-200 text-gray-700'
                                            }`}>
                                              {index + 1}
                                            </div>
                                            <div>
                                              <p className={`font-bold ${isMe ? 'text-green-900' : 'text-gray-900'}`}>
                                                {ranking.player.full_name}
                                                {isMe && ' (Voce)'}
                                              </p>
                                              <p className="text-sm text-gray-600">
                                                {ranking.matches_played} partidas jogadas
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className={`text-2xl font-bold ${isMe ? 'text-green-600' : 'text-green-500'}`}>
                                              {ranking.blowouts_applied}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                              {ranking.blowout_applied_rate.toFixed(0)}% dos jogos
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                {leagueRankings.filter(r => r.blowouts_applied > 0).length === 0 && (
                                  <p className="text-center text-gray-500 py-4">
                                    Nenhum pneu aplicado ainda
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                            Ranking da Liga
                          </h3>
                          <div className="space-y-2">
                            {leagueRankings.map((ranking, index) => {
                              const isMe = ranking.player_id === profile?.id;
                              const inScoringWindow = selectedLeague && shouldShowScoringCard(selectedLeague);
                              const attendanceData = inScoringWindow ? lastEventAttendances : allAttendances;
                              const attendanceStatus = selectedLeague?.format === 'weekly'
                                ? attendanceData[ranking.player_id]?.status
                                : null;
                              const willPlay = attendanceStatus === 'confirmed' || attendanceStatus === 'play_and_bbq';
                              const willBbq = attendanceStatus === 'bbq_only' || attendanceStatus === 'play_and_bbq';
                              const hasConfirmedAttendance = willPlay || willBbq;
                              const hasSubmittedScore = scoreSubmissions[ranking.player_id] || false;
                              const isOrganizer = selectedLeague && organizerLeagues.includes(selectedLeague.id);
                              const canEditScore = inScoringWindow && isOrganizer && hasConfirmedAttendance;
                              return (
                                <div
                                  key={ranking.player_id}
                                  className={`p-3 rounded-xl ${
                                    isMe
                                      ? 'bg-emerald-100 border-2 border-emerald-500'
                                      : index < 3
                                      ? 'bg-yellow-50 border-2 border-yellow-300'
                                      : 'bg-gray-50 border-2 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                      index === 0 ? 'bg-yellow-500 text-white' :
                                      index === 1 ? 'bg-gray-400 text-white' :
                                      index === 2 ? 'bg-orange-600 text-white' :
                                      'bg-gray-200 text-gray-700'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className={`font-bold text-sm truncate ${isMe ? 'text-emerald-900' : 'text-gray-900'}`}>
                                          {ranking.player.full_name}
                                          {isMe && ' (Voce)'}
                                        </p>
                                        {selectedLeague?.format === 'weekly' && (
                                          <div className="flex items-center gap-0.5 flex-shrink-0">
                                            {(willPlay || willBbq) && (
                                              <div className="flex items-center gap-0.5" title={
                                                inScoringWindow
                                                  ? (willPlay && willBbq ? 'Jogou e participou do churrasco' :
                                                     willPlay ? 'Jogou' : 'Participou do churrasco')
                                                  : (willPlay && willBbq ? 'Vai jogar e participar do churrasco' :
                                                     willPlay ? 'Vai apenas jogar' : 'Vai apenas ao churrasco')
                                              }>
                                                {willPlay && <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600 shadow-sm inline-block" />}
                                                {willBbq && <Beef className="w-3.5 h-3.5 text-amber-600" />}
                                              </div>
                                            )}
                                            {attendanceStatus === 'declined' && (
                                              <X className="w-3.5 h-3.5 text-red-600" title="Nao vai participar" />
                                            )}
                                            {(attendanceStatus === 'no_response' || !attendanceStatus) && (
                                              <HelpCircle className="w-3.5 h-3.5 text-gray-400" title="Ainda nao respondeu" />
                                            )}
                                          </div>
                                        )}
                                        {inScoringWindow && hasConfirmedAttendance && (
                                          <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ${
                                              hasSubmittedScore
                                                ? 'bg-emerald-500'
                                                : 'bg-amber-400'
                                            }`}
                                            title={hasSubmittedScore ? 'Pontuacao enviada' : 'Pontuacao pendente'}
                                          >
                                            {hasSubmittedScore ? (
                                              <Check className="w-2.5 h-2.5 text-white" />
                                            ) : (
                                              <Clock className="w-2.5 h-2.5 text-white" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 truncate">
                                        {ranking.matches_played} partidas • {ranking.wins}V / {ranking.losses}D
                                        {ranking.win_rate > 0 && ` • ${ranking.win_rate.toFixed(0)}%`}
                                        {ranking.blowouts > 0 && (
                                          <span className="text-red-600"> • {ranking.blowouts} pneu{ranking.blowouts > 1 ? 's' : ''}</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {canEditScore && (
                                        <button
                                          onClick={() => openPlayerScoreModal(ranking.player_id, ranking.player.full_name)}
                                          className={`p-1.5 rounded-lg transition-colors ${
                                            hasSubmittedScore
                                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                              : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                          }`}
                                          title={hasSubmittedScore ? 'Editar pontuacao' : 'Inserir pontuacao'}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="text-right">
                                        <p className={`text-xl font-bold ${isMe ? 'text-emerald-600' : 'text-gray-900'}`}>
                                          {ranking.points.toFixed(1)}
                                        </p>
                                        <p className="text-xs text-gray-600">pontos</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedLeague.format === 'weekly' && shouldShowAttendanceCard(selectedLeague) && (
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CalendarCheck className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-900">
                          Lista de Presença
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Confirmações para {getDayName(selectedLeague.weekly_day || 0)}, {getNextWeeklyEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                        {selectedLeague.weekly_time && ` às ${selectedLeague.weekly_time.slice(0, 5)}`}
                      </p>

                      <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-600"></div>
                            <p className="font-semibold text-emerald-900 text-sm">
                              Jogo ({Object.entries(allAttendances).filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq').length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(allAttendances)
                              .filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq')
                              .map(([playerId]) => {
                                const member = leagueMembers.find(m => m.player_id === playerId);
                                return member ? (
                                  <span key={playerId} className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-emerald-200">
                                    {member.player.full_name}
                                  </span>
                                ) : null;
                              })}
                            {Object.entries(allAttendances).filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq').length === 0 && (
                              <span className="text-sm text-gray-500 italic">Ninguém confirmou ainda</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Beef className="w-3.5 h-3.5 text-amber-600" />
                            <p className="font-semibold text-amber-900 text-sm">
                              Churrasco ({Object.entries(allAttendances).filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq').length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(allAttendances)
                              .filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq')
                              .map(([playerId]) => {
                                const member = leagueMembers.find(m => m.player_id === playerId);
                                return member ? (
                                  <span key={playerId} className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-amber-200">
                                    {member.player.full_name}
                                  </span>
                                ) : null;
                              })}
                            {Object.entries(allAttendances).filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq').length === 0 && (
                              <span className="text-sm text-gray-500 italic">Ninguém confirmou ainda</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <X className="w-4 h-4 text-red-600" />
                            <p className="font-semibold text-red-900 text-sm">
                              Não vai participar ({Object.entries(allAttendances).filter(([_, att]) => att.status === 'declined').length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(allAttendances)
                              .filter(([_, att]) => att.status === 'declined')
                              .map(([playerId]) => {
                                const member = leagueMembers.find(m => m.player_id === playerId);
                                return member ? (
                                  <span key={playerId} className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-red-200">
                                    {member.player.full_name}
                                  </span>
                                ) : null;
                              })}
                            {Object.entries(allAttendances).filter(([_, att]) => att.status === 'declined').length === 0 && (
                              <span className="text-sm text-gray-500 italic">Ninguém declinou ainda</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                            <p className="font-semibold text-gray-700 text-sm">
                              Não respondeu ({leagueMembers.filter(m => !allAttendances[m.player_id]).length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {leagueMembers
                              .filter(m => !allAttendances[m.player_id])
                              .map((member) => (
                                <span key={member.player_id} className="bg-white px-3 py-1 rounded-full text-sm text-gray-500 border border-gray-300">
                                  {member.player.full_name}
                                </span>
                              ))}
                            {leagueMembers.filter(m => !allAttendances[m.player_id]).length === 0 && (
                              <span className="text-sm text-gray-500 italic">Todos responderam</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">
                              {Object.entries(allAttendances).filter(([_, att]) => att.status === 'confirmed' || att.status === 'play_and_bbq').length}
                            </p>
                            <p className="text-gray-600">Jogadores confirmados</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">
                              {Object.entries(allAttendances).filter(([_, att]) => att.status === 'bbq_only' || att.status === 'play_and_bbq').length}
                            </p>
                            <p className="text-gray-600">No churrasco</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmar Reset</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja resetar todas as pontuacoes da liga? Esta acao ira zerar vitorias, derrotas e pontos de todos os jogadores. Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resettingPoints}
                className="flex-1 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPoints}
                disabled={resettingPoints}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingPoints ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  'Confirmar Reset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPlayerScore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-100 rounded-full">
                  <Trophy className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Inserir Pontuacao</h3>
                  <p className="text-sm text-gray-600">{editingPlayerScore.playerName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPlayerScore(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editAttendanceConfirmed"
                    checked={editAttendanceConfirmed}
                    onChange={(e) => setEditAttendanceConfirmed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="editAttendanceConfirmed" className="text-sm font-medium text-gray-700">
                    Confirmou presença
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editBbqParticipated"
                    checked={editBbqParticipated}
                    onChange={(e) => setEditBbqParticipated(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="editBbqParticipated" className="text-sm font-medium text-gray-700">
                    Participou churras
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vitorias
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editVictories}
                    onChange={(e) => setEditVictories(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Derrotas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDefeats}
                    onChange={(e) => setEditDefeats(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editAppliedBlowouts"
                  checked={editAppliedBlowouts}
                  onChange={(e) => {
                    setEditAppliedBlowouts(e.target.checked);
                    if (!e.target.checked) setEditBlowoutVictims([]);
                  }}
                  className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                />
                <label htmlFor="editAppliedBlowouts" className="text-sm font-medium text-gray-700">
                  Apliquei pneu (6x0)
                </label>
              </div>

              {editAppliedBlowouts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione qual dupla tomou pneu:
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {currentPairs
                      .filter(pair => pair.player1_id !== editingPlayerScore?.playerId && pair.player2_id !== editingPlayerScore?.playerId)
                      .map((pair) => {
                        const player1 = pair.player1;
                        const player2 = pair.player2;
                        const pairLabel = player2
                          ? `${player1?.full_name || 'Jogador 1'} + ${player2?.full_name || 'Jogador 2'}`
                          : `${player1?.full_name || 'Jogador 1'} (Wildcard)`;

                        const hasPlayer1 = player1 && editBlowoutVictims.includes(player1.id);
                        const hasPlayer2 = player2 && editBlowoutVictims.includes(player2.id);
                        const isPairSelected = hasPlayer1 || hasPlayer2;

                        return (
                          <label key={pair.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isPairSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newVictims = [...editBlowoutVictims];
                                  if (player1 && !newVictims.includes(player1.id)) {
                                    newVictims.push(player1.id);
                                  }
                                  if (player2 && !newVictims.includes(player2.id)) {
                                    newVictims.push(player2.id);
                                  }
                                  setEditBlowoutVictims(newVictims);
                                } else {
                                  const newVictims = editBlowoutVictims.filter(id =>
                                    id !== player1?.id && id !== player2?.id
                                  );
                                  setEditBlowoutVictims(newVictims);
                                }
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm">{pairLabel}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="bg-teal-50 rounded-lg p-3 text-sm text-teal-800">
                <p className="font-medium mb-1">Previa da pontuacao:</p>
                {editAttendanceConfirmed && <p>Presenca: +2,5 pts</p>}
                {editBbqParticipated && <p>Churras: +2,5 pts</p>}
                {editVictories > 0 && <p>Vitorias: +{editVictories * 2} pts</p>}
                {editAppliedBlowouts && editBlowoutVictims.length > 0 && (() => {
                  // Count how many PAIRS were selected (not individual players)
                  const selectedPairsCount = currentPairs.filter(pair => {
                    const hasPlayer1 = pair.player1_id && editBlowoutVictims.includes(pair.player1_id);
                    const hasPlayer2 = pair.player2_id && editBlowoutVictims.includes(pair.player2_id);
                    return hasPlayer1 || hasPlayer2;
                  }).length;
                  return <p className="text-green-700">Pneus aplicados: +{selectedPairsCount * 3} pts</p>;
                })()}
                <p className="font-bold mt-1 pt-1 border-t border-teal-200">
                  Total: {(() => {
                    // Count unique pairs for total calculation
                    const selectedPairsCount = editAppliedBlowouts ? currentPairs.filter(pair => {
                      const hasPlayer1 = pair.player1_id && editBlowoutVictims.includes(pair.player1_id);
                      const hasPlayer2 = pair.player2_id && editBlowoutVictims.includes(pair.player2_id);
                      return hasPlayer1 || hasPlayer2;
                    }).length : 0;

                    return (
                      (editAttendanceConfirmed ? 2.5 : 0) +
                      (editBbqParticipated ? 2.5 : 0) +
                      (editVictories * 2) +
                      (selectedPairsCount * 3)
                    ).toFixed(1);
                  })()} pts
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingPlayerScore(null)}
                disabled={submittingPlayerScore}
                className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleOrganizerSubmitScore}
                disabled={submittingPlayerScore}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingPlayerScore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Pontuacao
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualBlowoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Beef className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Inserir Pneu Manual</h3>
                  <p className="text-sm text-gray-600">Selecione jogadores individualmente</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowManualBlowoutModal(false);
                  setManualBlowoutAppliers([]);
                  setManualBlowoutVictims([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jogadores que aplicaram o pneu (podem ser múltiplos):
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {Object.values(lastEventAttendances)
                    .filter(att => ['confirmed', 'play_and_bbq'].includes(att.status))
                    .map((attendance) => {
                      const player = leagueRankings.find(r => r.player_id === attendance.player_id)?.player;
                      if (!player) return null;

                      return (
                        <label key={player.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={manualBlowoutAppliers.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManualBlowoutAppliers([...manualBlowoutAppliers, player.id]);
                              } else {
                                setManualBlowoutAppliers(manualBlowoutAppliers.filter(id => id !== player.id));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-800">{player.full_name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jogadores que receberam o pneu (podem ser múltiplos):
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {Object.values(lastEventAttendances)
                    .filter(att => ['confirmed', 'play_and_bbq'].includes(att.status))
                    .map((attendance) => {
                      const player = leagueRankings.find(r => r.player_id === attendance.player_id)?.player;
                      if (!player) return null;

                      return (
                        <label key={player.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={manualBlowoutVictims.includes(player.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManualBlowoutVictims([...manualBlowoutVictims, player.id]);
                              } else {
                                setManualBlowoutVictims(manualBlowoutVictims.filter(id => id !== player.id));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-800">{player.full_name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {manualBlowoutAppliers.length > 0 && manualBlowoutVictims.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800">
                  <p className="font-medium mb-1">Previa:</p>
                  <p>{manualBlowoutAppliers.length} jogador(es) aplicando pneu em {manualBlowoutVictims.length} jogador(es)</p>
                  <p className="text-xs mt-1 text-purple-600">
                    Total de {manualBlowoutAppliers.length * manualBlowoutVictims.length} registro(s) de pneu
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowManualBlowoutModal(false);
                  setManualBlowoutAppliers([]);
                  setManualBlowoutVictims([]);
                }}
                disabled={submittingManualBlowout}
                className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitManualBlowout}
                disabled={submittingManualBlowout || manualBlowoutAppliers.length === 0 || manualBlowoutVictims.length === 0}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingManualBlowout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Inserindo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Inserir Pneu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
