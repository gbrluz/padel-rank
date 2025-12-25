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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const previousPlayerRef = useRef<typeof player>(null);

  useEffect(() => {
    console.log('AppContent state:', { loading, hasUser: !!user, hasPlayer: !!player });
  }, [loading, user, player]);

  useEffect(() => {
    if (player && !previousPlayerRef.current) {
      setCurrentPage('dashboard');
    }
    previousPlayerRef.current = player;
  }, [player]);

  if (loading) {
    console.log('Mostrando tela de loading...');
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
    console.log('Usuário não autenticado, showAuth:', showAuth);
    if (showAuth) {
      return (
        <AuthPage
          onBack={() => setShowAuth(false)}
          onRegistrationComplete={() => {}}
        />
      );
    }
    console.log('Mostrando WelcomePage...');
    return <WelcomePage onGetStarted={() => setShowAuth(true)} />;
  }

  if (!player) {
    console.log('Mostrando RegistrationFormPage...');
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
    <div className="min-h-screen">
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
