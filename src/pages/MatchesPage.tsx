import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';
import { supabase, Match, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type MatchWithPlayers = Match & {
  team_a_player1: Profile;
  team_a_player2: Profile;
  team_b_player1: Profile;
  team_b_player2: Profile;
};

type StatusFilter = 'all' | 'pending_approval' | 'scheduled' | 'cancelled' | 'completed';

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    loadMatches();
  }, [profile]);

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
                      <div className="text-sm font-semibold text-gray-600 mb-2">Time A</div>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-emerald-600" />
                          <span className="text-sm font-medium">{match.team_a_player1.full_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-emerald-600" />
                          <span className="text-sm font-medium">{match.team_a_player2.full_name}</span>
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
                      <div className="text-sm font-semibold text-gray-600 mb-2">Time B</div>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-emerald-600" />
                          <span className="text-sm font-medium">{match.team_b_player1.full_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-emerald-600" />
                          <span className="text-sm font-medium">{match.team_b_player2.full_name}</span>
                        </div>
                      </div>
                      {match.team_b_was_duo && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Dupla
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
