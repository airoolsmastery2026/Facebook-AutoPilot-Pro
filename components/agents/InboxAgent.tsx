
import React, { useState } from 'react';
import Card from '../Card';
import { analyzeSentimentAndReply } from '../../services/geminiService';

interface InboxAgentProps {
  addLog: (agent: string, action: string) => void;
}

const InboxAgent: React.FC<InboxAgentProps> = ({ addLog }) => {
  // Mock comments
  const [comments, setComments] = useState([
    { id: 1, user: 'Nguyen Van A', text: 'Sản phẩm này giá bao nhiêu vậy shop?', replied: false },
    { id: 2, user: 'Tran Thi B', text: 'Dịch vụ quá tệ, gọi mãi không bắt máy!', replied: false },
    { id: 3, user: 'Le Van C', text: 'Tuyệt vời, sẽ ủng hộ dài dài <3', replied: false },
  ]);

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [draftReply, setDraftReply] = useState<{id: number, text: string, sentiment: string} | null>(null);

  const handleAnalyze = async (id: number, text: string) => {
    setProcessingId(id);
    setDraftReply(null);
    const result = await analyzeSentimentAndReply(text);
    setDraftReply({ id, text: result.reply, sentiment: result.sentiment });
    setProcessingId(null);
    addLog('SmartInbox', `Đã phân tích bình luận của ID ${id}: ${result.sentiment}`);
  };

  const handleSendReply = (id: number) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, replied: true } : c));
    setDraftReply(null);
    addLog('SmartInbox', `Đã tự động trả lời bình luận ID ${id}`);
  };

  const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );

  const getSentimentColor = (s: string) => {
      if (s.toLowerCase().includes('positive')) return 'text-green-400';
      if (s.toLowerCase().includes('negative')) return 'text-red-400';
      return 'text-yellow-400';
  }

  return (
    <Card title="Hộp thư Thông minh" icon={<ChatIcon />}>
      <p className="text-sm text-gray-400 mb-4">
        Phân tích cảm xúc khách hàng và soạn câu trả lời tự động.
      </p>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {comments.filter(c => !c.replied).length === 0 && (
            <p className="text-center text-gray-500 italic text-sm">Đã trả lời hết tin nhắn!</p>
        )}
        {comments.map(comment => !comment.replied && (
            <div key={comment.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-blue-300">{comment.user}</span>
                </div>
                <p className="text-sm text-gray-200 mb-2">"{comment.text}"</p>
                
                {draftReply && draftReply.id === comment.id ? (
                    <div className="bg-gray-800 p-2 rounded border border-gray-600 animate-fade-in">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">AI Đề xuất:</span>
                            <span className={`font-bold ${getSentimentColor(draftReply.sentiment)}`}>{draftReply.sentiment}</span>
                        </div>
                        <p className="text-sm text-white italic mb-2">{draftReply.text}</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleSendReply(comment.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs py-1 rounded text-white font-medium">
                                Gửi Trả lời
                            </button>
                            <button onClick={() => setDraftReply(null)} className="px-2 bg-gray-600 hover:bg-gray-500 text-xs py-1 rounded text-white">
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => handleAnalyze(comment.id, comment.text)}
                        disabled={processingId === comment.id}
                        className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-1 px-3 rounded transition w-full border border-blue-500/30"
                    >
                        {processingId === comment.id ? 'Đang phân tích...' : 'Phân tích & Trả lời'}
                    </button>
                )}
            </div>
        ))}
      </div>
    </Card>
  );
};

export default InboxAgent;
