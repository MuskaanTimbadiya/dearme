import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Brain,
  CheckCircle,
  Star,
  RefreshCw,
  Compass,
  ChevronDown,
  ChevronUp,
  Feather,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { ErrorBanner } from './ErrorBanner';
import type { JournalEntry, JournalMessage, ReflectionMode } from '../types';

interface ReflectionSessionProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => Promise<void>;
  isSaving: boolean;
}

const INSPIRATION_PROMPTS = [
  'What gave me the most energy today, and what drained it?',
  "What is an assumption I'm making about a current situation?",
  "What is one small victory or moment of peace I noticed today?",
  'If I looked at my current challenge with self-compassion, what would I tell myself?',
  'What boundary would protect my peace of mind this week?',
  'What decision have I been delaying, and what is the underlying fear?',
];

export const ReflectionSession: React.FC<ReflectionSessionProps> = ({
  entry,
  onUpdateEntry,
  isSaving,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflective');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(entry.title);
  const [showSummaryCard, setShowSummaryCard] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitleInput(entry.title);
  }, [entry.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    const newTitle = titleInput.trim() || 'Untitled Reflection';
    if (newTitle !== entry.title) {
      try {
        await onUpdateEntry({
          ...entry,
          title: newTitle,
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to update title.');
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isGenerating) return;

    setErrorMessage(null);
    const userMessage: JournalMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...entry.messages, userMessage];

    // Optimistically update entry state with user message
    const updatedEntry: JournalEntry = {
      ...entry,
      title:
        entry.title === 'New Reflection' && newMessages.length === 1
          ? textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : '')
          : entry.title,
      messages: newMessages,
      updatedAt: Date.now(),
    };

    setIsGenerating(true);

    try {
      // WAIT for db save before clearing input (Throws on failure)
      await onUpdateEntry(updatedEntry);
      
      // Clear input only after successful DB save is confirmed
      setInputText('');

      // Call server-side /api/chat with full history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: selectedMode,
          entryTitle: entry.title,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const modelMessage: JournalMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        role: 'model',
        content: data.reply,
        timestamp: Date.now(),
      };

      const finalEntry: JournalEntry = {
        ...updatedEntry,
        messages: [...newMessages, modelMessage],
        updatedAt: Date.now(),
      };

      await onUpdateEntry(finalEntry);
    } catch (err: any) {
      console.error('Failed to get Gemini response or save:', err);
      setErrorMessage(
        err.message || 'Failed to save or generate response. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (entry.messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: entry.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to synthesize summary.');
      }

      const data = await response.json();

      const updated: JournalEntry = {
        ...entry,
        title: data.title || entry.title,
        summary: data.summary,
        keyTakeaways: data.keyTakeaways || [],
        mood: data.mood || 'Reflective',
        updatedAt: Date.now(),
      };

      await onUpdateEntry(updated);
      setShowSummaryCard(true);
    } catch (err: any) {
      console.error('Summary error:', err);
      setErrorMessage(err.message || 'Could not generate summary or save.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#FDFCFB] overflow-hidden">
      {/* Session Top Bar */}
      <div className="px-6 py-4 border-b border-[#F0EDE8] bg-[#FDFCFB]/95 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              id="input-entry-title"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-xl font-serif font-medium text-[#5A5A40] border-b border-[#5A5A40] bg-transparent focus:outline-none w-full max-w-md"
            />
          ) : (
            <h2
              id="heading-entry-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename reflection"
              className="text-xl font-serif font-medium text-[#5A5A40] truncate cursor-pointer hover:underline decoration-dotted underline-offset-4"
            >
              {entry.title}
            </h2>
          )}

          <button
            onClick={async () => {
              try {
                await onUpdateEntry({
                  ...entry,
                  isFavorite: !entry.isFavorite,
                  updatedAt: Date.now(),
                });
              } catch (err: any) {
                setErrorMessage(err.message || 'Failed to save favorite toggle.');
              }
            }}
            className="p-1 rounded-md text-[#A8A294] hover:text-[#5A5A40] cursor-pointer"
            title={entry.isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
          >
            <Star
              className={`w-4 h-4 ${entry.isFavorite ? 'fill-[#5A5A40] text-[#5A5A40]' : ''}`}
            />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#F5F2ED] p-1 rounded-full text-xs font-medium text-[#5C564E]">
            <button
              onClick={() => setSelectedMode('reflective')}
              className={`px-3 py-1 rounded-full text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                selectedMode === 'reflective'
                  ? 'bg-white text-[#5A5A40] shadow-xs font-semibold'
                  : 'hover:text-[#5A5A40]'
              }`}
            >
              Reflect
            </button>
            <button
              onClick={() => setSelectedMode('brainstorm')}
              className={`px-3 py-1 rounded-full text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                selectedMode === 'brainstorm'
                  ? 'bg-white text-[#5A5A40] shadow-xs font-semibold'
                  : 'hover:text-[#5A5A40]'
              }`}
            >
              Brainstorm
            </button>
            <button
              onClick={() => setSelectedMode('actionable')}
              className={`px-3 py-1 rounded-full text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                selectedMode === 'actionable'
                  ? 'bg-white text-[#5A5A40] shadow-xs font-semibold'
                  : 'hover:text-[#5A5A40]'
              }`}
            >
              Actions
            </button>
          </div>

          {/* AI Summarize Action */}
          <button
            id="btn-summarize-entry"
            onClick={handleGenerateSummary}
            disabled={isSummarizing || entry.messages.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans uppercase tracking-wider font-semibold bg-[#EDE8DF] text-[#5A5A40] border border-[#DCD5C8] hover:bg-[#E2DDD2] active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Synthesize conversation into key takeaways and mood analysis"
          >
            {isSummarizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{entry.summary ? 'Re-Synthesize' : 'Synthesize Insights'}</span>
          </button>
        </div>
      </div>

      {/* Main Conversation & Journal Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 space-y-6">
        {/* AI Summary / Insights Card (if generated) */}
        {entry.summary && (
          <div className="p-6 rounded-[28px] bg-[#F5F2ED] border border-[#E6E1D6] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-sans font-semibold text-[#5A5A40] uppercase tracking-widest">
                  AI Synthesis & Reflections
                </span>
                {entry.mood && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8DF] text-[#5A5A40] text-[10px] font-sans uppercase tracking-wider font-medium border border-[#DCD5C8]">
                    Mood: {entry.mood}
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowSummaryCard(!showSummaryCard)}
                className="text-[#A8A294] hover:text-[#5A5A40] p-1 rounded-md cursor-pointer"
              >
                {showSummaryCard ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {showSummaryCard && (
              <div className="space-y-3 pt-1">
                <p className="text-sm sm:text-base text-[#5C564E] leading-relaxed font-serif italic">
                  "{entry.summary}"
                </p>

                {entry.keyTakeaways && entry.keyTakeaways.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E6E1D6]">
                    <span className="text-[10px] uppercase tracking-widest font-sans font-semibold text-[#A8A294] block mb-2">
                      Core Insights:
                    </span>
                    <ul className="space-y-2">
                      {entry.keyTakeaways.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2D2926] leading-normal"
                        >
                          <CheckCircle className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State / Starters */}
        {entry.messages.length === 0 ? (
          <div className="py-8 max-w-xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center mx-auto shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-normal text-[#2D2926] mb-2">
                What is on your mind today?
              </h3>
              <p className="text-sm text-[#5C564E] leading-relaxed font-serif italic">
                Take a breath and write whatever comes to mind. Your space is entirely private.
              </p>
            </div>

            <div className="text-left pt-2">
              <span className="text-[10px] font-sans font-semibold text-[#A8A294] uppercase tracking-widest block mb-3 text-center">
                Reflection Prompts
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {INSPIRATION_PROMPTS.slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3.5 rounded-2xl bg-[#F5F2ED] border border-[#E6E1D6] hover:border-[#5A5A40] hover:bg-[#EDE8DF]/60 text-left text-xs sm:text-sm text-[#2D2926] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#A8A294] group-hover:text-[#5A5A40] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conversation stream */
          entry.messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl text-sm sm:text-base leading-relaxed ${
                    isUser
                      ? 'bg-[#F5F2ED] text-[#2D2926] p-5 rounded-[28px] rounded-tr-none'
                      : 'bg-white border border-[#F0EDE8] p-6 rounded-[28px] rounded-tl-none shadow-xs text-[#2D2926]'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F0EDE8] text-[10px] font-sans font-semibold uppercase tracking-widest text-[#5A5A40]">
                      <div className="w-5 h-5 rounded-full bg-[#5A5A40] text-white flex items-center justify-center">
                        <Feather className="w-3 h-3 text-[#E6E1D6]" />
                      </div>
                      <span>Gemini Reflection</span>
                    </div>
                  )}

                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans">{message.content}</div>
                  ) : (
                    <div className="markdown-body prose prose-sm max-w-none text-[#2D2926]">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  )}
                </div>

                <span className="text-[10px] uppercase tracking-wider text-[#A8A294] font-sans mt-1.5 px-2">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        {/* Gemini Generating Indicator */}
        {isGenerating && (
          <div className="flex flex-col items-start">
            <div className="max-w-md rounded-[28px] p-5 bg-white border border-[#F0EDE8] shadow-xs rounded-tl-none">
              <div className="flex items-center gap-2.5 text-xs font-sans text-[#5A5A40]">
                <div className="w-2 h-2 rounded-full bg-[#5A5A40] animate-ping" />
                <span>Gemini is reflecting thoughtfully...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        <ErrorBanner 
          message={errorMessage || ''} 
          onRetry={inputText.trim() ? () => { setErrorMessage(null); handleSendMessage(); } : undefined} 
          onDismiss={() => setErrorMessage(null)} 
        />

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Section */}
      <div className="p-4 sm:p-6 bg-[#FDFCFB] border-t border-[#F0EDE8] shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="relative rounded-[28px] bg-[#F5F2ED] border border-[#E6E1D6] focus-within:ring-2 focus-within:ring-[#5A5A40]/25 transition-all p-3.5 sm:p-4">
            <textarea
              id="input-reflection-message"
              ref={textareaRef}
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                entry.messages.length === 0
                  ? 'Pour your thoughts, feelings, or situation here...'
                  : 'Reply or continue your reflection...'
              }
              className="w-full bg-transparent resize-none text-sm sm:text-base text-[#2D2926] placeholder-[#A8A294] focus:outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-[#E6E1D6] mt-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#A8A294] font-sans">
                <span className="hidden sm:inline">Cmd/Ctrl + Enter to send</span>
                <span className="text-[#D4C9B0]">•</span>
                <span className="capitalize">{selectedMode} Mode</span>
              </div>

              <button
                id="btn-send-reflection"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isGenerating}
                className="w-10 h-10 rounded-full bg-[#5A5A40] text-white hover:bg-[#4A4A34] active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center"
                title="Send Reflection"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
