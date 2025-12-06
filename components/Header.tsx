
import React from 'react';
import type { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenSettings }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-blue-400 hidden sm:block">
            Facebook AutoPilot Pro
          </h1>
          <h1 className="text-xl font-bold text-blue-400 sm:hidden">
            AutoPilot Pro
          </h1>
          <span className="px-3 py-1 text-xs font-semibold text-green-300 bg-green-800/50 rounded-full border border-green-700">
            ✅ Đã kết nối
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img
              src={user.pictureUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-gray-600"
            />
            <span className="text-sm font-medium hidden sm:block truncate max-w-[150px]">
              {user.name}
            </span>
          </div>
          
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            title="Cài đặt & Quản lý Tài khoản"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded-lg transition"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
