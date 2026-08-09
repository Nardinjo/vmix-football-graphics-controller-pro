import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import BroadcastLayout from '@/components/BroadcastLayout';
import { VmixProvider } from '@/lib/vmixContext';
import Dashboard from '@/pages/Dashboard';
import Matches from '@/pages/Matches';
import Teams from '@/pages/Teams';
import Players from '@/pages/Players';
import Lineups from '@/pages/Lineups';
import Graphics from '@/pages/Graphics';
import Scoreboard from '@/pages/Scoreboard';
import Statistics from '@/pages/Statistics';
import Settings from '@/pages/Settings';
import Events from '@/pages/Events';
import LowerThirds from '@/pages/LowerThirds';
import Media from '@/pages/Media';
import Playlist from '@/pages/Playlist';
import DataImport from '@/pages/DataImport';
import Logs from '@/pages/Logs';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<VmixProvider><BroadcastLayout /></VmixProvider>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/players" element={<Players />} />
          <Route path="/lineups" element={<Lineups />} />
          <Route path="/graphics" element={<Graphics />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/lower-thirds" element={<LowerThirds />} />
          <Route path="/media" element={<Media />} />
          <Route path="/playlist" element={<Playlist />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logs" element={<Logs />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App