
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
  title?: string; // Added title field
  content: string;
  imageUrl?: string;
  videoUrl?: string; // Added support for Video
  thumbnailUrl?: string; // Added thumbnail
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
  enableVideo: boolean; // Toggle to include video generation in the loop
  lastRun?: string;
}

export type AutoPilotPhase = 
  | 'IDLE' 
  | 'SCANNING_TRENDS' 
  | 'GENERATING_CONTENT' 
  | 'ANALYZING_IMAGE_PROMPT' 
  | 'GENERATING_IMAGE' 
  | 'GENERATING_VIDEO' // New phase
  | 'GENERATING_THUMBNAIL' // New phase
  | 'SCHEDULING' 
  | 'COOLDOWN';

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

export interface AutoPilotState {
  phase: AutoPilotPhase;
  logs: string[];
}

// New Interface for Deep Topic Analysis
export interface TopicAnalysis {
  trending: string[]; // Mới nhất, Viral
  popular: string[];  // Quan tâm nhiều nhất
  related: string[];  // Chủ đề liên quan
}
