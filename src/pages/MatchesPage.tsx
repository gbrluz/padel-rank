import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Trophy, ThumbsUp, ThumbsDown, ArrowLeft, ArrowRight, FileText, CalendarCheck, TrendingUp, TrendingDown, Crown, AlertTriangle } from 'lucide-react';
import { supabase, Match, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ReportMatchResultModal from '../components/ReportMatchResultModal';
import { MatchSchedulingModal } from '../components/MatchSchedulingModal';
import { ContestResultModal } from '../components/ContestResultModal';

type MatchWithPlayers = Match & {
  team_a_player1: Profile;
  team_a_player2: Profile;
  team_b_player1: Profile;
  team_b_player2: Profile;
};

type PlayerApprovalStatus = {
  player_id: string;
  approved: boolean | null;
};

type StatusFilter = 'all' | 'pending_approval' | 'scheduling' | 'scheduled' | 'cancelled' | 'completed';
type ViewMode = 'my-matches' | 'all-matches';

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [allMatches, setAllMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('my-matches');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [approvalStatus, setApprovalStatus] = useState<Record<string, boolean | null>>({});
  const [matchApprovals, setMatchApprovals] = useState<Record<string, PlayerApprovalStatus[]>>({});
  const [approvingMatch, setApprovingMatch] = useState<string | null>(null);
  const [reportingMatch, setReportingMatch] = useState<MatchWithPlayers | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState<MatchWithPlayers | null>(null);
  const [contestingMatch, setContestingMatch] = useState<MatchWithPlayers | null>(null);
  const [timeProposals, setTimeProposals] = useState<Record<string, any[]>>({});
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMatches();
    loadAllMatches();
    loadApprovalStatus();
    loadAllApprovals();
    loadTimeProposals();
  }, [profile]);

  const loadApprovalStatus = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('match_approvals')
      .select('match_id, approved')
      .eq('player_id', profile.id);

    if (data) {
      const statusMap: Record<string, boolean | null> = {};
      data.forEach(approval => {
        statusMap[approval.match_id] = approval.approved;
      });
      setApprovalStatus(statusMap);
    }
  };

  const loadAllApprovals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('match_approvals')
      .select('match_id, player_id, approved');

    if (data) {
      const approvalsMap: Record<string, PlayerApprovalStatus[]> = {};
      data.forEach(approval => {
        if (!approvalsMap[approval.match_id]) {
          approvalsMap[approval.match_id] = [];
        }
        approvalsMap[approval.match_id].push({
          player_id: approval.player_id,
          approved: approval.approved
        });
      });
      setMatchApprovals(approvalsMap);
    }
  };

  const loadTimeProposals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('match_time_proposals')
      .select('*')
      .order('proposal_order');

    if (data) {
      const proposalsMap: Record<string, any[]> = {};
      data.forEach(proposal => {
        if (!proposalsMap[proposal.match_id]) {
          proposalsMap[proposal.match_id] = [];
        }
        proposalsMap[proposal.match_id].push(proposal);
      });
      setTimeProposals(proposalsMap);
    }
  };

  const handleApproval = async (matchId: string, approved: boolean, selectedProposalId?: string) => {
    if (!profile) return;

    if (approved && !selectedProposalId) {
      alert('Por favor, escolha um horário antes de aprovar');
      return;
    }

    setApprovingMatch(matchId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-approval`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ matchId, approved, proposalId: selectedProposalId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar aprovação');
      }

      setApprovalStatus(prev => ({ ...prev, [matchId]: approved }));
      setSelectedTimes(prev => ({ ...prev, [matchId]: '' }));
      await loadMatches();
      await loadApprovalStatus();
      await loadAllApprovals();
    } catch (error: any) {
      console.error('Error approving match:', error);
      alert(error.message || 'Erro ao processar sua resposta. Tente novamente.');
    } finally {
      setApprovingMatch(null);
    }
  };

  const handleReportResult = async (data: {
    location: string;
    match_date: string;
    match_time: string;
    sets: { team_a: number; team_b: number }[];
    has_tiebreak: boolean;
    tiebreak_score: { team_a: number; team_b: number } | null;
  }) => {
    if (!reportingMatch || !profile) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      let teamAWins = 0;
      let teamBWins = 0;

      for (const set of data.sets) {
        if (set.team_a > set.team_b) teamAWins++;
        else if (set.team_b > set.team_a) teamBWins++;
      }

      if (data.has_tiebreak && data.tiebreak_score) {
        if (data.tiebreak_score.team_a > data.tiebreak_score.team_b) teamAWins++;
        else if (data.tiebreak_score.team_b > data.tiebreak_score.team_a) teamBWins++;
      }

      const winner = teamAWins > teamBWins ? 'team_a' : 'team_b';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-match`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchId: reportingMatch.id,
            teamAScore: teamAWins,
            teamBScore: teamBWins,
            winnerTeam: winner,
            location: data.location,
            matchDate: data.match_date,
            matchTime: data.match_time,
            sets: data.sets,
            hasTiebreak: data.has_tiebreak,
            tiebreakScore: data.tiebreak_score
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reportar resultado');
      }

      alert('Resultado reportado com sucesso!');
      await loadMatches();
    } catch (error: any) {
      console.error('Error reporting result:', error);
      alert(error.message || 'Erro ao reportar resultado. Tente novamente.');
    }
  };

  const loadMatches = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a_player1:profiles!matches_team_a_player1_id_fkey(*),
          team_a_player2:profiles!matches_team_a_player2_id_fkey(*),
          team_b_player1:profiles!matches_team_b_player1_id_fkey(*),
          team_b_player2:profiles!matches_team_b_player2_id_fkey(*),
          league:leagues(name, affects_regional_ranking)
        `)
        .or(`team_a_player1_id.eq.${profile.id},team_a_player2_id.eq.${profile.id},team_b_player1_id.eq.${profile.id},team_b_player2_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data as any || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMatches = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a_player1:profiles!matches_team_a_player1_id_fkey(*),
          team_a_player2:profiles!matches_team_a_player2_id_fkey(*),
          team_b_player1:profiles!matches_team_b_player1_id_fkey(*),
          team_b_player2:profiles!matches_team_b_player2_id_fkey(*),
          league:leagues(name, affects_regional_ranking)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllMatches(data as any || []);
    } catch (error) {
      console.error('Error loading all matches:', error);
    }
  };

  const currentMatches = viewMode === 'my-matches' ? matches : allMatches;
  const filteredMatches = currentMatches.filter(match => {
    if (statusFilter !== 'all' && match.status !== statusFilter) return false;
    if (genderFilter !== 'all' && match.gender !== genderFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending_approval: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-4 h-4" />,
        text: 'Aguardando Aprovação'
      },
      scheduling: {
        color: 'bg-purple-100 text-purple-800',
        icon: <Calendar className="w-4 h-4" />,
        text: 'Agendando Horário'
      },
      scheduled: {
        color: 'bg-blue-100 text-blue-800',
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Agendada'
      },
      cancelled: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Cancelada'
      },
      completed: {
        color: 'bg-green-100 text-green-800',
        icon: <Trophy className="w-4 h-4" />,
        text: 'Finalizada'
      }
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.icon}
        <span className="ml-1">{badge.text}</span>
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerApprovalStatus = (matchId: string, playerId: string) => {
    const approvals = matchApprovals[matchId];
    if (!approvals) return null;
    const playerApproval = approvals.find(a => a.player_id === playerId);
    return playerApproval?.approved ?? null;
  };

  const renderApprovalBadge = (status: boolean | null) => {
    if (status === true) {
      return (
        <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovado
        </span>
      );
    } else if (status === false) {
      return (
        <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
          <XCircle className="w-3 h-3 mr-1" />
          Recusado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </span>
      );
    }
  };

  const renderPlayerAvailabilities = (match: MatchWithPlayers) => {
    const playerAvailabilities = (match as any).player_availabilities;
    if (!playerAvailabilities || Object.keys(playerAvailabilities).length === 0) {
      return null;
    }

    const dayNames: Record<string, string> = {
      segunda: 'Seg',
      terça: 'Ter',
      quarta: 'Qua',
      quinta: 'Qui',
      sexta: 'Sex',
      sábado: 'Sab',
      domingo: 'Dom'
    };

    const periodNames: Record<string, string> = {
      morning: 'Manhã',
      afternoon: 'Tarde',
      evening: 'Noite'
    };

    const players = [
      { id: match.team_a_player1_id, name: match.team_a_player1.full_name },
      { id: match.team_a_player2_id, name: match.team_a_player2.full_name },
      { id: match.team_b_player1_id, name: match.team_b_player1.full_name },
      { id: match.team_b_player2_id, name: match.team_b_player2.full_name }
    ];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Disponibilidade de Cada Jogador
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          {players.map(player => {
            const availability = playerAvailabilities[player.id] || {};
            const hasAvailability = Object.keys(availability).length > 0;

            return (
              <div key={player.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-medium text-gray-900 text-sm mb-2">{player.name}</p>
                {!hasAvailability ? (
                  <p className="text-xs text-gray-500 italic">Nenhuma disponibilidade cadastrada</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(availability).map(([day, periods]) => (
                      <div key={day} className="flex items-start text-xs">
                        <span className="text-gray-600 font-medium min-w-[40px]">
                          {dayNames[day] || day}:
                        </span>
                        <div className="flex flex-wrap gap-1 ml-2">
                          {(periods as string[]).map(period => (
                            <span
                              key={period}
                              className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs"
                            >
                              {periodNames[period] || period}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCommonAvailability = (commonAvailability: Record<string, string[]>) => {
    if (!commonAvailability || Object.keys(commonAvailability).length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start">
            <CalendarCheck className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">
                Sem Horarios Comuns
              </p>
              <p className="text-xs text-yellow-700">
                Nenhum horario comum foi encontrado entre todos os jogadores. Voces precisarao coordenar individualmente.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const dayNames: Record<string, string> = {
      segunda: 'Segunda',
      terça: 'Terca',
      quarta: 'Quarta',
      quinta: 'Quinta',
      sexta: 'Sexta',
      sábado: 'Sabado',
      domingo: 'Domingo'
    };

    const periodNames: Record<string, string> = {
      morning: 'Manha',
      afternoon: 'Tarde',
      evening: 'Noite'
    };

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start mb-3">
          <CalendarCheck className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-1">
              Horarios Disponiveis para Todos
            </p>
            <p className="text-xs text-blue-700">
              Estes sao os horarios em que todos os 4 jogadores estao disponiveis:
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(commonAvailability).map(([day, periods]) => (
            <div key={day} className="flex items-start">
              <span className="text-sm font-medium text-blue-900 min-w-[80px]">
                {dayNames[day] || day}:
              </span>
              <div className="flex flex-wrap gap-2">
                {(periods as string[]).map(period => (
                  <span
                    key={period}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium"
                  >
                    {periodNames[period] || period}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4 overflow-x-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start mb-6">
            <Calendar className="w-8 h-8 mr-3 text-emerald-600" />
            Partidas
          </h1>

          <div className="flex gap-3 justify-center md:justify-start">
            <button
              onClick={() => setViewMode('my-matches')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                viewMode === 'my-matches'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Minhas Partidas
              </div>
            </button>
            <button
              onClick={() => setViewMode('all-matches')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                viewMode === 'all-matches'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Todas as Partidas
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Todas</option>
                <option value="pending_approval">Aguardando Aprovação</option>
                <option value="scheduling">Agendando Horário</option>
                <option value="scheduled">Agendadas</option>
                <option value="completed">Finalizadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">Todas</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Carregando partidas...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma partida encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              const isTeamA = match.team_a_player1_id === profile?.id || match.team_a_player2_id === profile?.id;
              const userTeam = isTeamA ? 'A' : 'B';
              const won = match.winner_team === `team_${userTeam.toLowerCase()}`;

              return (
                <div
                  key={match.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(match.status)}
                      {(match as any).captain_id === profile?.id && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                          <Crown className="w-4 h-4 mr-1" />
                          Capitão
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(match.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {match.status === 'completed' && (
                        <>
                          <div className={`px-4 py-2 rounded-xl font-bold ${
                            won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {won ? 'Vitória' : 'Derrota'}
                          </div>
                          {(match as any).league_id && (match as any).league?.affects_regional_ranking === false && (
                            <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">
                              Não contou para ranking
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 items-center">
                    <div className={`p-4 rounded-xl ${isTeamA ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'}`}>
                      <div className="text-sm font-semibold text-gray-600 mb-3">Time A</div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <Users className="w-4 h-4 mr-2 text-emerald-600" />
                              <span className="text-sm font-medium">{match.team_a_player1.full_name}</span>
                            </div>
                            <div className="flex items-center ml-2">
                              {(match as any).team_a_player1_side === 'left' ? (
                                <>
                                  <ArrowLeft className="w-4 h-4 text-blue-600 mr-1" />
                                  <span className="text-xs font-semibold text-blue-600">ESQ</span>
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-xs font-semibold text-orange-600">DIR</span>
                                </>
                              )}
                            </div>
                          </div>
                          {match.status === 'pending_approval' && (
                            <div className="ml-6">
                              {renderApprovalBadge(getPlayerApprovalStatus(match.id, match.team_a_player1_id))}
                            </div>
                          )}
                          {match.status === 'completed' && (match as any).team_a_points_change !== null && (match as any).team_a_points_change !== undefined && (
                            <div className="ml-6">
                              {(match as any).team_a_points_change > 0 ? (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  +{(match as any).team_a_points_change} pts
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  {(match as any).team_a_points_change} pts
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <Users className="w-4 h-4 mr-2 text-emerald-600" />
                              <span className="text-sm font-medium">{match.team_a_player2.full_name}</span>
                            </div>
                            <div className="flex items-center ml-2">
                              {(match as any).team_a_player2_side === 'left' ? (
                                <>
                                  <ArrowLeft className="w-4 h-4 text-blue-600 mr-1" />
                                  <span className="text-xs font-semibold text-blue-600">ESQ</span>
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-xs font-semibold text-orange-600">DIR</span>
                                </>
                              )}
                            </div>
                          </div>
                          {match.status === 'pending_approval' && (
                            <div className="ml-6">
                              {renderApprovalBadge(getPlayerApprovalStatus(match.id, match.team_a_player2_id))}
                            </div>
                          )}
                          {match.status === 'completed' && (match as any).team_a_points_change !== null && (match as any).team_a_points_change !== undefined && (
                            <div className="ml-6">
                              {(match as any).team_a_points_change > 0 ? (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  +{(match as any).team_a_points_change} pts
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  {(match as any).team_a_points_change} pts
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {match.team_a_was_duo && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Dupla
                        </span>
                      )}
                    </div>

                    <div className="text-center">
                      {match.status === 'completed' && (match as any).sets && (match as any).sets.length > 0 ? (
                        <div className="text-3xl font-bold text-gray-900">
                          {(match as any).sets[0].team_a} - {(match as any).sets[0].team_b}
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-gray-400">VS</div>
                      )}
                    </div>

                    <div className={`p-4 rounded-xl ${!isTeamA ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'}`}>
                      <div className="text-sm font-semibold text-gray-600 mb-3">Time B</div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <Users className="w-4 h-4 mr-2 text-emerald-600" />
                              <span className="text-sm font-medium">{match.team_b_player1.full_name}</span>
                            </div>
                            <div className="flex items-center ml-2">
                              {(match as any).team_b_player1_side === 'left' ? (
                                <>
                                  <ArrowLeft className="w-4 h-4 text-blue-600 mr-1" />
                                  <span className="text-xs font-semibold text-blue-600">ESQ</span>
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-xs font-semibold text-orange-600">DIR</span>
                                </>
                              )}
                            </div>
                          </div>
                          {match.status === 'pending_approval' && (
                            <div className="ml-6">
                              {renderApprovalBadge(getPlayerApprovalStatus(match.id, match.team_b_player1_id))}
                            </div>
                          )}
                          {match.status === 'completed' && (match as any).team_b_points_change !== null && (match as any).team_b_points_change !== undefined && (
                            <div className="ml-6">
                              {(match as any).team_b_points_change > 0 ? (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  +{(match as any).team_b_points_change} pts
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  {(match as any).team_b_points_change} pts
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <Users className="w-4 h-4 mr-2 text-emerald-600" />
                              <span className="text-sm font-medium">{match.team_b_player2.full_name}</span>
                            </div>
                            <div className="flex items-center ml-2">
                              {(match as any).team_b_player2_side === 'left' ? (
                                <>
                                  <ArrowLeft className="w-4 h-4 text-blue-600 mr-1" />
                                  <span className="text-xs font-semibold text-blue-600">ESQ</span>
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-xs font-semibold text-orange-600">DIR</span>
                                </>
                              )}
                            </div>
                          </div>
                          {match.status === 'pending_approval' && (
                            <div className="ml-6">
                              {renderApprovalBadge(getPlayerApprovalStatus(match.id, match.team_b_player2_id))}
                            </div>
                          )}
                          {match.status === 'completed' && (match as any).team_b_points_change !== null && (match as any).team_b_points_change !== undefined && (
                            <div className="ml-6">
                              {(match as any).team_b_points_change > 0 ? (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  +{(match as any).team_b_points_change} pts
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  {(match as any).team_b_points_change} pts
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {match.team_b_was_duo && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Dupla
                        </span>
                      )}
                    </div>
                  </div>

                  {match.status === 'completed' && (match as any).league_id && (match as any).league?.affects_regional_ranking === false && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start">
                        <Trophy className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800 mb-1">
                            Partida de Liga - Não afeta ranking regional
                          </p>
                          <p className="text-xs text-blue-700">
                            Esta partida faz parte da liga "{(match as any).league?.name}" que não afeta o ranking regional. Os pontos foram contabilizados apenas dentro da liga.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(match.status === 'pending_approval' || match.status === 'scheduling' || match.status === 'scheduled') && (
                    <div className="mt-4 space-y-3">
                      {renderCommonAvailability((match as any).common_availability || {})}
                      {renderPlayerAvailabilities(match)}
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'pending_approval' && approvalStatus[match.id] === null && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-yellow-800 font-semibold mb-2">
                          Esta partida precisa da sua aprovação!
                        </p>
                        <p className="text-xs text-yellow-700">
                          Escolha um horário e aprove a partida. Quando todos aprovarem, o capitão será designado.
                        </p>
                      </div>

                      {timeProposals[match.id] && timeProposals[match.id].length > 0 && (
                        <div className="mb-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Escolha seu horário preferido:
                          </h4>
                          {timeProposals[match.id].map((proposal) => (
                            <div
                              key={proposal.id}
                              onClick={() => setSelectedTimes(prev => ({ ...prev, [match.id]: proposal.id }))}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedTimes[match.id] === proposal.id
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Opção {proposal.proposal_order}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(proposal.proposed_time).toLocaleString('pt-BR', {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {selectedTimes[match.id] === proposal.id && (
                                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproval(match.id, true, selectedTimes[match.id])}
                          disabled={approvingMatch === match.id}
                          className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ThumbsUp className="w-5 h-5 mr-2" />
                          {approvingMatch === match.id ? 'Processando...' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => handleApproval(match.id, false)}
                          disabled={approvingMatch === match.id}
                          className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ThumbsDown className="w-5 h-5 mr-2" />
                          {approvingMatch === match.id ? 'Processando...' : 'Recusar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'pending_approval' && approvalStatus[match.id] === true && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-green-800 font-semibold">
                          Você aprovou esta partida
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Aguardando aprovação dos outros jogadores
                        </p>
                      </div>
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'pending_approval' && approvalStatus[match.id] === false && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="text-sm text-red-800 font-semibold">
                          Você recusou esta partida
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          A partida será cancelada
                        </p>
                      </div>
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'scheduling' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-purple-800 font-semibold mb-2">
                          Fase de Agendamento
                        </p>
                        <p className="text-xs text-purple-700">
                          Escolha um horário ou negocie com os outros jogadores para definir quando a partida acontecerá.
                        </p>
                      </div>
                      <button
                        onClick={() => setSchedulingMatch(match)}
                        className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                      >
                        <Calendar className="w-5 h-5 mr-2" />
                        Escolher Horário
                      </button>
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'scheduled' && (match as any).captain_id === profile?.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setReportingMatch(match);
                          setIsModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Reportar Resultado (Capitão)
                      </button>
                    </div>
                  )}

                  {viewMode === 'my-matches' && match.status === 'completed' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setContestingMatch(match)}
                        className="w-full flex items-center justify-center px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors"
                      >
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Contestar Resultado
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {reportingMatch && (
          <ReportMatchResultModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setReportingMatch(null);
            }}
            onSubmit={handleReportResult}
            teamANames={[
              reportingMatch.team_a_player1.full_name,
              reportingMatch.team_a_player2.full_name
            ]}
            teamBNames={[
              reportingMatch.team_b_player1.full_name,
              reportingMatch.team_b_player2.full_name
            ]}
          />
        )}

        {schedulingMatch && profile && (
          <MatchSchedulingModal
            match={schedulingMatch}
            currentUserId={profile.id}
            onClose={() => setSchedulingMatch(null)}
            onScheduled={() => {
              setSchedulingMatch(null);
              loadMatches();
            }}
          />
        )}

        {contestingMatch && profile && (
          <ContestResultModal
            match={contestingMatch}
            currentUserId={profile.id}
            onClose={() => setContestingMatch(null)}
            onContested={() => {
              setContestingMatch(null);
              alert('Contestação enviada com sucesso! Um administrador irá revisar.');
              loadMatches();
            }}
          />
        )}
      </div>
    </div>
  );
}
