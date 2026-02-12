import { useState, useRef, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  "How can I improve my content based on comments?",
  "What's the overall sentiment of my comments?",
  "Who are my most active commenters?",
  "Which videos get the most comments?",
  "Show me recent negative feedback",
  "Compare my YouTube vs Instagram engagement",
];

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();
  
  const isLoading = fetcher.state !== 'idle';

  // Handle response from API
  useEffect(() => {
    try {
      console.log('[ChatPanel] fetcher.data:', fetcher.data, 'fetcher.state:', fetcher.state);
      if (fetcher.data?.response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fetcher.data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (fetcher.data?.error) {
        const errorMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, something went wrong: ${fetcher.data.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('[ChatPanel] Error handling response:', err);
    }
  }, [fetcher.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    fetcher.submit(
      { message: text },
      { method: 'POST', action: '/api/chat' }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    console.log('[ChatPanel] Rendering closed state - isOpen is false');
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-oasis-500 hover:bg-oasis-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
        title="Ask about your analytics"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-oasis-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-oasis-100 bg-oasis-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-oasis-500" />
          <h3 className="font-semibold text-warm-800">Analytics Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-oasis-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-warm-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-10 h-10 text-oasis-300 mx-auto mb-3" />
            <p className="text-warm-600 font-medium mb-2">Ask me anything!</p>
            <p className="text-sm text-warm-400 mb-4">
              I can help you understand your comment analytics
            </p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(question)}
                  className="block w-full text-left text-sm px-3 py-2 bg-oasis-50 hover:bg-oasis-100 rounded-lg text-warm-600 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2',
                  message.role === 'user'
                    ? 'ml-auto bg-oasis-500 text-white'
                    : 'bg-gray-100 text-warm-800'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-warm-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-oasis-100">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your analytics..."
            className="flex-1 min-h-[44px] max-h-24 resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
