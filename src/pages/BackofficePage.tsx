import { useEffect, useState } from 'react';
import { Users, UserCog, Trophy, Calendar, Trash2, Save, X, Edit, Medal } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import LeaguesManagement from '../components/LeaguesManagement';

interface BackofficePageProps {
  onNavigate: (page: string) => void;
}

interface ProfileWithEmail extends Profile {
  email: string;
}

interface Match {
  id: string;
  gender: string;
  status: string;
  team_a_score: number | null;
  team_b_score: number | null;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  location: string | null;
  match_date: string | null;
  match_time: string | null;
  sets: any;
  has_tiebreak: boolean;
  tiebreak_score: any;
  winner_team: string | null;
  team_a_player1: Profile;
  team_a_player2: Profile;
  team_b_player1: Profile;
  team_b_player2: Profile;
}

export default function BackofficePage({ onNavigate }: BackofficePageProps) {
  const [profiles, setProfiles] = useState<ProfileWithEmail[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'matches' | 'leagues'>('profiles');
  const [editingProfile, setEditingProfile] = useState<ProfileWithEmail | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileWithEmail>>({});
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchFormData, setMatchFormData] = useState<Partial<Match>>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'leagues') {
      setLoading(false);
      return;
    }

    setLoading(true);
    if (activeTab === 'profiles') {
      await loadProfiles();
    } else {
      await loadMatches();
    }
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase.rpc('get_profiles_with_email');

    if (!error && data) {
      setProfiles(data);
    } else if (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        team_a_player1:profiles!matches_team_a_player1_id_fkey(*),
        team_a_player2:profiles!matches_team_a_player2_id_fkey(*),
        team_b_player1:profiles!matches_team_b_player1_id_fkey(*),
        team_b_player2:profiles!matches_team_b_player2_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMatches(data as Match[]);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData(profile);
  };

  const handleCancelEdit = () => {
    setEditingProfile(null);
    setFormData({});
  };

  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        gender: formData.gender,
        birth_date: formData.birth_date,
        preferred_side: formData.preferred_side,
        category: formData.category,
        state: formData.state,
        city: formData.city,
        ranking_points: formData.ranking_points,
        total_matches: formData.total_matches,
        total_wins: formData.total_wins,
        win_rate: formData.win_rate,
        is_admin: formData.is_admin,
      })
      .eq('id', editingProfile.id);

    if (!error) {
      await loadProfiles();
      handleCancelEdit();
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.')) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (!error) {
      await loadProfiles();
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.')) {
      return;
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (!error) {
      await loadMatches();
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setMatchFormData(match);
  };

  const handleCancelMatchEdit = () => {
    setEditingMatch(null);
    setMatchFormData({});
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;

    const { error } = await supabase
      .from('matches')
      .update({
        status: matchFormData.status,
        team_a_score: matchFormData.team_a_score,
        team_b_score: matchFormData.team_b_score,
        winner_team: matchFormData.winner_team,
        location: matchFormData.location,
        match_date: matchFormData.match_date,
        match_time: matchFormData.match_time,
      })
      .eq('id', editingMatch.id);

    if (!error) {
      await loadMatches();
      handleCancelMatchEdit();
    } else {
      alert('Erro ao atualizar partida: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <UserCog className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
                <span>Backoffice<span className="hidden sm:inline"> - Administração</span></span>
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-2">Gerencie usuários e partidas do sistema</p>
            </div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap text-sm sm:text-base self-start sm:self-auto"
            >
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
              <span className="sm:hidden">Voltar</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors flex items-center justify-center ${
                activeTab === 'profiles'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Perfis de Usuários
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors flex items-center justify-center ${
                activeTab === 'matches'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Partidas
            </button>
            <button
              onClick={() => setActiveTab('leagues')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors flex items-center justify-center ${
                activeTab === 'leagues'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Medal className="w-5 h-5 mr-2" />
              Ligas
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-emerald-500"></div>
                <p className="mt-4 text-gray-600">Carregando dados...</p>
              </div>
            ) : activeTab === 'profiles' ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Total de Usuários: {profiles.length}
                  </h2>
                </div>

                {editingProfile ? (
                  <div className="bg-slate-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Editando: {editingProfile.full_name}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          value={formData.full_name || ''}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gênero
                        </label>
                        <select
                          value={formData.gender || ''}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="male">Masculino</option>
                          <option value="female">Feminino</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lado Preferido
                        </label>
                        <select
                          value={formData.preferred_side || ''}
                          onChange={(e) => setFormData({ ...formData, preferred_side: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="left">Esquerda</option>
                          <option value="right">Direita</option>
                          <option value="both">Ambos</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Categoria
                        </label>
                        <input
                          type="text"
                          value={formData.category || ''}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pontos de Ranking
                        </label>
                        <input
                          type="number"
                          value={formData.ranking_points || 0}
                          onChange={(e) => setFormData({ ...formData, ranking_points: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total de Partidas
                        </label>
                        <input
                          type="number"
                          value={formData.total_matches || 0}
                          onChange={(e) => setFormData({ ...formData, total_matches: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total de Vitórias
                        </label>
                        <input
                          type="number"
                          value={formData.total_wins || 0}
                          onChange={(e) => setFormData({ ...formData, total_wins: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.is_admin || false}
                            onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                            className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Administrador
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleSaveProfile}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ranking</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Partidas</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vitórias</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Admin</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{profile.full_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{profile.email}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center">
                              <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
                              {profile.ranking_points}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{profile.total_matches}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{profile.total_wins}</td>
                          <td className="px-4 py-3 text-sm">
                            {profile.is_admin ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                Sim
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                Não
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditProfile(profile)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProfile(profile.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs flex items-center"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'leagues' ? (
              <LeaguesManagement />
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Total de Partidas: {matches.length}
                  </h2>
                </div>

                {editingMatch ? (
                  <div className="bg-slate-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Editando Partida
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={matchFormData.status || ''}
                          onChange={(e) => setMatchFormData({ ...matchFormData, status: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="pending_approval">Aguardando Aprovação</option>
                          <option value="scheduled">Agendada</option>
                          <option value="completed">Concluída</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Local
                        </label>
                        <input
                          type="text"
                          value={matchFormData.location || ''}
                          onChange={(e) => setMatchFormData({ ...matchFormData, location: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data
                        </label>
                        <input
                          type="date"
                          value={matchFormData.match_date || ''}
                          onChange={(e) => setMatchFormData({ ...matchFormData, match_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora
                        </label>
                        <input
                          type="time"
                          value={matchFormData.match_time || ''}
                          onChange={(e) => setMatchFormData({ ...matchFormData, match_time: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Placar Time A
                        </label>
                        <input
                          type="number"
                          value={matchFormData.team_a_score || 0}
                          onChange={(e) => setMatchFormData({ ...matchFormData, team_a_score: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Placar Time B
                        </label>
                        <input
                          type="number"
                          value={matchFormData.team_b_score || 0}
                          onChange={(e) => setMatchFormData({ ...matchFormData, team_b_score: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Vencedor
                        </label>
                        <select
                          value={matchFormData.winner_team || ''}
                          onChange={(e) => setMatchFormData({ ...matchFormData, winner_team: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="">Nenhum</option>
                          <option value="team_a">Time A</option>
                          <option value="team_b">Time B</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleSaveMatch}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </button>
                      <button
                        onClick={handleCancelMatchEdit}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.id} className="bg-slate-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            match.status === 'completed' ? 'bg-green-100 text-green-700' :
                            match.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            match.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {match.status === 'completed' ? 'Concluída' :
                             match.status === 'scheduled' ? 'Agendada' :
                             match.status === 'cancelled' ? 'Cancelada' :
                             'Aguardando Aprovação'}
                          </span>
                          <span className="ml-3 text-sm text-gray-600">
                            {new Date(match.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMatch(match)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center text-sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Time A</h4>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>{match.team_a_player1.full_name}</p>
                            <p>{match.team_a_player2.full_name}</p>
                          </div>
                          {match.team_a_score !== null && (
                            <p className="mt-2 text-lg font-bold text-gray-900">
                              Placar: {match.team_a_score}
                            </p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Time B</h4>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>{match.team_b_player1.full_name}</p>
                            <p>{match.team_b_player2.full_name}</p>
                          </div>
                          {match.team_b_score !== null && (
                            <p className="mt-2 text-lg font-bold text-gray-900">
                              Placar: {match.team_b_score}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
