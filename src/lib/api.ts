import { supabase } from './supabase';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Player API
export const playerAPI = {
  async get(id?: string) {
    const endpoint = id ? `/players/${id}` : '/players';
    return fetchAPI(endpoint);
  },

  async update(id: string, updates: any) {
    return fetchAPI(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// Matches API
export const matchesAPI = {
  async list(filters?: { status?: string; league_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.league_id) params.append('league_id', filters.league_id);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/matches${query}`);
  },

  async schedule(matchId: string, data: { scheduled_date: string; scheduled_time: string; location: string }) {
    return fetchAPI(`/matches/${matchId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateAvailability(matchId: string, availability: Record<string, string[]>) {
    return fetchAPI(`/matches/${matchId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    });
  },

  async complete(matchId: string, data: any) {
    return fetchAPI(`/complete-match`, {
      method: 'POST',
      body: JSON.stringify({ matchId, ...data }),
    });
  },

  async approve(matchId: string, approved: boolean) {
    return fetchAPI(`/match-approval`, {
      method: 'POST',
      body: JSON.stringify({ matchId, approved }),
    });
  },
};

// Leagues API
export const leaguesAPI = {
  async list(filters?: { status?: string; gender?: string; my_leagues?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.my_leagues) params.append('my_leagues', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/leagues${query}`);
  },

  async get(id: string) {
    return fetchAPI(`/leagues/${id}`);
  },

  async create(data: any) {
    return fetchAPI('/leagues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, updates: any) {
    return fetchAPI(`/leagues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async join(id: string, message?: string) {
    return fetchAPI(`/leagues/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async leave(id: string) {
    return fetchAPI(`/leagues/${id}/leave`, {
      method: 'DELETE',
    });
  },

  async getMembers(id: string) {
    return fetchAPI(`/leagues/${id}/members`);
  },

  async getParticipants(id: string) {
    return fetchAPI(`/leagues/${id}/members`);
  },

  async getRanking(id: string) {
    return fetchAPI(`/leagues/${id}/ranking`);
  },

  async getJoinRequests(id: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return fetchAPI(`/leagues/${id}/requests${query}`);
  },

  async approveJoinRequest(leagueId: string, requestId: string) {
    return fetchAPI(`/leagues/${leagueId}/requests/${requestId}/approve`, {
      method: 'POST',
    });
  },

  async rejectJoinRequest(leagueId: string, requestId: string) {
    return fetchAPI(`/leagues/${leagueId}/requests/${requestId}/reject`, {
      method: 'POST',
    });
  },

  async getEvents(id: string) {
    return fetchAPI(`/leagues/${id}/events`);
  },

  async createEvent(leagueId: string, data: { event_date: string; duo_sorting_config?: any }) {
    return fetchAPI(`/leagues/${leagueId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export interface DuoSortingConfig {
  type: 'all_together' | 'by_groups';
  groups?: Array<{ name: string; count: number }>;
}

export interface WeeklyScoreData {
  player_id?: string;
  victories: number;
  defeats: number;
  bbq_participated: boolean;
}

// Weekly Events API
export const weeklyEventsAPI = {
  async get(eventId: string) {
    return fetchAPI(`/weekly-events/${eventId}`);
  },

  async getAttendance(eventId: string) {
    return fetchAPI(`/weekly-events/${eventId}/attendance`);
  },

  async getDuos(eventId: string) {
    return fetchAPI(`/weekly-events/${eventId}/duos`);
  },

  async getMatches(eventId: string) {
    return fetchAPI(`/weekly-events/${eventId}/matches`);
  },

  async confirmAttendance(eventId: string, duoPartnerId?: string) {
    return fetchAPI(`/weekly-events/${eventId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ duo_partner_id: duoPartnerId }),
    });
  },

  async cancelAttendance(eventId: string) {
    return fetchAPI(`/weekly-events/${eventId}/cancel`, {
      method: 'POST',
    });
  },

  async generateDuos(eventId: string, sortingConfig?: DuoSortingConfig) {
    return fetchAPI(`/weekly-events/${eventId}/generate-duos`, {
      method: 'POST',
      body: JSON.stringify({ sorting_config: sortingConfig }),
    });
  },

  async submitScore(eventId: string, data: WeeklyScoreData) {
    return fetchAPI(`/weekly-events/${eventId}/score`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(eventId: string, status: string) {
    return fetchAPI(`/weekly-events/${eventId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async updateSortingConfig(eventId: string, sortingConfig: DuoSortingConfig) {
    return fetchAPI(`/weekly-events/${eventId}/sorting-config`, {
      method: 'PUT',
      body: JSON.stringify({ sorting_config: sortingConfig }),
    });
  },
};

// Rankings API
export const rankingsAPI = {
  async getRegional(filters?: { state?: string; city?: string; gender?: string; category?: string }) {
    const params = new URLSearchParams();
    if (filters?.state) params.append('state', filters.state);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.category) params.append('category', filters.category);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/rankings/regional${query}`);
  },

  async getGlobal(gender?: string) {
    const query = gender ? `?gender=${gender}` : '';
    return fetchAPI(`/rankings/global${query}`);
  },

  async getHistory(playerId?: string) {
    const endpoint = playerId ? `/rankings/history/${playerId}` : '/rankings/history';
    return fetchAPI(endpoint);
  },
};

// Queue API
export const queueAPI = {
  async getStatus() {
    return fetchAPI('/queue');
  },

  async join(data: { partnerId?: string; gender: string; preferredSide?: string }) {
    return fetchAPI('/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async leave() {
    return fetchAPI('/queue', {
      method: 'DELETE',
    });
  },

  async findMatch(data: any) {
    return fetchAPI('/find-match', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Admin API
export const adminAPI = {
  async getPlayers(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchAPI(`/admin/players${query}`);
  },

  async updatePlayer(id: string, updates: any) {
    return fetchAPI(`/admin/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getStats() {
    return fetchAPI('/admin/stats');
  },
};

export const api = {
  players: playerAPI,
  matches: matchesAPI,
  leagues: leaguesAPI,
  weeklyEvents: weeklyEventsAPI,
  rankings: rankingsAPI,
  queue: queueAPI,
  admin: adminAPI,
};
