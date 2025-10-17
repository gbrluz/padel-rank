import { Trophy, Calendar, PlayCircle, Home, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { profile } = useAuth();

  if (!profile) return null;

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'ranking', icon: Trophy, label: 'Ranking' },
    { id: 'matches', icon: Calendar, label: 'Partidas' },
    { id: 'play', icon: PlayCircle, label: 'Jogar', highlight: true }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mr-3">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Padel Ranking</span>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all ${
                    item.highlight
                      ? isActive
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md'
                      : isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
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
                className={`flex flex-col items-center space-y-1 ${
                  item.highlight
                    ? 'text-orange-600'
                    : isActive
                      ? 'text-emerald-600'
                      : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
