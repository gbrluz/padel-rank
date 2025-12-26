import { useEffect, useState } from 'react';
import { Medal, Users, Trophy, TrendingUp, UserPlus, Clock, Check, Loader2, Shield, CheckCircle, XCircle, Trash2, Calendar, CalendarCheck } from 'lucide-react';
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
  status: 'confirmed' | 'declined' | 'no_response';
}

interface LeagueRanking {
  player_id: string;
  points: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
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
  const [submittingScore, setSubmittingScore] = useState(false);
  const [weeklyScore, setWeeklyScore] = useState<any>(null);
  const [allAttendances, setAllAttendances] = useState<Record<string, WeeklyAttendance>>({});

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
          player:players(*)
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

    const maxHoursToShow = 5 * 24;
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

  const handleUpdateAttendance = async (status: 'confirmed' | 'declined') => {
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
            confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
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
            confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
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
  if (!myAttendance || myAttendance.status !== 'confirmed') return false;
  //if (weeklyScore == null) return false;

  const now = Date.now();
  const lastEvent = getLastEventDate(league);
  const nextEvent = getNextWeeklyEventDate(league);

  if (!lastEvent || !nextEvent) return false;

  const scoringStart = new Date(lastEvent);
  scoringStart.setHours(0, 0, 0, 0);

  const scoringEnd = new Date(nextEvent.getTime() - (24 * 60 * 60 * 1000));

  return (
    now >= scoringStart.getTime() &&
    now < scoringEnd.getTime()
  );
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
        } else {
          const { data: newAttendance, error: createError } = await supabase
            .from('weekly_event_attendance')
            .insert({
              event_id: weeklyEvent.id,
              player_id: profile.id,
              confirmed: true,
              confirmed_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          setWeeklyScore(newAttendance);
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
    if (!weeklyScore) return;

    setSubmittingScore(true);
    try {
      const totalPoints = scoringVictories + scoringDefeats + (scoringBbq ? 1 : 0);

      const { error } = await supabase
        .from('weekly_event_attendance')
        .update({
          victories: scoringVictories,
          defeats: scoringDefeats,
          bbq_participated: scoringBbq,
          total_points: totalPoints,
          points_submitted: true,
          points_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', weeklyScore.id);

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
        .eq('league_id', leagueId);

      if (membersError) throw membersError;

      const { data: rankings, error: rankingsError } = await supabase
        .from('league_rankings')
        .select('*')
        .eq('league_id', leagueId);

      if (rankingsError) throw rankingsError;

      const rankingsMap = new Map(rankings?.map(r => [r.player_id, r]) || []);

      const combinedRankings = (members || []).map(member => {
        const existingRanking = rankingsMap.get(member.player_id);
        return {
          player_id: member.player_id,
          league_id: leagueId,
          points: existingRanking?.points || 0,
          matches_played: existingRanking?.matches_played || 0,
          wins: existingRanking?.wins || 0,
          losses: existingRanking?.losses || 0,
          win_rate: existingRanking?.win_rate || 0,
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
                      <div className="flex items-start gap-3">
                        <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">
                            Proximo evento semanal
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            {getDayName(selectedLeague.weekly_day || 0)}, {getNextWeeklyEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                            {selectedLeague.weekly_time && ` as ${selectedLeague.weekly_time.slice(0, 5)}`}
                          </p>
                          {getAttendanceDeadline(selectedLeague) && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md w-fit">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                Confirmação disponível até {formatDeadlineTime(getAttendanceDeadline(selectedLeague)!)}
                              </span>
                            </div>
                          )}

                          {myAttendance?.status === 'confirmed' ? (
                            <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg">
                              <CalendarCheck className="w-5 h-5" />
                              <span className="font-medium">Presenca confirmada!</span>
                            </div>
                          ) : myAttendance?.status === 'declined' ? (
                            <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                              <XCircle className="w-5 h-5" />
                              <span className="font-medium">Voce indicou que nao podera comparecer</span>
                            </div>
                          ) : (
                            <p className="text-sm text-blue-600 mt-2">
                              Confirme sua presenca para o proximo evento
                            </p>
                          )}

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleUpdateAttendance('confirmed')}
                              disabled={updatingAttendance || myAttendance?.status === 'confirmed'}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                myAttendance?.status === 'confirmed'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {updatingAttendance ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Vou participar
                            </button>
                            <button
                              onClick={() => handleUpdateAttendance('declined')}
                              disabled={updatingAttendance || myAttendance?.status === 'declined'}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                myAttendance?.status === 'declined'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {updatingAttendance ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Nao poderei ir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {shouldShowScoringCard(selectedLeague) && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Trophy className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-purple-900">
                            Cadastro de Pontuacao Semanal
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
                            {getLastEventDate(selectedLeague)?.toLocaleDateString('pt-BR')}
                          </p>

                          {weeklyScore?.points_submitted ? (
                            <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                              <p className="text-sm text-purple-800 font-medium">
                                Pontuacao ja enviada
                              </p>
                              <div className="mt-2 flex gap-4 text-sm text-purple-700">
                                <span>Vitorias: {weeklyScore.victories}</span>
                                <span>Derrotas: {weeklyScore.defeats}</span>
                                <span>Total: {weeklyScore.total_points} pts</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-4 space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-purple-800 mb-1">
                                    Vitorias
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={scoringVictories}
                                    onChange={(e) => setScoringVictories(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-purple-800 mb-1">
                                    Derrotas
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={scoringDefeats}
                                    onChange={(e) => setScoringDefeats(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="bbq"
                                    checked={scoringBbq}
                                    onChange={(e) => setScoringBbq(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                                  />
                                  <label htmlFor="bbq" className="text-sm font-medium text-purple-800">
                                    Participei do churrasco
                                  </label>
                                </div>
                              </div>

                              <button
                                onClick={handleSubmitScore}
                                disabled={submittingScore}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
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
                                        {isMe && ' (Você)'}
                                      </p>
                                      {hasConfirmed && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full" title="Presença confirmada">
                                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                                          <span className="text-xs font-medium text-emerald-700">Confirmado</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      {ranking.matches_played} partidas • {ranking.wins}V / {ranking.losses}D
                                      {ranking.win_rate > 0 && ` • ${ranking.win_rate.toFixed(0)}% vitórias`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-2xl font-bold ${isMe ? 'text-emerald-600' : 'text-gray-900'}`}>
                                    {ranking.points}
                                  </p>
                                  <p className="text-xs text-gray-600">pontos</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
