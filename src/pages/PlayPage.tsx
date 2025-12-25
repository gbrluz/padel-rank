import { useState, useEffect } from 'react';
import { PlayCircle, Users, User, AlertCircle, CheckCircle, UserPlus, X, Check, Clock, Loader, Search } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PlayPageProps = {
  onNavigate?: (page: string) => void;
};

type QueuePlayer = {
  player_id: string;
  partner_id: string | null;
  gender: string;
  average_ranking: number;
  created_at: string;
  profile: Profile;
  partner_profile?: Profile;
};

type DuoInvitation = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  sender_profile?: Profile;
  receiver_profile?: Profile;
};

type Notification = {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
};

export default function PlayPage({ onNavigate }: PlayPageProps) {
  const { profile } = useAuth();
  const [inQueue, setInQueue] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<DuoInvitation[]>([]);
  const [sentInvitation, setSentInvitation] = useState<DuoInvitation | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const filteredPlayers = searchTerm.trim() === ''
    ? []
    : availablePlayers.filter(player =>
        player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleSelectPlayer = (playerId: string, playerName: string) => {
    setSelectedPartner(playerId);
    setSearchTerm(playerName);
    setShowDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(value.trim() !== '');
    if (value.trim() === '') {
      setSelectedPartner('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.autocomplete-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    checkQueueStatus();
    loadAvailablePlayers();
    loadQueuePlayers();
    loadInvitations();

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

    const queueChannel = supabase
      .channel('all-queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries'
        },
        () => {
          loadQueuePlayers();
        }
      )
      .subscribe();

    const invitationsChannel = supabase
      .channel('invitations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duo_invitations',
          filter: `receiver_id=eq.${profile?.id}`
        },
        () => {
          loadInvitations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duo_invitations',
          filter: `sender_id=eq.${profile?.id}`
        },
        () => {
          loadInvitations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      matchChannel.unsubscribe();
      queueChannel.unsubscribe();
      invitationsChannel.unsubscribe();
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

  const loadQueuePlayers = async () => {
    if (!profile) return;

    const { data: queueEntries } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('status', 'active')
      .order('created_at');

    if (!queueEntries) {
      setQueuePlayers([]);
      return;
    }

    const playerIds = queueEntries.map(entry => entry.player_id);
    const partnerIds = queueEntries
      .filter(entry => entry.partner_id)
      .map(entry => entry.partner_id as string);
    const allIds = [...new Set([...playerIds, ...partnerIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allIds);

    if (!profiles) {
      setQueuePlayers([]);
      return;
    }

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const processedEntries = new Set<string>();
    const queuePlayersData: QueuePlayer[] = [];

    queueEntries.forEach(entry => {
      if (processedEntries.has(entry.player_id)) return;

      const playerProfile = profileMap.get(entry.player_id);
      if (!playerProfile) return;

      const queuePlayer: QueuePlayer = {
        player_id: entry.player_id,
        partner_id: entry.partner_id,
        gender: entry.gender,
        average_ranking: entry.average_ranking,
        created_at: entry.created_at,
        profile: playerProfile,
      };

      if (entry.partner_id) {
        const partnerProfile = profileMap.get(entry.partner_id);
        if (partnerProfile) {
          queuePlayer.partner_profile = partnerProfile;
        }
        processedEntries.add(entry.player_id);
        processedEntries.add(entry.partner_id);
      } else {
        processedEntries.add(entry.player_id);
      }

      queuePlayersData.push(queuePlayer);
    });

    setQueuePlayers(queuePlayersData);
  };

  const loadInvitations = async () => {
    if (!profile) return;

    const { data: receivedInvites } = await supabase
      .from('duo_invitations')
      .select('*')
      .eq('receiver_id', profile.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    const { data: sentInvite } = await supabase
      .from('duo_invitations')
      .select('*')
      .eq('sender_id', profile.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (receivedInvites && receivedInvites.length > 0) {
      const allUserIds = receivedInvites.map(inv => inv.sender_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const invitesWithProfiles = receivedInvites.map(inv => ({
        ...inv,
        sender_profile: profileMap.get(inv.sender_id)
      }));

      setPendingInvitations(invitesWithProfiles);
    } else {
      setPendingInvitations([]);
    }

    if (sentInvite) {
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sentInvite.receiver_id)
        .maybeSingle();

      setSentInvitation({
        ...sentInvite,
        receiver_profile: receiverProfile || undefined
      });
    } else {
      setSentInvitation(null);
    }
  };

  const sendDuoInvitation = async () => {
    if (!profile || !selectedPartner) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('duo_invitations')
        .insert([{
          sender_id: profile.id,
          receiver_id: selectedPartner,
          status: 'pending'
        }]);

      if (error) throw error;

      await loadInvitations();
      showNotification('Convite enviado! Aguarde a resposta do seu parceiro.', 'success');
    } catch (error) {
      console.error('Error sending invitation:', error);
      showNotification('Erro ao enviar convite. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async () => {
    if (!sentInvitation) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('duo_invitations')
        .update({ status: 'cancelled' })
        .eq('id', sentInvitation.id);

      if (error) throw error;

      await loadInvitations();
      setSelectedPartner(null);
    } catch (error) {
      console.error('Error canceling invitation:', error);
      showNotification('Erro ao cancelar convite.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string, senderId: string) => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('duo_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', senderId)
        .maybeSingle();

      if (!senderProfile) throw new Error('Sender profile not found');

      const averageRanking = Math.floor((profile.ranking_points + senderProfile.ranking_points) / 2);

      const { error: queueError } = await supabase
        .from('queue_entries')
        .insert([
          {
            player_id: profile.id,
            partner_id: senderId,
            gender: profile.gender,
            average_ranking: averageRanking,
            status: 'active',
            preferred_side: profile.preferred_side
          },
          {
            player_id: senderId,
            partner_id: profile.id,
            gender: senderProfile.gender,
            average_ranking: averageRanking,
            status: 'active',
            preferred_side: senderProfile.preferred_side
          }
        ]);

      if (queueError) throw queueError;

      await loadInvitations();
      await checkQueueStatus();
      await loadQueuePlayers();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      fetch(`${supabaseUrl}/functions/v1/find-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Error calling find-match:', err));

      showNotification('Convite aceito! Você e seu parceiro entraram na fila.', 'success');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showNotification('Erro ao aceitar convite. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const rejectInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('duo_invitations')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (error) throw error;

      await loadInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showNotification('Erro ao rejeitar convite.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const joinQueue = async () => {
    if (!profile) return;

    if (selectedPartner) {
      await sendDuoInvitation();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('queue_entries')
        .insert([{
          player_id: profile.id,
          partner_id: null,
          gender: profile.gender,
          average_ranking: profile.ranking_points,
          status: 'active',
          preferred_side: profile.preferred_side
        }]);

      if (error) throw error;

      setInQueue(true);
      await checkQueueStatus();
      await loadQueuePlayers();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      fetch(`${supabaseUrl}/functions/v1/find-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Error calling find-match:', err));

    } catch (error) {
      console.error('Error joining queue:', error);
      showNotification('Erro ao entrar na fila. Tente novamente.', 'error');
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
      await loadQueuePlayers();
    } catch (error) {
      console.error('Error leaving queue:', error);
      showNotification('Erro ao sair da fila. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };


  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-8 px-4 overflow-x-hidden">
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-xl shadow-lg transform transition-all duration-300 animate-slide-in ${
              notification.type === 'success'
                ? 'bg-emerald-500 text-white'
                : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-start">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
              {notification.type === 'info' && <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start">
            <PlayCircle className="w-8 h-8 mr-3 text-emerald-600" />
            Jogar
          </h1>
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

        {pendingInvitations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <UserPlus className="w-7 h-7 mr-3 text-emerald-600" />
              Convites Recebidos
            </h2>
            <div className="space-y-4">
              {pendingInvitations.map(invitation => (
                <div key={invitation.id} className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <Users className="w-6 h-6 text-emerald-600 mr-3" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {invitation.sender_profile?.full_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {invitation.sender_profile?.ranking_points} pts • {invitation.sender_profile?.category}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Expira em {Math.max(0, Math.floor((new Date(invitation.expires_at).getTime() - Date.now()) / 60000))} min
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptInvitation(invitation.id, invitation.sender_id)}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aceitar
                      </button>
                      <button
                        onClick={() => rejectInvitation(invitation.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Recusar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sentInvitation && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Clock className="w-7 h-7 mr-3 text-blue-600" />
              Convite Enviado
            </h2>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Users className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Aguardando resposta de {sentInvitation.receiver_profile?.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {sentInvitation.receiver_profile?.ranking_points} pts • {sentInvitation.receiver_profile?.category}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      Expira em {Math.max(0, Math.floor((new Date(sentInvitation.expires_at).getTime() - Date.now()) / 60000))} min
                    </div>
                  </div>
                </div>
                <button
                  onClick={cancelInvitation}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
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
                  onClick={() => {
                    setSelectedPartner(null);
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
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
                  onClick={() => {
                    setSelectedPartner('');
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
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
                <div className="mb-6 relative autocomplete-container">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Escolha seu Parceiro
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => {
                        if (searchTerm.trim() !== '') {
                          setShowDropdown(true);
                        }
                      }}
                      placeholder="Digite o nome do parceiro..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>

                  {showDropdown && filteredPlayers.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredPlayers.map(player => (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPlayer(player.id, player.full_name)}
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900">{player.full_name}</div>
                          <div className="text-sm text-gray-600">
                            {player.ranking_points} pts • {player.category}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showDropdown && searchTerm.trim() !== '' && filteredPlayers.length === 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4">
                      <p className="text-gray-600 text-center">Nenhum parceiro encontrado</p>
                    </div>
                  )}
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

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-7 h-7 mr-3 text-emerald-600" />
              Jogadores na Fila
            </h2>
            {queuePlayers.length >= 4 && (
              <p className="text-sm text-emerald-600 mt-2">
                O sistema está buscando automaticamente partidas equilibradas
              </p>
            )}
          </div>

          {queuePlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum jogador na fila no momento</p>
            </div>
          ) : (
            <div className="space-y-6">
              {['male', 'female'].map(gender => {
                const genderPlayers = queuePlayers.filter(qp => qp.gender === gender);
                if (genderPlayers.length === 0) return null;

                return (
                  <div key={gender}>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                      }`}></span>
                      {gender === 'male' ? 'Masculino' : 'Feminino'}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({genderPlayers.length} {genderPlayers.length === 1 ? 'jogador' : 'jogadores'})
                      </span>
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      {genderPlayers.map(queuePlayer => (
                        <div
                          key={queuePlayer.player_id}
                          className={`p-4 rounded-xl border-2 ${
                            queuePlayer.player_id === profile?.id
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {queuePlayer.partner_id && queuePlayer.partner_profile ? (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <Users className="w-5 h-5 text-emerald-600 mr-2" />
                                  <span className="font-semibold text-gray-900">Dupla</span>
                                </div>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                  -20% pts
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-700">
                                    {queuePlayer.profile.full_name}
                                  </span>
                                  <span className="text-xs font-bold text-gray-600">
                                    {queuePlayer.profile.ranking_points} pts
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-700">
                                    {queuePlayer.partner_profile.full_name}
                                  </span>
                                  <span className="text-xs font-bold text-gray-600">
                                    {queuePlayer.partner_profile.ranking_points} pts
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-gray-300">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Media da Dupla:</span>
                                    <span className="text-sm font-bold text-emerald-700">
                                      {queuePlayer.average_ranking} pts
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <User className="w-5 h-5 text-emerald-600 mr-2" />
                                  <span className="font-semibold text-gray-900">Solo</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">
                                  {queuePlayer.profile.full_name}
                                </span>
                                <span className="text-sm font-bold text-emerald-700">
                                  {queuePlayer.profile.ranking_points} pts
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Categoria: {queuePlayer.profile.category}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
