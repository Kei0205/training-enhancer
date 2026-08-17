import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, PlusCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_SYSTEM_PROMPT } from '../constants';
import { parseAIWorkoutText } from '../utils/parser';
import { fetchWorkouts, fetchWeights, saveWorkout } from '../utils/supabaseApi';

interface AIChatProps {
  apiKey: string;
  onNavigateToLogger: () => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const AIChat: React.FC<AIChatProps> = ({ apiKey, onNavigateToLogger }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_chat_history');
    const savedDate = localStorage.getItem('ai_chat_date');
    const today = new Date().toLocaleDateString('ja-JP');

    if (saved && savedDate === today) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chat history');
      }
    } else {
      const initialMessage = {
        role: 'model' as const,
        content: 'こんにちは、啓太郎さん！本日のトレーニングメニューを作成しますか？「今日のメニューは？」ボタンを押してください。'
      };
      setMessages([initialMessage]);
      localStorage.setItem('ai_chat_history', JSON.stringify([initialMessage]));
      localStorage.setItem('ai_chat_date', today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChatClick = () => {
    setShowConfirmModal(true);
  };

  const confirmClearChat = () => {
    const initialMessage = {
      role: 'model' as const,
      content: '履歴をクリアしました。今日のメニューを作成しますか？'
    };
    setMessages([initialMessage]);
    localStorage.setItem('ai_chat_history', JSON.stringify([initialMessage]));
    localStorage.setItem('ai_chat_date', new Date().toLocaleDateString('ja-JP'));
    setShowConfirmModal(false);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = typeof messageText === 'string' ? messageText : input;
    if (!textToSend.trim() || !apiKey) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend.trim() }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', systemInstruction: AI_SYSTEM_PROMPT });

      const todayString = new Date().toLocaleDateString('ja-JP', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      let workoutContext = `システム情報：本日の日付は ${todayString} です。何日前のトレーニングかなどを計算する際の絶対的な基準としてください。\n\n【最近のトレーニング記録】\n`;
      try {
        const workouts = await fetchWorkouts();
        // Sort workouts by date descending (newest first)
        const sortedWorkouts = [...workouts].sort((a, b) => {
          const dA = new Date(a.date).getTime();
          const dB = new Date(b.date).getTime();
          return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
        });
        const recentWorkouts = sortedWorkouts.slice(0, 5);
        if (recentWorkouts.length > 0) {
          workoutContext += recentWorkouts.map(w => {
            let text = `${w.date} ${w.bodyPart}\n`;
            w.exercises.forEach(ex => {
              if(ex.name) {
                 text += `${ex.name}: ` + ex.sets.map(s => `${s.weight}*${s.reps}`).join(', ') + '\n';
              }
            });
            return text;
          }).join('\n');
        } else {
          workoutContext += 'まだ記録がありません。\n';
        }
        
        const weights = await fetchWeights();
        if (weights && weights.length > 0) {
           const sortedWeights = [...weights].sort((a, b) => {
             const dA = new Date(a.date).getTime();
             const dB = new Date(b.date).getTime();
             return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
           });
           workoutContext += `\n【最近の体重記録】\n直近の体重: ${sortedWeights[0].date} に ${sortedWeights[0].weight}kg\n`;
        }
      } catch (e) {
        workoutContext += '記録の読み込みエラー\n';
      }

      let validHistoryMessages = newMessages.slice(0, -1);
      // Remove any initial model messages so history starts with user
      const firstUserIndex = validHistoryMessages.findIndex(m => m.role === 'user');
      if (firstUserIndex !== -1) {
        validHistoryMessages = validHistoryMessages.slice(firstUserIndex);
      } else {
        validHistoryMessages = [];
      }
      
      // Filter out error messages starting with 'エラーが発生しました'
      validHistoryMessages = validHistoryMessages.filter(m => !m.content.startsWith('エラーが発生しました'));

      const history = validHistoryMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({ history: history });
      const prompt = `[内部データ・最近のログ共有（ユーザーには見えない想定のデータですが、回答の参考にしてください）]\n${workoutContext}\n\n[ユーザーからのメッセージ]\n${textToSend.trim()}`;
      
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `エラーが発生しました。APIキーが正しいか確認してください。\nエラー内容: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToLogger = async (codeBlock: string) => {
    const parsedWorkout = parseAIWorkoutText(codeBlock);
    if (!parsedWorkout) {
      setAlertMessage("解析に失敗しました。フォーマットが正しくない可能性があります。");
      return;
    }

    const success = await saveWorkout(parsedWorkout);
    if (success) {
      onNavigateToLogger();
    } else {
      setAlertMessage("ワークアウトの保存に失敗しました。");
    }
  };

  const formatMessageText = (text: string) => {
    const parts = text.split(/(\`\`\`[\s\S]*?\`\`\`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('\`\`\`') && part.endsWith('\`\`\`')) {
        const lines = part.split('\n');
        const code = lines.slice(1, -1).join('\n') || part.replace(/\`\`\`/g, '').replace(/^text\n/, '');
        
        // Attempt to parse to see if it's a valid workout block
        const isWorkoutBlock = parseAIWorkoutText(code) !== null;

        return (
          <div key={index} style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem' }}>
            <pre style={{ 
              backgroundColor: 'rgba(255,255,255,0.8)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto',
              border: '1px solid rgba(255,255,255,0.9)',
              margin: 0,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <code>{code}</code>
            </pre>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="action-button secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => navigator.clipboard.writeText(code)}
              >
                Copy Text
              </button>
              {isWorkoutBlock && (
                <button 
                  className="action-button primary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleAddToLogger(code)}
                >
                  <PlusCircle size={16} />
                  Add to Logger
                </button>
              )}
            </div>
          </div>
        );
      }
      return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  if (!apiKey) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', padding: '4rem 0' }}>
        <AlertCircle size={48} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>API Key Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Please go to Settings and enter your Gemini API Key to use the AI Trainer.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>AI Personal Trainer</h2>
      
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              gap: '1rem',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}>
              {msg.role === 'model' && (
                <img 
                  src="/favicon.png" 
                  alt="AI" 
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    flexShrink: 0, boxShadow: 'var(--shadow-sm)', 
                    border: '2px solid white', backgroundColor: 'white' 
                  }} 
                />
              )}
              
              <div style={{ 
                backgroundColor: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.85)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                borderTopRightRadius: msg.role === 'user' ? 0 : 'var(--radius-lg)',
                borderTopLeftRadius: msg.role === 'model' ? 0 : 'var(--radius-lg)',
                border: msg.role === 'model' ? '1px solid rgba(255,255,255,0.9)' : 'none',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '1.05rem',
                lineHeight: 1.6
              }}>
                {formatMessageText(msg.content)}
              </div>

              {msg.role === 'user' && (
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  backgroundColor: 'white', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border)'
                }}>
                  <span style={{ 
                    fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive', 
                    fontSize: '1.4rem', 
                    color: 'var(--accent-primary)', 
                    lineHeight: 1,
                    paddingRight: '2px',
                    fontWeight: 'bold'
                  }}>
                    K
                  </span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
              <img 
                src="/favicon.png" 
                alt="AI" 
                style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  flexShrink: 0, boxShadow: 'var(--shadow-sm)', 
                  border: '2px solid white', backgroundColor: 'white' 
                }} 
              />
              <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.85)', padding: '1rem', 
                borderRadius: 'var(--radius-lg)', borderTopLeftRadius: 0,
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', height: '100%', minHeight: '44px'
              }}>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.6)' }}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className="action-button secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }}
              onClick={() => handleSend("今日のメニューは？")}
              disabled={isLoading}
            >
              💡 今日のメニューは？
            </button>
            <button 
              className="action-button secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)' }}
              onClick={() => handleSend("前回の調子に合わせて重量を調整して")}
              disabled={isLoading}
            >
              ⚖️ 重量調整をお願い
            </button>
            <button 
              className="action-button secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', marginLeft: 'auto', color: 'var(--warning)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              onClick={handleClearChatClick}
              disabled={isLoading}
            >
              🧹 履歴をクリア
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask for advice, menu suggestions..."
              style={{ flex: 1, resize: 'none', height: '50px', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              disabled={isLoading}
            />
            <button 
              className="action-button primary"
              style={{ height: '50px', width: '50px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>確認</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>チャット履歴を削除しますか？</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="action-button secondary" 
                style={{ flex: 1 }}
              >
                キャンセル
              </button>
              <button 
                onClick={confirmClearChat}
                className="action-button primary" 
                style={{ flex: 1, backgroundColor: 'var(--warning)', borderColor: 'var(--warning)' }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>エラー</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)}
              className="action-button primary" 
              style={{ width: '100%' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
