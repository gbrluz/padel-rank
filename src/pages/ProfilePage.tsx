import { useState, useEffect } from 'react';
import { User, Trophy, Calendar, Award, LogOut, MapPin, Target, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type State = {
  id: number;
  sigla: string;
  nome: string;
};

type City = {
  id: number;
  nome: string;
};

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const PERIODS = ['morning', 'afternoon', 'evening'];
const PERIOD_LABELS: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite'
};

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    preferred_side: '',
    category: '',
    state: '',
    city: '',
    availability: {} as Record<string, string[]>
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        preferred_side: profile.preferred_side,
        category: profile.category,
        state: profile.state,
        city: profile.city,
        availability: profile.availability
      });
    }
  }, [profile]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setStates(data))
      .catch(() => setError('Erro ao carregar estados'));
  }, []);

  useEffect(() => {
    if (formData.state) {
      const state = states.find(s => s.nome === formData.state);
      if (state) {
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.sigla}/municipios?orderBy=nome`)
          .then(res => res.json())
          .then(data => setCities(data))
          .catch(() => setError('Erro ao carregar cidades'));
      }
    }
  }, [formData.state, states]);

  const toggleAvailability = (day: string, period: string) => {
    const dayKey = day.toLowerCase();
    const currentPeriods = formData.availability[dayKey] || [];

    if (currentPeriods.includes(period)) {
      setFormData({
        ...formData,
        availability: {
          ...formData.availability,
          [dayKey]: currentPeriods.filter(p => p !== period)
        }
      });
    } else {
      setFormData({
        ...formData,
        availability: {
          ...formData.availability,
          [dayKey]: [...currentPeriods, period]
        }
      });
    }
  };

  const selectAllAvailability = () => {
    const allAvailability: Record<string, string[]> = {};
    DAYS.forEach(day => {
      allAvailability[day.toLowerCase()] = [...PERIODS];
    });
    setFormData({ ...formData, availability: allAvailability });
  };

  const clearAllAvailability = () => {
    setFormData({ ...formData, availability: {} });
  };

  const selectAllPeriod = (period: string) => {
    const newAvailability = { ...formData.availability };
    DAYS.forEach(day => {
      const dayKey = day.toLowerCase();
      const currentPeriods = newAvailability[dayKey] || [];
      if (!currentPeriods.includes(period)) {
        newAvailability[dayKey] = [...currentPeriods, period];
      }
    });
    setFormData({ ...formData, availability: newAvailability });
  };

  const handleSave = async () => {
    if (!profile) return;

    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          preferred_side: formData.preferred_side,
          category: formData.category,
          state: formData.state,
          city: formData.city,
          availability: formData.availability
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        preferred_side: profile.preferred_side,
        category: profile.category,
        state: profile.state,
        city: profile.city,
        availability: profile.availability
      });
    }
    setIsEditing(false);
    setError('');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <User className="w-8 h-8 mr-3 text-emerald-600" />
              Meu Perfil
            </h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-32"></div>
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6">
              <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-emerald-600" />
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    disabled={loading}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Lado de Preferência
                    </label>
                    <select
                      value={formData.preferred_side}
                      onChange={(e) => setFormData({ ...formData, preferred_side: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      disabled={loading}
                    >
                      <option value="left">Esquerda</option>
                      <option value="right">Direita</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      disabled={loading}
                    >
                      <option value="Iniciante">Iniciante</option>
                      <option value="1ª">1ª</option>
                      <option value="2ª">2ª</option>
                      <option value="3ª">3ª</option>
                      <option value="4ª">4ª</option>
                      <option value="5ª">5ª</option>
                      <option value="6ª">6ª</option>
                      <option value="7ª">7ª</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      disabled={loading}
                    >
                      {states.map(state => (
                        <option key={state.id} value={state.nome}>{state.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cidade
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      disabled={loading}
                    >
                      {cities.map(city => (
                        <option key={city.id} value={city.nome}>{city.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700">
                      Disponibilidade Semanal
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllAvailability}
                        className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium"
                        disabled={loading}
                      >
                        Selecionar Todos
                      </button>
                      <button
                        type="button"
                        onClick={clearAllAvailability}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                        disabled={loading}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3 justify-end">
                    <button
                      type="button"
                      onClick={() => selectAllPeriod('morning')}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                      disabled={loading}
                    >
                      Todas Manhãs
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllPeriod('afternoon')}
                      className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
                      disabled={loading}
                    >
                      Todas Tardes
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllPeriod('evening')}
                      className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                      disabled={loading}
                    >
                      Todas Noites
                    </button>
                  </div>
                  <div className="space-y-3">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-3">
                        <div className="w-24 text-sm font-medium text-gray-700">{day}</div>
                        <div className="flex gap-2 flex-1">
                          {PERIODS.map((period) => {
                            const isSelected = (formData.availability[day.toLowerCase()] || []).includes(period);
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => toggleAvailability(day, period)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                disabled={loading}
                              >
                                {PERIOD_LABELS[period]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.full_name}</h2>
                  <p className="text-gray-600">{profile.category}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Trophy className="w-5 h-5 text-emerald-600 mr-2" />
                      <span className="text-xs md:text-sm text-gray-600">Pontuação</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.ranking_points}</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-xs md:text-sm text-gray-600">Partidas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.total_matches}</p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Award className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-xs md:text-sm text-gray-600">Vitórias</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.total_wins}</p>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Trophy className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-xs md:text-sm text-gray-600">Taxa</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.win_rate}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Informações Pessoais</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Gênero</p>
                        <p className="font-medium text-gray-900">
                          {profile.gender === 'male' ? 'Masculino' : 'Feminino'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Data de Nascimento</p>
                        <p className="font-medium text-gray-900">
                          {new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-emerald-600" />
                      Preferências de Jogo
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Lado de Preferência</p>
                        <p className="font-medium text-gray-900">
                          {profile.preferred_side === 'left' ? 'Esquerda' :
                           profile.preferred_side === 'right' ? 'Direita' : 'Ambos'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Categoria</p>
                        <p className="font-medium text-gray-900">{profile.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                      Localização
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Estado</p>
                        <p className="font-medium text-gray-900">{profile.state}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Cidade</p>
                        <p className="font-medium text-gray-900">{profile.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Disponibilidade</h3>
                    <div className="space-y-2">
                      {Object.entries(profile.availability || {}).map(([day, periods]) => {
                        if ((periods as string[]).length === 0) return null;
                        const dayNames: Record<string, string> = {
                          segunda: 'Segunda',
                          terça: 'Terça',
                          quarta: 'Quarta',
                          quinta: 'Quinta',
                          sexta: 'Sexta',
                          sábado: 'Sábado',
                          domingo: 'Domingo'
                        };
                        const periodNames: Record<string, string> = {
                          morning: 'Manhã',
                          afternoon: 'Tarde',
                          evening: 'Noite'
                        };
                        return (
                          <div key={day} className="flex items-center">
                            <span className="w-24 text-sm font-medium text-gray-700">
                              {dayNames[day] || day}:
                            </span>
                            <div className="flex gap-2">
                              {(periods as string[]).map(period => (
                                <span
                                  key={period}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm"
                                >
                                  {periodNames[period] || period}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={handleSignOut}
            className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </button>
        )}
      </div>
    </div>
  );
}
