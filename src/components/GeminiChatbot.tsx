import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { PortalPageId, ProyashDB, User } from '../types';

type RolePreset = 'academic' | 'library' | 'portal';
type ModelChoice = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface GeminiChatbotProps {
  db: ProyashDB;
  viewMode: 'public' | 'portal';
  portalPage: PortalPageId;
  currentUser: User | null;
}

const ROLE_OPTIONS: { id: RolePreset; label: string; subtitle: string; starters: string[] }[] = [
  {
    id: 'academic',
    label: 'Academic & Exam Guide',
    subtitle: 'Class II–X Exam, Registration & Study Tips',
    starters: [
      'How do students from Class II to Class X register for the Merit Exam?',
      'What documents or photo rules apply to exam registration?',
      'Give a 2-week revision plan for a Class VIII scholarship student.',
    ],
  },
  {
    id: 'library',
    label: 'Library & Reading Assistant',
    subtitle: 'Books, Borrowing Rules & Reading Guides',
    starters: [
      'Suggest inspiring science and math books for Class VI–IX students.',
      'How can members borrow and return books from the PROYASH library?',
      'Help design a weekly reading habit for Class IV students.',
    ],
  },
  {
    id: 'portal',
    label: 'Portal Operations Helper',
    subtitle: 'Room Distribution, Entry Tick & Role Guide',
    starters: [
      'How do I multi-select Class II–X students and assign seats in Room Management?',
      'What is the difference between Super Admin, Admin, Manager, and Member?',
      'How do Gatekeeper Entry Tick and Group Message Box work?',
    ],
  },
];

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  db,
  viewMode,
  portalPage,
  currentUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rolePreset, setRolePreset] = useState<RolePreset>(
    viewMode === 'portal' ? 'portal' : 'academic'
  );
  const [model, setModel] = useState<ModelChoice>('gemini-4-hydrogen');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewMode === 'portal' && messages.length === 0) {
      setRolePreset('portal');
    } else if (viewMode === 'public' && messages.length === 0 && rolePreset === 'portal') {
      setRolePreset('academic');
    }
  }, [viewMode, messages.length, rolePreset]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  const activeRole = ROLE_OPTIONS.find((r) => r.id === rolePreset) || ROLE_OPTIONS[0];

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || isSending) return;

    setErrorMsg('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historyBeforeTurn = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyBeforeTurn,
          rolePreset,
          model,
          siteContext: {
            brandTitle: db.siteContent.brandTitle,
            examTitle: db.examinations[0]?.name || 'Merit Scholarship Examination',
            examDate: db.examinations[0]?.date || 'Scheduled Exam Date',
            viewMode,
            portalPage: viewMode === 'portal' ? portalPage : undefined,
            userRoleLevel: currentUser ? currentUser.level : undefined,
            classesRange: 'II–X',
            stats: {
              totalStudents: db.students.length,
              totalRooms: db.rooms.length,
              totalBooks: db.library.length,
              totalNotices: db.notices.length,
            },
          },
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach the assistant.';
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {/* Floating Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open PROYASH Assistant"
          className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#091b33] text-white border border-[#d4a017]/60 shadow-lg hover:bg-[#0f294a] transition cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#d4a017]" />
          <span className="text-xs font-semibold tracking-wide">PROYASH Assistant</span>
        </button>
      )}

      {/* Multi-turn Chat Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="PROYASH Multi-Turn Assistant"
          className="fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[410px] h-[580px] max-h-[82vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#091b33] text-white px-4 py-3.5 border-b border-white/10">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#d4a017] text-[#091b33] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">PROYASH Assistant</div>
                  <div className="text-[11px] text-slate-300 leading-tight">
                    {activeRole.subtitle}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setErrorMsg('');
                  }}
                  title="Clear Conversation"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role & Model Selector */}
            <div className="grid grid-cols-12 gap-2">
              <select
                aria-label="Assistant Role"
                value={rolePreset}
                onChange={(e) => setRolePreset(e.target.value as RolePreset)}
                className="col-span-7 px-2.5 py-1.5 rounded-lg bg-[#0f294a] border border-white/15 text-xs text-white font-medium"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    Role: {r.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Response Mode"
                value={model}
                onChange={(e) => setModel(e.target.value as ModelChoice)}
                className="col-span-5 px-2.5 py-1.5 rounded-lg bg-[#0f294a] border border-white/15 text-xs text-white font-medium"
              >
                <option value="gemini-4-hydrogen">Balanced</option>
                <option value="gemini-3.1-flash-lite">Fast</option>
              </select>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fb]">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed">
                  <div className="font-bold text-[#0f294a] mb-1">
                    Active Role: {activeRole.label}
                  </div>
                  Ask questions across multiple turns. Switch roles anytime above to tailor how the
                  assistant responds.
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Suggested Questions
                  </div>
                  {activeRole.starters.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#0f294a] text-xs text-[#0f294a] font-medium transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'model' && (
                    <div className="w-7 h-7 rounded-lg bg-[#0f294a] text-[#d4a017] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#0f294a] text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>{m.text}</div>
                    <div
                      className={`mt-1 text-[10px] tabular-nums ${
                        m.role === 'user' ? 'text-slate-300 text-right' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-[#d4a017] text-[#091b33] flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isSending && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0f294a] text-[#d4a017] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f294a]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-end gap-2"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${activeRole.label}...`}
              className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0f294a]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="px-3.5 py-2.5 rounded-xl bg-[#0f294a] text-white hover:bg-[#091b33] disabled:opacity-40 cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
