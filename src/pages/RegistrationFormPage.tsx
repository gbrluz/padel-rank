import { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Target, Clock, ArrowRight, LogOut, Phone } from 'lucide-react';
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

export default function RegistrationFormPage() {
  const { user, refreshPlayer, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    gender: '',
    birth_date: '',
    preferred_side: '',
    category: '',
    state: '',
    city: '',
    availability: {} as Record<string, string[]>
  });

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data && !error) {
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            gender: data.gender || '',
            birth_date: data.birth_date || '',
            preferred_side: data.preferred_side || '',
            category: data.category || '',
            state: data.state || '',
            city: data.city || '',
            availability: data.availability || {}
          });
        }
      }
    };

    loadExistingProfile();
  }, [user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name || !formData.phone || !formData.gender || !formData.birth_date ||
        !formData.preferred_side || !formData.category || !formData.state || !formData.city) {
      setError('Por favor, preencha todos os campos obrigatorios');
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Telefone invalido. Use o formato (XX) XXXXX-XXXX');
      return;
    }

    setLoading(true);

    try {
      const { data: existingProfile } = await supabase
        .from('players')
        .select('id, ranking_points, total_matches')
        .eq('id', user!.id)
        .maybeSingle();

      console.log('RegistrationForm - Perfil existente:', existingProfile);

      const { data: initialPoints } = await supabase.rpc('get_initial_points_for_category', {
        category_name: formData.category
      });

      console.log('RegistrationForm - Pontos iniciais:', initialPoints);

      if (existingProfile) {
        const updateData: any = { ...formData };

        if (existingProfile.total_matches === 0 || !existingProfile.ranking_points) {
          updateData.ranking_points = initialPoints || 100;
          updateData.is_provisional = true;
          updateData.provisional_games_played = 0;
          updateData.can_join_leagues = false;
        }

        console.log('RegistrationForm - Atualizando perfil com:', updateData);

        const { error: updateError } = await supabase
          .from('players')
          .update(updateData)
          .eq('id', user!.id);

        if (updateError) {
          console.error('RegistrationForm - Erro ao atualizar:', updateError);
          throw updateError;
        }

        console.log('RegistrationForm - Perfil atualizado com sucesso');
      } else {
        console.log('RegistrationForm - Inserindo novo perfil');

        const { error: insertError } = await supabase
          .from('players')
          .insert([{
            id: user!.id,
            ...formData,
            ranking_points: initialPoints || 100,
            is_provisional: true,
            provisional_games_played: 0,
            can_join_leagues: false
          }]);

        if (insertError) {
          console.error('RegistrationForm - Erro ao inserir:', insertError);
          throw insertError;
        }

        console.log('RegistrationForm - Perfil inserido com sucesso');
      }

      console.log('RegistrationForm - Chamando refreshPlayer...');
      await refreshPlayer();
      console.log('RegistrationForm - refreshPlayer concluído');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-4 md:py-8 px-4 overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-5 md:p-10">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900">Complete seu Perfil</h2>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium hidden md:inline">Sair</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="Seu nome completo"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 mr-2" />
                  Telefone com DDD *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    if (value.length > 0) {
                      if (value.length <= 2) {
                        value = `(${value}`;
                      } else if (value.length <= 7) {
                        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                      } else {
                        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                      }
                    }
                    setFormData({ ...formData, phone: value });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="(XX) XXXXX-XXXX"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Genero *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2" />
                Lado de Preferência *
              </label>
              <select
                value={formData.preferred_side}
                onChange={(e) => setFormData({ ...formData, preferred_side: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                disabled={loading}
              >
                <option value="">Selecione</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
                <option value="both">Ambos</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Target className="w-4 h-4 mr-2" />
                Categoria Inicial *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                disabled={loading}
              >
                <option value="">Selecione sua categoria</option>
                <option value="Iniciante">Iniciante (100 pontos)</option>
                <option value="7ª">7ª Categoria (300 pontos)</option>
                <option value="6ª">6ª Categoria (500 pontos)</option>
                <option value="5ª">5ª Categoria (700 pontos)</option>
                <option value="4ª">4ª Categoria (900 pontos)</option>
                <option value="3ª">3ª Categoria (1100 pontos)</option>
                <option value="2ª">2ª Categoria (1300 pontos)</option>
                <option value="1ª">1ª Categoria (1500 pontos)</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Você começará com pontos provisórios no meio da categoria selecionada. Seus primeiros 5 jogos terão impacto maior no ranking para ajustar sua posição real.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Estado *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {states.map(state => (
                    <option key={state.id} value={state.nome}>{state.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cidade *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  disabled={loading || !formData.state}
                >
                  <option value="">Selecione</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.nome}>{city.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4 mr-2" />
                  Disponibilidade Semanal
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllAvailability}
                    className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium"
                    disabled={loading}
                  >
                    Selecionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={clearAllAvailability}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    disabled={loading}
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mb-3 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => selectAllPeriod('morning')}
                  className="text-xs px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                  disabled={loading}
                >
                  Todas Manhas
                </button>
                <button
                  type="button"
                  onClick={() => selectAllPeriod('afternoon')}
                  className="text-xs px-2 md:px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
                  disabled={loading}
                >
                  Todas Tardes
                </button>
                <button
                  type="button"
                  onClick={() => selectAllPeriod('evening')}
                  className="text-xs px-2 md:px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  disabled={loading}
                >
                  Todas Noites
                </button>
              </div>
              <div className="space-y-2 md:space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-2 md:gap-3">
                    <div className="w-16 md:w-24 text-xs md:text-sm font-medium text-gray-700">{day.substring(0, 3)}<span className="hidden md:inline">{day.substring(3)}</span></div>
                    <div className="flex gap-1.5 md:gap-2 flex-1">
                      {PERIODS.map((period) => {
                        const isSelected = (formData.availability[day.toLowerCase()] || []).includes(period);
                        return (
                          <button
                            key={period}
                            type="button"
                            onClick={() => toggleAvailability(day, period)}
                            className={`flex-1 py-2 md:py-2 px-1 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            disabled={loading}
                          >
                            <span className="md:hidden">{PERIOD_LABELS[period].substring(0, 1)}</span>
                            <span className="hidden md:inline">{PERIOD_LABELS[period]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              {loading ? 'Salvando...' : (
                <>
                  Começar a Jogar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
