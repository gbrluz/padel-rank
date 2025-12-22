import { useState, useEffect } from 'react';
import { Trophy, Calendar, PlayCircle, TrendingUp, Users, Award, Medal, User as UserIcon, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Match } from '../lib/supabase';

type DashboardPageProps = {
  onNavigate: (page: string) => void;
};

type MatchWithPlayers = Match & {
  team_a_player1: Profile;
  team_a_player2: Profile;
  team_b_player1: Profile;
  team_b_player2: Profile;
};

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();
  const [topPlayers, setTopPlayers] = useState<Profile[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithPlayers[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: rankings } = await supabase
        .from('profiles')
        .select('*')
        .eq('gender', profile.gender)
        .order('ranking_points', { ascending: false })
        .limit(5);

      if (rankings) {
        setTopPlayers(rankings);
        const position = rankings.findIndex(p => p.id === profile.id);
        if (position !== -1) {
          setUserPosition(position + 1);
        } else {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('gender', profile.gender)
            .gt('ranking_points', profile.ranking_points);
          setUserPosition((count || 0) + 1);
        }
      }

      const { data: matches } = await supabase
        .from('matches')
        .select(`
          *,
          team_a_player1:profiles!matches_team_a_player1_id_fkey(*),
          team_a_player2:profiles!matches_team_a_player2_id_fkey(*),
          team_b_player1:profiles!matches_team_b_player1_id_fkey(*),
          team_b_player2:profiles!matches_team_b_player2_id_fkey(*)
        `)
        .or(`team_a_player1_id.eq.${profile.id},team_a_player2_id.eq.${profile.id},team_b_player1_id.eq.${profile.id},team_b_player2_id.eq.${profile.id}`)
        .in('status', ['pending_approval', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(3);

      setUpcomingMatches(matches as any || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {profile.full_name.split(' ')[0]}!
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1">Pontuação</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{profile.ranking_points}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1">Partidas</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{profile.total_matches}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1">Vitórias</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{profile.total_wins}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1">Taxa de Vitória</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{profile.win_rate}%</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-emerald-600" />
                Top 5 Ranking
              </h3>
              <button
                onClick={() => onNavigate('ranking')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center"
              >
                Ver Todos
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Carregando...</div>
            ) : topPlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhum jogador no ranking</div>
            ) : (
              <div className="space-y-3">
                {topPlayers.map((player, index) => {
                  const position = index + 1;
                  const isCurrentUser = player.id === profile.id;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center p-3 rounded-xl ${
                        isCurrentUser ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center mr-3">
                        {position === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
                        {position === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                        {position === 3 && <Medal className="w-5 h-5 text-amber-700" />}
                        <span className={`ml-1 text-lg font-bold ${
                          position <= 3 ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          {position}
                        </span>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold truncate ${
                            isCurrentUser ? 'text-emerald-700' : 'text-gray-900'
                          }`}>
                            {player.full_name}
                          </span>
                          {isCurrentUser && (
                            <span className="flex-shrink-0 text-xs bg-emerald-600 text-white px-2 py-1 rounded-full whitespace-nowrap">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{player.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600">{player.ranking_points}</div>
                        <div className="text-xs text-gray-500">{player.total_matches} partidas</div>
                      </div>
                    </div>
                  );
                })}
                {userPosition && userPosition > 5 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <div className="text-sm text-gray-700">
                      Sua posição: <span className="font-bold text-blue-600">#{userPosition}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Próximas Partidas
              </h3>
              <button
                onClick={() => onNavigate('matches')}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center"
              >
                Ver Todas
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Carregando...</div>
            ) : upcomingMatches.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">Nenhuma partida agendada</p>
                <button
                  onClick={() => onNavigate('play')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                >
                  Entrar na Fila
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => {
                  const isTeamA = match.team_a_player1_id === profile.id || match.team_a_player2_id === profile.id;
                  return (
                    <div key={match.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          match.status === 'pending_approval'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {match.status === 'pending_approval' ? 'Aguardando Aprovação' : 'Agendada'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(match.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-center text-xs">
                        <div className={`${isTeamA ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                          <div className="truncate">{match.team_a_player1.full_name.split(' ')[0]}</div>
                          <div className="truncate">{match.team_a_player2.full_name.split(' ')[0]}</div>
                        </div>
                        <div className="text-center font-bold text-gray-400">VS</div>
                        <div className={`text-right ${!isTeamA ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                          <div className="truncate">{match.team_b_player1.full_name.split(' ')[0]}</div>
                          <div className="truncate">{match.team_b_player2.full_name.split(' ')[0]}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Users className="w-6 h-6 mr-2 text-emerald-600" />
            Sobre o Sistema
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Como Funciona</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Entre na fila sozinho ou em dupla</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>O sistema encontra jogadores do seu nível</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Todos devem aprovar a partida em até 24h</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-2">•</span>
                  <span>Após jogar, registre o resultado no app</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Sistema de Pontos</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Pontos baseados no ranking dos adversários</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Vitória contra ranking maior = mais pontos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Duplas formadas têm penalidade de 20%</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  <span>Rankings separados por gênero</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
