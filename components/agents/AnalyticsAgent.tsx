import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import type { ScheduledPost } from '../../types';

// Mock data generation
const generateMockStats = () => ({
  reach: Math.floor(Math.random() * 5000) + 1000,
  reachChange: (Math.random() * 10 - 5).toFixed(1),
  engagement: Math.floor(Math.random() * 500) + 100,
  engagementChange: (Math.random() * 10 - 4).toFixed(1),
  followers: Math.floor(Math.random() * 200) + 20,
  followersChange: (Math.random() * 5).toFixed(1),
});

const generateMockChartData = () =>
  Array.from({ length: 5 }, (_, i) => ({
    name: `Post ${i + 1}`,
    engagement: Math.floor(Math.random() * 100) + 20,
  }));

const mockTopPost: ScheduledPost = {
  id: 'top-post-1',
  content: 'Cà phê buổi sáng và một chút mã hóa để bắt đầu ngày mới! ☕💻 #devlife',
  imageUrl: `https://picsum.photos/seed/coffee/200/200`,
  scheduledTime: 'Hôm qua lúc 8:00 AM',
  status: 'Posted',
};

const AnalyticsAgent: React.FC = () => {
  const [stats, setStats] = useState(generateMockStats());
  const [chartData, setChartData] = useState(generateMockChartData());
  const maxEngagement = Math.max(...chartData.map((d) => d.engagement), 100);

  // Effect to slightly randomize data on load to feel "live"
  useEffect(() => {
    setStats(generateMockStats());
    setChartData(generateMockChartData());
  }, []);

  const StatCard: React.FC<{
    label: string;
    value: number;
    change: string;
  }> = ({ label, value, change }) => {
    const isPositive = parseFloat(change) >= 0;
    return (
      <div className="bg-gray-900/50 p-3 rounded-lg text-center">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-white">
          {value.toLocaleString()}
        </p>
        <p
          className={`text-xs font-semibold ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isPositive ? '▲' : '▼'} {change}%
        </p>
      </div>
    );
  };

  return (
    <Card title="Trợ lý Phân tích" icon={<ChartBarIcon />}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Theo dõi hiệu suất và nhận thông tin chi tiết để tối ưu hóa chiến lược của bạn.
        </p>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="Tổng Reich"
            value={stats.reach}
            change={stats.reachChange}
          />
          <StatCard
            label="Lượt tương tác"
            value={stats.engagement}
            change={stats.engagementChange}
          />
          <StatCard
            label="Follower Mới"
            value={stats.followers}
            change={stats.followersChange}
          />
        </div>

        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Hiệu suất Bài đăng Gần đây
          </h4>
          <div className="bg-gray-900/50 p-4 rounded-lg flex justify-around items-end h-32 space-x-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 hover:bg-blue-400 transition-colors rounded-t-sm"
                  style={{ height: `${(data.engagement / maxEngagement) * 100}%` }}
                  title={`Tương tác: ${data.engagement}`}
                ></div>
                <p className="text-xs text-gray-500 mt-1">{data.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Post */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Bài đăng Hàng đầu
          </h4>
          <div className="bg-gray-900/50 p-3 rounded-lg flex items-center space-x-3">
            <img
              src={mockTopPost.imageUrl}
              alt="Top post preview"
              className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            />
            <div>
              <p className="text-xs font-medium text-gray-300 line-clamp-2">
                {mockTopPost.content}
              </p>
              <p className="text-xs text-green-400 font-semibold">
                {Math.floor(Math.random() * 150) + 50} lượt tương tác
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AnalyticsAgent;
