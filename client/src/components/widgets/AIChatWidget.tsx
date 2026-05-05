import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Trash2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-accent" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-background rounded-tr-sm whitespace-pre-wrap'
            : 'bg-surface-elevated text-text-primary rounded-tl-sm border border-border'
        }`}
      >
        {isUser ? msg.content : (
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
                >
                  {children}
                </a>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
              h1: ({ children }) => <p className="font-semibold text-text-primary mb-1">{children}</p>,
              h2: ({ children }) => <p className="font-semibold text-text-primary mb-1">{children}</p>,
              h3: ({ children }) => <p className="font-medium text-text-primary mb-1">{children}</p>,
              code: ({ children }) => (
                <code className="bg-background/60 text-accent px-1 py-0.5 rounded text-xs font-mono">{children}</code>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AIChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { messages: updated });
      setMessages([...updated, { role: 'assistant', content: res.data.data.reply }]);
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">AD Brain</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-text-muted hover:text-text-secondary transition-colors p-1 rounded"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">AD Brain</p>
              <p className="text-xs text-text-muted mt-1">Above Digital's internal assistant</p>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-48">
              {['Help me write a client email', 'Brainstorm campaign ideas', 'How do I add a widget?'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs text-text-secondary bg-surface-elevated hover:bg-border border border-border rounded-lg px-3 py-1.5 text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="bg-surface-elevated border border-border rounded-2xl rounded-tl-sm px-3 py-2">
              <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AD Brain… (Enter to send)"
            rows={1}
            className="flex-1 resize-none bg-surface-elevated border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors max-h-28 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
