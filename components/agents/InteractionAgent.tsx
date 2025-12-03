
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
  const [interactionType, setInteractionType] = useLocalStorage<
    'like' | 'comment'
  >('interaction-type', 'like');
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

      if (interactionType === 'like') {
        await new Promise((res) => setTimeout(res, 1000)); // Simulate time to "like"
        
        // Randomize emotional reactions
        const reactions = ['Thích', 'Yêu thích', 'Thương thương', 'Wow'];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        addLog('InteractionAgent', `Đã bày tỏ cảm xúc "${randomReaction}" cho bài đăng về "${randomInterest}"`);
      } else {
        if (!exampleComments.trim()) {
          addLog(
            'InteractionAgent',
            'Thêm bình luận mẫu để tạo bình luận.',
            'Error',
          );
        } else {
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

      setIsProcessing(false);

      // Schedule next run with a more natural, random delay (5-15 seconds)
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
            Tự động tương tác với các bài đăng dựa trên sở thích của bạn.
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
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Loại tương tác
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="interactionType"
                value="like"
                checked={interactionType === 'like'}
                onChange={() => setInteractionType('like')}
                disabled={isDisabled}
                className="form-radio bg-gray-700 border-gray-600 text-pink-500 focus:ring-pink-500 disabled:opacity-50"
              />
              <span
                className={`text-sm ${
                  isDisabled ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                Cảm xúc (Like/Love/Wow)
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="interactionType"
                value="comment"
                checked={interactionType === 'comment'}
                onChange={() => setInteractionType('comment')}
                disabled={isDisabled}
                className="form-radio bg-gray-700 border-gray-600 text-pink-500 focus:ring-pink-500 disabled:opacity-50"
              />
              <span
                className={`text-sm ${
                  isDisabled ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                Bình luận (AI)
              </span>
            </label>
          </div>
        </div>

        {interactionType === 'comment' && (
          <div>
            <label
              htmlFor="exampleComments"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Bình luận mẫu (mỗi dòng một bình luận)
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
          </div>
        )}
      </div>
    </Card>
  );
};

export default InteractionAgent;
