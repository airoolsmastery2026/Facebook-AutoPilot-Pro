
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateText, getDeepTopicAnalysis, generatePostTitle, ApiKeyError } from '../../services/geminiService';
import { PenIcon } from '../icons/PenIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import type { TopicAnalysis } from '../../types';

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
  
  // Advanced Suggestions State
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysis | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<'trending' | 'popular' | 'related'>('trending');

  const [isTitling, setIsTitling] = useState(false);

  // Sync state with props (Manual + Auto)
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (generatedContent) setGeneratedText(generatedContent);
  }, [generatedContent]);

  const handleSuggestTopics = async () => {
      if (!topic) {
          alert("Vui lòng nhập chủ đề chính để AI phân tích!");
          return;
      }
      setIsSuggesting(true);
      setTopicAnalysis(null);
      try {
        const analysis = await getDeepTopicAnalysis(topic);
        setTopicAnalysis(analysis);
        // Default to trending if available, otherwise fallback
        if (analysis.trending.length > 0) setActiveSuggestionTab('trending');
        else if (analysis.popular.length > 0) setActiveSuggestionTab('popular');
        
        addLog('ContentAgent', `Đã phân tích chuyên sâu chủ đề "${topic}"`);
      } catch (error) {
        addLog('ContentAgent', `Lỗi gợi ý chủ đề: ${(error as Error).message}`, 'Error');
      } finally {
        setIsSuggesting(false);
      }
  }

  const handleGenerateTitle = async () => {
      if (!generatedText) return;
      setIsTitling(true);
      try {
        const newTitle = await generatePostTitle(generatedText);
        setTitle(newTitle);
        onContentGenerated(generatedText, newTitle); // Update parent
      } catch (error) {
        addLog('ContentAgent', `Lỗi tạo tiêu đề: ${(error as Error).message}`, 'Error');
      } finally {
        setIsTitling(false);
      }
  }

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setGeneratedText('');
    
    try {
        const prompt = `Create a natural, engaging Facebook post about "${topic}". Include relevant hashtags. The tone should be conversational and friendly in Vietnamese.`;
        const result = await generateText(prompt);
        
        // Auto generate title after content
        let autoTitle = '';
        try {
            autoTitle = await generatePostTitle(result);
            setTitle(autoTitle);
        } catch (e) {
            console.warn('Could not auto-generate title', e);
        }
        
        setGeneratedText(result);
        onContentGenerated(result, autoTitle);
        addLog('ContentAgent', `Đã tạo bài đăng về "${topic}"`);
    } catch (error) {
         const msg = (error as Error).message;
         if (error instanceof ApiKeyError) {
             setGeneratedText(`Lỗi: ${msg}`);
         } else {
             setGeneratedText(`Lỗi: ${msg}`);
         }
         addLog('ContentAgent', `Tạo nội dung thất bại: ${msg}`, 'Error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedText) return;
    const element = document.createElement("a");
    const contentToSave = `TIÊU ĐỀ: ${title}\n\nNỘI DUNG:\n${generatedText}\n\nCHỦ ĐỀ: ${topic}`;
    const file = new Blob([contentToSave], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `facebook-post-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog('ContentAgent', 'Đã tải nội dung xuống máy tính.');
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-md text-sm font-medium transition disabled:bg-gray-700 flex items-center gap-1 min-w-[100px] justify-center"
                title="Phân tích sâu: Hot Trend, Phổ biến, Liên quan"
            >
                {isSuggesting ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <>💡 Gợi ý</>
                )}
            </button>
        </div>

        {/* Advanced Categorized Suggestions */}
        {topicAnalysis && (
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-3 animate-fade-in">
                {/* Tabs */}
                <div className="flex border-b border-gray-700 mb-2">
                    <button 
                        onClick={() => setActiveSuggestionTab('trending')}
                        className={`flex-1 pb-2 text-xs font-bold uppercase transition ${activeSuggestionTab === 'trending' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-white'}`}
                    >
                        🔥 Mới nhất (Viral)
                    </button>
                    <button 
                        onClick={() => setActiveSuggestionTab('popular')}
                        className={`flex-1 pb-2 text-xs font-bold uppercase transition ${activeSuggestionTab === 'popular' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}
                    >
                        🏆 Phổ biến nhất
                    </button>
                    <button 
                        onClick={() => setActiveSuggestionTab('related')}
                        className={`flex-1 pb-2 text-xs font-bold uppercase transition ${activeSuggestionTab === 'related' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-white'}`}
                    >
                        🔗 Liên quan
                    </button>
                </div>

                {/* List Content */}
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {topicAnalysis[activeSuggestionTab].length > 0 ? (
                        topicAnalysis[activeSuggestionTab].map((s, idx) => (
                            <button 
                                key={idx}
                                onClick={() => { setTopic(s); setTopicAnalysis(null); }}
                                className={`text-xs border rounded-full px-3 py-1 transition text-white ${
                                    activeSuggestionTab === 'trending' ? 'bg-red-900/30 border-red-500/50 hover:bg-red-600' :
                                    activeSuggestionTab === 'popular' ? 'bg-blue-900/30 border-blue-500/50 hover:bg-blue-600' :
                                    'bg-green-900/30 border-green-500/50 hover:bg-green-600'
                                }`}
                            >
                                {s}
                            </button>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 italic w-full text-center py-2">Không tìm thấy dữ liệu cho mục này.</p>
                    )}
                </div>
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
          <div className="relative animate-fade-in">
              <textarea
                value={generatedText}
                readOnly
                rows={6}
                className="w-full mt-4 p-3 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-gray-300"
              />
              <button
                onClick={handleDownload}
                className="absolute top-6 right-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-md transition"
                title="Tải nội dung xuống (.txt)"
              >
                 <DownloadIcon />
              </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContentAgent;
