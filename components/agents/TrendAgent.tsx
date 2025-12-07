import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateTrends, suggestRelatedNiches, ApiKeyError } from '../../services/geminiService';

interface TrendAgentProps {
  onTrendSelected: (trend: string) => void;
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  autoTrend?: string; // New prop for Auto-Pilot integration
}

const TrendAgent: React.FC<TrendAgentProps> = ({ onTrendSelected, addLog, autoTrend }) => {
  const [niche, setNiche] = useState('Công nghệ AI');
  const [trends, setTrends] = useState<{ text: string; urls: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // React to auto-detected trends from the Master Brain
  useEffect(() => {
      if (autoTrend) {
          setTrends({ text: autoTrend, urls: [] });
      }
  }, [autoTrend]);

  const handleScan = async () => {
    setIsLoading(true);
    setTrends(null);
    try {
        const result = await generateTrends(niche);
        setTrends(result);
        addLog('TrendAgent', `Đã quét xu hướng cho "${niche}"`);
    } catch (error) {
        if (error instanceof ApiKeyError) {
             addLog('TrendAgent', `Lỗi: ${(error as Error).message}`, 'Error');
        } else {
             addLog('TrendAgent', `Lỗi quét xu hướng: ${(error as Error).message}`, 'Error');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleSuggest = async () => {
      if (!niche) return;
      setIsSuggesting(true);
      try {
          const results = await suggestRelatedNiches(niche);
          setSuggestions(results);
          addLog('TrendAgent', `Đã gợi ý các chủ đề liên quan đến "${niche}"`);
      } catch (e) {
          addLog('TrendAgent', 'Lỗi lấy gợi ý.', 'Error');
      } finally {
          setIsSuggesting(false);
      }
  };

  const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <Card title="Trend Hunter (Săn Xu Hướng)" icon={<GlobeIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Sử dụng <b>Google Search Grounding</b> để tìm nội dung nóng hổi theo thời gian thực.
        </p>
        <div className="flex gap-2">
            <div className="flex-1 relative">
                <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Lĩnh vực (ví dụ: Bóng đá, Thời trang)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>
            
            <button
            onClick={handleSuggest}
            disabled={isSuggesting || !niche}
            className="bg-gray-700 hover:bg-gray-600 text-blue-300 font-medium py-2 px-3 rounded-md transition disabled:opacity-50 text-sm"
            title="Gợi ý chủ đề liên quan bằng AI"
            >
             {isSuggesting ? '...' : '🤖 Gợi ý'}
            </button>

            <button
            onClick={handleScan}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-purple-800 disabled:cursor-wait"
            >
            {isLoading ? '...' : 'Quét'}
            </button>
        </div>

        {/* Suggestions Chips */}
        {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
                {suggestions.map((s, i) => (
                    <button 
                        key={i} 
                        onClick={() => { setNiche(s); setSuggestions([]); }}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-full px-3 py-1 transition"
                    >
                        + {s}
                    </button>
                ))}
            </div>
        )}

        {trends && (
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 space-y-3 animate-fade-in">
                <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {trends.text}
                </div>
                {trends.urls.length > 0 && (
                     <div className="text-xs text-blue-400">
                        <p className="font-semibold text-gray-500 mb-1">Nguồn tham khảo:</p>
                        <div className="flex flex-wrap gap-2">
                            {trends.urls.slice(0, 3).map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px]">
                                    Link {idx + 1}
                                </a>
                            ))}
                        </div>
                     </div>
                )}
                <button
                    onClick={() => {
                        onTrendSelected(`Tin tức mới nhất về ${niche}: ${trends.text.substring(0, 50)}...`);
                    }}
                    className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded text-blue-300 border border-blue-900/30"
                >
                    Viết bài về xu hướng này ➔
                </button>
            </div>
        )}
      </div>
    </Card>
  );
};

export default TrendAgent;