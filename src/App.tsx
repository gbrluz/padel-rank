import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import WelcomePage from './pages/WelcomePage';
import AuthPage from './pages/AuthPage';
import RegistrationFormPage from './pages/RegistrationFormPage';
import DashboardPage from './pages/DashboardPage';
import RankingPage from './pages/RankingPage';
import MatchesPage from './pages/MatchesPage';
import PlayPage from './pages/PlayPage';
import ProfilePage from './pages/ProfilePage';
import BackofficePage from './pages/BackofficePage';
import LeaguesPage from './pages/LeaguesPage';
import Navigation from './components/Navigation';

function AppContent() {
  const { user, player, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    // Use sessionStorage instead of localStorage
    // sessionStorage is cleared when browser/tab closes, so new logins start fresh
    return sessionStorage.getItem('lastPage') || 'dashboard';
  });
  const previousPlayerRef = useRef<typeof player>(null);
  const isFirstLoad = useRef(true);

  // Save current page to sessionStorage whenever it changes
  useEffect(() => {
    if (currentPage && !isFirstLoad.current) {
      sessionStorage.setItem('lastPage', currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    // On first load with a player, reset to dashboard if it's a new login session
    if (player && !previousPlayerRef.current) {
      // If there's no session data, this is a fresh login → go to dashboard
      if (!sessionStorage.getItem('lastPage')) {
        setCurrentPage('dashboard');
      }
      isFirstLoad.current = false;
    }

    // Clear session when user logs out
    if (!player && previousPlayerRef.current) {
      sessionStorage.removeItem('lastPage');
    }

    previousPlayerRef.current = player;
  }, [player]);

  if (loading) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <AuthPage
          onBack={() => setShowAuth(false)}
          onRegistrationComplete={() => {}}
        />
      );
    }
    return <WelcomePage onGetStarted={() => setShowAuth(true)} />;
  }

  if (!player) {
    return <RegistrationFormPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'ranking':
        return <RankingPage />;
      case 'matches':
        return <MatchesPage />;
      case 'play':
        return <PlayPage onNavigate={setCurrentPage} />;
      case 'leagues':
        return <LeaguesPage onNavigate={setCurrentPage} />;
      case 'profile':
        return <ProfilePage />;
      case 'backoffice':
        return <BackofficePage onNavigate={setCurrentPage} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="pt-20 md:pt-20">
        {renderPage()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
