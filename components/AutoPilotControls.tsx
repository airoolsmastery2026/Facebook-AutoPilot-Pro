
import React, { useState, useEffect } from 'react';
import type { AutoPilotConfig, AutoPilotPhase } from '../types';

interface AutoPilotControlsProps {
  config: AutoPilotConfig;
  onUpdateConfig: (newConfig: AutoPilotConfig) => void;
  currentPhase: AutoPilotPhase;
}

const AutoPilotControls: React.FC<AutoPilotControlsProps> = ({
  config,
  onUpdateConfig,
  currentPhase,
}) => {
  const [nicheInput, setNicheInput] = useState(config.niche);
  const [intervalInput, setIntervalInput] = useState(config.intervalMinutes);
  const [isSaved, setIsSaved] = useState(false);

  // Sync internal state if props change externally (e.g. from restore backup)
  useEffect(() => {
    setNicheInput(config.niche);
    setIntervalInput(config.intervalMinutes);
  }, [config.niche, config.intervalMinutes]);

  const handleSave = () => {
    onUpdateConfig({
      ...config,
      niche: nicheInput,
      intervalMinutes: intervalInput,
    });
    showSaveFeedback();
  };

  const showSaveFeedback = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggle = () => {
    // Save current inputs before toggling
    onUpdateConfig({
      ...config,
      isActive: !config.isActive,
      niche: nicheInput,
      intervalMinutes: intervalInput,
    });
  };

  const toggleVideo = () => {
      onUpdateConfig({
          ...config,
          enableVideo: !config.enableVideo
      });
      // No need to show save feedback for toggle as it's visual enough
  };

  const getPhaseLabel = (phase: AutoPilotPhase) => {
    switch (phase) {
      case 'SCANNING_TRENDS': return '📡 Đang quét Trend Google...';
      case 'GENERATING_CONTENT': return '✍️ Đang viết bài...';
      case 'ANALYZING_IMAGE_PROMPT': return '🧠 Đang phân tích ý tưởng ảnh...';
      case 'GENERATING_IMAGE': return '🎨 Đang vẽ minh họa...';
      case 'GENERATING_VIDEO': return '🎬 Đang tạo Video (Veo)...';
      case 'GENERATING_THUMBNAIL': return '🖼️ Đang thiết kế Thumbnail...'; 
      case 'SCHEDULING': return '📅 Đang lên lịch đăng...';
      case 'COOLDOWN': return `⏳ Đang chờ lượt sau (${config.intervalMinutes}p)...`;
      default: return '💤 Hệ thống nghỉ';
    }
  };

  const getProgressBarWidth = (phase: AutoPilotPhase) => {
    switch (phase) {
        case 'SCANNING_TRENDS': return '15%';
        case 'GENERATING_CONTENT': return '30%';
        case 'ANALYZING_IMAGE_PROMPT': return '40%';
        case 'GENERATING_IMAGE': return '50%';
        case 'GENERATING_VIDEO': return '70%';
        case 'GENERATING_THUMBNAIL': return '85%';
        case 'SCHEDULING': return '100%';
        default: return '0%';
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-blue-900/50 shadow-lg p-6 mb-6 relative overflow-hidden">
        {/* Background Animation when Active */}
        {config.isActive && (
            <div className="absolute inset-0 z-0 opacity-10">
                <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-blue-500/30 skew-x-12 animate-shimmer"></div>
            </div>
        )}

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🚀 Auto-Pilot Master Engine
            {config.isActive && (
                 <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Hệ thống tự động: Tìm Trend ➔ Viết Bài ➔ Vẽ Ảnh ➔ {config.enableVideo ? 'Tạo Video ➔ ' : ''}Thumbnail ➔ Lên Lịch
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
            <div className="flex flex-col">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Chủ đề (Niche)</label>
                <input 
                    type="text" 
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    onBlur={handleSave} // Save on blur
                    disabled={config.isActive}
                    className="bg-transparent text-white font-medium focus:outline-none border-b border-gray-600 focus:border-blue-500 w-32"
                />
            </div>
            <div className="w-px h-8 bg-gray-700 hidden sm:block"></div>
            <div className="flex flex-col">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Tần suất (Phút)</label>
                <input 
                    type="number" 
                    min={15}
                    value={intervalInput}
                    onChange={(e) => setIntervalInput(Number(e.target.value))}
                    onBlur={handleSave} // Save on blur
                    disabled={config.isActive}
                    className="bg-transparent text-white font-medium focus:outline-none border-b border-gray-600 focus:border-blue-500 w-16"
                />
            </div>
            
            {/* Enable Video Toggle */}
             <div className="flex items-center gap-2 px-2 border-l border-gray-700">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={config.enableVideo}
                        onChange={toggleVideo}
                        disabled={config.isActive}
                        className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
                <span className={`text-[10px] font-bold ${config.enableVideo ? 'text-red-400' : 'text-gray-500'}`}>
                    VIDEO
                </span>
            </div>

            {/* Explicit Save Button */}
            <button
                onClick={handleSave}
                className="p-2 text-gray-400 hover:text-green-400 transition"
                title="Lưu cấu hình (Save Config)"
                disabled={config.isActive}
            >
                {isSaved ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                )}
            </button>

            <button
                onClick={handleToggle}
                className={`ml-2 px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 ${
                    config.isActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
                {config.isActive ? 'DỪNG HỆ THỐNG' : 'KÍCH HOẠT A-Z'}
            </button>
        </div>
      </div>

      {/* Status Bar */}
      {config.isActive && (
          <div className="mt-6 relative z-10">
              <div className="flex justify-between text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wider">
                  <span>Trạng thái: {getPhaseLabel(currentPhase)}</span>
                  <span>Tiến trình</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-in-out"
                    style={{ width: currentPhase === 'COOLDOWN' ? '100%' : getProgressBarWidth(currentPhase) }}
                  ></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AutoPilotControls;
