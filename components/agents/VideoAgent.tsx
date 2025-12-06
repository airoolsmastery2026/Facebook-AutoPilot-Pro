import React, { useState, useRef, useEffect } from 'react';
import Card from '../Card';
import { generateVideo, ApiKeyError, VideoConfig } from '../../services/geminiService';
import { VideoIcon } from '../icons/VideoIcon';

interface VideoAgentProps {
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
}

interface ImageFile {
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
  'Đang dựng kịch bản 3D & Ánh sáng...',
  'Đang render khung hình (Ray Tracing)...',
  'Đang xử lý chuyển động vật lý...',
  'Đang áp dụng bộ lọc điện ảnh...',
  'Đang xuất bản video độ phân giải cao...',
  'Gần xong rồi, video của bạn sẽ rất tuyệt...',
];

const VideoAgent: React.FC<VideoAgentProps> = ({ addLog }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<ImageFile | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    const checkApiKeyStatus = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const isSelected = await window.aistudio.hasSelectedApiKey();
        setHasApiKeySelected(isSelected);
        if (!isSelected) {
          setNeedsApiKeySelection(true);
          setError(
            'Để tạo video, bạn cần chọn Khóa API. Khóa này phải được liên kết với một dự án GCP có tính năng thanh toán được bật.'
          );
        }
      } else {
        // Fallback for environments where window.aistudio is not available
        if (process.env.API_KEY) {
          setHasApiKeySelected(true);
        } else {
          setNeedsApiKeySelection(true);
          setError(
            'API_KEY chưa được cấu hình. Để tạo video, bạn cần chọn Khóa API từ AI Studio.'
          );
        }
      }
    };
    checkApiKeyStatus();
  }, []);

  useEffect(() => {
    if (isLoading) {
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
  }, [isLoading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const removeImage = () => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      setImage(null);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKeySelected(true);
        setNeedsApiKeySelection(false);
        setError(null);
      } catch (err) {
        console.error('Error opening API key selection:', err);
        setError('Không thể mở hộp thoại chọn Khóa API. Vui lòng thử lại.');
        setNeedsApiKeySelection(true);
      }
    } else {
      setError('window.aistudio API không có sẵn.');
      setNeedsApiKeySelection(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    if (!hasApiKeySelected) {
      setNeedsApiKeySelection(true);
      setError('Bạn cần chọn Khóa API để tạo video.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl('');
    
    const modelNameDisplay = modelMode === 'quality' ? 'Veo 3.1 Cinematic' : 'Veo 3.1 Fast';
    addLog('VideoAgent', `Bắt đầu tạo video (${modelNameDisplay}, ${resolution}) cho "${prompt}"`);

    try {
      const imagePayload = image
        ? {
            imageBytes: await fileToBase64(image.file),
            mimeType: image.file.type,
          }
        : null;

      const config: VideoConfig = {
          model: modelMode === 'quality' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview',
          aspectRatio: aspectRatio,
          resolution: resolution
      };

      const result = await generateVideo(prompt, imagePayload, config);
      setGeneratedVideoUrl(result);
      addLog('VideoAgent', `Tạo video thành công`);
    } catch (err) {
      if (err instanceof ApiKeyError) {
        setNeedsApiKeySelection(true);
        setError(err.message);
        addLog('VideoAgent', `Tạo video thất bại: ${err.message}`, 'Error');
      } else {
        const errorMessage = (err as Error).message || 'Đã xảy ra lỗi không xác định.';
        setError(errorMessage);
        addLog('VideoAgent', `Tạo video thất bại: ${errorMessage}`, 'Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Trợ lý Video (Veo 3.1)" icon={<VideoIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Tạo video chất lượng điện ảnh bằng <b>Google Veo 3.1</b>.
        </p>

        {needsApiKeySelection && (
          <div className="bg-orange-900/40 border border-orange-700 text-orange-200 p-4 rounded-lg space-y-3" role="alert" aria-live="polite">
            <p className="font-semibold">Yêu cầu Khóa API:</p>
            <p className="text-sm">
              Để sử dụng tính năng tạo video, bạn phải chọn một Khóa API được liên kết với một dự án Google Cloud có tính năng thanh toán được bật.
            </p>
            {error && <p className="text-red-300 text-xs italic">{error}</p>}
            <button
              onClick={handleSelectApiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition"
              disabled={isLoading}
            >
              Chọn Khóa API
            </button>
          </div>
        )}

        {/* Configuration Controls */}
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 grid grid-cols-2 gap-3">
            <div className="col-span-2">
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Mô hình AI</label>
                <div className="flex bg-gray-700 rounded-md p-1">
                    <button 
                        onClick={() => setModelMode('fast')}
                        disabled={isLoading}
                        className={`flex-1 text-xs py-1.5 rounded transition ${modelMode === 'fast' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Veo 3.1 Fast (Tốc độ)
                    </button>
                    <button 
                        onClick={() => setModelMode('quality')}
                        disabled={isLoading}
                        className={`flex-1 text-xs py-1.5 rounded transition ${modelMode === 'quality' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Veo 3.1 Cinematic (HQ)
                    </button>
                </div>
            </div>
            
            <div>
                 <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Tỷ lệ khung hình</label>
                 <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    disabled={isLoading}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500"
                 >
                     <option value="16:9">16:9 (Ngang - Youtube)</option>
                     <option value="9:16">9:16 (Dọc - Tiktok/Reels)</option>
                 </select>
            </div>
            
            <div>
                 <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Độ phân giải</label>
                 <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    disabled={isLoading}
                    className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500"
                 >
                     <option value="720p">720p (HD)</option>
                     <option value="1080p">1080p (Full HD)</option>
                 </select>
            </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Khung hình bắt đầu (Image-to-Video) <span className="text-gray-500 italic">- Tùy chọn</span>
          </label>
          <div className="p-4 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-lg">
            {image && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
                <div className="relative group">
                  <img
                    src={image.previewUrl}
                    alt="preview"
                    className="w-full h-20 object-cover rounded-md border border-gray-500"
                  />
                  <div className="absolute top-1 left-1 bg-black/70 text-[10px] px-1 rounded text-white font-bold">START FRAME</div>
                  <button
                    onClick={removeImage}
                    className="absolute top-0 right-0 m-1 bg-red-600/70 hover:bg-red-600 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!image || isLoading || needsApiKeySelection}
              className="w-full text-sm text-center py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {image ? (
                  'Thay đổi ảnh bắt đầu'
              ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Tải lên ảnh bắt đầu
                  </>
              )}
            </button>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
                Veo sẽ tạo video chuyển động nối tiếp từ hình ảnh này.
            </p>
          </div>
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={image ? "Mô tả cách hình ảnh chuyển động..." : "Nhập mô tả video (ví dụ: 'một con mèo robot lái ô tô')"}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={needsApiKeySelection}
        />

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt || needsApiKeySelection}
          className={`w-full text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${modelMode === 'quality' ? 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {isLoading ? 'Đang tạo Video...' : `Tạo Video (${modelMode === 'quality' ? 'Cinematic' : 'Fast'})`}
        </button>

        {(isLoading || generatedVideoUrl || error) && (
          <div className="w-full aspect-video bg-gray-900/50 rounded-md flex items-center justify-center mt-4 p-2">
            {isLoading && (
              <div className="text-center">
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
            {generatedVideoUrl && !isLoading && (
              <video
                src={generatedVideoUrl}
                controls
                className="w-full h-full object-contain rounded-md shadow-lg"
              />
            )}
            {error && !isLoading && !needsApiKeySelection && (
              <p className="text-red-400 text-sm text-center px-4">{error}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default VideoAgent;