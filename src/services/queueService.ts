import { api } from '../lib/api';
import { QueueEntry } from '../lib/supabase';

export interface JoinQueueData {
  partnerId?: string;
  gender: 'male' | 'female';
  preferredSide?: 'left' | 'right' | 'both';
}

export interface FindMatchData {
  gender: 'male' | 'female';
  partnerId?: string;
  leagueId?: string;
  preferredSide?: 'left' | 'right' | 'both';
}

export const queueService = {
  async getQueueStatus(): Promise<QueueEntry | null> {
    try {
      const { queueEntry } = await api.queue.getStatus();
      return queueEntry;
    } catch {
      return null;
    }
  },

  async joinQueue(data: JoinQueueData): Promise<QueueEntry> {
    const { queueEntry } = await api.queue.join(data);
    return queueEntry;
  },

  async joinSolo(gender: 'male' | 'female', preferredSide?: 'left' | 'right' | 'both'): Promise<QueueEntry> {
    return this.joinQueue({ gender, preferredSide });
  },

  async joinWithPartner(
    partnerId: string,
    gender: 'male' | 'female',
    preferredSide?: 'left' | 'right' | 'both'
  ): Promise<QueueEntry> {
    return this.joinQueue({ partnerId, gender, preferredSide });
  },

  async leaveQueue(): Promise<void> {
    await api.queue.leave();
  },

  async findMatch(data: FindMatchData): Promise<any> {
    return api.queue.findMatch(data);
  },

  async isInQueue(): Promise<boolean> {
    const status = await this.getQueueStatus();
    return status !== null && status.status === 'active';
  },

  isDuo(queueEntry: QueueEntry): boolean {
    return queueEntry.partner_id !== null;
  },

  getQueueType(queueEntry: QueueEntry): 'solo' | 'duo' {
    return this.isDuo(queueEntry) ? 'duo' : 'solo';
  },

  getEstimatedWaitTime(queueEntry: QueueEntry): string {
    const createdAt = new Date(queueEntry.created_at);
    const now = new Date();
    const minutesWaiting = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    if (minutesWaiting < 1) return 'Menos de 1 minuto';
    if (minutesWaiting < 5) return `${minutesWaiting} minutos`;
    if (minutesWaiting < 15) return '5-15 minutos';
    if (minutesWaiting < 30) return '15-30 minutos';
    return 'Mais de 30 minutos';
  },

  validateQueueEntry(data: JoinQueueData, playerRanking: number, partnerRanking?: number): string | null {
    if (!data.gender) {
      return 'Gênero é obrigatório';
    }

    if (data.partnerId && !partnerRanking) {
      return 'Ranking do parceiro não encontrado';
    }

    if (data.partnerId && partnerRanking) {
      const averageRanking = (playerRanking + partnerRanking) / 2;
      const maxDifference = 300;
      const difference = Math.abs(playerRanking - partnerRanking);

      if (difference > maxDifference) {
        return `Diferença de ranking muito grande. Máximo permitido: ${maxDifference} pontos`;
      }
    }

    return null;
  },

  getMatchmakingRange(averageRanking: number): { min: number; max: number } {
    const baseRange = 200;
    const min = Math.max(0, averageRanking - baseRange);
    const max = averageRanking + baseRange;

    return { min, max };
  },

  formatQueueTime(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },
};
