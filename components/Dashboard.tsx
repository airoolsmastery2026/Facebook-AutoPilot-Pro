
import React, { useState } from 'react';
import type { UserProfile, ScheduledPost, ActivityLog } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Header from './Header';
import ContentAgent from './agents/ContentAgent';
import ImageAgent from './agents/ImageAgent';
import SchedulerAgent from './agents/SchedulerAgent';
import InteractionAgent from './agents/InteractionAgent';
import GroupAgent from './agents/GroupAgent';
import ActivityLogFeed from './ActivityLogFeed';
import VideoAgent from './agents/VideoAgent';
import AnalyticsAgent from './agents/AnalyticsAgent';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings?: () => void; // Added prop
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onOpenSettings }) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [posts, setPosts] = useLocalStorage<ScheduledPost[]>(
    'scheduled-posts',
    [],
  );
  const [logs, setLogs] = useLocalStorage<ActivityLog[]>('activity-logs', []);

  const addLog = (
    agent: string,
    action: string,
    status: 'Success' | 'Error' = 'Success',
  ) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      agent,
      action,
      status,
    };
    setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 49)]); // Keep last 50 logs
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onOpenSettings={onOpenSettings || (() => {})} // Pass handler
      />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ContentAgent
                onContentGenerated={setGeneratedContent}
                addLog={addLog}
              />
              <ImageAgent
                onImageGenerated={setGeneratedImageUrl}
                addLog={addLog}
              />
            </div>
            <SchedulerAgent
              posts={posts}
              setPosts={setPosts}
              content={generatedContent}
              imageUrl={generatedImageUrl}
              addLog={addLog}
            />
            <VideoAgent addLog={addLog} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <InteractionAgent addLog={addLog} />
            <GroupAgent addLog={addLog} />
            <AnalyticsAgent />
            <ActivityLogFeed logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
