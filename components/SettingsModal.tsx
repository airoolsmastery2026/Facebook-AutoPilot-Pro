
import React, { useState } from 'react';
import type { FacebookAccount } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getProfile } from '../services/facebookService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserToken: string | null;
  onSwitchAccount: (token: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUserToken,
  onSwitchAccount,
}) => {
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [accounts, setAccounts] = useLocalStorage<FacebookAccount[]>('fb-accounts', []);
  const [activeTab, setActiveTab] = useState<'general' | 'accounts'>('general');
  const [newAccountToken, setNewAccountToken] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddAccount = async () => {
    if (!newAccountToken.trim()) return;
    setIsAddingAccount(true);
    setAddAccountError(null);
    try {
      // Check if already exists
      if (accounts.some(acc => acc.accessToken === newAccountToken.trim())) {
        throw new Error('Tài khoản này đã tồn tại trong danh sách.');
      }

      const profile = await getProfile(newAccountToken.trim());
      const newAccount: FacebookAccount = {
        id: profile.id,
        name: profile.name,
        pictureUrl: profile.pictureUrl,
        accessToken: newAccountToken.trim(),
      };
      
      // Update accounts list, removing duplicates by ID just in case
      setAccounts(prev => [newAccount, ...prev.filter(a => a.id !== newAccount.id)]);
      setNewAccountToken('');
    } catch (err) {
      setAddAccountError((err as Error).message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleRemoveAccount = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này khỏi danh sách?')) {
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Cài đặt & Quản lý</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium transition ${
              activeTab === 'general' ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            onClick={() => setActiveTab('general')}
          >
            Cấu hình Chung (API)
          </button>
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium transition ${
              activeTab === 'accounts' ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            onClick={() => setActiveTab('accounts')}
          >
            Quản lý Nick Facebook
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gemini API Key (AI Studio)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Nhập khóa API bắt đầu bằng AIza..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nếu để trống, ứng dụng sẽ cố gắng sử dụng biến môi trường hệ thống.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Khóa API khác (Nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: OpenWeather API, NewsAPI..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tính năng đang phát triển.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Add New Account */}
              <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Thêm Nick mới</h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newAccountToken}
                    onChange={(e) => setNewAccountToken(e.target.value)}
                    placeholder="Dán Token Facebook (EAA...)"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <button
                    onClick={handleAddAccount}
                    disabled={isAddingAccount || !newAccountToken}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {isAddingAccount ? 'Đang thêm...' : 'Thêm'}
                  </button>
                </div>
                {addAccountError && <p className="text-red-400 text-xs mt-2">{addAccountError}</p>}
              </div>

              {/* Account List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Danh sách tài khoản ({accounts.length})</h3>
                <div className="space-y-2">
                  {accounts.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Chưa lưu tài khoản nào.</p>
                  ) : (
                    accounts.map(acc => {
                      const isActive = acc.accessToken === currentUserToken;
                      return (
                        <div key={acc.id} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-700/50 border-gray-600'}`}>
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <img src={acc.pictureUrl} alt={acc.name} className="w-10 h-10 rounded-full border border-gray-500" />
                            <div className="truncate">
                              <p className="text-sm font-medium text-white truncate">{acc.name}</p>
                              <p className="text-xs text-gray-400 truncate w-32 md:w-48">{acc.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isActive ? (
                              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Đang dùng</span>
                            ) : (
                              <button
                                onClick={() => onSwitchAccount(acc.accessToken)}
                                className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition"
                              >
                                Chuyển
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveAccount(acc.id)}
                              className="text-gray-400 hover:text-red-400 p-1"
                              title="Xóa tài khoản"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
