import { useState } from 'react';
import { X, Calendar, Clock, Crown, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MatchSchedulingModalProps {
  match: any;
  currentUserId: string;
  onClose: () => void;
  onScheduled: () => void;
}

export function MatchSchedulingModal({ match, currentUserId, onClose, onScheduled }: MatchSchedulingModalProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const isCaptain = match.captain_id === currentUserId;

  const handleConfirmSchedule = async () => {
    if (!scheduledDate || !scheduledTime || !location || !isCaptain) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      alert('A data e horário da partida devem ser no futuro');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'scheduled',
          scheduled_time: scheduledDateTime.toISOString(),
          location: location
        })
        .eq('id', match.id);

      if (error) throw error;

      onScheduled();
    } catch (error: any) {
      console.error('Error scheduling match:', error);
      alert('Erro ao agendar partida. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const cancelMatch = async () => {
    if (!isCaptain) return;

    if (!confirm('Tem certeza que deseja cancelar esta partida?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', match.id);

      if (error) throw error;

      onClose();
    } catch (error: any) {
      console.error('Error cancelling match:', error);
      alert('Erro ao cancelar partida. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const commonAvailability = match.common_availability || {};
  const hasAvailability = Object.keys(commonAvailability).length > 0;

  const dayNames: Record<string, string> = {
    segunda: 'Segunda',
    terça: 'Terça',
    quarta: 'Quarta',
    quinta: 'Quinta',
    sexta: 'Sexta',
    sábado: 'Sábado',
    domingo: 'Domingo'
  };

  const dayOrder = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

  const periodNames: Record<string, string> = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite',
    night: 'Noite'
  };

  const getCurrentDayIndex = () => {
    const today = new Date().getDay();
    const dayMap = [6, 0, 1, 2, 3, 4, 5];
    return dayMap[today];
  };

  const sortDaysFromToday = (days: string[]) => {
    const currentDayIndex = getCurrentDayIndex();
    const sortedDays = [...dayOrder];
    return sortedDays
      .slice(currentDayIndex)
      .concat(sortedDays.slice(0, currentDayIndex))
      .filter(day => days.includes(day));
  };

  const sortedAvailabilityDays = sortDaysFromToday(Object.keys(commonAvailability));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agendamento da Partida</h2>
            {isCaptain && (
              <div className="flex items-center gap-2 mt-1 text-amber-600">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-semibold">Você é o capitão</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isCaptain && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    Aguardando Agendamento
                  </p>
                  <p className="text-xs text-blue-700">
                    O capitão está responsável por buscar uma quadra e agendar o horário da partida baseado na disponibilidade dos jogadores.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasAvailability && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start mb-3">
                <Clock className="w-5 h-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    Disponibilidade Comum dos Jogadores
                  </p>
                  <p className="text-xs text-emerald-700">
                    Horários em que todos os 4 jogadores estão disponíveis:
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {sortedAvailabilityDays.map(day => {
                  const periods = commonAvailability[day] as string[];
                  return (
                    <div key={day} className="flex items-start">
                      <span className="text-sm font-medium text-emerald-900 min-w-[80px]">
                        {dayNames[day] || day}:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {periods.map(period => (
                          <span
                            key={period}
                            className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium"
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
          )}

          {isCaptain && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start">
                  <Crown className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">
                      Responsabilidade do Capitão
                    </p>
                    <p className="text-xs text-amber-700">
                      Você deve buscar uma quadra disponível dentro da disponibilidade dos jogadores e agendar o horário da partida. Após agendar, preencha os dados abaixo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Agendar Partida
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local da Partida
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Nome da quadra / clube"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Partida
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário da Partida
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmSchedule}
                    disabled={loading || !scheduledDate || !scheduledTime || !location}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                  </button>
                  <button
                    onClick={cancelMatch}
                    disabled={loading}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar Partida
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
