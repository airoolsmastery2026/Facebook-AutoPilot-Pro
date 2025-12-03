
import React from 'react';
import type { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-blue-400">
            Facebook AutoPilot Pro
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
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm font-medium hidden sm:block">
              {user.name}
            </span>
          </div>
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
