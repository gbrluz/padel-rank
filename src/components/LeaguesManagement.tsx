import { useEffect, useState } from 'react';
import { Medal, Plus, Edit, Save, X, Users, Trash2, UserPlus } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface League {
  id: string;
  name: string;
  type: 'club' | 'friends' | 'official';
  description: string;
  created_by: string;
  affects_regional_ranking: boolean;
  region_state: string | null;
  region_city: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface LeagueMembership {
  id: string;
  league_id: string;
  player_id: string;
  status: string;
  profile: Profile;
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

export default function LeaguesManagement() {
  const { profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMembership[]>([]);
  const [leagueRankings, setLeagueRankings] = useState<LeagueRanking[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueFormData, setLeagueFormData] = useState<Partial<League>>({
    type: 'friends',
    affects_regional_ranking: false,
    is_active: true,
  });

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      loadLeagueMembers(selectedLeague.id);
      loadLeagueRankings(selectedLeague.id);
      loadAvailablePlayers(selectedLeague.id);
    }
  }, [selectedLeague]);

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeagues(data || []);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeagueMembers = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('league_memberships')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'active');

      if (error) throw error;
      setLeagueMembers(data || []);
    } catch (error) {
      console.error('Error loading league members:', error);
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
        .order('points', { ascending: false });

      if (error) throw error;
      setLeagueRankings(data || []);
    } catch (error) {
      console.error('Error loading league rankings:', error);
    }
  };

  const loadAvailablePlayers = async (leagueId: string) => {
    try {
      const { data: members } = await supabase
        .from('league_memberships')
        .select('player_id')
        .eq('league_id', leagueId);

      const memberIds = members?.map(m => m.player_id) || [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${memberIds.join(',') || 'null'})`)
        .order('full_name');

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('Error loading available players:', error);
    }
  };

  const handleCreateLeague = async () => {
    if (!leagueFormData.name || !profile) return;

    try {
      const { error } = await supabase
        .from('leagues')
        .insert([{
          ...leagueFormData,
          created_by: profile.id,
        }]);

      if (error) throw error;

      await loadLeagues();
      setShowCreateLeague(false);
      setLeagueFormData({
        type: 'friends',
        affects_regional_ranking: false,
        is_active: true,
      });
    } catch (error) {
      console.error('Error creating league:', error);
      alert('Erro ao criar liga');
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;

    try {
      const { error } = await supabase
        .from('leagues')
        .update(leagueFormData)
        .eq('id', editingLeague.id);

      if (error) throw error;

      await loadLeagues();
      setEditingLeague(null);
      setLeagueFormData({});
    } catch (error) {
      console.error('Error updating league:', error);
      alert('Erro ao atualizar liga');
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta liga?')) return;

    try {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

      if (error) throw error;

      await loadLeagues();
      if (selectedLeague?.id === leagueId) {
        setSelectedLeague(null);
      }
    } catch (error) {
      console.error('Error deleting league:', error);
      alert('Erro ao excluir liga');
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

      await loadLeagueMembers(selectedLeague.id);
      await loadAvailablePlayers(selectedLeague.id);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Tem certeza que deseja remover este jogador?')) return;

    try {
      const { error } = await supabase
        .from('league_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      if (selectedLeague) {
        await loadLeagueMembers(selectedLeague.id);
        await loadAvailablePlayers(selectedLeague.id);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Erro ao remover membro');
    }
  };

  const startEdit = (league: League) => {
    setEditingLeague(league);
    setLeagueFormData(league);
  };

  const cancelEdit = () => {
    setEditingLeague(null);
    setLeagueFormData({});
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Ligas</h2>
        <button
          onClick={() => setShowCreateLeague(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Liga
        </button>
      </div>

      {showCreateLeague && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-emerald-200">
          <h3 className="text-xl font-bold mb-4">Criar Nova Liga</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                value={leagueFormData.name || ''}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
              <select
                value={leagueFormData.type || 'friends'}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, type: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="friends">Amigos</option>
                <option value="club">Clube</option>
                <option value="official">Oficial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
              <textarea
                value={leagueFormData.description || ''}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={leagueFormData.affects_regional_ranking || false}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, affects_regional_ranking: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Afeta ranking regional</label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateLeague}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Criar
              </button>
              <button
                onClick={() => {
                  setShowCreateLeague(false);
                  setLeagueFormData({ type: 'friends', affects_regional_ranking: false, is_active: true });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Ligas</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {leagues.map((league) => (
              <div
                key={league.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedLeague?.id === league.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
                onClick={() => setSelectedLeague(league)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Medal className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-bold text-gray-900">{league.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{league.description || 'Sem descrição'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded">{
                        league.type === 'friends' ? 'Amigos' :
                        league.type === 'club' ? 'Clube' : 'Oficial'
                      }</span>
                      {league.affects_regional_ranking && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          Afeta Regional
                        </span>
                      )}
                      {!league.is_active && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(league);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLeague(league.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedLeague && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Membros - {selectedLeague.name}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adicionar Jogador
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddMember(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione um jogador...</option>
                {availablePlayers.map((player) => (
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
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{member.profile.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {member.profile.ranking_points} pts regional
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {leagueRankings.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-3">Ranking da Liga</h4>
                <div className="space-y-2">
                  {leagueRankings.map((ranking, index) => (
                    <div
                      key={ranking.player_id}
                      className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600">#{index + 1}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{ranking.profile.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {ranking.matches_played} partidas • {ranking.wins}V / {ranking.losses}D
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">{ranking.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingLeague && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Editar Liga</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={leagueFormData.name || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
                <textarea
                  value={leagueFormData.description || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leagueFormData.affects_regional_ranking || false}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, affects_regional_ranking: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Afeta ranking regional</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leagueFormData.is_active !== false}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Liga ativa</label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateLeague}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
