

import React, { useState, useRef, useEffect } from 'react';
import Card from '../Card';
import { generateVideo, ApiKeyError } from '../../services/geminiService';
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
  'Đang liên hệ mô hình VEO...',
  'Đang dựng kịch bản cho mô tả của bạn...',
  'Đang kết xuất các khung hình đầu tiên...',
  'Quá trình này có thể mất vài phút...',
  'Đang áp dụng hiệu ứng hình ảnh...',
  'Đang hoàn thiện video...',
  'Sắp xong rồi...',
];

// FIX: Removed duplicate global `aistudio` type declaration.
// This type is assumed to be provided by the AI Studio environment.
// declare global {
//   interface Window {
//     aistudio: {
//       hasSelectedApiKey: () => Promise<boolean>;
//       openSelectKey: () => Promise<void>;
//     };
//   }
// }

const VideoAgent: React.FC<VideoAgentProps> = ({ addLog }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<ImageFile | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageIntervalRef = useRef<number | null>(null);

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
        // Fallback for environments where window.aistudio is not available (e.g., local dev without AI Studio platform)
        // If process.env.API_KEY is defined, assume it's set.
        if (process.env.API_KEY) {
          setHasApiKeySelected(true);
        } else {
          setNeedsApiKeySelection(true);
          setError(
            'API_KEY chưa được cấu hình. Để tạo video, bạn cần chọn Khóa API từ AI Studio hoặc cấu hình biến môi trường VITE_API_KEY. Khóa này phải được liên kết với một dự án GCP có tính năng thanh toán được bật.'
          );
        }
      }
    };
    checkApiKeyStatus();
  }, []); // Run once on mount

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
        // As per guideline, assume success immediately after opening the dialog.
        setHasApiKeySelected(true);
        setNeedsApiKeySelection(false);
        setError(null);
        // User can now try to generate the video again.
      } catch (err) {
        console.error('Error opening API key selection:', err);
        setError('Không thể mở hộp thoại chọn Khóa API. Vui lòng thử lại.');
        setNeedsApiKeySelection(true); // Keep prompt visible if dialog failed to open
      }
    } else {
      setError('window.aistudio API không có sẵn. Vui lòng đảm bảo bạn đang chạy trong môi trường AI Studio.');
      setNeedsApiKeySelection(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    // Check API key before starting generation
    if (!hasApiKeySelected) {
      setNeedsApiKeySelection(true);
      setError(
        'Bạn cần chọn Khóa API để tạo video. Vui lòng nhấp vào nút "Chọn Khóa API" bên dưới.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl('');
    addLog('VideoAgent', `Bắt đầu tạo video cho "${prompt}"`);

    try {
      const imagePayload = image
        ? {
            imageBytes: await fileToBase64(image.file),
            mimeType: image.file.type,
          }
        : null;

      const result = await generateVideo(prompt, imagePayload);
      setGeneratedVideoUrl(result);
      addLog('VideoAgent', `Tạo video thành công`);
    } catch (err) {
      if (err instanceof ApiKeyError) {
        setNeedsApiKeySelection(true); // Always show selection prompt for ApiKeyError
        setError(err.message);
        addLog('VideoAgent', `Tạo video thất bại: ${err.message}`, 'Error');
      } else {
        const errorMessage =
          (err as Error).message || 'Đã xảy ra lỗi không xác định.';
        setError(errorMessage);
        addLog('VideoAgent', `Tạo video thất bại: ${errorMessage}`, 'Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Trợ lý Video" icon={<VideoIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Tạo video ấn tượng từ mô tả văn bản, có thể kèm theo hình ảnh tham khảo.
        </p>

        {needsApiKeySelection && (
          <div className="bg-orange-900/40 border border-orange-700 text-orange-200 p-4 rounded-lg space-y-3" role="alert" aria-live="polite">
            <p className="font-semibold">Yêu cầu Khóa API:</p>
            <p className="text-sm">
              Để sử dụng tính năng tạo video (với mô hình Veo), bạn phải chọn một Khóa API được liên kết với một dự án Google Cloud có tính năng thanh toán được bật.
            </p>
            {error && <p className="text-red-300 text-xs italic">{error}</p>}
            <button
              onClick={handleSelectApiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition"
              disabled={isLoading}
            >
              Chọn Khóa API
            </button>
            <p className="text-xs text-gray-400">
              Tìm hiểu thêm về thanh toán tại{' '}
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                ai.google.dev/gemini-api/docs/billing
              </a>
            </p>
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Hình ảnh tham khảo (Tùy chọn)
          </label>
          <div className="p-4 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-lg">
            {image && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
                <div className="relative group">
                  <img
                    src={image.previewUrl}
                    alt="preview"
                    className="w-full h-20 object-cover rounded-md"
                  />
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
              className="w-full text-sm text-center py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {image ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
            </button>
          </div>
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Nhập mô tả video (ví dụ: 'một con mèo robot lái ô tô')"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={needsApiKeySelection}
        />

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt || needsApiKeySelection}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-red-800 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? 'Đang tạo Video...' : 'Tạo Video'}
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
                <p className="mt-4 text-sm text-gray-300">{loadingMessage}</p>
              </div>
            )}
            {generatedVideoUrl && !isLoading && (
              <video
                src={generatedVideoUrl}
                controls
                className="w-full h-full object-contain rounded-md"
              />
            )}
            {error && !isLoading && !needsApiKeySelection && ( // Only show generic error if not a key selection issue
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default VideoAgent;