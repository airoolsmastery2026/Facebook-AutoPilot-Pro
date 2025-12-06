
import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LoginProps {
  onLogin: (token: string, apiKey?: string) => void;
  isLoading: boolean;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [token, setToken] = useState('');
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Check if env var exists to hide/show input initially
  useEffect(() => {
    if (!process.env.API_KEY && !apiKey) {
      setShowApiKeyInput(true);
    }
  }, [apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim(), apiKey.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400">
            Facebook AutoPilot Pro
          </h1>
          <p className="text-gray-400 mt-2">
            Trợ lý AI 24/7 của bạn cho Tự động hóa Facebook
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Mã Access Token Facebook (Bắt buộc)
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAA..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center mb-2 focus:outline-none"
            >
              {showApiKeyInput ? '▼' : '▶'} Cấu hình Nâng cao (AI Studio API Key)
            </button>
            
            {showApiKeyInput && (
              <div className="animate-fade-in">
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  AI Studio / Gemini API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cần thiết để sử dụng các tính năng tạo nội dung, ảnh và video.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Đang kết nối...
              </>
            ) : (
              'Kết nối & Kích hoạt'
            )}
          </button>
        </form>

        <div className="mt-8 text-xs text-gray-500 p-4 bg-gray-900 rounded-lg">
          <h4 className="font-bold text-gray-400 mb-2">
            Hướng dẫn lấy mã:
          </h4>
          <ul className="list-disc list-inside space-y-1">
             <li>
               <b>Facebook Token:</b> Truy cập <a href="https://developers.facebook.com/tools/explorer" target="_blank" className="text-blue-400 hover:underline">Graph API Explorer</a>.
             </li>
             <li>
               <b>Gemini API Key:</b> Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a>.
             </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
