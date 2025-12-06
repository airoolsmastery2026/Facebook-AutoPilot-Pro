
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
  addLog: (agent: string, action: string) => void;
  isAutoMode: boolean; // New prop
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
  addLog,
  isAutoMode,
}) => {
  const [scheduleTime, setScheduleTime] = useState(
    new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
  );

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
            // Check if this specific post is in the due list
            if (duePosts.some(p => p.id === post.id)) {
              return { ...post, status: 'Posted' };
            }
            return post;
          })
        );
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [posts, setPosts, addLog, isAutoMode]); // Depend on isAutoMode

  const handleSchedule = () => {
    if (!content) {
      alert('Vui lòng tạo nội dung trước.');
      return;
    }
    const newPost: ScheduledPost = {
      id: Date.now().toString(),
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      imageUrl,
      // Store as locale string for display, but Date constructor can parse it back
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
    addLog(
      'SchedulerAgent',
      `[Thủ công] Cập nhật bài đăng thành '${statusText}'`,
    );
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
              
              // Determine if we should show manual controls
              // Show if: Status is 'Scheduled' AND (Mode is Manual OR We want to allow manual override anyway)
              // Currently always showing manual controls for 'Scheduled' posts gives users power to force-post even in auto mode, 
              // but mostly useful in Manual mode.
              const isScheduled = post.status === 'Scheduled';

              return (
                <div
                  key={post.id}
                  className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post preview"
                        className="w-10 h-10 rounded-md object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        {post.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        {post.scheduledTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isScheduled ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(post.id, 'Posted')}
                          className="px-2 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition"
                          title="Đăng ngay (Thủ công)"
                        >
                          Đăng
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(post.id, 'Failed')}
                          className="px-2 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                          title="Hủy / Lỗi"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 border rounded-full ${displayInfo.className}`}
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
