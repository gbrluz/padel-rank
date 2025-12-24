import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

type Set = {
  team_a: number;
  team_b: number;
};

type ReportMatchResultModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    sets: Set[];
    has_tiebreak: boolean;
    tiebreak_score: { team_a: number; team_b: number } | null;
  }) => void;
  teamANames: string[];
  teamBNames: string[];
  location: string;
  matchDate: string;
  matchTime: string;
};

export default function ReportMatchResultModal({
  isOpen,
  onClose,
  onSubmit,
  teamANames,
  teamBNames,
  location,
  matchDate,
  matchTime
}: ReportMatchResultModalProps) {
  const [sets, setSets] = useState<Set[]>([{ team_a: 0, team_b: 0 }]);
  const [hasTiebreak, setHasTiebreak] = useState(false);
  const [tiebreakScore, setTiebreakScore] = useState({ team_a: 0, team_b: 0 });
  const [error, setError] = useState('');

  const updateTiebreak = (team: 'team_a' | 'team_b', value: string) => {
    if (value === '') {
      setTiebreakScore({ ...tiebreakScore, [team]: 0 });
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numValue = parseInt(value);
    if (numValue < 0) return;

    setTiebreakScore({ ...tiebreakScore, [team]: numValue });
  };

  if (!isOpen) return null;

  const addSet = () => {
    if (sets.length < 3) {
      setSets([...sets, { team_a: 0, team_b: 0 }]);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, team: 'team_a' | 'team_b', value: string) => {
    if (value === '') {
      const newSets = [...sets];
      newSets[index][team] = 0;
      setSets(newSets);
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numValue = parseInt(value);
    if (numValue < 0 || numValue > 9) return;

    const newSets = [...sets];
    newSets[index][team] = numValue;
    setSets(newSets);

    const lastSet = newSets[newSets.length - 1];
    const isTiebreakScore = (lastSet.team_a === 9 && lastSet.team_b === 8) ||
                            (lastSet.team_a === 8 && lastSet.team_b === 9);

    if (isTiebreakScore) {
      setHasTiebreak(true);
    } else {
      setHasTiebreak(false);
      setTiebreakScore({ team_a: 0, team_b: 0 });
    }
  };

  const validateSets = () => {
    const reportedDateTime = new Date(`${matchDate}T${matchTime}`);
    const now = new Date();

    if (reportedDateTime > now) {
      setError('Não é possível reportar resultado de uma partida que ainda não aconteceu');
      return false;
    }

    let teamAWins = 0;
    let teamBWins = 0;

    for (const set of sets) {
      const hasNine = set.team_a === 9 || set.team_b === 9;
      const otherScore = set.team_a === 9 ? set.team_b : set.team_a;

      if (!hasNine) {
        setError('Um time deve ter exatamente 9 games para vencer o set');
        return false;
      }

      if (otherScore > 8) {
        setError('O time perdedor não pode ter mais de 8 games');
        return false;
      }

      if (otherScore < 0) {
        setError('Placar inválido');
        return false;
      }

      if (set.team_a > set.team_b) teamAWins++;
      else if (set.team_b > set.team_a) teamBWins++;
    }

    if (hasTiebreak) {
      if (tiebreakScore.team_a === 0 && tiebreakScore.team_b === 0) {
        setError('Você precisa informar o placar do tiebreak');
        return false;
      }

      const maxScore = Math.max(tiebreakScore.team_a, tiebreakScore.team_b);
      const minScore = Math.min(tiebreakScore.team_a, tiebreakScore.team_b);
      const diff = maxScore - minScore;

      if (maxScore < 7) {
        setError('O vencedor do tiebreak deve ter pelo menos 7 pontos');
        return false;
      }

      if (minScore >= 6 && diff !== 2) {
        setError('Quando o placar está 6 ou mais pontos, é necessário 2 pontos de diferença');
        return false;
      }

      if (tiebreakScore.team_a > tiebreakScore.team_b) teamAWins++;
      else if (tiebreakScore.team_b > tiebreakScore.team_a) teamBWins++;
    }

    if (teamAWins === 0 && teamBWins === 0) {
      setError('Pelo menos um time deve vencer um set');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateSets()) {
      onSubmit({
        sets,
        has_tiebreak: hasTiebreak,
        tiebreak_score: hasTiebreak ? tiebreakScore : null
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setSets([{ team_a: 0, team_b: 0 }]);
    setHasTiebreak(false);
    setTiebreakScore({ team_a: 0, team_b: 0 });
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Reportar Resultado</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Placar dos Sets</h3>
              {sets.length < 3 && (
                <button
                  type="button"
                  onClick={addSet}
                  className="flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Set
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sets.map((set, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700">Set {index + 1}</span>
                    {sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(index)}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Time A ({teamANames[0]} e {teamANames[1]})
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={set.team_a === 0 ? '' : set.team_a}
                        onChange={(e) => updateSet(index, 'team_a', e.target.value)}
                        placeholder="0-9"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-center text-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Time B ({teamBNames[0]} e {teamBNames[1]})
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={set.team_b === 0 ? '' : set.team_b}
                        onChange={(e) => updateSet(index, 'team_b', e.target.value)}
                        placeholder="0-9"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasTiebreak && (
              <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-900 mb-3">Tiebreak (9-8)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-2">
                      Time A
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tiebreakScore.team_a === 0 ? '' : tiebreakScore.team_a}
                      onChange={(e) => updateTiebreak('team_a', e.target.value)}
                      placeholder="0+"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none text-center text-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-2">
                      Time B
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tiebreakScore.team_b === 0 ? '' : tiebreakScore.team_b}
                      onChange={(e) => updateTiebreak('team_b', e.target.value)}
                      placeholder="0+"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none text-center text-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Reportar Resultado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
