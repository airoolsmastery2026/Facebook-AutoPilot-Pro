
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateText, suggestContentTopics, generatePostTitle } from '../../services/geminiService';
import { PenIcon } from '../icons/PenIcon';

interface ContentAgentProps {
  onContentGenerated: (content: string, title: string) => void;
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
  const [title, setTitle] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isTitling, setIsTitling] = useState(false);

  // Sync state with props (Manual + Auto)
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (generatedContent) setGeneratedText(generatedContent);
  }, [generatedContent]);

  const handleSuggestTopics = async () => {
      if (!topic) return;
      setIsSuggesting(true);
      const suggestions = await suggestContentTopics(topic);
      setSuggestedTopics(suggestions);
      setIsSuggesting(false);
  }

  const handleGenerateTitle = async () => {
      if (!generatedText) return;
      setIsTitling(true);
      const newTitle = await generatePostTitle(generatedText);
      setTitle(newTitle);
      onContentGenerated(generatedText, newTitle); // Update parent
      setIsTitling(false);
  }

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setGeneratedText('');
    const prompt = `Create a natural, engaging Facebook post about "${topic}". Include relevant hashtags. The tone should be conversational and friendly in Vietnamese.`;
    const result = await generateText(prompt);
    
    // Auto generate title after content
    const autoTitle = await generatePostTitle(result);
    setTitle(autoTitle);
    
    setGeneratedText(result);
    onContentGenerated(result, autoTitle);
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
        
        {/* Topic Input with Suggest Button */}
        <div className="flex gap-2">
            <div className="relative flex-1">
                <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Nhập chủ đề (VD: Công nghệ AI)..."
                disabled={isAutoGenerating}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:opacity-50"
                />
            </div>
            <button
                onClick={handleSuggestTopics}
                disabled={isSuggesting || isAutoGenerating || !topic}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-md text-sm font-medium transition disabled:bg-gray-700"
                title="Gợi ý chủ đề liên quan"
            >
                {isSuggesting ? '...' : '💡 Gợi ý'}
            </button>
        </div>

        {/* Suggested Topics Chips */}
        {suggestedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
                {suggestedTopics.map((s, idx) => (
                    <button 
                        key={idx}
                        onClick={() => { setTopic(s); setSuggestedTopics([]); }}
                        className="text-xs bg-gray-800 hover:bg-blue-900 border border-gray-600 hover:border-blue-500 rounded-full px-3 py-1 transition text-gray-300"
                    >
                        {s}
                    </button>
                ))}
            </div>
        )}

        {/* Title Field (Visible after content gen or optional) */}
        {(generatedText || title) && (
            <div className="animate-fade-in relative">
                <label className="text-xs text-gray-400 block mb-1">Tiêu đề bài viết</label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); onContentGenerated(generatedText, e.target.value); }}
                        placeholder="Tiêu đề bài viết..."
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                     <button
                        onClick={handleGenerateTitle}
                        disabled={isTitling || !generatedText}
                        className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-3 rounded-md transition"
                        title="Tạo tiêu đề bằng AI từ nội dung"
                    >
                        {isTitling ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : '✨'}
                    </button>
                </div>
            </div>
        )}
        
        <button
          onClick={handleGenerate}
          disabled={isLoading || isAutoGenerating || !topic}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading || isAutoGenerating ? 'Đang viết bài...' : 'Tạo bài đăng'}
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
