import { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Target, Clock, ArrowRight, LogOut } from 'lucide-react';
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
  const { user, refreshProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
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
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data && !error) {
          setFormData({
            full_name: data.full_name || '',
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

    if (!formData.full_name || !formData.gender || !formData.birth_date ||
        !formData.preferred_side || !formData.category || !formData.state || !formData.city) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user!.id)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', user!.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user!.id,
            ...formData
          }]);

        if (insertError) throw insertError;
      }

      await refreshProfile();
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Complete seu Perfil</h2>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gênero *
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

            <div className="grid md:grid-cols-2 gap-6">
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  disabled={loading}
                >
                  <option value="">Selecione</option>
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
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4 mr-2" />
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
