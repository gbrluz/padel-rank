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
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Sessão inicial:', session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPlayer(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('Auth state changed:', event, session?.user?.id);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchPlayer(session.user.id);
        } else {
          setPlayer(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
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
