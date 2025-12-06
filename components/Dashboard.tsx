import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UserProfile, ScheduledPost, ActivityLog, AutoPilotConfig, AutoPilotPhase } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Header from './Header';
import AutoPilotControls from './AutoPilotControls';
import ContentAgent from './agents/ContentAgent';
import ImageAgent from './agents/ImageAgent';
import SchedulerAgent from './agents/SchedulerAgent';
import InteractionAgent from './agents/InteractionAgent';
import GroupAgent from './agents/GroupAgent';
import ActivityLogFeed from './ActivityLogFeed';
import VideoAgent from './agents/VideoAgent';
import AnalyticsAgent from './agents/AnalyticsAgent';
import TrendAgent from './agents/TrendAgent';
import InboxAgent from './agents/InboxAgent';

// Services
import { 
    generateTrends, 
    generateText, 
    generateImagePromptFromContent, 
    generateImage,
    generateVideo,
    ImagePayload
} from '../services/geminiService';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onOpenSettings }) => {
  // --- Global State ---
  const [posts, setPosts] = useLocalStorage<ScheduledPost[]>('scheduled-posts', []);
  const [logs, setLogs] = useLocalStorage<ActivityLog[]>('activity-logs', []);
  const [isAutoMode, setIsAutoMode] = useLocalStorage<boolean>('workflow-auto-mode', false);
  
  // --- Auto-Pilot Configuration & State ---
  const [autoPilotConfig, setAutoPilotConfig] = useLocalStorage<AutoPilotConfig>('auto-pilot-config', {
    niche: 'Công nghệ AI',
    intervalMinutes: 60,
    isActive: false,
    enableVideo: false // Default to false as it consumes more quota/time
  });
  const [autoPilotPhase, setAutoPilotPhase] = useState<AutoPilotPhase>('IDLE');

  // --- Intermediate Data (The "Flow" between modules) ---
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
  const [detectedTrend, setDetectedTrend] = useState<string>('');
  
  // Lifted state for manual overrides
  const [contentTopic, setContentTopic] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  // Refs for loop management
  const autoPilotTimeoutRef = useRef<number | null>(null);

  const addLog = useCallback((
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
    setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 49)]);
  }, [setLogs]);

  // --- MASTER ORCHESTRATOR: THE BRAIN ---
  const runAutoPilotCycle = useCallback(async () => {
    if (!autoPilotConfig.isActive) return;

    try {
        // Reset per-cycle states
        setGeneratedVideoUrl('');
        setGeneratedImageUrl('');
        setGeneratedContent('');

        // 1. SCANNING TRENDS
        setAutoPilotPhase('SCANNING_TRENDS');
        addLog('AutoPilot', `Bắt đầu chu trình mới. Đang quét xu hướng về "${autoPilotConfig.niche}"...`);
        
        const trendResult = await generateTrends(autoPilotConfig.niche);
        const topTrend = trendResult.text.split('\n')[0] || trendResult.text; // Take first line/trend
        setDetectedTrend(trendResult.text); // Update TrendAgent UI
        addLog('TrendAgent', `[Auto] Phát hiện xu hướng: ${topTrend.substring(0, 50)}...`);

        // 2. GENERATING CONTENT
        setAutoPilotPhase('GENERATING_CONTENT');
        const contentPrompt = `Write a short, engaging Facebook post about this trending topic: "${topTrend}". Use Vietnamese language.`;
        const content = await generateText(contentPrompt);
        setGeneratedContent(content); // Update ContentAgent UI
        addLog('ContentAgent', `[Auto] Đã viết nội dung dựa trên xu hướng.`);

        // 3. ANALYZING IMAGE
        setAutoPilotPhase('ANALYZING_IMAGE_PROMPT');
        const imgPrompt = await generateImagePromptFromContent(content);
        setImagePrompt(imgPrompt); // Update ImageAgent UI
        addLog('ImageAgent', `[Auto] Đã tạo prompt ảnh: ${imgPrompt.substring(0, 30)}...`);

        // 4. GENERATING IMAGE
        setAutoPilotPhase('GENERATING_IMAGE');
        const imgUrl = await generateImage(imgPrompt);
        let finalVideoUrl = '';

        if (imgUrl) {
            setGeneratedImageUrl(imgUrl); // Update ImageAgent UI
            addLog('ImageAgent', `[Auto] Đã vẽ xong ảnh minh họa.`);

            // 5. GENERATING VIDEO (Optional Step)
            if (autoPilotConfig.enableVideo) {
                setAutoPilotPhase('GENERATING_VIDEO');
                addLog('VideoAgent', `[Auto] Đang chuyển ảnh thành video (Veo 3.1)...`);
                
                try {
                    // Extract base64 data from data URL
                    const base64Data = imgUrl.split(',')[1];
                    const mimeType = imgUrl.split(';')[0].split(':')[1];

                    const imagePayload: ImagePayload = {
                        imageBytes: base64Data,
                        mimeType: mimeType
                    };

                    // Generate Video using Content as prompt and Image as start frame
                    // Wrap imagePayload in array [] as per new signature
                    finalVideoUrl = await generateVideo(
                        `Cinematic movement for: ${content.substring(0, 50)}`, 
                        [imagePayload], 
                        { model: 'veo-3.1-fast-generate-preview', resolution: '720p', aspectRatio: '16:9' }
                    );
                    
                    setGeneratedVideoUrl(finalVideoUrl);
                    addLog('VideoAgent', `[Auto] Đã tạo video thành công.`);
                } catch (vidErr) {
                    addLog('VideoAgent', `[Auto] Lỗi tạo video: ${(vidErr as Error).message}`, 'Error');
                    // Continue even if video fails, we still have the image
                }
            }
        } else {
            addLog('ImageAgent', `[Auto] Lỗi tạo ảnh, sẽ đăng bài không ảnh.`, 'Error');
        }

        // 6. SCHEDULING
        setAutoPilotPhase('SCHEDULING');
        const newPost: ScheduledPost = {
            id: Date.now().toString(),
            content: content,
            imageUrl: imgUrl || undefined,
            videoUrl: finalVideoUrl || undefined,
            scheduledTime: new Date(Date.now() + 10 * 60000).toLocaleString(), // Schedule for 10 mins later
            status: 'Scheduled',
        };
        setPosts((prev) => [newPost, ...prev]);
        addLog('SchedulerAgent', `[Auto] Đã lên lịch đăng bài thành công!`);

        // 7. COOLDOWN
        setAutoPilotPhase('COOLDOWN');
        const nextRunMs = autoPilotConfig.intervalMinutes * 60 * 1000;
        addLog('AutoPilot', `Hoàn tất chu trình. Nghỉ ${autoPilotConfig.intervalMinutes} phút.`);
        
        autoPilotTimeoutRef.current = window.setTimeout(() => {
            runAutoPilotCycle();
        }, nextRunMs);

    } catch (error) {
        addLog('AutoPilot', `Lỗi nghiêm trọng trong chu trình: ${(error as Error).message}`, 'Error');
        setAutoPilotPhase('IDLE');
        // Retry logic could go here, for now just stop or wait
    }
  }, [autoPilotConfig, addLog, setPosts]);

  // Effect to Start/Stop the cycle
  useEffect(() => {
    if (autoPilotConfig.isActive) {
        // If just activated and idle, start immediately
        if (autoPilotPhase === 'IDLE') {
            runAutoPilotCycle();
        }
    } else {
        // Stop everything
        if (autoPilotTimeoutRef.current) {
            clearTimeout(autoPilotTimeoutRef.current);
            autoPilotTimeoutRef.current = null;
        }
        setAutoPilotPhase('IDLE');
    }
    
    return () => {
        if (autoPilotTimeoutRef.current) {
            clearTimeout(autoPilotTimeoutRef.current);
        }
    };
  }, [autoPilotConfig.isActive, runAutoPilotCycle, autoPilotPhase]);


  // --- Event Handlers ---
  const handleVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();
    addLog('VoiceCommander', `Đã nhận lệnh: "${transcript}"`);
    if (lower.includes('tạo bài') || lower.includes('viết bài')) {
      const topic = transcript.replace(/(tạo bài viết về|viết bài về|tạo bài|viết bài)/i, '').trim();
      if (topic) setContentTopic(topic);
    } else if (lower.includes('tạo ảnh') || lower.includes('vẽ')) {
       const prompt = transcript.replace(/(tạo ảnh|vẽ|tạo hình ảnh)/i, '').trim();
       if (prompt) setImagePrompt(prompt);
    }
  };

  const handleTrendSelected = (trendText: string) => {
    setContentTopic(trendText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onOpenSettings={onOpenSettings || (() => {})}
        onVoiceCommand={handleVoiceCommand} 
      />
      
      <main className="p-4 sm:p-6 lg:p-8 max-w-8xl mx-auto">
        
        {/* TOP: Auto-Pilot Control Center */}
        <AutoPilotControls 
            config={autoPilotConfig} 
            onUpdateConfig={setAutoPilotConfig}
            currentPhase={autoPilotPhase}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Generation Pipeline (Trend -> Content -> Image -> Schedule) */}
          <div className="lg:col-span-8 space-y-6">
            
            <TrendAgent 
                onTrendSelected={handleTrendSelected} 
                addLog={addLog} 
                autoTrend={detectedTrend} // Pass auto-detected trend to UI
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Connecting Line for Visual Flow */}
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-8 h-1 bg-gray-700"></div>

                <ContentAgent
                    onContentGenerated={setGeneratedContent}
                    addLog={addLog}
                    initialTopic={contentTopic}
                    generatedContent={generatedContent} // Allow overriding state from AutoPilot
                    isAutoGenerating={autoPilotPhase === 'GENERATING_CONTENT'}
                />
                
                <ImageAgent
                    onImageGenerated={setGeneratedImageUrl}
                    addLog={addLog}
                    initialPrompt={imagePrompt}
                    generatedContent={generatedContent}
                    generatedImage={generatedImageUrl} // Allow overriding state from AutoPilot
                    isAutoGenerating={autoPilotPhase === 'GENERATING_IMAGE' || autoPilotPhase === 'ANALYZING_IMAGE_PROMPT'}
                />
            </div>

            <VideoAgent 
                addLog={addLog} 
                generatedVideo={generatedVideoUrl}
                isAutoGenerating={autoPilotPhase === 'GENERATING_VIDEO'}
            />

            <SchedulerAgent
                posts={posts}
                setPosts={setPosts}
                content={generatedContent}
                imageUrl={generatedImageUrl}
                videoUrl={generatedVideoUrl} // Pass the video URL to scheduler preview
                addLog={addLog}
                isAutoMode={isAutoMode}
            />
          </div>

          {/* RIGHT: Engagement & Analytics */}
          <div className="lg:col-span-4 space-y-6">
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