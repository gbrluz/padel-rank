import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { profileService, Player } from '../services';

const playerToProfile = (player: Player): Profile => ({
  id: player.id,
  full_name: player.fullName,
  gender: player.gender,
  birth_date: '',
  preferred_side: player.preferredSide || 'both',
  category: player.category,
  state: player.state,
  city: player.city,
  availability: player.availability,
  photo_url: player.avatarUrl,
  ranking_points: player.rankingPoints,
  total_matches: player.totalMatches,
  total_wins: player.totalWins,
  win_rate: player.winRate,
  is_admin: player.isAdmin,
  created_at: player.createdAt,
  updated_at: player.createdAt,
});

type AuthContextType = {
  user: User | null;
  player: Player | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayer = async (userId: string) => {
    try {
      console.log('Buscando jogador para usuário:', userId);
      const data = await profileService.getPlayer(userId);

      if (data) {
        console.log('Jogador encontrado:', data);
        setPlayer(data);
        setLoading(false);
      } else {
        console.log('Nenhum jogador encontrado para o usuário:', userId);
        setPlayer(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar jogador:', err);
      setPlayer(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Erro ao obter sessão:', error);
          setLoading(false);
          return;
        }

        console.log('Sessão inicial:', session?.user?.id);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchPlayer(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Timeout na inicialização (2s), forçando loading = false');
        setLoading(false);
      }
    }, 2000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;

        try {
          console.log('Auth state changed:', event, session?.user?.id);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchPlayer(session.user.id);
          } else {
            setPlayer(null);
            setLoading(false);
          }
        } catch (err) {
          console.error('Erro no onAuthStateChange:', err);
          if (mounted) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setPlayer(null);
  };

  const refreshPlayer = async () => {
    if (user) {
      await fetchPlayer(user.id);
    }
  };

  const isAdmin = player?.isAdmin ?? false;
  const profile = player ? playerToProfile(player) : null;

  return (
    <AuthContext.Provider value={{ user, player, profile, loading, signIn, signUp, signOut, refreshPlayer, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
