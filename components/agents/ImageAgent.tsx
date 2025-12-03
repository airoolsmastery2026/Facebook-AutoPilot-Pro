
import React, { useState } from 'react';
import Card from '../Card';
import { generateImage } from '../../services/geminiService';
import { ImageIcon } from '../icons/ImageIcon';

interface ImageAgentProps {
  onImageGenerated: (imageUrl: string) => void;
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
}

const ImageAgent: React.FC<ImageAgentProps> = ({
  onImageGenerated,
  addLog,
}) => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setImageUrl('');
    const result = await generateImage(prompt);
    if (result) {
      setImageUrl(result);
      onImageGenerated(result);
      addLog('ImageAgent', `Đã tạo hình ảnh cho "${prompt}"`);
    } else {
      addLog('ImageAgent', `Tạo hình ảnh thất bại`, 'Error');
    }
    setIsLoading(false);
  };

  return (
    <Card title="Trợ lý Hình ảnh" icon={<ImageIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Tạo hình ảnh độc đáo, chân thực cho bài đăng của bạn bằng AI.
        </p>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Nhập mô tả hình ảnh (ví dụ: 'một con mèo trong không gian')"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? 'Đang tạo...' : 'Tạo hình ảnh'}
        </button>
        <div className="w-full aspect-square bg-gray-700/50 rounded-md flex items-center justify-center mt-4">
          {isLoading && (
            <svg
              className="animate-spin h-8 w-8 text-white"
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
          )}
          {imageUrl && !isLoading && (
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full h-full object-cover rounded-md"
            />
          )}
          {!imageUrl && !isLoading && (
            <span className="text-gray-500 text-sm">Xem trước hình ảnh</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ImageAgent;
