
import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { UserProfile, FacebookAccount } from './types';
import { getProfile } from './services/facebookService';

const App: React.FC = () => {
  // App Authentication State
  const [currentAppUser, setCurrentAppUser] = useLocalStorage<string | null>('current_app_user', null);

  // Facebook Data State
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('fb-access-token', null);
  const [savedAccounts, setSavedAccounts] = useLocalStorage<FacebookAccount[]>('fb-accounts', []);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- 1. App Login Handling (Username/Password) ---
  const handleAppLogin = (username: string) => {
    setCurrentAppUser(username);
    // After app login, we verify if there is a valid FB token saved
    loadFacebookProfile(accessToken); 
  };

  const handleLogout = useCallback(() => {
    setCurrentAppUser(null);
    setUser(null);
    // Note: We do NOT clear the accessToken or savedAccounts here, 
    // so they persist for the next login (as requested "saved once").
  }, [setCurrentAppUser]);

  // --- 2. Facebook Profile Loading ---
  const loadFacebookProfile = useCallback(async (token: string | null) => {
    if (!token) {
        setUser(null);
        return;
    }

    setIsLoading(true);
    try {
        const userProfile = await getProfile(token);
        userProfile.accessToken = token;
        setUser(userProfile);
        
        // Auto-save account context
        setSavedAccounts(prev => {
             if (!prev.some(acc => acc.id === userProfile.id)) {
                return [{
                  id: userProfile.id,
                  name: userProfile.name,
                  pictureUrl: userProfile.pictureUrl,
                  accessToken: token
                }, ...prev];
              }
              return prev.map(acc => acc.id === userProfile.id ? { ...acc, accessToken: token } : acc);
        });

    } catch (err) {
        // If token is invalid, we just don't set the user, but we stay logged in to the App
        console.error("Failed to load FB profile:", err);
        setUser(null);
        // Optional: setAccessToken(null); if we want to force re-entry
    } finally {
        setIsLoading(false);
    }
  }, [setSavedAccounts]);

  // Initial Load & Watch for Token Changes
  useEffect(() => {
    if (currentAppUser) {
        loadFacebookProfile(accessToken);
    }
  }, [currentAppUser, accessToken, loadFacebookProfile]);

  // Handle Account Switching from Settings
  const handleSwitchAccount = (newToken: string) => {
      setAccessToken(newToken); // This triggers the useEffect above to reload profile
  };

  // --- Render ---

  // If not logged in to the App, show Login Screen
  if (!currentAppUser) {
      return <Login onLogin={handleAppLogin} isLoading={isLoading} error={error} />;
  }

  // If logged in, show Dashboard
  // Note: 'user' might be null if FB token is missing/invalid. 
  // We create a "Guest" profile object in that case so Dashboard handles it gracefully.
  const displayUser = user || {
      id: 'guest',
      name: 'Chưa kết nối FB',
      pictureUrl: 'https://via.placeholder.com/150?text=Guest',
      accessToken: ''
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Dashboard 
          user={displayUser} 
          onLogout={handleLogout} 
          onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentUserToken={accessToken}
        onSwitchAccount={handleSwitchAccount}
        accounts={savedAccounts}
        onUpdateAccounts={setSavedAccounts}
      />
    </div>
  );
};

export default App;
