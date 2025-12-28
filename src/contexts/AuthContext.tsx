import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { profileService, Player } from '../services';

type AuthContextType = {
  user: User | null;
  player: Player | null;
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
  const [playerLoading, setPlayerLoading] = useState(false);

  const fetchPlayer = async (userId: string) => {
    setPlayerLoading(true);
    try {
      const data = await profileService.getPlayer(userId);

      if (data) {
        setPlayer(data);
      } else {
        setPlayer(null);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar jogador:', err);
      setPlayer(null);
    } finally {
      setPlayerLoading(false);
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
          if (event === 'SIGNED_IN' && session?.user) {
            setLoading(true);
            setUser(session.user);
            await fetchPlayer(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setPlayer(null);
            setLoading(false);
          } else if (session?.user) {
            setUser(session.user);
            if (!player && !playerLoading) {
              await fetchPlayer(session.user.id);
            }
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

  const isAdmin = player?.is_admin ?? false;

  return (
    <AuthContext.Provider value={{ user, player, loading, signIn, signUp, signOut, refreshPlayer, isAdmin }}>
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
