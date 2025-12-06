
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
import TrendAgent from './agents/TrendAgent'; // New
import InboxAgent from './agents/InboxAgent'; // New

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onOpenSettings }) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  
  // Global Workflow Mode: Manual (false) vs Auto AI (true)
  const [isAutoMode, setIsAutoMode] = useLocalStorage<boolean>('workflow-auto-mode', false);

  // State lifted up for Voice/Trend integration
  const [contentTopic, setContentTopic] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

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

  // Callback for Voice Commands from Header
  const handleVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();
    addLog('VoiceCommander', `Đã nhận lệnh: "${transcript}"`);

    if (lower.includes('tạo bài') || lower.includes('viết bài')) {
      const topic = transcript.replace(/(tạo bài viết về|viết bài về|tạo bài|viết bài)/i, '').trim();
      if (topic) {
        setContentTopic(topic);
        // Reset after a short delay to allow re-triggering if needed, 
        // though strictly React state update is enough.
      }
    } else if (lower.includes('tạo ảnh') || lower.includes('vẽ')) {
       const prompt = transcript.replace(/(tạo ảnh|vẽ|tạo hình ảnh)/i, '').trim();
       if (prompt) setImagePrompt(prompt);
    }
  };

  const handleTrendSelected = (trendText: string) => {
    setContentTopic(trendText);
    // Scroll to top smooth
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onOpenSettings={onOpenSettings || (() => {})}
        onVoiceCommand={handleVoiceCommand} // Pass handler
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Workflow Mode Controller */}
        <div className="mb-8 bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col sm:flex-row items-center justify-between shadow-lg">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Chế độ Vận hành
            </h2>
            <p className="text-sm text-gray-400">Chọn cách hệ thống xử lý quy trình công việc</p>
          </div>
          <div className="bg-gray-700 p-1 rounded-lg flex">
            <button
              onClick={() => setIsAutoMode(false)}
              className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                !isAutoMode 
                  ? 'bg-gray-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ✋ Thủ công
            </button>
            <button
              onClick={() => setIsAutoMode(true)}
              className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                isAutoMode 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🤖 Tự động AI</span>
              {isAutoMode && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Content Creation & Trends */}
          <div className="lg:col-span-2 space-y-6">
            <TrendAgent onTrendSelected={handleTrendSelected} addLog={addLog} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ContentAgent
                onContentGenerated={setGeneratedContent}
                addLog={addLog}
                initialTopic={contentTopic}
              />
              <ImageAgent
                onImageGenerated={setGeneratedImageUrl}
                addLog={addLog}
                initialPrompt={imagePrompt}
                generatedContent={generatedContent} // Pass content to Image Agent
              />
            </div>
            <SchedulerAgent
              posts={posts}
              setPosts={setPosts}
              content={generatedContent}
              imageUrl={generatedImageUrl}
              addLog={addLog}
              isAutoMode={isAutoMode} // Pass mode to scheduler
            />
            <VideoAgent addLog={addLog} />
          </div>

          {/* Right Column: Interaction & Analytics */}
          <div className="space-y-6">
            <InboxAgent addLog={addLog} />
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
