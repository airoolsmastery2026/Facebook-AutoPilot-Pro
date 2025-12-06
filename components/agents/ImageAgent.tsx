
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { generateImage, generateImagePromptFromContent } from '../../services/geminiService';
import { ImageIcon } from '../icons/ImageIcon';

interface ImageAgentProps {
  onImageGenerated: (imageUrl: string) => void;
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
  initialPrompt?: string; 
  generatedContent?: string; // Content from ContentAgent
}

const ImageAgent: React.FC<ImageAgentProps> = ({
  onImageGenerated,
  addLog,
  initialPrompt = '',
  generatedContent = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

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

  const handleAutoPrompt = async () => {
    if (!generatedContent) return;
    setIsPromptLoading(true);
    const newPrompt = await generateImagePromptFromContent(generatedContent);
    if (newPrompt) {
      setPrompt(newPrompt);
      addLog('ImageAgent', 'Đã tự động tạo prompt từ nội dung bài viết.');
    } else {
      addLog('ImageAgent', 'Không thể tạo prompt từ nội dung.', 'Error');
    }
    setIsPromptLoading(false);
  };

  const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <Card title="Trợ lý Hình ảnh" icon={<ImageIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Tạo hình ảnh độc đáo, chân thực cho bài đăng của bạn bằng AI.
        </p>
        
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Nhập mô tả hình ảnh..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
          />
          {generatedContent && (
            <button
              onClick={handleAutoPrompt}
              disabled={isPromptLoading}
              title="Tự động tạo mô tả từ nội dung bài viết"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 hover:text-yellow-300 transition disabled:opacity-50"
            >
              {isPromptLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <MagicWandIcon />
              )}
            </button>
          )}
        </div>

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