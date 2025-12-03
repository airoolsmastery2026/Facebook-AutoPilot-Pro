
import React from 'react';
import Card from './Card';
import type { ActivityLog } from '../types';
import { ListIcon } from './icons/ListIcon';

interface ActivityLogFeedProps {
  logs: ActivityLog[];
}

const ActivityLogFeed: React.FC<ActivityLogFeedProps> = ({ logs }) => {
  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'ContentAgent':
        return 'text-blue-400';
      case 'ImageAgent':
        return 'text-indigo-400';
      case 'SchedulerAgent':
        return 'text-green-400';
      case 'InteractionAgent':
        return 'text-pink-400';
      case 'GroupAgent':
        return 'text-yellow-400';
      case 'VideoAgent':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card title="Nhật ký Hoạt động" icon={<ListIcon />}>
      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Chưa có hoạt động nào. Hãy kích hoạt một trợ lý để bắt đầu.
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="text-xs">
              <p className="text-gray-400">
                {new Date(log.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-gray-300">
                <span className={`font-semibold ${getAgentColor(log.agent)}`}>
                  [{log.agent}]
                </span>{' '}
                {log.action}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default ActivityLogFeed;
