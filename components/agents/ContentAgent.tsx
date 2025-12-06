
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateText } from '../../services/geminiService';
import { PenIcon } from '../icons/PenIcon';

interface ContentAgentProps {
  onContentGenerated: (content: string) => void;
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  initialTopic?: string;
  generatedContent?: string; // Content injected by AutoPilot
  isAutoGenerating?: boolean; // State injected by AutoPilot
}

const ContentAgent: React.FC<ContentAgentProps> = ({
  onContentGenerated,
  addLog,
  initialTopic = '',
  generatedContent = '',
  isAutoGenerating = false
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with props (Manual + Auto)
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (generatedContent) setGeneratedText(generatedContent);
  }, [generatedContent]);

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
    <Card title="Trợ lý Nội dung" icon={<PenIcon />} className={isAutoGenerating ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
            {isAutoGenerating ? (
                <span className="text-blue-400 font-semibold animate-pulse">⚡ Auto-Pilot đang viết bài...</span>
            ) : (
                "Người viết do AI hỗ trợ để tạo các bài đăng, chú thích và hashtag hấp dẫn."
            )}
        </p>
        <div className="relative">
            <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Nhập chủ đề..."
            disabled={isAutoGenerating}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:opacity-50"
            />
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isLoading || isAutoGenerating || !topic}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading || isAutoGenerating ? 'Đang tạo...' : 'Tạo bài đăng'}
        </button>
        {generatedText && (
          <textarea
            value={generatedText}
            readOnly
            rows={6}
            className="w-full mt-4 p-3 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-gray-300 animate-fade-in"
          />
        )}
      </div>
    </Card>
  );
};

export default ContentAgent;
