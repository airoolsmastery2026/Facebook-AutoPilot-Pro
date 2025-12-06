
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { UserProfile, FacebookAccount } from './types';
import { getProfile } from './services/facebookService';

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>(
    'fb-access-token',
    null,
  );
  // Also store account history to auto-save successful logins
  const [savedAccounts, setSavedAccounts] = useLocalStorage<FacebookAccount[]>('fb-accounts', []);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogin = useCallback(
    async (token: string, newApiKey?: string) => {
      setIsLoading(true);
      setError(null);
      
      // Save API Key if provided during login
      if (newApiKey) {
         window.localStorage.setItem('gemini-api-key', newApiKey);
      }

      try {
        const userProfile = await getProfile(token);
        // Attach token to profile for context
        userProfile.accessToken = token;
        
        setUser(userProfile);
        setAccessToken(token);

        // Auto-save this account to the list if not exists
        setSavedAccounts(prev => {
          if (!prev.some(acc => acc.id === userProfile.id)) {
            return [{
              id: userProfile.id,
              name: userProfile.name,
              pictureUrl: userProfile.pictureUrl,
              accessToken: token
            }, ...prev];
          }
          // Update token if it changed
          return prev.map(acc => acc.id === userProfile.id ? { ...acc, accessToken: token } : acc);
        });

      } catch (err) {
        setError((err as Error).message);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [setAccessToken, setSavedAccounts],
  );

  const handleLogout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, [setAccessToken]);

  useEffect(() => {
    const validateToken = async () => {
      if (accessToken) {
        await handleLogin(accessToken);
      }
      setIsLoading(false);
    };
    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-lg">Đang khởi tạo AutoPilot Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      {user && accessToken ? (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <Login onLogin={handleLogin} isLoading={isLoading} error={error} />
      )}

      {/* Settings Modal is available at app level */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentUserToken={accessToken}
        onSwitchAccount={(token) => {
          handleLogin(token);
          // Optional: Close modal on switch
          // setIsSettingsOpen(false); 
        }}
        accounts={savedAccounts}
        onUpdateAccounts={setSavedAccounts}
      />
    </div>
  );
};

export default App;
