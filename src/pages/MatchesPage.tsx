import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Trophy, ThumbsUp, ThumbsDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase, Match, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

type StatusFilter = 'all' | 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [approvalStatus, setApprovalStatus] = useState<Record<string, boolean | null>>({});
  const [matchApprovals, setMatchApprovals] = useState<Record<string, PlayerApprovalStatus[]>>({});
  const [approvingMatch, setApprovingMatch] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
    loadApprovalStatus();
    loadAllApprovals();
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

  const handleApproval = async (matchId: string, approved: boolean) => {
    if (!profile) return;

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
          body: JSON.stringify({ matchId, approved })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar aprovação');
      }

      setApprovalStatus(prev => ({ ...prev, [matchId]: approved }));
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
          team_b_player2:profiles!matches_team_b_player2_id_fkey(*)
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

  const filteredMatches = matches.filter(match => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Calendar className="w-8 h-8 mr-3 text-emerald-600" />
            Minhas Partidas
          </h1>
          <p className="text-gray-600">Acompanhe suas partidas agendadas e histórico</p>
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(match.status)}
                      <span className="text-sm text-gray-500">
                        {formatDate(match.created_at)}
                      </span>
                    </div>
                    {match.status === 'completed' && (
                      <div className={`px-4 py-2 rounded-xl font-bold ${
                        won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {won ? 'Vitória' : 'Derrota'}
                      </div>
                    )}
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
                        </div>
                      </div>
                      {match.team_a_was_duo && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Dupla
                        </span>
                      )}
                    </div>

                    <div className="text-center">
                      {match.status === 'completed' && match.team_a_score !== null && match.team_b_score !== null ? (
                        <div className="text-3xl font-bold text-gray-900">
                          {match.team_a_score} - {match.team_b_score}
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
                        </div>
                      </div>
                      {match.team_b_was_duo && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Dupla
                        </span>
                      )}
                    </div>
                  </div>

                  {match.status === 'pending_approval' && approvalStatus[match.id] === null && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-yellow-800 font-semibold mb-2">
                          Esta partida precisa da sua aprovação!
                        </p>
                        <p className="text-xs text-yellow-700">
                          Você tem até 24 horas para aprovar. Se todos aprovarem, a partida será agendada.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproval(match.id, true)}
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

                  {match.status === 'pending_approval' && approvalStatus[match.id] === true && (
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

                  {match.status === 'pending_approval' && approvalStatus[match.id] === false && (
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
