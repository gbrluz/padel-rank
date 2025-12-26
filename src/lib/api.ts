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
  async list(filters?: { status?: string; gender?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.gender) params.append('gender', filters.gender);

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

  async join(id: string) {
    return fetchAPI(`/leagues/${id}/join`, {
      method: 'POST',
    });
  },

  async leave(id: string) {
    return fetchAPI(`/leagues/${id}/leave`, {
      method: 'DELETE',
    });
  },

  async getParticipants(id: string) {
    return fetchAPI(`/leagues/${id}/participants`);
  },

  async getRanking(id: string) {
    return fetchAPI(`/leagues/${id}/ranking`);
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
  rankings: rankingsAPI,
  queue: queueAPI,
  admin: adminAPI,
};
