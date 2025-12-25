import { useEffect, useState } from 'react';
import { Medal, Users, Trophy, TrendingUp } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LeaguesPageProps {
  onNavigate: (page: string) => void;
}

interface League {
  id: string;
  name: string;
  type: 'club' | 'friends' | 'official';
  description: string;
  affects_regional_ranking: boolean;
  is_active: boolean;
}

interface LeagueRanking {
  player_id: string;
  points: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  profile: Profile;
}

export default function LeaguesPage({ onNavigate }: LeaguesPageProps) {
  const { player: profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueRankings, setLeagueRankings] = useState<LeagueRanking[]>([]);
  const [myLeagues, setMyLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeagues();
    if (profile) {
      loadMyLeagues();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedLeague) {
      loadLeagueRankings(selectedLeague.id);
    }
  }, [selectedLeague]);

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

  const loadLeagueRankings = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('league_rankings')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('league_id', leagueId)
        .order('points', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeagueRankings(data || []);
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
                      onClick={() => setSelectedLeague(league)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedLeague?.id === league.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {myLeagues.includes(league.id) && (
                          <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{league.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {league.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {getLeagueTypeName(league.type)}
                            </span>
                            {league.affects_regional_ranking && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                Afeta Regional
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
                  </div>

                  {myLeagues.includes(selectedLeague.id) && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-emerald-900">
                            Você está participando desta liga!
                          </p>
                          {getMyPosition() && (
                            <p className="text-sm text-emerald-700 mt-1">
                              Posição atual: #{getMyPosition()}
                            </p>
                          )}
                        </div>
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
                                    <p className={`font-bold ${isMe ? 'text-emerald-900' : 'text-gray-900'}`}>
                                      {ranking.profile.full_name}
                                      {isMe && ' (Você)'}
                                    </p>
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
