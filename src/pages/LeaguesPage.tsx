import { useEffect, useState } from 'react';
import { Medal, Users, Trophy, TrendingUp, UserPlus, Clock, Check, Loader2, Shield, CheckCircle, XCircle, Trash2, Calendar, CalendarCheck, RotateCcw, AlertTriangle } from 'lucide-react';
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
  status: 'confirmed' | 'declined' | 'no_response' | 'bbq_only';
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

export default function LeaguesPage({ onNavigate }: LeaguesPageProps) {
  const { player: profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
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
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [scoringVictories, setScoringVictories] = useState(0);
  const [scoringDefeats, setScoringDefeats] = useState(0);
  const [scoringBbq, setScoringBbq] = useState(false);
  const [scoringBlowouts, setScoringBlowouts] = useState(0);
  const [hasBlowouts, setHasBlowouts] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [weeklyScore, setWeeklyScore] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<Record<string, WeeklyAttendance>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [showBlowoutRanking, setShowBlowoutRanking] = useState(false);

  useEffect(() => {
    loadLeagues();
    loadAllPlayers();
    if (profile) {
      loadMyLeagues();
      loadPendingRequests();
      loadOrganizerLeagues();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedLeague) {
      loadLeagueRankings(selectedLeague.id);
      if (organizerLeagues.includes(selectedLeague.id)) {
        loadJoinRequests(selectedLeague.id);
        loadLeagueMembers(selectedLeague.id);
      }
      if (selectedLeague.format === 'weekly') {
        loadAllAttendances(selectedLeague.id);
        if (myLeagues.includes(selectedLeague.id)) {
          loadMyAttendance(selectedLeague.id);
        }
      }
    }
  }, [selectedLeague, organizerLeagues, myLeagues]);

  useEffect(() => {
    if (selectedLeague && myAttendance && shouldShowScoringCard(selectedLeague)) {
      loadWeeklyScore();
    }
  }, [selectedLeague, myAttendance]);

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

      if (data && data.length > 0 && !selectedLeague) {
        setSelectedLeague(data[0]);
      }
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
          .from('weekly_event_attendance')
          .update({
            victories: 0,
            defeats: 0,
            blowouts_received: 0,
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

  const loadMyAttendance = async (leagueId: string) => {
    if (!profile || !selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) return;

    const weekDate = nextEvent.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('league_attendance')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', profile.id)
        .eq('week_date', weekDate)
        .maybeSingle();

      if (error) throw error;
      setMyAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const loadAllAttendances = async (leagueId: string) => {
    if (!selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) return;

    const weekDate = nextEvent.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('league_attendance')
        .select('*')
        .eq('league_id', leagueId)
        .eq('week_date', weekDate);

      if (error) throw error;

      const attendanceMap: Record<string, WeeklyAttendance> = {};
      if (data) {
        data.forEach((attendance) => {
          attendanceMap[attendance.player_id] = attendance;
        });
      }
      setAllAttendances(attendanceMap);
    } catch (error) {
      console.error('Error loading all attendances:', error);
    }
  };

  const handleUpdateAttendance = async (status: 'confirmed' | 'declined' | 'bbq_only') => {
    if (!profile || !selectedLeague) return;

    const nextEvent = getNextWeeklyEventDate(selectedLeague);
    if (!nextEvent) return;

    const weekDate = nextEvent.toISOString().split('T')[0];

    setUpdatingAttendance(true);
    try {
      if (myAttendance) {
        const { error } = await supabase
          .from('league_attendance')
          .update({
            status,
            confirmed_at: (status === 'confirmed' || status === 'bbq_only') ? new Date().toISOString() : null,
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
            confirmed_at: (status === 'confirmed' || status === 'bbq_only') ? new Date().toISOString() : null,
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
  if (!myAttendance || (myAttendance.status !== 'confirmed' && myAttendance.status !== 'bbq_only')) return false;

  const now = Date.now();
  const lastEvent = getLastEventDate(league);

  if (!lastEvent) return false;

  const scoringStart = lastEvent.getTime();
  const scoringEnd = scoringStart + (48 * 60 * 60 * 1000);

  return now >= scoringStart && now < scoringEnd;
};

  const loadWeeklyScore = async () => {
    if (!profile || !selectedLeague) return;

    const lastEvent = getLastEventDate(selectedLeague);
    if (!lastEvent) return;

    const eventDate = lastEvent.toISOString().split('T')[0];

    try {
      const { data: weeklyEvent, error: eventError } = await supabase
        .from('weekly_events')
        .select('id')
        .eq('league_id', selectedLeague.id)
        .eq('event_date', eventDate)
        .maybeSingle();

      if (eventError) throw eventError;

      if (weeklyEvent) {
        const { data: attendance, error: attendanceError } = await supabase
          .from('weekly_event_attendance')
          .select('*')
          .eq('event_id', weeklyEvent.id)
          .eq('player_id', profile.id)
          .maybeSingle();

        if (attendanceError) throw attendanceError;

        if (attendance) {
          setWeeklyScore(attendance);
          setScoringVictories(attendance.victories || 0);
          setScoringDefeats(attendance.defeats || 0);
          setScoringBbq(attendance.bbq_participated || false);
          setHasBlowouts((attendance.blowouts_received || 0) > 0);
          setScoringBlowouts(attendance.blowouts_received || 0);
        } else {
          setWeeklyScore(null);
          setScoringVictories(0);
          setScoringDefeats(0);
          setScoringBbq(false);
          setHasBlowouts(false);
          setScoringBlowouts(0);
        }
      } else {
        setWeeklyScore(null);
      }
    } catch (error) {
      console.error('Error loading weekly score:', error);
      setWeeklyScore(null);
    }
  };

  const handleSubmitScore = async () => {
    if (!selectedLeague || !profile) return;

    setSubmittingScore(true);
    try {
      const blowouts = hasBlowouts ? (scoringBlowouts ?? 0) : 0;
      const totalPoints =
        2.5 +
        (scoringBbq ? 2.5 : 0) +
        ((scoringVictories ?? 0) * 2) +
        (blowouts * -2);

      const lastEvent = getLastEventDate(selectedLeague);
      if (!lastEvent) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }
      const eventDate = lastEvent.toISOString().split('T')[0];

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
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          victories: scoringVictories ?? 0,
          defeats: scoringDefeats ?? 0,
          bbq_participated: scoringBbq ?? false,
          blowouts_received: blowouts,
          total_points: totalPoints,
          points_submitted: true,
          points_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,player_id'
        });

      if (error) throw error;

      alert('Pontuacao enviada com sucesso!');
      await loadWeeklyScore();
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
      const lastEvent = getLastEventDate(selectedLeague);
      if (!lastEvent) {
        alert('Nao foi possivel determinar a data do evento');
        return;
      }
      const eventDate = lastEvent.toISOString().split('T')[0];

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
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          victories: 0,
          defeats: 0,
          bbq_participated: true,
          blowouts_received: 0,
          total_points: 2.5,
          points_submitted: true,
          points_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'event_id,player_id'
        });

      if (error) throw error;

      alert('Presenca no churrasco confirmada! +2,5 pontos');
      await loadWeeklyScore();
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
          .select('player_id, victories, defeats, total_points, bbq_participated, blowouts_received')
          .in('event_id', eventIds)
          .eq('points_submitted', true);

        if (attendanceError) throw attendanceError;
        attendanceData = attendance || [];
      }

      const statsMap = new Map<string, { points: number; wins: number; losses: number; blowouts: number }>();
      attendanceData.forEach(att => {
        const existing = statsMap.get(att.player_id) || { points: 0, wins: 0, losses: 0, blowouts: 0 };
        statsMap.set(att.player_id, {
          points: existing.points + (att.total_points || 0),
          wins: existing.wins + (att.victories || 0),
          losses: existing.losses + (att.defeats || 0),
          blowouts: existing.blowouts + (att.blowouts_received || 0),
        });
      });

      const combinedRankings = (members || []).map(member => {
        const stats = statsMap.get(member.player_id) || { points: 0, wins: 0, losses: 0, blowouts: 0 };
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4 overflow-x-hidden">
      <div className="container mx-auto max-w-6xl">
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
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ligas Disponíveis</h2>
                <div className="space-y-3">
                  {leagues.map((league) => (
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
              </div>
            </div>

            <div className="md:col-span-2">
              {selectedLeague && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
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
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md w-fit">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                Confirmacao disponivel ate {formatDeadlineTime(getAttendanceDeadline(selectedLeague)!)}
                              </span>
                            </div>
                          )}

                          {myAttendance?.status === 'confirmed' ? (
                            <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg">
                              <CalendarCheck className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Presenca confirmada!</span>
                            </div>
                          ) : myAttendance?.status === 'bbq_only' ? (
                            <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                              <CheckCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Apenas churrasco confirmado!</span>
                            </div>
                          ) : myAttendance?.status === 'declined' ? (
                            <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                              <XCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium">Voce indicou que nao podera comparecer</span>
                            </div>
                          ) : (
                            <p className="text-sm text-blue-600 mt-2">
                              Confirme sua presenca para o proximo evento
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
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
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="truncate">Vou participar</span>
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
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
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
                        </div>
                      </div>
                    </div>
                  )}

                  {shouldShowScoringCard(selectedLeague) && myAttendance?.status === 'bbq_only' && (
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

                  {shouldShowScoringCard(selectedLeague) && myAttendance?.status === 'confirmed' && (
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
                                {weeklyScore.blowouts_received > 0 && (
                                  <span className="text-red-600">Pneus: {weeklyScore.blowouts_received}</span>
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
                                    id="bbq"
                                    checked={scoringBbq}
                                    onChange={(e) => setScoringBbq(e.target.checked)}
                                    className="w-4 h-4 text-teal-600 border-teal-300 rounded focus:ring-teal-500"
                                  />
                                  <label htmlFor="bbq" className="text-sm font-medium text-teal-800">
                                    Participei do churrasco
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="hasBlowouts"
                                    checked={hasBlowouts}
                                    onChange={(e) => {
                                      setHasBlowouts(e.target.checked);
                                      if (!e.target.checked) setScoringBlowouts(0);
                                    }}
                                    className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                                  />
                                  <label htmlFor="hasBlowouts" className="text-sm font-medium text-teal-800">
                                    Tomei pneu (6x0)
                                  </label>
                                </div>
                                {hasBlowouts && (
                                  <div>
                                    <label className="block text-sm font-medium text-red-800 mb-1">
                                      Quantos pneus (6x0)?
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={scoringBlowouts}
                                      onChange={(e) => setScoringBlowouts(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </div>
                                )}
                                <div className="bg-teal-100 rounded-lg p-3 text-sm text-teal-800">
                                  <p className="font-medium mb-1">Previa da pontuacao:</p>
                                  <p>Presenca: +2,5 pts</p>
                                  {scoringBbq && <p>Churras: +2,5 pts</p>}
                                  {scoringVictories > 0 && <p>Vitorias: +{scoringVictories * 2} pts</p>}
                                  {hasBlowouts && scoringBlowouts > 0 && <p className="text-red-700">Pneus: -{scoringBlowouts * 2} pts</p>}
                                  <p className="font-bold mt-1 pt-1 border-t border-teal-200">
                                    Total: {(2.5 + (scoringBbq ? 2.5 : 0) + (scoringVictories * 2) + ((hasBlowouts ? scoringBlowouts : 0) * -2)).toFixed(1)} pts
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
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            Ranking de Pneus (6x0)
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
                                Nenhum pneu registrado ainda
                              </p>
                            )}
                          </div>
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
                              const hasConfirmed = selectedLeague?.format === 'weekly' &&
                                allAttendances[ranking.player_id]?.status === 'confirmed';
                              return (
                                <div
                                  key={ranking.player_id}
                                  className={`p-4 rounded-xl ${
                                    isMe
                                      ? 'bg-emerald-100 border-2 border-emerald-500'
                                      : index < 3
                                      ? 'bg-yellow-50 border-2 border-yellow-300'
                                      : 'bg-gray-50 border-2 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                        index === 0 ? 'bg-yellow-500 text-white' :
                                        index === 1 ? 'bg-gray-400 text-white' :
                                        index === 2 ? 'bg-orange-600 text-white' :
                                        'bg-gray-200 text-gray-700'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className={`font-bold ${isMe ? 'text-emerald-900' : 'text-gray-900'}`}>
                                            {ranking.player.full_name}
                                            {isMe && ' (Voce)'}
                                          </p>
                                          {hasConfirmed && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full" title="Presenca confirmada">
                                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                                              <span className="text-xs font-medium text-emerald-700">Confirmado</span>
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          {ranking.matches_played} partidas • {ranking.wins}V / {ranking.losses}D
                                          {ranking.win_rate > 0 && ` • ${ranking.win_rate.toFixed(0)}% vitorias`}
                                          {ranking.blowouts > 0 && (
                                            <span className="text-red-600"> • {ranking.blowouts} pneu{ranking.blowouts > 1 ? 's' : ''}</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-2xl font-bold ${isMe ? 'text-emerald-600' : 'text-gray-900'}`}>
                                        {ranking.points.toFixed(1)}
                                      </p>
                                      <p className="text-xs text-gray-600">pontos</p>
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
    </div>
  );
}
