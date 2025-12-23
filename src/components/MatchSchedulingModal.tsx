import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MessageSquare, CheckCircle, Crown, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MatchSchedulingModalProps {
  match: any;
  currentUserId: string;
  onClose: () => void;
  onScheduled: () => void;
}

export function MatchSchedulingModal({ match, currentUserId, onClose, onScheduled }: MatchSchedulingModalProps) {
  const [timeProposals, setTimeProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [chatMessages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);

  const isCaptain = match.captain_id === currentUserId;
  const playerIds = [
    match.team_a_player1_id,
    match.team_a_player2_id,
    match.team_b_player1_id,
    match.team_b_player2_id
  ];

  useEffect(() => {
    loadSchedulingData();
    const channel = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_time_votes', filter: `match_id=eq.${match.id}` }, loadSchedulingData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_chat_messages', filter: `match_id=eq.${match.id}` }, loadChatMessages)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  const loadSchedulingData = async () => {
    const [proposalsRes, votesRes] = await Promise.all([
      supabase.from('match_time_proposals').select('*').eq('match_id', match.id).order('proposal_order'),
      supabase.from('match_time_votes').select('*, player:player_id(full_name)').eq('match_id', match.id)
    ]);

    if (proposalsRes.data) setTimeProposals(proposalsRes.data);
    if (votesRes.data) {
      setVotes(votesRes.data);
      checkConsensus(proposalsRes.data || [], votesRes.data);
    }
  };

  const loadChatMessages = async () => {
    const { data } = await supabase
      .from('match_chat_messages')
      .select('*, player:player_id(full_name)')
      .eq('match_id', match.id)
      .order('created_at');

    if (data) setMessages(data);
  };

  const checkConsensus = (proposals: any[], currentVotes: any[]) => {
    if (currentVotes.length === 4) {
      const voteCounts = proposals.map(p => ({
        id: p.id,
        count: currentVotes.filter(v => v.proposal_id === p.id).length
      }));

      const consensus = voteCounts.find(vc => vc.count === 4);
      if (consensus) {
        const consensusProposal = proposals.find(p => p.id === consensus.id);
        confirmSchedule(consensusProposal.proposed_time);
      } else {
        setShowNegotiation(true);
        loadChatMessages();
      }
    }
  };

  const handleVote = async (proposalId: string) => {
    setLoading(true);
    const myVote = votes.find(v => v.player_id === currentUserId);

    if (myVote) {
      await supabase
        .from('match_time_votes')
        .update({ proposal_id: proposalId })
        .eq('id', myVote.id);
    } else {
      await supabase
        .from('match_time_votes')
        .insert({ match_id: match.id, player_id: currentUserId, proposal_id: proposalId });
    }

    setSelectedProposal(proposalId);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase
      .from('match_chat_messages')
      .insert({ match_id: match.id, player_id: currentUserId, message: newMessage });

    setNewMessage('');
  };

  const confirmSchedule = async (scheduledTime: string) => {
    await supabase
      .from('matches')
      .update({ status: 'scheduled', scheduled_time: scheduledTime })
      .eq('id', match.id);

    onScheduled();
  };

  const handleManualConfirm = async () => {
    if (!manualTime || !isCaptain) return;
    setLoading(true);
    await confirmSchedule(new Date(manualTime).toISOString());
    setLoading(false);
  };

  const cancelMatch = async () => {
    if (!isCaptain) return;
    setLoading(true);

    await supabase
      .from('matches')
      .update({ status: 'cancelled' })
      .eq('id', match.id);

    setLoading(false);
    onClose();
  };

  const myVote = votes.find(v => v.player_id === currentUserId);
  const deadline = new Date(match.negotiation_deadline);
  const isExpired = deadline < new Date();

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

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-900 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Prazo para definição:</span>
              <span>{deadline.toLocaleString('pt-BR')}</span>
            </div>
            {isExpired && (
              <p className="text-red-600 text-sm">O prazo expirou. O capitão deve confirmar um horário ou cancelar a partida.</p>
            )}
          </div>

          {!showNegotiation ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Escolha um horário:
              </h3>

              {timeProposals.map((proposal) => {
                const proposalVotes = votes.filter(v => v.proposal_id === proposal.id);
                const isMyVote = myVote?.proposal_id === proposal.id;

                return (
                  <div
                    key={proposal.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isMyVote
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                    onClick={() => !loading && handleVote(proposal.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          Opção {proposal.proposal_order}
                        </p>
                        <p className="text-gray-600">
                          {new Date(proposal.proposed_time).toLocaleString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">{proposalVotes.length}/4</span>
                        </div>
                        {isMyVote && (
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        )}
                      </div>
                    </div>
                    {proposalVotes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {proposalVotes.map(vote => (
                          <span key={vote.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {vote.player?.full_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-900 font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Não houve consenso. Use o chat para negociar um horário.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h4 className="font-semibold text-gray-900">Chat de Negociação</h4>
                </div>
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.player_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg p-3 ${
                          msg.player_id === currentUserId
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1">{msg.player?.full_name}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCaptain && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Ações do Capitão
              </h3>

              <div className="flex gap-3">
                <input
                  type="datetime-local"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleManualConfirm}
                  disabled={!manualTime || loading}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  Confirmar Horário
                </button>
              </div>

              <button
                onClick={cancelMatch}
                disabled={loading}
                className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Cancelar Partida
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
