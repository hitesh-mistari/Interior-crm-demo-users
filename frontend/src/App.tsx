import { AppProvider, useApp } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
// import PWAInstallPrompt from './components/PWAInstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OnlineStatusIndicator from './components/OnlineStatusIndicator';

function AppContent() {
  const { currentUser, isSessionLoading } = useApp();

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <>
      <Dashboard />
      {/* <PWAInstallPrompt /> */}
      <UpdatePrompt />
      <OnlineStatusIndicator />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AppProvider>
  );
}

export default App;
