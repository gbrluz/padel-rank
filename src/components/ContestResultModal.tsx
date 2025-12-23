import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContestResultModalProps {
  match: any;
  currentUserId: string;
  onClose: () => void;
  onContested: () => void;
}

export function ContestResultModal({ match, currentUserId, onClose, onContested }: ContestResultModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Por favor, informe o motivo da contestação');
      return;
    }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase
      .from('match_result_contestations')
      .insert({
        match_id: match.id,
        contested_by: currentUserId,
        reason: reason.trim()
      });

    if (insertError) {
      setError('Erro ao registrar contestação: ' + insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onContested();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-gray-900">Contestar Resultado</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              Você está prestes a contestar o resultado desta partida. Um administrador será notificado
              e irá revisar a situação.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Motivo da Contestação *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da contestação..."
              rows={6}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Contestar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
