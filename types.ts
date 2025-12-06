
export interface UserProfile {
  id: string;
  name: string;
  pictureUrl: string;
  accessToken?: string; // Added to store token with profile
}

export interface FacebookAccount {
  id: string;
  name: string;
  pictureUrl: string;
  accessToken: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  imageUrl?: string;
  scheduledTime: string;
  status: 'Scheduled' | 'Posted' | 'Failed';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: 'Success' | 'Error';
}

export interface AutoPilotConfig {
  niche: string;
  intervalMinutes: number;
  isActive: boolean;
  lastRun?: string;
}

export type AutoPilotPhase = 'IDLE' | 'SCANNING_TRENDS' | 'GENERATING_CONTENT' | 'ANALYZING_IMAGE_PROMPT' | 'GENERATING_IMAGE' | 'SCHEDULING' | 'COOLDOWN';

export interface AppBackup {
  version: string;
  timestamp: string;
  settings: {
    apiKey: string;
    facebookAccounts: FacebookAccount[];
    autoPilotConfig: AutoPilotConfig;
    interests: string;
    enableLikes: boolean;
    enableComments: boolean;
    exampleComments: string;
  };
  data: {
    posts: ScheduledPost[];
    logs: ActivityLog[];
  };
}
