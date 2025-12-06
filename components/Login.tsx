
import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { AppCredentials } from '../types';

interface LoginProps {
  onLogin: (username: string) => void;
  isLoading: boolean;
  error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Store registered users in localStorage (Simulation of a database)
  const [registeredUsers, setRegisteredUsers] = useLocalStorage<AppCredentials[]>('app_users', []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    if (isRegister) {
      // Registration Logic
      if (password !== confirmPassword) {
        setLocalError('Mật khẩu xác nhận không khớp.');
        return;
      }
      
      const userExists = registeredUsers.some(u => u.username === username);
      if (userExists) {
        setLocalError('Tên đăng nhập đã tồn tại.');
        return;
      }

      // Save new user
      const newUser = { username, password };
      setRegisteredUsers([...registeredUsers, newUser]);
      setIsRegister(false); // Switch back to login
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      alert('Đăng ký thành công! Vui lòng đăng nhập.');

    } else {
      // Login Logic
      const user = registeredUsers.find(u => u.username === username && u.password === password);
      
      if (user) {
        onLogin(user.username);
      } else {
        setLocalError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setLocalError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-700 z-10 relative">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Facebook AutoPilot
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {isRegister ? 'Tạo tài khoản quản lý mới' : 'Đăng nhập vào hệ thống quản lý'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-600"
              required
            />
          </div>

          {isRegister && (
             <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                Xác nhận Mật khẩu
                </label>
                <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-600"
                required
                />
            </div>
          )}

          {(error || localError) && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                 <p className="text-red-400 text-xs text-center font-medium">{error || localError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button
              onClick={toggleMode}
              className="ml-2 text-blue-400 hover:text-blue-300 font-semibold focus:outline-none hover:underline transition"
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
            </button>
          </p>
        </div>
        
        {!isRegister && (
            <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                <p className="text-xs text-gray-500">
                    Lưu ý: Khóa API & Token Facebook sẽ được cấu hình trong phần <b>Cài đặt</b> sau khi đăng nhập.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;
