
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateText } from '../../services/geminiService';
import { PenIcon } from '../icons/PenIcon';

interface ContentAgentProps {
  onContentGenerated: (content: string) => void;
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  initialTopic?: string; // New prop for integration
}

const ContentAgent: React.FC<ContentAgentProps> = ({
  onContentGenerated,
  addLog,
  initialTopic = '',
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update topic if prop changes (e.g. from Voice or Trend Agent)
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setGeneratedText('');
    const prompt = `Create a natural, engaging Facebook post about "${topic}". Include relevant hashtags. The tone should be conversational and friendly in Vietnamese.`;
    const result = await generateText(prompt);
    setGeneratedText(result);
    onContentGenerated(result);
    addLog('ContentAgent', `Đã tạo bài đăng về "${topic}"`);
    setIsLoading(false);
  };

  return (
    <Card title="Trợ lý Nội dung" icon={<PenIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Người viết do AI hỗ trợ để tạo các bài đăng, chú thích và hashtag hấp dẫn.
        </p>
        <div className="relative">
            <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Nhập chủ đề (ví dụ: 'cà phê buổi sáng')"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isLoading || !topic}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Đang tạo...
            </>
          ) : (
            'Tạo bài đăng'
          )}
        </button>
        {generatedText && (
          <textarea
            value={generatedText}
            readOnly
            rows={6}
            className="w-full mt-4 p-3 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-gray-300"
          />
        )}
      </div>
    </Card>
  );
};

export default ContentAgent;
