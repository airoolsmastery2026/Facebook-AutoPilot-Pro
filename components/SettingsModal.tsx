
import React, { useState } from 'react';
import type { FacebookAccount } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getProfile } from '../services/facebookService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserToken: string | null;
  onSwitchAccount: (token: string) => void;
  accounts: FacebookAccount[];
  onUpdateAccounts: (accounts: FacebookAccount[] | ((prev: FacebookAccount[]) => FacebookAccount[])) => void;
}

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUserToken,
  onSwitchAccount,
  accounts,
  onUpdateAccounts,
}) => {
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [activeTab, setActiveTab] = useState<'general' | 'accounts'>('accounts');
  
  const [newAccountToken, setNewAccountToken] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  // State for inline delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // State for activation button feedback
  const [apiActivationStatus, setApiActivationStatus] = useState<'idle' | 'success'>('idle');

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleActivateApiKey = () => {
    if (!apiKey.trim()) return;
    setApiActivationStatus('success');
    showNotification('success', 'Đã lưu và kích hoạt Gemini API Key thành công!');
    setTimeout(() => {
      setApiActivationStatus('idle');
    }, 2000);
  };

  const handleAddAccount = async () => {
    const token = newAccountToken.trim();
    if (!token) return;
    
    // Basic validation
    if (!token.startsWith('EAA')) {
      showNotification('error', 'Token không hợp lệ. Token thường bắt đầu bằng "EAA..."');
      return;
    }

    setIsAddingAccount(true);
    setNotification(null);

    try {
      // 1. Fetch profile first to identify the user
      const profile = await getProfile(token);
      
      const newAccount: FacebookAccount = {
        id: profile.id,
        name: profile.name,
        pictureUrl: profile.pictureUrl,
        accessToken: token,
      };

      // Update via Prop Callback
      onUpdateAccounts((prev) => {
        // 2. Check if account ID already exists
        const existingIndex = prev.findIndex(acc => acc.id === newAccount.id);

        if (existingIndex >= 0) {
          // 3. UPDATE existing account (Upsert)
          const updatedList = [...prev];
          updatedList[existingIndex] = newAccount; // Update token and info
          showNotification('success', `Đã cập nhật Token mới cho tài khoản "${newAccount.name}"!`);
          return updatedList;
        } else {
          // 4. ADD new account
          showNotification('success', `Đã thêm tài khoản "${newAccount.name}" vào danh sách!`);
          return [newAccount, ...prev];
        }
      });

      setNewAccountToken('');
    } catch (err) {
      showNotification('error', (err as Error).message || 'Lỗi không xác định khi thêm tài khoản.');
    } finally {
      setIsAddingAccount(false);
    }
  };

  const requestRemoveAccount = (id: string) => {
    setDeleteConfirmId(id);
  };

  const cancelRemoveAccount = () => {
    setDeleteConfirmId(null);
  };

  const confirmRemoveAccount = (id: string, name: string, token: string) => {
    // If deleting the currently active account, handle it gracefully
    if (token === currentUserToken) {
       showNotification('info', 'Bạn vừa xóa tài khoản đang đăng nhập.');
    }

    onUpdateAccounts((prev) => prev.filter(acc => acc.id !== id));
    showNotification('success', `Đã xóa tài khoản "${name}" thành công.`);
    setDeleteConfirmId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('info', 'Đã sao chép ID vào bộ nhớ tạm.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Cài đặt & Quản lý
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-700 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Global Notification */}
        {notification && (
          <div className={`px-6 py-2 text-sm font-medium text-white flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-600/90' : 
            notification.type === 'error' ? 'bg-red-600/90' : 'bg-blue-600/90'
          }`}>
            {notification.type === 'success' && (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            )}
            {notification.type === 'error' && (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            )}
            {notification.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            className={`flex-1 py-4 px-6 text-sm font-medium transition relative ${
              activeTab === 'accounts' ? 'text-blue-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('accounts')}
          >
            Quản lý Nick Facebook
            {activeTab === 'accounts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-6 text-sm font-medium transition relative ${
              activeTab === 'general' ? 'text-blue-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('general')}
          >
            Cấu hình API & Hệ thống
            {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-800">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                   <span className="text-2xl">🧠</span> Google Gemini AI
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gemini API Key (AI Studio)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                      />
                      <button
                        onClick={handleActivateApiKey}
                        disabled={!apiKey.trim()}
                        className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap shadow-lg ${
                          apiActivationStatus === 'success'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {apiActivationStatus === 'success' ? 'Đã Lưu' : 'Lưu & Kích hoạt'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Khóa API là cần thiết để sử dụng các tính năng tạo nội dung, hình ảnh và video. 
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline ml-1">Lấy khóa tại đây</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-fade-in">
              {/* Add New Account Section */}
              <div className="bg-gray-900/50 p-5 rounded-lg border border-blue-900/30 shadow-inner">
                <h3 className="text-sm font-semibold text-blue-200 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Thêm hoặc Cập nhật tài khoản
                </h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newAccountToken}
                    onChange={(e) => setNewAccountToken(e.target.value)}
                    placeholder="Dán mã Token Facebook (EAA...)"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm placeholder-gray-500 shadow-sm"
                  />
                  <button
                    onClick={handleAddAccount}
                    disabled={isAddingAccount || !newAccountToken}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
                  >
                    {isAddingAccount ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang xử lý...
                      </span>
                    ) : (
                      'Lưu Tài khoản'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Mẹo: Nếu tài khoản đã tồn tại, hệ thống sẽ tự động cập nhật Token mới nhất cho tài khoản đó.
                </p>
              </div>

              {/* Account List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Danh sách tài khoản ({accounts.length})</h3>
                </div>
                
                <div className="space-y-3">
                  {accounts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                      <p className="text-gray-500 text-sm">Chưa có tài khoản nào được lưu.</p>
                      <p className="text-gray-600 text-xs mt-1">Hãy thêm Token ở trên để bắt đầu.</p>
                    </div>
                  ) : (
                    accounts.map(acc => {
                      const isActive = acc.accessToken === currentUserToken;
                      const isDeleting = deleteConfirmId === acc.id;

                      return (
                        <div 
                          key={acc.id} 
                          className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                            isActive 
                            ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500/50 shadow-lg' 
                            : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/60 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center space-x-4 overflow-hidden">
                            <div className="relative">
                              <img src={acc.pictureUrl} alt={acc.name} className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover" />
                              {isActive && (
                                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-gray-800"></span>
                              )}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <p className="text-base font-bold text-white truncate">{acc.name}</p>
                                {isActive && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Active</span>}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="font-mono bg-gray-800 px-1 rounded border border-gray-700">ID: {acc.id}</span>
                                <button 
                                  onClick={() => copyToClipboard(acc.id)}
                                  className="hover:text-white transition-colors"
                                  title="Sao chép ID"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Open Profile Link */}
                            <a
                              href={`https://facebook.com/${acc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-blue-400 p-2 hover:bg-blue-900/20 rounded-lg transition"
                              title="Mở trang cá nhân Facebook"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>

                            {/* Action Buttons: Switch or Delete */}
                            {isDeleting ? (
                                <div className="flex items-center gap-2 animate-fade-in bg-gray-800 p-1 rounded-lg border border-red-500/50">
                                    <span className="text-xs text-red-200 hidden sm:inline px-1">Xóa?</span>
                                    <button 
                                        onClick={() => confirmRemoveAccount(acc.id, acc.name, acc.accessToken)}
                                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold shadow-sm"
                                    >
                                        Có
                                    </button>
                                    <button 
                                        onClick={cancelRemoveAccount}
                                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded shadow-sm"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {!isActive && (
                                    <button
                                        onClick={() => onSwitchAccount(acc.accessToken)}
                                        className="text-xs bg-gray-600 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
                                    >
                                        Chuyển
                                    </button>
                                    )}
                                    
                                    <button
                                    onClick={() => requestRemoveAccount(acc.id)}
                                    className="text-gray-500 hover:text-red-400 p-2 hover:bg-red-900/20 rounded-lg transition"
                                    title="Xóa tài khoản khỏi danh sách"
                                    >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    </button>
                                </>
                            )}
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end bg-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
