import { useState, useEffect } from 'react';
import { Trophy, Calendar, PlayCircle, Home, User, Shield, Medal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { profile, isAdmin } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (profile) {
      loadPendingApprovals();

      const channel = supabase
        .channel('approval-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_approvals',
            filter: `player_id=eq.${profile.id}`
          },
          () => {
            loadPendingApprovals();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches'
          },
          () => {
            loadPendingApprovals();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [profile]);

  const loadPendingApprovals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('match_approvals')
      .select('*, matches!inner(status)')
      .eq('player_id', profile.id)
      .is('approved', null)
      .neq('matches.status', 'cancelled');

    setPendingApprovals(data?.length || 0);
  };

  if (!profile) return null;

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'ranking', icon: Trophy, label: 'Ranking' },
    { id: 'leagues', icon: Medal, label: 'Ligas' },
    { id: 'matches', icon: Calendar, label: 'Partidas' },
    { id: 'play', icon: PlayCircle, label: 'Jogar', highlight: true },
    ...(isAdmin ? [{ id: 'backoffice', icon: Shield, label: 'Admin', adminOnly: true }] : [])
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <img
              src="/image.png"
              alt="CLIMB"
              className="h-12 w-auto"
            />
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex items-center px-6 py-3 rounded-xl font-semibold transition-all ${
                    item.highlight
                      ? isActive
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                      : item.adminOnly
                        ? isActive
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                        : isActive
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                  {item.id === 'matches' && pendingApprovals > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {pendingApprovals}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center space-x-3 hover:bg-gray-100 rounded-xl p-2 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-gray-900">
                {profile.full_name.split(' ')[0]}
              </p>
              <p className="text-xs text-gray-500">{profile.ranking_points} pts</p>
            </div>
          </button>
        </div>

        <div className="md:hidden flex justify-around py-3 border-t">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center space-y-1 ${
                  item.highlight
                    ? 'text-orange-600'
                    : item.adminOnly
                      ? 'text-red-600'
                      : isActive
                        ? 'text-emerald-600'
                        : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.id === 'matches' && pendingApprovals > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
