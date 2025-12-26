import { useEffect, useState } from 'react';
import { Medal, Plus, CreditCard as Edit, Save, X, Users, Trash2, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Player as Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface League {
  id: string;
  name: string;
  type: 'club' | 'friends' | 'official';
  format: 'free' | 'weekly' | 'monthly';
  description: string;
  created_by: string;
  affects_regional_ranking: boolean;
  region_state: string | null;
  region_city: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  duration_months: number | null;
  club_name: string | null;
  group_name: string | null;
  max_members: number | null;
  entry_criteria: string | null;
  min_points: number | null;
  max_points: number | null;
  scoring_type: 'standard' | 'games_won' | 'games_balance' | 'by_event';
  weekly_day: number | null;
  weekly_time: string | null;
  attendance_deadline_hours: number | null;
  monthly_min_matches: number | null;
  requires_approval: boolean;
}

interface LeagueOrganizer {
  id: string;
  league_id: string;
  player_id: string;
  created_at: string;
  player: Profile;
}

interface LeagueMembership {
  id: string;
  league_id: string;
  player_id: string;
  status: string;
  player: Profile;
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

export default function LeaguesManagement() {
  const { player: profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMembership[]>([]);
  const [leagueRankings, setLeagueRankings] = useState<LeagueRanking[]>([]);
  const [leagueOrganizers, setLeagueOrganizers] = useState<LeagueOrganizer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Profile[]>([]);
  const [allPlayers, setAllPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueFormData, setLeagueFormData] = useState<Partial<League>>({
    type: 'friends',
    format: 'free',
    affects_regional_ranking: false,
    is_active: true,
    scoring_type: 'standard',
    min_points: 0,
    attendance_deadline_hours: 3,
  });

  useEffect(() => {
    loadLeagues();
    loadAllPlayers();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      loadLeagueMembers(selectedLeague.id);
      loadLeagueRankings(selectedLeague.id);
      loadAvailablePlayers(selectedLeague.id);
      loadLeagueOrganizers(selectedLeague.id);
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

  const loadLeagueRankings = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('league_rankings')
        .select(`
          *,
          player:players(*)
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

      let query = supabase
        .from('players')
        .select('*')
        .order('full_name');

      if (memberIds.length > 0) {
        query = query.not('id', 'in', `(${memberIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('Error loading available players:', error);
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

  const loadLeagueOrganizers = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from('league_organizers')
        .select(`
          *,
          player:players(*)
        `)
        .eq('league_id', leagueId);

      if (error) throw error;
      setLeagueOrganizers(data || []);
    } catch (error) {
      console.error('Error loading league organizers:', error);
    }
  };

  const handleAddOrganizer = async (playerId: string) => {
    if (!selectedLeague) return;

    try {
      const { error } = await supabase
        .from('league_organizers')
        .insert([{
          league_id: selectedLeague.id,
          player_id: playerId,
        }]);

      if (error) throw error;

      await loadLeagueOrganizers(selectedLeague.id);
    } catch (error) {
      console.error('Error adding organizer:', error);
      alert('Erro ao adicionar organizador');
    }
  };

  const handleRemoveOrganizer = async (organizerId: string) => {
    if (!confirm('Tem certeza que deseja remover este organizador?')) return;

    try {
      const { error } = await supabase
        .from('league_organizers')
        .delete()
        .eq('id', organizerId);

      if (error) throw error;

      if (selectedLeague) {
        await loadLeagueOrganizers(selectedLeague.id);
      }
    } catch (error) {
      console.error('Error removing organizer:', error);
      alert('Erro ao remover organizador');
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Formato da Liga</label>
              <select
                value={leagueFormData.format || 'free'}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, format: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="free">Livre - Pareamento automático via fila</option>
                <option value="weekly">Semanal - Dia e horário fixo com confirmação de presença</option>
                <option value="monthly">Mensal - Número mínimo de partidas por mês</option>
              </select>
            </div>

            {leagueFormData.format === 'weekly' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900">Configurações Semanais</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dia da Semana</label>
                    <select
                      value={leagueFormData.weekly_day ?? ''}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, weekly_day: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="0">Domingo</option>
                      <option value="1">Segunda</option>
                      <option value="2">Terça</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                      <option value="6">Sábado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Horário</label>
                    <input
                      type="time"
                      value={leagueFormData.weekly_time || ''}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, weekly_time: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prazo para confirmar presença (horas antes)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max="72"
                    step="0.01"
                    value={leagueFormData.attendance_deadline_hours ?? 3}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, attendance_deadline_hours: parseFloat(e.target.value) || 3 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {leagueFormData.format === 'monthly' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900">Configurações Mensais</h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número mínimo de partidas por mês
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={leagueFormData.monthly_min_matches || ''}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, monthly_min_matches: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: 4 partidas por mês"
                  />
                </div>
              </div>
            )}

            {leagueFormData.type === 'club' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Clube</label>
                <input
                  type="text"
                  value={leagueFormData.club_name || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, club_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Nome do clube"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descricao</label>
              <textarea
                value={leagueFormData.description || ''}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duracao (meses)</label>
              <input
                type="number"
                min="1"
                value={leagueFormData.duration_months || ''}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, duration_months: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Numero de meses (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Numero de Vagas</label>
              <input
                type="number"
                min="2"
                value={leagueFormData.max_members || ''}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, max_members: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Máximo de participantes"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pontuação Mínima</label>
                <input
                  type="number"
                  min="0"
                  value={leagueFormData.min_points ?? 0}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, min_points: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pontuação Máxima</label>
                <input
                  type="number"
                  min="0"
                  value={leagueFormData.max_points || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, max_points: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Pontuacao</label>
              <select
                value={leagueFormData.scoring_type || 'standard'}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, scoring_type: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="standard">Pontuacao Padrao (comeca do zero, pode ficar negativa)</option>
                <option value="games_won">Por games ganhos no total</option>
                <option value="games_balance">Por saldo de games no geral</option>
                {leagueFormData.format === 'weekly' && (
                  <option value="by_event">Por Evento (presenca 4pts, churrasco 2pts, vitoria 3pts, derrota 1pt)</option>
                )}
              </select>
              {leagueFormData.format === 'weekly' && leagueFormData.scoring_type === 'by_event' && (
                <p className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  Pontuacao por evento: Presenca = 4 pontos | Churrasco = 2 pontos | Vitoria = 3 pontos | Derrota = 1 ponto
                </p>
              )}
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
                checked={leagueFormData.requires_approval || false}
                onChange={(e) => setLeagueFormData({ ...leagueFormData, requires_approval: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Requer aprovacao para entrar</label>
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
                  setLeagueFormData({ type: 'friends', affects_regional_ranking: false, is_active: true, scoring_type: 'standard', min_points: 0 });
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
                    {(league.club_name || league.group_name) && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        {league.club_name || league.group_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{league.description || 'Sem descrição'}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded">{
                        league.type === 'friends' ? 'Amigos' :
                        league.type === 'club' ? 'Clube' : 'Oficial'
                      }</span>

                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-medium">{
                        league.format === 'free' ? 'Livre' :
                        league.format === 'weekly' ? 'Semanal' : 'Mensal'
                      }</span>

                      {league.max_members && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          Max: {league.max_members} vagas
                        </span>
                      )}

                      {league.duration_months && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          {league.duration_months} {league.duration_months === 1 ? 'mês' : 'meses'}
                        </span>
                      )}

                      {(league.min_points !== null && league.min_points !== undefined) && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                          {league.min_points}{league.max_points ? `-${league.max_points}` : '+'} pts
                        </span>
                      )}

                      {league.scoring_type && league.scoring_type !== 'standard' && (
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">
                          {league.scoring_type === 'games_won' ? 'Games ganhos' :
                           league.scoring_type === 'games_balance' ? 'Saldo de games' :
                           league.scoring_type === 'by_event' ? 'Por evento' : ''}
                        </span>
                      )}

                      {league.affects_regional_ranking && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          Afeta Regional
                        </span>
                      )}

                      {league.requires_approval && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">
                          Requer Aprovacao
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
                    <p className="font-semibold text-gray-900">{member.player.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {member.player.ranking_points} pts regional
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

            <div className="mt-6 border-t pt-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Organizadores
              </h4>
              <div className="mb-4">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddOrganizer(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Adicionar organizador...</option>
                  {allPlayers
                    .filter(p => !leagueOrganizers.some(o => o.player_id === p.id))
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {leagueOrganizers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhum organizador designado</p>
                ) : (
                  leagueOrganizers.map((organizer) => (
                    <div
                      key={organizer.id}
                      className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <p className="font-semibold text-gray-900">{organizer.player.full_name}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveOrganizer(organizer.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Organizadores podem adicionar/remover membros e gerenciar pontuacao semanal
              </p>
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
                          <p className="font-semibold text-gray-900">{ranking.player.full_name}</p>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Formato da Liga</label>
                <select
                  value={leagueFormData.format || 'free'}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, format: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="free">Livre - Pareamento automático via fila</option>
                  <option value="weekly">Semanal - Dia e horário fixo com confirmação de presença</option>
                  <option value="monthly">Mensal - Número mínimo de partidas por mês</option>
                </select>
              </div>

              {leagueFormData.format === 'weekly' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900">Configurações Semanais</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Dia da Semana</label>
                      <select
                        value={leagueFormData.weekly_day ?? ''}
                        onChange={(e) => setLeagueFormData({ ...leagueFormData, weekly_day: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Selecione...</option>
                        <option value="0">Domingo</option>
                        <option value="1">Segunda</option>
                        <option value="2">Terça</option>
                        <option value="3">Quarta</option>
                        <option value="4">Quinta</option>
                        <option value="5">Sexta</option>
                        <option value="6">Sábado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Horário</label>
                      <input
                        type="time"
                        value={leagueFormData.weekly_time || ''}
                        onChange={(e) => setLeagueFormData({ ...leagueFormData, weekly_time: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prazo para confirmar presença (horas antes)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      max="72"
                      step="0.01"
                      value={leagueFormData.attendance_deadline_hours ?? 3}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, attendance_deadline_hours: parseFloat(e.target.value) || 3 })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {leagueFormData.format === 'monthly' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900">Configurações Mensais</h4>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número mínimo de partidas por mês
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={leagueFormData.monthly_min_matches || ''}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, monthly_min_matches: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 4 partidas por mês"
                    />
                  </div>
                </div>
              )}

              {leagueFormData.type === 'club' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Clube</label>
                  <input
                    type="text"
                    value={leagueFormData.club_name || ''}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, club_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nome do clube"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descricao</label>
                <textarea
                  value={leagueFormData.description || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duracao (meses)</label>
                <input
                  type="number"
                  min="1"
                  value={leagueFormData.duration_months || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, duration_months: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Numero de meses (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Vagas</label>
                <input
                  type="number"
                  min="2"
                  value={leagueFormData.max_members || ''}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, max_members: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Máximo de participantes"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pontuação Mínima</label>
                  <input
                    type="number"
                    min="0"
                    value={leagueFormData.min_points ?? 0}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, min_points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pontuação Máxima</label>
                  <input
                    type="number"
                    min="0"
                    value={leagueFormData.max_points || ''}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, max_points: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Pontuacao</label>
                <select
                  value={leagueFormData.scoring_type || 'standard'}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, scoring_type: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="standard">Pontuacao Padrao (comeca do zero, pode ficar negativa)</option>
                  <option value="games_won">Por games ganhos no total</option>
                  <option value="games_balance">Por saldo de games no geral</option>
                  {leagueFormData.format === 'weekly' && (
                    <option value="by_event">Por Evento (presenca 4pts, churrasco 2pts, vitoria 3pts, derrota 1pt)</option>
                  )}
                </select>
                {leagueFormData.format === 'weekly' && leagueFormData.scoring_type === 'by_event' && (
                  <p className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    Pontuacao por evento: Presenca = 4 pontos | Churrasco = 2 pontos | Vitoria = 3 pontos | Derrota = 1 ponto
                  </p>
                )}
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
                  checked={leagueFormData.requires_approval || false}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, requires_approval: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Requer aprovacao para entrar</label>
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
