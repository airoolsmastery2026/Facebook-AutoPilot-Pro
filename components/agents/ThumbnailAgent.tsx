import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateThumbnail, ApiKeyError } from '../../services/geminiService';
import { ImageIcon } from '../icons/ImageIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface ThumbnailAgentProps {
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  videoTitle?: string;
  niche?: string;
  onThumbnailGenerated: (url: string) => void;
  generatedThumbnail?: string; // New prop for Auto-Pilot visual sync
  isAutoGenerating?: boolean;
}

const ThumbnailAgent: React.FC<ThumbnailAgentProps> = ({
  addLog,
  videoTitle = '',
  niche = '',
  onThumbnailGenerated,
  generatedThumbnail = '',
  isAutoGenerating = false
}) => {
  const [titleInput, setTitleInput] = useState(videoTitle);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync title from props
  useEffect(() => {
    if (videoTitle) setTitleInput(videoTitle);
  }, [videoTitle]);

  // Sync generated URL from parent (Auto-Pilot result)
  useEffect(() => {
    if (generatedThumbnail) setThumbnailUrl(generatedThumbnail);
  }, [generatedThumbnail]);

  const handleGenerate = async () => {
    if (!titleInput) {
        addLog('ThumbnailAgent', 'Cần tiêu đề để tạo Thumbnail.', 'Error');
        return;
    }
    
    setIsLoading(true);
    setThumbnailUrl('');
    addLog('ThumbnailAgent', `Đang tạo ảnh bìa/thumbnail cho: "${titleInput}"...`);

    try {
        const url = await generateThumbnail(titleInput, niche || "General");
        if (url) {
            setThumbnailUrl(url);
            onThumbnailGenerated(url);
            addLog('ThumbnailAgent', 'Đã tạo Thumbnail thành công (16:9).');
        } else {
            addLog('ThumbnailAgent', 'Không thể tạo Thumbnail.', 'Error');
        }
    } catch (e) {
        if (e instanceof ApiKeyError) {
             addLog('ThumbnailAgent', `Lỗi: ${(e as Error).message}`, 'Error');
        } else {
             addLog('ThumbnailAgent', `Lỗi tạo Thumbnail: ${(e as Error).message}`, 'Error');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!thumbnailUrl) return;
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    link.download = `thumbnail-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('ThumbnailAgent', 'Đã tải Thumbnail xuống máy tính.');
  };

  return (
    <Card 
        title="Trợ lý Thumbnail & Hub" 
        icon={<ImageIcon />} 
        className={isAutoGenerating ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : ''}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
            {isAutoGenerating ? (
                <span className="text-purple-400 font-semibold animate-pulse">⚡ Auto-Pilot đang thiết kế ảnh bìa...</span>
            ) : (
                "Tạo ảnh bìa và hình thu nhỏ (Thumbnail) bắt mắt, tối ưu tỷ lệ Click (CTR) cho Video."
            )}
        </p>

        <div className="flex gap-2">
             <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Nhập tiêu đề video hoặc nội dung chính..."
                disabled={isAutoGenerating}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
             />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || isAutoGenerating || !titleInput}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
        >
          {isLoading || isAutoGenerating ? 'Đang thiết kế...' : '✨ Tạo Thumbnail (16:9)'}
        </button>

        {(isLoading || isAutoGenerating || thumbnailUrl) && (
            <div className="relative w-full aspect-video bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden group flex items-center justify-center shadow-md">
                 {(isLoading || isAutoGenerating) && (
                     <div className="text-center z-10">
                        <svg className="animate-spin h-8 w-8 text-white mx-auto mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-xs text-gray-400 animate-pulse">AI đang vẽ...</p>
                     </div>
                 )}
                 {thumbnailUrl && (
                     <>
                        <img src={thumbnailUrl} alt="Generated Thumbnail" className="w-full h-full object-cover animate-fade-in" />
                        
                        {/* High Contrast Badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/30 backdrop-blur-sm">
                            ⚡ HIGH CTR
                        </div>

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button 
                                onClick={handleDownload}
                                className="bg-white text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 shadow-xl"
                             >
                                <DownloadIcon /> Tải Xuống
                             </button>
                        </div>
                     </>
                 )}
            </div>
        )}
      </div>
    </Card>
  );
};

export default ThumbnailAgent;