
import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { UsersIcon } from '../icons/UsersIcon';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface GroupAgentProps {
  addLog: (agent: string, action: string) => void;
}

const GroupAgent: React.FC<GroupAgentProps> = ({ addLog }) => {
  const [isActive, setIsActive] = useState(false);
  const [joinedGroups, setJoinedGroups] = useLocalStorage<number>(
    'joined-groups-count',
    5,
  );

  useEffect(() => {
    let intervalId: number | undefined;
    if (isActive) {
      addLog('GroupAgent', 'Trợ lý đã được Kích hoạt');
      intervalId = window.setInterval(() => {
        setJoinedGroups((count) => count + 1);
        addLog('GroupAgent', 'Đã tham gia một nhóm mới: "Những người đam mê AI"');
      }, 30000); // Log every 30 seconds
    } else {
      if (intervalId) {
        addLog('GroupAgent', 'Trợ lý đã bị Hủy kích hoạt');
      }
    }
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <Card title="Trợ lý Nhóm" icon={<UsersIcon />}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400">
            Tự động tìm và tham gia các nhóm dựa trên sở thích của bạn.
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`}
            ></div>
            <span className="text-sm font-medium">
              {isActive ? 'Hoạt động' : 'Không hoạt động'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
            isActive
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isActive ? 'Hủy kích hoạt' : 'Kích hoạt'}
        </button>
      </div>
      <div className="p-3 bg-gray-900/50 rounded-md">
        <p className="text-sm text-gray-400">
          Số nhóm đã tham gia:{' '}
          <span className="font-bold text-blue-400">{joinedGroups}</span>
        </p>
      </div>
    </Card>
  );
};

export default GroupAgent;
