import { useState, useEffect } from 'react';
import { PlayCircle, Users, User, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PlayPageProps = {
  onNavigate?: (page: string) => void;
};

export default function PlayPage({ onNavigate }: PlayPageProps) {
  const { profile } = useAuth();
  const [inQueue, setInQueue] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    checkQueueStatus();
    loadAvailablePlayers();

    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `player_id=eq.${profile?.id}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).status === 'matched') {
            setMatchFound(true);
            setInQueue(false);
          }
        }
      )
      .subscribe();

    const matchChannel = supabase
      .channel('match-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_approvals',
          filter: `player_id=eq.${profile?.id}`
        },
        () => {
          setMatchFound(true);
          setInQueue(false);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      matchChannel.unsubscribe();
    };
  }, [profile]);

  const checkQueueStatus = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('player_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      setInQueue(true);
      setQueueEntry(data);
      if (data.partner_id) {
        setSelectedPartner(data.partner_id);
      }
    }
  };

  const loadAvailablePlayers = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('gender', profile.gender)
      .neq('id', profile.id)
      .order('full_name');

    setAvailablePlayers(data || []);
  };

  const joinQueue = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const averageRanking = selectedPartner
        ? Math.floor((profile.ranking_points + (availablePlayers.find(p => p.id === selectedPartner)?.ranking_points || 0)) / 2)
        : profile.ranking_points;

      const { error } = await supabase
        .from('queue_entries')
        .insert([{
          player_id: profile.id,
          partner_id: selectedPartner,
          gender: profile.gender,
          average_ranking: averageRanking,
          status: 'active'
        }]);

      if (error) throw error;

      setInQueue(true);
      checkQueueStatus();
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Erro ao entrar na fila. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const leaveQueue = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('player_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;

      setInQueue(false);
      setQueueEntry(null);
      setSelectedPartner(null);
    } catch (error) {
      console.error('Error leaving queue:', error);
      alert('Erro ao sair da fila. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <PlayCircle className="w-8 h-8 mr-3 text-emerald-600" />
            Jogar
          </h1>
          <p className="text-gray-600">Entre na fila e encontre adversários do seu nível</p>
        </div>

        {matchFound && (
          <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-6 mb-6 animate-pulse">
            <div className="flex items-start">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-2">Partida Encontrada!</h3>
                <p className="text-green-800 mb-4">
                  Uma partida foi encontrada para você! Vá até a aba <strong>Partidas</strong> para aprovar e ver os detalhes.
                </p>
                <button
                  onClick={() => {
                    setMatchFound(false);
                    if (onNavigate) {
                      onNavigate('matches');
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  Ver Partidas
                </button>
              </div>
            </div>
          </div>
        )}

        {inQueue ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
                <Loader className="w-10 h-10 text-emerald-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Você está na fila!</h2>
              <p className="text-gray-600">
                Estamos procurando adversários compatíveis com seu nível
              </p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sua Pontuação</p>
                  <p className="text-2xl font-bold text-gray-900">{profile.ranking_points}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Modo</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedPartner ? 'Dupla' : 'Solo'}
                  </p>
                </div>
              </div>
            </div>

            {selectedPartner && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      Penalidade de Dupla Ativa
                    </p>
                    <p className="text-sm text-yellow-700">
                      Duplas formadas previamente ganham 20% menos pontos em vitórias
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Como funciona?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">1.</span>
                  <span>O sistema busca 4 jogadores de nível similar</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">2.</span>
                  <span>Considera disponibilidade e lado de preferência</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">3.</span>
                  <span>Todos os jogadores recebem notificação</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">4.</span>
                  <span>Partida agendada se aprovada em até 24 horas</span>
                </li>
              </ul>
            </div>

            <button
              onClick={leaveQueue}
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saindo...' : 'Sair da Fila'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Escolha seu Modo</h2>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSelectedPartner(null)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedPartner === null
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Jogar Solo</h3>
                  <p className="text-sm text-gray-600">
                    Entre sozinho e seja pareado com outro jogador
                  </p>
                </button>

                <button
                  onClick={() => setSelectedPartner('')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedPartner !== null
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Jogar em Dupla</h3>
                  <p className="text-sm text-gray-600">
                    Escolha seu parceiro e joguem juntos
                  </p>
                </button>
              </div>

              {selectedPartner !== null && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Escolha seu Parceiro
                  </label>
                  <select
                    value={selectedPartner || ''}
                    onChange={(e) => setSelectedPartner(e.target.value || null)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione um parceiro</option>
                    {availablePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.full_name} - {player.ranking_points} pts
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPartner !== null && selectedPartner !== '' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        Atenção: Penalidade de Dupla
                      </p>
                      <p className="text-sm text-yellow-700">
                        Ao entrar como dupla, você e seu parceiro ganharão 20% menos pontos em vitórias
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-emerald-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Suas Informações</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Pontuação</p>
                  <p className="font-bold text-gray-900">{profile.ranking_points}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Lado Preferido</p>
                  <p className="font-bold text-gray-900">
                    {profile.preferred_side === 'left' ? 'Esquerda' :
                     profile.preferred_side === 'right' ? 'Direita' : 'Ambos'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Categoria</p>
                  <p className="font-bold text-gray-900">{profile.category}</p>
                </div>
              </div>
            </div>

            <button
              onClick={joinQueue}
              disabled={loading || (selectedPartner !== null && !selectedPartner)}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Entrando na fila...' : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Entrar na Fila
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
