import { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, User } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function RankingPage() {
  const { profile } = useAuth();
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [rankings, setRankings] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<number | null>(null);

  useEffect(() => {
    loadRankings();
  }, [gender]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('gender', gender)
        .order('ranking_points', { ascending: false });

      if (error) throw error;

      setRankings(data || []);

      if (profile && profile.gender === gender) {
        const position = (data || []).findIndex(p => p.id === profile.id);
        setUserPosition(position !== -1 ? position + 1 : null);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (position === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Trophy className="w-8 h-8 mr-3 text-emerald-600" />
            Ranking
          </h1>
          <p className="text-gray-600">Veja sua classificação e compare com outros jogadores</p>
        </div>

        {userPosition && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 mb-1">Sua Posição</p>
                <p className="text-4xl font-bold">#{userPosition}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 mb-1">Pontuação</p>
                <p className="text-3xl font-bold">{profile?.ranking_points}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setGender('male')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                gender === 'male'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Masculino
            </button>
            <button
              onClick={() => setGender('female')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                gender === 'female'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Feminino
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Carregando ranking...
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Nenhum jogador cadastrado ainda
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Posição
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Jogador
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Pontos
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Partidas
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Vitórias
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Taxa de Vitória
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankings.map((player, index) => {
                    const position = index + 1;
                    const isCurrentUser = player.id === profile?.id;

                    return (
                      <tr
                        key={player.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          isCurrentUser ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getMedalIcon(position)}
                            <span className={`ml-2 text-lg font-bold ${
                              position <= 3 ? 'text-emerald-600' : 'text-gray-900'
                            }`}>
                              {position}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt={player.full_name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <div className={`font-semibold ${isCurrentUser ? 'text-emerald-700' : 'text-gray-900'}`}>
                                {player.full_name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                                    Você
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{player.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 mr-1 text-emerald-600" />
                            <span className="text-lg font-bold text-gray-900">
                              {player.ranking_points}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                          {player.total_matches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                          {player.total_wins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`font-semibold ${
                            player.win_rate >= 60 ? 'text-green-600' :
                            player.win_rate >= 40 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {player.win_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {rankings.map((player, index) => {
                const position = index + 1;
                const isCurrentUser = player.id === profile?.id;

                return (
                  <div
                    key={player.id}
                    className={`rounded-xl p-4 ${
                      isCurrentUser ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className="flex items-center mr-3">
                        {getMedalIcon(position)}
                        <span className={`ml-1 text-xl font-bold ${
                          position <= 3 ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          #{position}
                        </span>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold ${
                          isCurrentUser ? 'text-emerald-700' : 'text-gray-900'
                        }`}>
                          {player.full_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{player.category}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Pontos</div>
                        <div className="text-lg font-bold text-emerald-600">
                          {player.ranking_points}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Partidas</div>
                        <div className="text-lg font-bold text-gray-900">
                          {player.total_matches}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Vitórias</div>
                        <div className="text-lg font-bold text-gray-900">
                          {player.total_wins}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Taxa</div>
                        <div className={`text-lg font-bold ${
                          player.win_rate >= 60 ? 'text-green-600' :
                          player.win_rate >= 40 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {player.win_rate.toFixed(0)}%
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
      </div>
    </div>
  );
}
