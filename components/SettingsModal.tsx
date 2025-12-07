
import React, { useState, useRef } from 'react';
import type { FacebookAccount, AppCredentials } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getProfile } from '../services/facebookService';
import { exportAppConfig, importAppConfig } from '../services/configService';

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
  // App Users Storage
  const [appUsers, setAppUsers] = useLocalStorage<AppCredentials[]>('app_users', []);

  const [activeTab, setActiveTab] = useState<'general' | 'accounts' | 'admins' | 'backup'>('accounts');
  
  // FB Account State
  const [newAccountToken, setNewAccountToken] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  // App User State
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  // State for inline delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteAdminConfirm, setDeleteAdminConfirm] = useState<string | null>(null);

  // State for activation button feedback
  const [apiActivationStatus, setApiActivationStatus] = useState<'idle' | 'success'>('idle');

  // Backup file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- API KEY HANDLERS ---
  const handleActivateApiKey = () => {
    if (!apiKey.trim()) return;
    setApiActivationStatus('success');
    showNotification('success', 'Đã lưu và kích hoạt Gemini API Key thành công!');
    setTimeout(() => {
      setApiActivationStatus('idle');
    }, 2000);
  };

  // --- FACEBOOK ACCOUNT HANDLERS ---
  const handleAddAccount = async () => {
    const token = newAccountToken.trim();
    if (!token) return;
    
    if (!token.startsWith('EAA')) {
      showNotification('error', 'Token không hợp lệ. Token thường bắt đầu bằng "EAA..."');
      return;
    }

    setIsAddingAccount(true);
    setNotification(null);

    try {
      const profile = await getProfile(token);
      
      const newAccount: FacebookAccount = {
        id: profile.id,
        name: profile.name,
        pictureUrl: profile.pictureUrl,
        accessToken: token,
      };

      onUpdateAccounts((prev) => {
        const existingIndex = prev.findIndex(acc => acc.id === newAccount.id);
        if (existingIndex >= 0) {
          const updatedList = [...prev];
          updatedList[existingIndex] = newAccount;
          showNotification('success', `Đã cập nhật Token mới cho tài khoản "${newAccount.name}"!`);
          
          if (currentUserToken === updatedList[existingIndex].accessToken) {
              onSwitchAccount(token);
          }
          return updatedList;
        } else {
          showNotification('success', `Đã thêm tài khoản "${newAccount.name}" vào danh sách!`);
          return [newAccount, ...prev];
        }
      });

      if (!currentUserToken || accounts.length === 0) {
          onSwitchAccount(token);
          showNotification('success', `Đã tự động kích hoạt tài khoản "${profile.name}".`);
      }

      setNewAccountToken('');
    } catch (err) {
      showNotification('error', (err as Error).message || 'Lỗi không xác định khi thêm tài khoản.');
    } finally {
      setIsAddingAccount(false);
    }
  };

  const confirmRemoveAccount = (id: string, name: string, token: string) => {
    if (token === currentUserToken) {
       showNotification('info', 'Bạn vừa xóa tài khoản đang đăng nhập.');
    }
    onUpdateAccounts((prev) => prev.filter(acc => acc.id !== id));
    showNotification('success', `Đã xóa tài khoản "${name}" thành công.`);
    setDeleteConfirmId(null);
  };

  // --- APP USER (ADMIN) HANDLERS ---
  const handleAddAdmin = () => {
      if (!newAdminUser.trim() || !newAdminPass.trim()) {
          showNotification('error', 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
          return;
      }
      
      if (appUsers.some(u => u.username === newAdminUser.trim())) {
          showNotification('error', 'Tên đăng nhập này đã tồn tại.');
          return;
      }

      setAppUsers(prev => [...prev, { username: newAdminUser.trim(), password: newAdminPass.trim() }]);
      showNotification('success', `Đã thêm quản trị viên "${newAdminUser}".`);
      setNewAdminUser('');
      setNewAdminPass('');
  };

  const handleRemoveAdmin = (username: string) => {
      // Prevent deleting the last user
      if (appUsers.length <= 1) {
          showNotification('error', 'Không thể xóa tài khoản cuối cùng. Cần ít nhất 1 quản trị viên.');
          return;
      }
      setAppUsers(prev => prev.filter(u => u.username !== username));
      showNotification('success', `Đã xóa quản trị viên "${username}".`);
      setDeleteAdminConfirm(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('info', 'Đã sao chép vào bộ nhớ tạm.');
  };

  // --- BACKUP & RESTORE HANDLERS ---
  const handleExport = () => {
    const dataStr = exportAppConfig();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `autopilot-backup-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification('success', 'Đã xuất file cấu hình thành công!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = (event) => {
            if (event.target?.result) {
                const success = importAppConfig(event.target.result as string);
                if (success) {
                    showNotification('success', 'Khôi phục cài đặt thành công! Đang tải lại...');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showNotification('error', 'File không hợp lệ hoặc bị lỗi.');
                }
            }
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Bộ Lưu Trữ & Cài Đặt
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
            {notification.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50 overflow-x-auto">
          <button
            className={`flex-1 py-4 px-4 text-sm font-medium transition whitespace-nowrap relative ${
              activeTab === 'accounts' ? 'text-blue-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('accounts')}
          >
            Nick Facebook
            {activeTab === 'accounts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-4 text-sm font-medium transition whitespace-nowrap relative ${
              activeTab === 'admins' ? 'text-purple-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('admins')}
          >
            Quản lý Admin
            {activeTab === 'admins' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-4 text-sm font-medium transition whitespace-nowrap relative ${
              activeTab === 'general' ? 'text-green-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('general')}
          >
            API & Hệ thống
            {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500"></div>}
          </button>
          <button
            className={`flex-1 py-4 px-4 text-sm font-medium transition whitespace-nowrap relative ${
              activeTab === 'backup' ? 'text-yellow-400 bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('backup')}
          >
            Sao lưu & Khôi phục
            {activeTab === 'backup' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500"></div>}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-800">
          
          {/* --- TAB: GENERAL API --- */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                   <span className="text-2xl">🧠</span> Google Gemini AI Key
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                      />
                      <button
                        onClick={handleActivateApiKey}
                        disabled={!apiKey.trim()}
                        className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap shadow-lg ${
                          apiActivationStatus === 'success'
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {apiActivationStatus === 'success' ? 'Đã Lưu' : 'Lưu & Kích hoạt'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: FACEBOOK ACCOUNTS --- */}
          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-fade-in">
              {/* Add New Account Section */}
              <div className="bg-gray-900/50 p-5 rounded-lg border border-blue-900/30 shadow-inner">
                <h3 className="text-sm font-semibold text-blue-200 mb-3">
                  + Thêm Tài khoản Facebook Mới
                </h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newAccountToken}
                    onChange={(e) => setNewAccountToken(e.target.value)}
                    placeholder="Dán mã Access Token (EAA...)"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleAddAccount}
                    disabled={isAddingAccount || !newAccountToken}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
                  >
                    {isAddingAccount ? 'Đang tải...' : 'Lưu'}
                  </button>
                </div>
              </div>

              {/* Account List */}
              <div className="space-y-3">
                  {accounts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                      <p className="text-gray-500 text-sm">Chưa có tài khoản nào.</p>
                    </div>
                  ) : (
                    accounts.map(acc => {
                      const isActive = acc.accessToken === currentUserToken;
                      const isDeleting = deleteConfirmId === acc.id;

                      return (
                        <div 
                          key={acc.id} 
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isActive ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-700/30 border-gray-600'
                          }`}
                        >
                          <div className="flex items-center space-x-4 overflow-hidden">
                            <img src={acc.pictureUrl} alt={acc.name} className="w-10 h-10 rounded-full border border-gray-500" />
                            <div className="truncate">
                                <p className="text-sm font-bold text-white truncate">{acc.name} {isActive && '(Active)'}</p>
                                <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                                    <span>ID: {acc.id}</span>
                                    <button onClick={() => copyToClipboard(acc.id)} className="hover:text-white">COPY</button>
                                </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {/* Open Profile */}
                            <a
                              href={`https://facebook.com/${acc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-white p-2"
                              title="Xem Facebook"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>

                            {isDeleting ? (
                                <div className="flex gap-2">
                                    <button onClick={() => confirmRemoveAccount(acc.id, acc.name, acc.accessToken)} className="text-xs bg-red-600 px-3 py-1 rounded text-white">Xóa</button>
                                    <button onClick={() => setDeleteConfirmId(null)} className="text-xs bg-gray-600 px-3 py-1 rounded text-white">Hủy</button>
                                </div>
                            ) : (
                                <>
                                    {!isActive && (
                                        <button onClick={() => onSwitchAccount(acc.accessToken)} className="text-xs bg-gray-600 hover:bg-blue-600 px-3 py-1.5 rounded text-white">Chuyển</button>
                                    )}
                                    <button onClick={() => setDeleteConfirmId(acc.id)} className="text-gray-500 hover:text-red-400 p-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
          )}

          {/* --- TAB: APP ADMINS --- */}
          {activeTab === 'admins' && (
            <div className="space-y-6 animate-fade-in">
                 <div className="bg-purple-900/20 p-5 rounded-lg border border-purple-500/30">
                    <h3 className="text-sm font-semibold text-purple-200 mb-3">
                       + Tạo Tài khoản Quản trị mới
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                            type="text"
                            value={newAdminUser}
                            onChange={(e) => setNewAdminUser(e.target.value)}
                            placeholder="Tên đăng nhập"
                            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <input
                            type="password"
                            value={newAdminPass}
                            onChange={(e) => setNewAdminPass(e.target.value)}
                            placeholder="Mật khẩu"
                            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleAddAdmin}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-bold shadow-md"
                    >
                        Thêm Quản trị viên
                    </button>
                    <p className="text-[10px] text-gray-500 mt-2 italic">* Tài khoản này dùng để đăng nhập vào bảng điều khiển AutoPilot.</p>
                </div>

                <div className="space-y-3">
                     <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Danh sách Admin ({appUsers.length})</h3>
                     {appUsers.map((user, idx) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                             <div className="flex items-center gap-3">
                                 <div className="bg-purple-600 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                     {user.username.charAt(0).toUpperCase()}
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-white">{user.username}</p>
                                     <p className="text-[10px] text-gray-400">********</p>
                                 </div>
                             </div>
                             
                             {deleteAdminConfirm === user.username ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleRemoveAdmin(user.username)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Xác nhận xóa</button>
                                    <button onClick={() => setDeleteAdminConfirm(null)} className="text-xs bg-gray-600 text-white px-2 py-1 rounded">Hủy</button>
                                </div>
                             ) : (
                                <button onClick={() => setDeleteAdminConfirm(user.username)} className="p-2 text-gray-500 hover:text-red-400 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                             )}
                         </div>
                     ))}
                </div>
            </div>
          )}

          {/* --- TAB: BACKUP & RESTORE --- */}
          {activeTab === 'backup' && (
            <div className="space-y-8 animate-fade-in text-center py-8">
              <div className="p-6 bg-gray-900/50 rounded-lg border border-yellow-700/30">
                <h3 className="text-lg font-bold text-yellow-500 mb-2">Sao lưu toàn bộ (Backup)</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Tải xuống file chứa toàn bộ: Nick Facebook, Tài khoản Admin, API Key, Cấu hình Auto-Pilot, Bài viết...
                </p>
                <button 
                  onClick={handleExport}
                  className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải file sao lưu (.json)
                </button>
              </div>

              <div className="p-6 bg-gray-900/50 rounded-lg border border-blue-700/30">
                <h3 className="text-lg font-bold text-blue-400 mb-2">Khôi phục (Restore)</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Tải lên file backup để khôi phục toàn bộ trạng thái làm việc.
                </p>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".json"
                />
                <button 
                  onClick={handleImportClick}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Chọn file & Khôi phục
                </button>
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
