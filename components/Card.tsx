import React from 'react';

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  icon,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden ${className}`}
    >
      <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex items-center space-x-3">
        <div className="text-blue-400">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

export default Card;