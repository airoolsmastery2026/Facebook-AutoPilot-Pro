
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import type { ScheduledPost } from '../../types';
import { CalendarIcon } from '../icons/CalendarIcon';

interface SchedulerAgentProps {
  posts: ScheduledPost[];
  setPosts: (
    posts: ScheduledPost[] | ((prev: ScheduledPost[]) => ScheduledPost[]),
  ) => void;
  content: string;
  imageUrl: string;
  videoUrl?: string; // Add video support
  addLog: (agent: string, action: string) => void;
  isAutoMode: boolean;
}

const statusDisplayMap: Record<
  ScheduledPost['status'],
  { text: string; className: string }
> = {
  Scheduled: {
    text: 'Đã lên lịch',
    className: 'bg-yellow-800/50 text-yellow-300 border-yellow-700',
  },
  Posted: {
    text: 'Đã đăng',
    className: 'bg-green-800/50 text-green-300 border-green-700',
  },
  Failed: {
    text: 'Thất bại',
    className: 'bg-red-800/50 text-red-300 border-red-700',
  },
};

const SchedulerAgent: React.FC<SchedulerAgentProps> = ({
  posts,
  setPosts,
  content,
  imageUrl,
  videoUrl,
  addLog,
  isAutoMode,
}) => {
  const [scheduleTime, setScheduleTime] = useState(
    new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
  );

  // State for rescheduling functionality
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  // Automation Logic: Check for due posts every 3 seconds
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // If NOT in Auto Mode, do not process posts automatically
      if (!isAutoMode) return;

      const now = new Date();
      
      // Find posts that are Scheduled and due
      const duePosts = posts.filter(post => {
        if (post.status !== 'Scheduled') return false;
        const postTime = new Date(post.scheduledTime);
        return postTime <= now;
      });

      if (duePosts.length > 0) {
        // 1. Update Logs
        duePosts.forEach(post => {
          addLog(
            'SchedulerAgent', 
            `[Auto AI] Tự động đăng bài: "${post.content.substring(0, 30)}${post.content.length > 30 ? '...' : ''}"`
          );
        });

        // 2. Update Status in State
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (duePosts.some(p => p.id === post.id)) {
              return { ...post, status: 'Posted' };
            }
            return post;
          })
        );
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [posts, setPosts, addLog, isAutoMode]);

  const handleSchedule = () => {
    if (!content) {
      alert('Vui lòng tạo nội dung trước.');
      return;
    }
    const newPost: ScheduledPost = {
      id: Date.now().toString(),
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      scheduledTime: new Date(scheduleTime).toLocaleString(),
      status: 'Scheduled',
    };
    setPosts((prev) => [newPost, ...prev]);
    addLog('SchedulerAgent', `Đã lên lịch bài đăng vào ${newPost.scheduledTime}`);
  };

  const handleUpdateStatus = (
    postId: string,
    newStatus: 'Posted' | 'Failed',
  ) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, status: newStatus } : post,
      ),
    );
    const statusText = newStatus === 'Posted' ? 'Đã đăng' : 'Thất bại';
    const actionPrefix = isAutoMode ? '[Thủ công (Override)]' : '[Thủ công]';
    addLog(
      'SchedulerAgent',
      `${actionPrefix} Cập nhật bài đăng thành '${statusText}'`,
    );
  };

  // --- Reschedule Logic ---

  const startRescheduling = (post: ScheduledPost) => {
    setEditingPostId(post.id);
    // Try to convert stored locale string back to ISO for input
    try {
        const dateObj = new Date(post.scheduledTime);
        // Handle timezone offset to ensure input shows correct local time
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
        setEditTimeValue(localISOTime);
    } catch (e) {
        setEditTimeValue(new Date().toISOString().slice(0, 16));
    }
  };

  const saveReschedule = (postId: string) => {
      if (!editTimeValue) return;
      const newTimeDisplay = new Date(editTimeValue).toLocaleString();
      
      setPosts(prev => prev.map(p => 
        p.id === postId 
            ? { ...p, scheduledTime: newTimeDisplay } 
            : p
      ));
      
      addLog('SchedulerAgent', `[Thủ công] Đã đổi giờ đăng bài sang: ${newTimeDisplay}`);
      setEditingPostId(null);
  };

  const cancelReschedule = () => {
      setEditingPostId(null);
      setEditTimeValue('');
  };

  return (
    <Card title="Trợ lý Lên lịch" icon={<CalendarIcon />}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-400">
          Quản lý lịch đăng bài. 
          {isAutoMode ? (
             <span className="ml-1 text-green-400 font-semibold text-xs border border-green-600/50 bg-green-900/30 px-2 py-0.5 rounded">
                ● Tự động đăng khi đến giờ
             </span>
          ) : (
             <span className="ml-1 text-orange-400 font-semibold text-xs border border-orange-600/50 bg-orange-900/30 px-2 py-0.5 rounded">
                ● Cần duyệt thủ công
             </span>
          )}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label
            htmlFor="schedule-time"
            className="text-xs text-gray-400 block mb-1"
          >
            Thời gian lên lịch
          </label>
          <input
            id="schedule-time"
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSchedule}
          disabled={!content}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-green-800 disabled:cursor-not-allowed"
        >
          Lên lịch đăng
        </button>
      </div>
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Bài đăng sắp tới</h4>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Chưa có bài đăng nào được lên lịch.
            </p>
          ) : (
            posts.map((post) => {
              const displayInfo = statusDisplayMap[post.status] || {
                text: post.status,
                className: 'bg-gray-800/50 text-gray-300 border-gray-700',
              };
              
              const isScheduled = post.status === 'Scheduled';
              const isEditing = editingPostId === post.id;

              return (
                <div
                  key={post.id}
                  className="bg-gray-700/50 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                    <div className="relative">
                        {post.imageUrl ? (
                            <img
                                src={post.imageUrl}
                                alt="Post preview"
                                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                            />
                        ) : post.videoUrl ? (
                            <div className="w-10 h-10 rounded-md bg-black flex items-center justify-center border border-gray-600">
                                <span className="text-xs">Video</span>
                            </div>
                        ) : null}
                        {post.videoUrl && post.imageUrl && (
                            <div className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] px-1 rounded text-white font-bold">VID</div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-300 truncate" title={post.content}>
                        {post.content}
                      </p>
                      
                      {/* Date Display or Edit Input */}
                      {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                              <input 
                                type="datetime-local"
                                value={editTimeValue}
                                onChange={(e) => setEditTimeValue(e.target.value)}
                                className="text-xs bg-gray-900 border border-blue-500 rounded px-1 py-0.5 text-white"
                              />
                              <button onClick={() => saveReschedule(post.id)} className="text-green-400 hover:text-green-300" title="Lưu">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button onClick={cancelReschedule} className="text-red-400 hover:text-red-300" title="Hủy">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                          </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                            {post.scheduledTime}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                    {isScheduled ? (
                      <>
                        {!isEditing && (
                            <button
                                onClick={() => startRescheduling(post)}
                                className="p-1.5 text-gray-300 hover:text-blue-300 hover:bg-gray-600 rounded transition"
                                title="Đổi giờ (Lên lịch lại)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        )}
                        
                        <button
                          onClick={() => handleUpdateStatus(post.id, 'Posted')}
                          className="px-2 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition whitespace-nowrap"
                          title="Bỏ qua lịch trình và đăng ngay lập tức"
                        >
                          Đăng Ngay
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus(post.id, 'Failed')}
                          className="px-2 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition whitespace-nowrap"
                          title="Hủy bài đăng này"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 border rounded-full whitespace-nowrap ${displayInfo.className}`}
                      >
                        {displayInfo.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
};

export default SchedulerAgent;
