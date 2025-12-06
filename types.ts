
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
