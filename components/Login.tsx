
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
  isLoading: boolean;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
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
              Mã Access Token Facebook
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Dán mã của bạn vào đây"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
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
              'Kết nối & Kích hoạt Trợ lý'
            )}
          </button>
        </form>

        <div className="mt-8 text-xs text-gray-500 p-4 bg-gray-900 rounded-lg">
          <h4 className="font-bold text-gray-400 mb-2">
            Cách lấy Mã Access Token của bạn:
          </h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Truy cập{' '}
              <a
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Graph API Explorer
              </a>
              .
            </li>
            <li>Nhấp vào "Get Token" → "Get User Access Token".</li>
            <li>
              Yêu cầu các quyền như `pages_manage_posts`,
              `publish_to_groups`, v.v.
            </li>
            <li>Sao chép mã được tạo và dán vào ô trên.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Login;
