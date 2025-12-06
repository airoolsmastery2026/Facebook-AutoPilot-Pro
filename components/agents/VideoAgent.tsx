
import React, { useState, useRef, useEffect } from 'react';
import Card from '../Card';
import { generateVideo, ApiKeyError, VideoConfig, ImagePayload, generateVideoPromptFromContent } from '../../services/geminiService';
import { VideoIcon } from '../icons/VideoIcon';
import { EyeIcon } from '../icons/EyeIcon'; 
import { DownloadIcon } from '../icons/DownloadIcon';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface VideoAgentProps {
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  generatedVideo?: string; // Video URL injected by AutoPilot
  generatedContent?: string; // Content injected by AutoPilot
  isAutoGenerating?: boolean; // State injected by AutoPilot
}

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const loadingMessages = [
  'Đang kết nối siêu máy tính VEO 3.1...',
  'Đang xác thực tài khoản & tín dụng...',
  'Đang dựng kịch bản 3D & Ánh sáng...',
  'Đang render khung hình (Ray Tracing)...',
  'Đang xử lý chuyển động vật lý...',
  'Đang áp dụng bộ lọc điện ảnh...',
  'Đang xuất bản video độ phân giải cao...',
  'Gần xong rồi, video của bạn sẽ rất tuyệt...',
];

const VideoAgent: React.FC<VideoAgentProps> = ({ addLog, generatedVideo, generatedContent = '', isAutoGenerating = false }) => {
  const [prompt, setPrompt] = useState('');
  const [videoTitle, setVideoTitle] = useState(''); 
  
  // Consistent Character State
  const [isConsistencyMode, setIsConsistencyMode] = useLocalStorage<boolean>('video-consistency-mode', false);
  const [characterDescription, setCharacterDescription] = useLocalStorage<string>('video-character-desc', '');
  const [refImages, setRefImages] = useState<ImageFile[]>([]);

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Track if current result is a preview
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageIntervalRef = useRef<number | null>(null);

  // Video Configuration State
  const [modelMode, setModelMode] = useState<'fast' | 'quality'>('fast');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  // New state for API key handling
  const [needsApiKeySelection, setNeedsApiKeySelection] = useState(false);
  const [hasApiKeySelected, setHasApiKeySelected] = useState(false);

  // Sync with Auto-Pilot results
  useEffect(() => {
    if (generatedVideo) {
        setGeneratedVideoUrl(generatedVideo);
        setIsPreviewMode(false); // Auto-pilot assumes standard gen unless specified otherwise
    }
  }, [generatedVideo]);

  // Initial Check for API Key
  useEffect(() => {
    const checkApiKeyStatus = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const isSelected = await window.aistudio.hasSelectedApiKey();
        setHasApiKeySelected(isSelected);
        if (!isSelected) {
          setNeedsApiKeySelection(true);
        }
      } else {
        // Fallback for dev environments without the wrapper
        if (process.env.API_KEY) {
          setHasApiKeySelected(true);
        } else {
          setNeedsApiKeySelection(true);
        }
      }
    };
    checkApiKeyStatus();
  }, []);

  useEffect(() => {
    const isWorking = isLoading || isAutoGenerating;

    if (isWorking) {
      messageIntervalRef.current = window.setInterval(() => {
        setLoadingMessage((prev) => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 4000);
    } else {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      setLoadingMessage(loadingMessages[0]);
    }

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [isLoading, isAutoGenerating]);

  // SMART PROMPT AUTO-GENERATION
  const handleAutoSmartPrompt = async () => {
      if (!generatedContent && !refImages.length) return;
      
      setIsPromptLoading(true);
      try {
          // Prepare payload details for service
          const imagePayloads: ImagePayload[] = await Promise.all(
              refImages.map(async (img) => ({
                  imageBytes: '', // Not needed for prompt gen logic context, just counting
                  mimeType: img.file.type
              }))
          );

          const newPrompt = await generateVideoPromptFromContent(
              generatedContent || "A creative video", 
              isConsistencyMode ? characterDescription : undefined,
              imagePayloads
          );
          
          setPrompt(newPrompt);
          addLog('VideoAgent', 'Đã tự động tạo prompt video từ nội dung & ảnh tham chiếu.');
      } catch (e) {
          console.error(e);
      } finally {
          setIsPromptLoading(false);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Convert FileList to Array and cast to File[] to ensure TS knows the type
    const newFiles: File[] = (Array.from(files) as File[]).slice(0, 3 - refImages.length);

    if (newFiles.length === 0 && refImages.length >= 3) {
        alert("Bạn chỉ có thể tải lên tối đa 3 ảnh tham chiếu.");
        return;
    }

    const newImageFiles: ImageFile[] = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file)
    }));

    setRefImages(prev => [...prev, ...newImageFiles]);
    
    // Reset input to allow selecting same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Trigger auto prompt if content exists
    if (generatedContent) {
        // Debounce slightly or just trigger (using timeout to let state settle)
        setTimeout(() => handleAutoSmartPrompt(), 500);
    }
  };

  const removeImage = (id: string) => {
    setRefImages(prev => {
        const target = prev.find(img => img.id === id);
        if (target) URL.revokeObjectURL(target.previewUrl);
        return prev.filter(img => img.id !== id);
    });
  };

  const handleSelectApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume success immediately to avoid race conditions
        setHasApiKeySelected(true);
        setNeedsApiKeySelection(false);
        setError(null);
      } catch (err) {
        console.error('Error opening API key selection:', err);
        setError('Không thể mở hộp thoại chọn Khóa API. Vui lòng thử lại.');
        setNeedsApiKeySelection(true);
      }
    } else {
      setError('Môi trường không hỗ trợ chọn khóa API tự động. Vui lòng nhập tay trong Cài đặt.');
      setNeedsApiKeySelection(true);
    }
  };

  const executeGeneration = async (isPreview: boolean = false) => {
    if (!prompt) return;

    // Strict Billing Check Check
    if (!hasApiKeySelected) {
      setNeedsApiKeySelection(true);
      setError('Vui lòng chọn Khóa API (Billing) để tiếp tục.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl('');
    setIsPreviewMode(isPreview);
    
    // Construct Prompt with Character Description if enabled (and manually edited)
    // Note: If Smart Prompt was used, it likely already includes this.
    // We append only if it seems missing or user typed a manual prompt.
    let finalPrompt = prompt;
    if (isConsistencyMode && characterDescription.trim() && !prompt.includes('Character:')) {
        finalPrompt = `[Character: ${characterDescription.trim()}] ${prompt}`;
    }

    // --- Config Logic ---
    let activeModel: VideoConfig['model'];
    let activeRes: VideoConfig['resolution'];
    let activeRatio: VideoConfig['aspectRatio'];

    if (isPreview) {
        // PREVIEW MODE: Force Fast Model, 720p
        if (refImages.length > 1) {
             activeModel = 'veo-3.1-generate-preview'; 
             activeRes = '720p';
             activeRatio = '16:9'; 
        } else {
             activeModel = 'veo-3.1-fast-generate-preview';
             activeRes = '720p';
             activeRatio = aspectRatio;
        }
    } else {
        // NORMAL MODE
        activeModel = modelMode === 'quality' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
        activeRes = resolution;
        activeRatio = aspectRatio;
        
        // Override constraints for Multi-Ref
        if (refImages.length > 1) {
            activeModel = 'veo-3.1-generate-preview'; 
            activeRes = '720p';
            activeRatio = '16:9';
        } else if (modelMode === 'quality') {
            activeModel = 'veo-3.1-generate-preview';
        }
    }

    addLog('VideoAgent', `Bắt đầu ${isPreview ? 'XEM TRƯỚC (Fast)' : 'tạo video'} cho "${finalPrompt.substring(0, 30)}..."`);

    try {
      const imagePayloads: ImagePayload[] = await Promise.all(
          refImages.map(async (img) => ({
              imageBytes: await fileToBase64(img.file),
              mimeType: img.file.type
          }))
      );

      const config: VideoConfig = {
          model: activeModel,
          aspectRatio: activeRatio,
          resolution: activeRes
      };

      const result = await generateVideo(finalPrompt, imagePayloads, config);
      setGeneratedVideoUrl(result);
      addLog('VideoAgent', `${isPreview ? 'Xem trước' : 'Tạo video'} thành công`);
    } catch (err) {
      if (err instanceof ApiKeyError) {
        // Critical: If API Key fails (404/Permission), reset selection to force user to pick a new one
        setHasApiKeySelected(false); 
        setNeedsApiKeySelection(true);
        
        const isBillingError = err.type === 'NOT_FOUND_404';
        const userMsg = isBillingError 
            ? 'Lỗi Tín dụng/Billing: Khóa API hiện tại không hỗ trợ Veo hoặc đã hết hạn mức.' 
            : err.message;

        setError(userMsg);
        addLog('VideoAgent', `Lỗi Billing: ${userMsg}`, 'Error');
      } else {
        const errorMessage = (err as Error).message || 'Đã xảy ra lỗi không xác định.';
        setError(errorMessage);
        addLog('VideoAgent', `Thất bại: ${errorMessage}`, 'Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => executeGeneration(false);
  const handlePreview = () => executeGeneration(true);

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const link = document.createElement('a');
    link.href = generatedVideoUrl;
    link.download = `ai-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('VideoAgent', 'Đã tải video xuống máy tính.');
  };

  const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <Card title="Trợ lý Video (Veo 3.1)" icon={<VideoIcon />} className={isAutoGenerating ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/20' : ''}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          {isAutoGenerating ? (
              <span className="text-red-400 font-semibold animate-pulse">⚡ Auto-Pilot đang tạo Video từ hình ảnh...</span>
          ) : (
             <>Tạo video chất lượng điện ảnh bằng <b>Google Veo 3.1</b>.</>
          )}
        </p>

        {/* --- BILLING & API KEY WARNING --- */}
        {needsApiKeySelection && (
          <div className="bg-gradient-to-r from-orange-900/60 to-red-900/60 border border-orange-500/50 text-orange-100 p-4 rounded-lg shadow-lg" role="alert" aria-live="polite">
            <div className="flex items-start gap-3">
                 <div className="text-2xl">💳</div>
                 <div className="flex-1 space-y-2">
                    <h4 className="font-bold text-white">Yêu cầu Tín dụng & Billing</h4>
                    <p className="text-sm">
                      Model <b>Veo 3.1</b> là mô hình cao cấp, yêu cầu Khóa API được liên kết với <b>Dự án Google Cloud có tính năng Thanh toán (Billing)</b>.
                    </p>
                    <p className="text-xs text-orange-300">
                      * Khóa miễn phí (Free Tier) sẽ không hoạt động và báo lỗi 404/Not Found.
                    </p>
                    
                    {error && (
                        <div className="bg-black/30 p-2 rounded text-xs text-red-300 font-mono border border-red-500/30">
                            Lỗi: {error}
                        </div>
                    )}

                    <button
                        onClick={handleSelectApiKey}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded shadow-md transition-all active:scale-95"
                        disabled={isLoading || isAutoGenerating}
                    >
                        Chọn Khóa API (Có Billing)
                    </button>
                    
                    <div className="text-center pt-1">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-white underline">
                            Xem bảng giá & hạn mức tín dụng
                        </a>
                    </div>
                 </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS PANEL --- */}
        <div className={`bg-gray-800/50 p-3 rounded-lg border border-gray-700 grid grid-cols-2 gap-3 transition-opacity ${needsApiKeySelection ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {/* Model & Consistency Toggle */}
            <div className="col-span-2 flex justify-between items-start gap-2">
                <div className="flex-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Mô hình AI</label>
                    <div className="flex bg-gray-700 rounded-md p-1">
                        <button 
                            onClick={() => setModelMode('fast')}
                            disabled={isLoading || isAutoGenerating || refImages.length > 1}
                            className={`flex-1 text-xs py-1.5 rounded transition ${modelMode === 'fast' && refImages.length <= 1 ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'}`}
                        >
                            Fast
                        </button>
                        <button 
                            onClick={() => setModelMode('quality')}
                            disabled={isLoading || isAutoGenerating}
                            className={`flex-1 text-xs py-1.5 rounded transition ${modelMode === 'quality' || refImages.length > 1 ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Cinematic
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                     <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block flex items-center gap-1">
                        Đồng nhất nhân vật
                        <span className="text-[8px] bg-gray-600 px-1 rounded text-white" title="Giữ nguyên đặc điểm nhân vật qua các video">BETA</span>
                     </label>
                     <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${isConsistencyMode ? 'bg-green-900/30 border-green-700' : 'bg-gray-700 border-transparent'}`}>
                        <input 
                            type="checkbox" 
                            id="consistency-toggle"
                            checked={isConsistencyMode} 
                            onChange={(e) => setIsConsistencyMode(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-500 text-green-600 focus:ring-green-500"
                        />
                        <label htmlFor="consistency-toggle" className={`text-xs select-none cursor-pointer ${isConsistencyMode ? 'text-green-300' : 'text-gray-400'}`}>
                            {isConsistencyMode ? 'Đang bật' : 'Đang tắt'}
                        </label>
                     </div>
                </div>
            </div>
            
            {/* Resolution & Aspect Ratio */}
            <div>
                 <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Tỷ lệ khung hình</label>
                 <select 
                    value={refImages.length > 1 ? '16:9' : aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    disabled={isLoading || isAutoGenerating || refImages.length > 1}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                 >
                     <option value="16:9">16:9 (Youtube)</option>
                     <option value="9:16">9:16 (Tiktok)</option>
                 </select>
            </div>
            
            <div>
                 <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Độ phân giải</label>
                 <select 
                    value={refImages.length > 1 ? '720p' : resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    disabled={isLoading || isAutoGenerating || refImages.length > 1}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                 >
                     <option value="720p">720p</option>
                     <option value="1080p">1080p</option>
                 </select>
            </div>
        </div>

        {/* --- CHARACTER CONSISTENCY PROMPT --- */}
        {isConsistencyMode && (
            <div className="animate-fade-in">
                <label className="text-xs text-green-400 block mb-1 font-bold">
                    Mô tả nhân vật (Master Prompt)
                </label>
                <textarea 
                    value={characterDescription}
                    onChange={(e) => setCharacterDescription(e.target.value)}
                    placeholder="Mô tả chi tiết nhân vật cố định (VD: Robot màu đỏ, mắt xanh, phong cách Cyberpunk...)"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-green-700/50 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-xs text-gray-200 placeholder-gray-500"
                    disabled={needsApiKeySelection}
                />
            </div>
        )}

        {/* --- MULTI-IMAGE UPLOAD --- */}
        <div className={needsApiKeySelection ? 'opacity-50 pointer-events-none' : ''}>
          <label className="text-xs text-gray-400 block mb-1">
             {refImages.length > 0 ? `Ảnh tham chiếu (${refImages.length}/3)` : 'Ảnh tham chiếu / Start Frame'}
             <span className="text-gray-500 italic ml-1">- Tối đa 3 ảnh</span>
          </label>
          
          <div className="p-3 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-lg">
            <div className="grid grid-cols-3 gap-2 mb-2">
                {refImages.map((img) => (
                    <div key={img.id} className="relative group aspect-square">
                        <img
                            src={img.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover rounded-md border border-gray-500"
                        />
                        <button
                            onClick={() => removeImage(img.id)}
                            disabled={isAutoGenerating}
                            className="absolute top-0 right-0 m-1 bg-red-600/70 hover:bg-red-600 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))}
                
                {/* Add Button */}
                {refImages.length < 3 && (
                     <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || needsApiKeySelection || isAutoGenerating}
                        className="flex flex-col items-center justify-center border border-gray-600 rounded-md hover:bg-gray-800 transition aspect-square text-gray-400 hover:text-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10px]">Thêm ảnh</span>
                    </button>
                )}
            </div>

            <input
              type="file"
              accept="image/*"
              multiple // Allow multiple selection
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {refImages.length > 1 && (
               <p className="text-[10px] text-yellow-500 mt-1 flex items-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                   Nhiều ảnh tham chiếu yêu cầu chế độ Cinematic, 720p, 16:9.
               </p>
          )}
        </div>
        
        {/* Video Title Input */}
        <div className="flex gap-2 items-center">
            <input
            type="text"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            placeholder="Tiêu đề video (Tùy chọn)..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-gray-500"
            disabled={needsApiKeySelection || isAutoGenerating}
            />
        </div>
        
        <div className="relative">
            <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={refImages.length > 0 ? "Mô tả hành động của nhân vật..." : "Nhập mô tả video..."}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 pr-8"
            disabled={needsApiKeySelection || isAutoGenerating}
            />
            {generatedContent && (
                <button
                    onClick={handleAutoSmartPrompt}
                    disabled={isPromptLoading || isAutoGenerating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-300 transition"
                    title="Tự động tạo prompt video chi tiết từ Nội dung & Ảnh"
                >
                    {isPromptLoading ? (
                         <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <MagicWandIcon />
                    )}
                </button>
            )}
        </div>

        <div className={`flex gap-2 ${needsApiKeySelection ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
            onClick={handlePreview}
            disabled={isLoading || !prompt || needsApiKeySelection || isAutoGenerating || refImages.length > 1}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={refImages.length > 1 ? "Xem trước nhanh không khả dụng cho Multi-Ref" : "Tạo nhanh video nháp 720p"}
            >
                <EyeIcon />
                Xem trước (Fast)
            </button>
            <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt || needsApiKeySelection || isAutoGenerating}
            className={`flex-[2] text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${modelMode === 'quality' || refImages.length > 1 ? 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
            {isLoading || isAutoGenerating ? 'Đang tạo...' : `Tạo Video ${refImages.length > 1 ? '(Multi-Ref)' : ''}`}
            </button>
        </div>

        {(isLoading || isAutoGenerating || generatedVideoUrl || error) && !needsApiKeySelection && (
          <div className="w-full aspect-video bg-gray-900/50 rounded-md flex items-center justify-center mt-4 p-2 relative overflow-hidden group">
            {(isLoading || isAutoGenerating) && (
              <div className="text-center z-10">
                <svg
                  className="animate-spin h-8 w-8 text-white mx-auto"
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
                <p className="mt-4 text-sm text-gray-300 animate-pulse">{loadingMessage}</p>
                <p className="mt-1 text-xs text-gray-500">(Thời gian ước tính: 1-3 phút)</p>
              </div>
            )}
            {generatedVideoUrl && !isLoading && !isAutoGenerating && (
              <div className="relative w-full h-full">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay={isPreviewMode} // Auto play if it's a preview
                    loop={isPreviewMode}
                    className="w-full h-full object-contain rounded-md shadow-lg animate-fade-in"
                  />
                  {isPreviewMode && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded shadow-md border border-yellow-300 z-10 opacity-80 pointer-events-none">
                          PREVIEW MODE (720p)
                      </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                     <button
                        onClick={handleDownload}
                        className="bg-gray-900/80 hover:bg-black text-white p-2 rounded-lg shadow-lg"
                        title="Tải video xuống"
                    >
                        <DownloadIcon />
                    </button>
                  </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default VideoAgent;
