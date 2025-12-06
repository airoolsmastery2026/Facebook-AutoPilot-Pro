
import React, { useState, useEffect, useRef } from 'react';
import Card from '../Card';
import { HeartIcon } from '../icons/HeartIcon';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { generateComment } from '../../services/geminiService';

interface InteractionAgentProps {
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
}

const InteractionAgent: React.FC<InteractionAgentProps> = ({ addLog }) => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Replaced single interactionType with two independent toggles
  const [enableLikes, setEnableLikes] = useLocalStorage<boolean>('enable-likes', true);
  const [enableComments, setEnableComments] = useLocalStorage<boolean>('enable-comments', false);

  const [interests, setInterests] = useLocalStorage<string>(
    'user-interests',
    'AI, công nghệ, khởi nghiệp, công nghệ mới nhất, xu hướng AI',
  );
  const [exampleComments, setExampleComments] = useLocalStorage<string>(
    'example-comments',
    'Bài viết tuyệt vời!\nQuan điểm thú vị.\nCảm ơn đã chia sẻ!',
  );
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const runAgent = async () => {
      if (!isActive) return;

      const allInterests = interests
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      if (allInterests.length === 0) {
        addLog('InteractionAgent', 'Vui lòng đặt sở thích để bắt đầu.', 'Error');
        setIsActive(false);
        return;
      }

      if (!enableLikes && !enableComments) {
        addLog('InteractionAgent', 'Vui lòng chọn ít nhất một loại tương tác (Like hoặc Bình luận).', 'Error');
        setIsActive(false);
        return;
      }

      const randomInterest =
        allInterests[Math.floor(Math.random() * allInterests.length)];
      const engagement = ['cao', 'trung bình', 'lan truyền'][
        Math.floor(Math.random() * 3)
      ];
      
      addLog(
        'InteractionAgent',
        `Đã tìm thấy bài đăng về "${randomInterest}" với mức tương tác ${engagement}.`,
      );

      setIsProcessing(true);

      try {
        // Handle Likes/Reactions
        if (enableLikes) {
          await new Promise((res) => setTimeout(res, 1000)); // Simulate reading time
          const reactions = ['Thích', 'Yêu thích', 'Thương thương', 'Wow'];
          const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
          addLog('InteractionAgent', `Đã bày tỏ cảm xúc "${randomReaction}" cho bài đăng.`);
        }

        // Handle Comments
        if (enableComments) {
          if (!exampleComments.trim()) {
            addLog('InteractionAgent', 'Bỏ qua bình luận: Chưa thiết lập bình luận mẫu.', 'Error');
          } else {
            // Add a small delay if we also liked the post
            if (enableLikes) await new Promise((res) => setTimeout(res, 1500));

            const comment = await generateComment(
              randomInterest,
              interests,
              exampleComments,
            );
            
            if (comment.startsWith('Error:')) {
              addLog('InteractionAgent', comment, 'Error');
            } else {
              addLog('InteractionAgent', `Đã bình luận: "${comment}"`);
            }
          }
        }
      } catch (error) {
        addLog('InteractionAgent', 'Gặp lỗi trong quá trình tương tác.', 'Error');
      }

      setIsProcessing(false);

      // Schedule next run with a random delay (5-15 seconds)
      const randomDelay = Math.random() * 10000 + 5000; 
      timeoutRef.current = window.setTimeout(runAgent, randomDelay);
    };

    if (isActive) {
      addLog('InteractionAgent', 'Trợ lý đã được Kích hoạt');
      runAgent();
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      addLog('InteractionAgent', 'Trợ lý đã bị Hủy kích hoạt');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleToggle = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setIsActive(true);
    }
  };

  const isDisabled = isActive || isProcessing;

  return (
    <Card title="Trợ lý Tương tác" icon={<HeartIcon />}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Tự động tương tác (Like, Comment) với các bài đăng theo sở thích.
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div
              className={`w-3 h-3 rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-500'
              } ${isProcessing ? 'animate-pulse' : ''}`}
            ></div>
            <span className="text-sm font-medium">
              {isProcessing
                ? 'Đang xử lý...'
                : isActive
                ? 'Hoạt động'
                : 'Không hoạt động'}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
            isActive
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          } disabled:opacity-50 disabled:cursor-wait`}
        >
          {isActive ? 'Hủy kích hoạt' : 'Kích hoạt'}
        </button>
      </div>

      <div className="my-4 border-t border-gray-700" />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="interests"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Sở thích của bạn (phân cách bằng dấu phẩy)
          </label>
          <input
            id="interests"
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            disabled={isDisabled}
            placeholder="ví dụ: AI, công nghệ, khởi nghiệp"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cấu hình hành động
          </label>
          <div className="flex flex-col space-y-2">
            {/* Toggle Like */}
            <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md border border-gray-700">
              <span className="text-sm text-gray-300">Tự động Thả cảm xúc</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLikes}
                  onChange={(e) => setEnableLikes(e.target.checked)}
                  disabled={isDisabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {/* Toggle Comment */}
            <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md border border-gray-700">
              <span className="text-sm text-gray-300">Tự động Bình luận (AI)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableComments}
                  onChange={(e) => setEnableComments(e.target.checked)}
                  disabled={isDisabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {enableComments && (
          <div className="animate-fade-in">
            <label
              htmlFor="exampleComments"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Bình luận mẫu (để AI học phong cách)
            </label>
            <textarea
              id="exampleComments"
              value={exampleComments}
              onChange={(e) => setExampleComments(e.target.value)}
              disabled={isDisabled}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Bài viết tuyệt vời!&#10;Quan điểm thú vị.&#10;Cảm ơn đã chia sẻ!"
            />
            <p className="text-xs text-gray-500 mt-1">
              AI sẽ tạo bình luận mới dựa trên các mẫu này và chủ đề bài viết.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InteractionAgent;
