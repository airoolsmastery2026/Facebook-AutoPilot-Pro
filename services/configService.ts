
import type { AppBackup, ScheduledPost, ActivityLog, FacebookAccount, AutoPilotConfig, AppCredentials } from '../types';

const CONFIG_VERSION = '1.0.0';

export const exportAppConfig = (): string => {
  if (typeof window === 'undefined') return '';

  // Collect data from localStorage
  const apiKey = localStorage.getItem('gemini-api-key') || '';
  
  const fbAccountsRaw = localStorage.getItem('fb-accounts');
  const facebookAccounts: FacebookAccount[] = fbAccountsRaw ? JSON.parse(fbAccountsRaw) : [];

  const appUsersRaw = localStorage.getItem('app_users');
  const appUsers: AppCredentials[] = appUsersRaw ? JSON.parse(appUsersRaw) : [];

  const autoPilotRaw = localStorage.getItem('auto-pilot-config');
  const autoPilotConfig: AutoPilotConfig = autoPilotRaw ? JSON.parse(autoPilotRaw) : {
      niche: 'Công nghệ AI', intervalMinutes: 60, isActive: false, enableVideo: false
  };

  const interests = localStorage.getItem('user-interests') || '';
  const enableLikes = localStorage.getItem('enable-likes') === 'true';
  const enableComments = localStorage.getItem('enable-comments') === 'true';
  const exampleComments = localStorage.getItem('example-comments') || '';

  const postsRaw = localStorage.getItem('scheduled-posts');
  const posts: ScheduledPost[] = postsRaw ? JSON.parse(postsRaw) : [];

  const logsRaw = localStorage.getItem('activity-logs');
  const logs: ActivityLog[] = logsRaw ? JSON.parse(logsRaw) : [];

  const backup: AppBackup = {
    version: CONFIG_VERSION,
    timestamp: new Date().toISOString(),
    settings: {
      apiKey,
      facebookAccounts,
      appUsers,
      autoPilotConfig,
      interests,
      enableLikes,
      enableComments,
      exampleComments
    },
    data: {
      posts,
      logs
    }
  };

  return JSON.stringify(backup, null, 2);
};

export const importAppConfig = (jsonString: string): boolean => {
  try {
    const backup: AppBackup = JSON.parse(jsonString);

    // Basic Validation
    if (!backup.version || !backup.settings || !backup.data) {
        throw new Error("Invalid backup file format");
    }

    // Restore Settings
    if (backup.settings.apiKey) localStorage.setItem('gemini-api-key', backup.settings.apiKey);
    
    if (backup.settings.facebookAccounts) {
        localStorage.setItem('fb-accounts', JSON.stringify(backup.settings.facebookAccounts));
    }

    if (backup.settings.appUsers) {
        localStorage.setItem('app_users', JSON.stringify(backup.settings.appUsers));
    }

    if (backup.settings.autoPilotConfig) {
        // Force inactive on restore to prevent immediate unwanted running
        const safeConfig = { ...backup.settings.autoPilotConfig, isActive: false };
        localStorage.setItem('auto-pilot-config', JSON.stringify(safeConfig));
    }

    if (backup.settings.interests) localStorage.setItem('user-interests', backup.settings.interests);
    localStorage.setItem('enable-likes', String(backup.settings.enableLikes));
    localStorage.setItem('enable-comments', String(backup.settings.enableComments));
    if (backup.settings.exampleComments) localStorage.setItem('example-comments', backup.settings.exampleComments);

    // Restore Data
    if (backup.data.posts) localStorage.setItem('scheduled-posts', JSON.stringify(backup.data.posts));
    if (backup.data.logs) localStorage.setItem('activity-logs', JSON.stringify(backup.data.logs));

    return true;
  } catch (error) {
    console.error("Import failed:", error);
    return false;
  }
};
