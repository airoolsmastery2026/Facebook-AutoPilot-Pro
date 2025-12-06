
import React, { useState, useEffect, useRef } from 'react';
import Card from '../Card';
import { analyzeSentimentAndReply } from '../../services/geminiService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { MessageIcon } from '../icons/MessageIcon';

interface InboxAgentProps {
  addLog: (agent: string, action: string, status?: 'Success' | 'Error') => void;
}

interface Comment {
  id: number;
  user: string;
  text: string;
  replied: boolean;
  replyText?: string;
  replyType?: 'PUBLIC' | 'PRIVATE';
  sentiment?: string;
}

const InboxAgent: React.FC<InboxAgentProps> = ({ addLog }) => {
  // Toggle for full automation
  const [isAutoReply, setIsAutoReply] = useLocalStorage<boolean>('inbox-auto-reply', false);
  // Store Product/Shop Link
  const [shopLink, setShopLink] = useLocalStorage<string>('inbox-shop-link', '');
  
  // Mock comments
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, user: 'Nguyen Van A', text: 'Sản phẩm này giá bao nhiêu vậy shop?', replied: false },
    { id: 2, user: 'Tran Thi B', text: 'Dịch vụ quá tệ, gọi mãi không bắt máy!', replied: false },
    { id: 3, user: 'Le Van C', text: 'Tuyệt vời, sẽ ủng hộ dài dài <3', replied: false },
    { id: 4, user: 'Pham D', text: 'Có ship hỏa tốc đi Hà Nội không ạ?', replied: false },
  ]);

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [draftReply, setDraftReply] = useState<{id: number, text: string, sentiment: string} | null>(null);
  
  // Ref for automation loop
  const automationTimeoutRef = useRef<number | null>(null);

  // --- AUTOMATION LOGIC ---
  useEffect(() => {
    const processNextComment = async () => {
        if (!isAutoReply) return;

        // Find the first unreplied comment that isn't currently being processed
        const target = comments.find(c => !c.replied && c.id !== processingId);

        if (target) {
            setProcessingId(target.id);
            addLog('SmartInbox', `[Auto] Đang phân tích bình luận của ${target.user}...`);

            try {
                // Artificial delay to simulate "reading"
                await new Promise(r => setTimeout(r, 2000));

                const result = await analyzeSentimentAndReply(target.text, shopLink);
                
                // Automatically apply the reply
                setComments(prev => prev.map(c => 
                    c.id === target.id 
                    ? { 
                        ...c, 
                        replied: true, 
                        replyText: result.reply, 
                        sentiment: result.sentiment,
                        replyType: 'PUBLIC' 
                      } 
                    : c
                ));

                addLog('SmartInbox', `[Auto] Đã trả lời ${target.user}: "${result.reply}" (${result.sentiment})`);
            } catch (error) {
                addLog('SmartInbox', `[Auto] Lỗi khi xử lý bình luận ID ${target.id}: ${(error as Error).message}`, 'Error');
            } finally {
                setProcessingId(null);
            }
        }
        
        // Schedule next check
        automationTimeoutRef.current = window.setTimeout(processNextComment, 4000); 
    };

    if (isAutoReply) {
        processNextComment();
    } else {
        if (automationTimeoutRef.current) clearTimeout(automationTimeoutRef.current);
    }

    return () => {
        if (automationTimeoutRef.current) clearTimeout(automationTimeoutRef.current);
    };
  }, [isAutoReply, comments, addLog, processingId, shopLink]);


  // --- MANUAL HANDLERS ---

  const handleAnalyze = async (id: number, text: string) => {
    setProcessingId(id);
    setDraftReply(null);
    try {
        const result = await analyzeSentimentAndReply(text, shopLink);
        setDraftReply({ id, text: result.reply, sentiment: result.sentiment });
        addLog('SmartInbox', `Đã phân tích bình luận của ID ${id}: ${result.sentiment}`);
    } catch (error) {
        addLog('SmartInbox', `Lỗi phân tích: ${(error as Error).message}`, 'Error');
    } finally {
        setProcessingId(null);
    }
  };

  const handleSendReply = (id: number) => {
    if (!draftReply) return;
    setComments(prev => prev.map(c => 
        c.id === id 
        ? { ...c, replied: true, replyText: draftReply.text, sentiment: draftReply.sentiment, replyType: 'PUBLIC' } 
        : c
    ));
    setDraftReply(null);
    addLog('SmartInbox', `Đã gửi trả lời công khai cho ID ${id}`);
  };

  const handlePrivateMessage = (id: number, user: string) => {
      // Simulate opening a messenger window
      // In a real app, this would link to the specific conversation
      window.open(`https://facebook.com/messages/t/${id}`, '_blank');

      setComments(prev => prev.map(c => 
        c.id === id 
        ? { ...c, replied: true, replyText: 'Đã nhắn tin riêng', replyType: 'PRIVATE' } 
        : c
      ));
      setDraftReply(null); // Clear draft if open
      addLog('SmartInbox', `Đã gửi tin nhắn riêng (DM) cho ${user}`);
  };

  const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );

  const ShoppingCartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  const getSentimentColor = (s?: string) => {
      if (!s) return 'text-gray-400';
      if (s.toLowerCase().includes('positive')) return 'text-green-400';
      if (s.toLowerCase().includes('negative')) return 'text-red-400';
      return 'text-yellow-400';
  }

  return (
    <Card title="Hộp thư Thông minh" icon={<ChatIcon />}>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
                AI tự động phân tích và trả lời khách hàng.
            </p>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isAutoReply ? 'text-green-400' : 'text-gray-500'}`}>
                    {isAutoReply ? 'AUTO ON' : 'AUTO OFF'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={isAutoReply} 
                        onChange={(e) => setIsAutoReply(e.target.checked)}
                        className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>
        </div>
        
        {/* Shopping Link Input */}
        <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-md border border-gray-700">
            <span className="text-yellow-500"><ShoppingCartIcon /></span>
            <input 
                type="text"
                value={shopLink}
                onChange={(e) => setShopLink(e.target.value)}
                placeholder="Nhập Link Sản phẩm/Giỏ hàng để AI chốt đơn..."
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
        </div>
        {shopLink && (
            <p className="text-[10px] text-gray-400 italic -mt-1 pl-1">
                * AI sẽ tự động đính kèm link này khi khách hỏi giá hoặc khen sản phẩm.
            </p>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {comments.filter(c => !c.replied).length === 0 && (
            <p className="text-center text-gray-500 italic text-sm py-4">
                🎉 Tuyệt vời! Bạn đã trả lời hết tin nhắn.
            </p>
        )}

        {comments.map(comment => (
            <div key={comment.id} className={`p-3 rounded-lg border transition-all ${comment.replied ? 'bg-gray-800/30 border-gray-800 opacity-70' : 'bg-gray-900/50 border-gray-700'}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-blue-300">{comment.user}</span>
                    {comment.replied && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${comment.replyType === 'PRIVATE' ? 'bg-purple-900/50 text-purple-300 border-purple-800' : 'bg-green-900/50 text-green-300 border-green-800'}`}>
                            {comment.replyType === 'PRIVATE' ? 'Đã Inbox' : 'Đã Trả lời'}
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-200 mb-2">"{comment.text}"</p>
                
                {/* DRAFTING AREA */}
                {!comment.replied && draftReply && draftReply.id === comment.id ? (
                    <div className="bg-gray-800 p-2 rounded border border-gray-600 animate-fade-in">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">AI Đề xuất:</span>
                            <span className={`font-bold ${getSentimentColor(draftReply.sentiment)}`}>{draftReply.sentiment}</span>
                        </div>
                        <p className="text-sm text-white italic mb-2">{draftReply.text}</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleSendReply(comment.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-xs py-1.5 rounded text-white font-medium shadow">
                                Gửi Trả lời
                            </button>
                            <button onClick={() => setDraftReply(null)} className="px-2 bg-gray-600 hover:bg-gray-500 text-xs py-1.5 rounded text-white">
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : !comment.replied ? (
                    /* ACTION BUTTONS */
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleAnalyze(comment.id, comment.text)}
                            disabled={processingId === comment.id || isAutoReply}
                            className="flex-1 flex justify-center items-center gap-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-1.5 px-3 rounded transition border border-blue-500/30 disabled:opacity-50"
                        >
                            {processingId === comment.id ? <span className="animate-spin">⏳</span> : '✨ Phân tích & Trả lời'}
                        </button>
                        
                        <button 
                            onClick={() => handlePrivateMessage(comment.id, comment.user)}
                            disabled={processingId === comment.id || isAutoReply}
                            className="flex items-center gap-1 text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 py-1.5 px-3 rounded transition border border-purple-500/30 disabled:opacity-50"
                            title="Nhắn tin riêng (Inbox)"
                        >
                           <MessageIcon />
                           <span className="hidden sm:inline">Nhắn tin</span>
                        </button>
                    </div>
                ) : (
                    /* ALREADY REPLIED VIEW */
                    <div className="mt-2 pl-2 border-l-2 border-gray-600">
                         {comment.replyType === 'PUBLIC' ? (
                             <>
                                <p className="text-xs text-gray-400 mb-0.5">Phản hồi của bạn:</p>
                                <p className="text-xs text-gray-300 italic">"{comment.replyText}"</p>
                             </>
                         ) : (
                             <p className="text-xs text-purple-300 italic flex items-center gap-1">
                                 <MessageIcon /> Đã gửi tin nhắn riêng tư.
                             </p>
                         )}
                    </div>
                )}
            </div>
        ))}
      </div>
    </Card>
  );
};

export default InboxAgent;
