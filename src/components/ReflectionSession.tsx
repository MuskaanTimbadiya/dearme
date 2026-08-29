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
  MapPin,
  Image as ImageIcon,
  Mic,
  Palette,
  LocateFixed,
  X,
  Volume2,
  Play,
  Pause,
  Maximize2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { auth } from '../lib/firebase';
import { ErrorBanner } from './ErrorBanner';
import { VoiceRecorderModal } from './VoiceRecorderModal';
import type { JournalEntry, JournalMessage, ReflectionMode, JournalFontFamily, JournalTheme } from '../types';

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

  // Photos & Attachments State
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Note State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [pendingAudioNote, setPendingAudioNote] = useState<{
    url: string;
    duration: number;
    transcript?: string;
  } | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Font & Theme Customization State
  const [selectedFont, setSelectedFont] = useState<JournalFontFamily>(entry.fontFamily || 'serif');
  const [selectedTheme, setSelectedTheme] = useState<JournalTheme>(entry.theme || 'parchment');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Location State
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [placePredictions, setPlacePredictions] = useState<any[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitleInput(entry.title);
    setSelectedFont(entry.fontFamily || 'serif');
    setSelectedTheme(entry.theme || 'parchment');
  }, [entry]);

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

  const handleFontChange = async (font: JournalFontFamily) => {
    setSelectedFont(font);
    try {
      await onUpdateEntry({
        ...entry,
        fontFamily: font,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      setErrorMessage('Failed to update font style.');
    }
  };

  const handleThemeChange = async (theme: JournalTheme) => {
    setSelectedTheme(theme);
    try {
      await onUpdateEntry({
        ...entry,
        theme: theme,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      setErrorMessage('Failed to update paper theme.');
    }
  };

  // 1-Click Browser Geolocation Auto-Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.suburb ||
            data.address?.state ||
            'Current Location';
          const country = data.address?.country ? `, ${data.address.country}` : '';
          const description = `${city}${country}`;

          await onUpdateEntry({
            ...entry,
            location: {
              description,
              lat: latitude,
              lng: longitude,
            },
            updatedAt: Date.now(),
          });
          setIsSearchingLocation(false);
        } catch (err) {
          await onUpdateEntry({
            ...entry,
            location: {
              description: `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`,
              lat: latitude,
              lng: longitude,
            },
            updatedAt: Date.now(),
          });
          setIsSearchingLocation(false);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setErrorMessage('Location permission denied or unavailable.');
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSearchLocation = async (query: string) => {
    setLocationInput(query);
    if (query.length < 3) {
      setPlacePredictions([]);
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.predictions) {
        setPlacePredictions(data.predictions);
      }
    } catch (err) {
      console.error('Failed to search locations:', err);
    }
  };

  const handleSelectLocation = async (placeId: string, description: string) => {
    setIsSearchingLocation(false);
    setLocationInput('');
    setPlacePredictions([]);
    try {
      await onUpdateEntry({
        ...entry,
        location: { placeId, description },
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update location.');
    }
  };

  // Image Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAttachedPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedPhoto = (index: number) => {
    setAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Audio Playback Handler for message audio notes
  const toggleAudioPlayback = (audioId: string, url: string) => {
    if (playingAudioId === audioId && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setPlayingAudioId(audioId);

    audio.play().catch((err) => {
      console.error('Playback error:', err);
      setPlayingAudioId(null);
    });

    audio.onended = () => {
      setPlayingAudioId(null);
    };
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if ((!textToSend.trim() && attachedPhotos.length === 0 && !pendingAudioNote) || isGenerating)
      return;

    setErrorMessage(null);
    const userMessage: JournalMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
      photos: attachedPhotos.length > 0 ? attachedPhotos : undefined,
      audioNote: pendingAudioNote || undefined,
    };

    const newMessages = [...entry.messages, userMessage];

    const updatedEntry: JournalEntry = {
      ...entry,
      title:
        entry.title === 'New Reflection' && newMessages.length === 1
          ? textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : '')
          : entry.title,
      messages: newMessages,
      fontFamily: selectedFont,
      theme: selectedTheme,
      updatedAt: Date.now(),
    };

    setIsGenerating(true);

    try {
      await onUpdateEntry(updatedEntry);
      setInputText('');
      setAttachedPhotos([]);
      setPendingAudioNote(null);

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content + (m.audioNote?.transcript ? ` [Voice Transcript: "${m.audioNote.transcript}"]` : ''),
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
      setErrorMessage(err.message || 'Failed to save or generate response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (entry.messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setErrorMessage(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  // Helper font class generator
  const getFontClass = () => {
    switch (selectedFont) {
      case 'handwritten':
        return 'font-journal-handwritten';
      case 'editorial':
        return 'font-journal-editorial';
      case 'mono':
        return 'font-journal-mono';
      case 'sans':
        return 'font-journal-sans';
      default:
        return 'font-journal-serif';
    }
  };

  // Explicit Paper Theme Palette Config
  const getThemePalette = () => {
    switch (selectedTheme) {
      case 'midnight':
        return {
          container: 'bg-[#121316] text-[#F4F4F5]',
          topBar: 'bg-[#18191E]/90 border-zinc-800 text-[#F4F4F5]',
          userBubble: 'bg-[#252830] text-[#F4F4F5] border border-zinc-700',
          modelBubble: 'bg-[#1A1C23] text-[#F4F4F5] border border-zinc-800 shadow-sm',
          composerContainer: 'bg-[#1A1C23] border-zinc-700 text-[#F4F4F5]',
          textarea: 'text-[#F4F4F5] placeholder-zinc-500',
          summaryCard: 'bg-[#1A1C23] border-zinc-800 text-[#F4F4F5]',
          badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          pill: 'bg-zinc-800 text-zinc-300',
          activePill: 'bg-white text-zinc-900 font-semibold',
        };
      case 'sage':
        return {
          container: 'bg-[#F2F6F3] text-[#1E2E25]',
          topBar: 'bg-[#F2F6F3]/95 border-[#D1DFD5] text-[#1E2E25]',
          userBubble: 'bg-[#E1EDE4] text-[#1E2E25] border border-[#C5D8C9]',
          modelBubble: 'bg-white text-[#1E2E25] border border-[#D1DFD5] shadow-xs',
          composerContainer: 'bg-white border-[#C5D8C9] text-[#1E2E25]',
          textarea: 'text-[#1E2E25] placeholder-[#7F9E8B]',
          summaryCard: 'bg-[#E6F0E8] border-[#C5D8C9] text-[#1E2E25]',
          badge: 'bg-[#E1EDE4] text-[#1E2E25] border-[#C5D8C9]',
          pill: 'bg-[#E1EDE4] text-[#1E2E25]',
          activePill: 'bg-white text-[#1E2E25] font-semibold shadow-xs',
        };
      case 'rose':
        return {
          container: 'bg-[#FAF3F4] text-[#381F23]',
          topBar: 'bg-[#FAF3F4]/95 border-[#E8D0D5] text-[#381F23]',
          userBubble: 'bg-[#F3E5E8] text-[#381F23] border border-[#E0C5CB]',
          modelBubble: 'bg-white text-[#381F23] border border-[#E8D0D5] shadow-xs',
          composerContainer: 'bg-white border-[#E0C5CB] text-[#381F23]',
          textarea: 'text-[#381F23] placeholder-[#A67E86]',
          summaryCard: 'bg-[#F5E8EA] border-[#E0C5CB] text-[#381F23]',
          badge: 'bg-[#F3E5E8] text-[#381F23] border-[#E0C5CB]',
          pill: 'bg-[#F3E5E8] text-[#381F23]',
          activePill: 'bg-white text-[#381F23] font-semibold shadow-xs',
        };
      default:
        // Parchment (Default)
        return {
          container: 'bg-[#FDFCFB] text-[#2D2926]',
          topBar: 'bg-[#FDFCFB]/95 border-[#F0EDE8] text-[#2D2926]',
          userBubble: 'bg-[#F5F2ED] text-[#2D2926] border border-[#E6E1D6]',
          modelBubble: 'bg-white text-[#2D2926] border border-[#F0EDE8] shadow-xs',
          composerContainer: 'bg-white border-[#E6E1D6] text-[#2D2926]',
          textarea: 'text-[#2D2926] placeholder-[#A8A294]',
          summaryCard: 'bg-[#F5F2ED] border-[#E6E1D6] text-[#2D2926]',
          badge: 'bg-[#F5F2ED] text-[#5A5A40] border-[#E6E1D6]',
          pill: 'bg-[#F5F2ED] text-[#5C564E]',
          activePill: 'bg-white text-[#5A5A40] font-semibold shadow-xs',
        };
    }
  };

  const themePalette = getThemePalette();

  return (
    <div className={`flex-1 h-full flex flex-col overflow-hidden transition-colors duration-300 ${themePalette.container}`}>
      {/* Session Top Bar */}
      <div className={`px-6 py-3.5 border-b backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 ${themePalette.topBar}`}>
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
              className={`text-xl font-medium border-b border-current bg-transparent focus:outline-none w-full max-w-md ${getFontClass()}`}
            />
          ) : (
            <h2
              id="heading-entry-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename reflection"
              className={`text-xl font-medium truncate cursor-pointer hover:underline decoration-dotted underline-offset-4 ${getFontClass()}`}
            >
              {entry.title}
            </h2>
          )}

          {/* Location Badge */}
          {entry.location && (
            <div className={`flex items-center gap-1 text-xs font-sans shrink-0 px-2.5 py-1 rounded-full border ${themePalette.badge}`}>
              <MapPin className="w-3 h-3 text-[#5A5A40]" />
              <span className="truncate max-w-[150px]">{entry.location.description}</span>
            </div>
          )}

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchingLocation(!isSearchingLocation)}
              className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 cursor-pointer transition-colors"
              title="Location Pinning & Auto-Detect"
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* Style & Theme Customizer Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowStyleMenu(!showStyleMenu)}
                className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 cursor-pointer transition-colors"
                title="Customize Fonts & Paper Themes"
              >
                <Palette className="w-4 h-4" />
              </button>

              {/* Style Dropdown Menu */}
              {showStyleMenu && (
                <div className="absolute top-10 left-0 z-50 w-64 bg-[#FDFCFB] text-[#2D2926] rounded-2xl shadow-xl border border-[#E6E1D6] p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#A8A294] block mb-2">
                      Journal Typography
                    </label>
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { id: 'serif', label: 'Classic Garamond (Serif)', fontClass: 'font-serif' },
                        { id: 'handwritten', label: 'Handwritten Diary (Caveat)', fontClass: 'font-journal-handwritten' },
                        { id: 'editorial', label: 'Bookish Lora (Editorial)', fontClass: 'font-journal-editorial' },
                        { id: 'mono', label: 'Typewriter (Mono)', fontClass: 'font-journal-mono' },
                        { id: 'sans', label: 'Modern Clean (Sans)', fontClass: 'font-journal-sans' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            handleFontChange(f.id as JournalFontFamily);
                            setShowStyleMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            selectedFont === f.id ? 'bg-[#5A5A40] text-white font-semibold' : 'hover:bg-[#F5F2ED]'
                          }`}
                        >
                          <span className={f.fontClass}>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#F0EDE8] pt-3">
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#A8A294] block mb-2">
                      Paper Palette Theme
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'parchment', label: 'Parchment', bg: 'bg-[#FDFCFB]', border: 'border-[#E6E1D6]' },
                        { id: 'midnight', label: 'Midnight', bg: 'bg-[#121316]', border: 'border-zinc-700 text-white' },
                        { id: 'sage', label: 'Sage', bg: 'bg-[#F2F6F3]', border: 'border-emerald-200' },
                        { id: 'rose', label: 'Rose', bg: 'bg-[#FAF3F4]', border: 'border-rose-200' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            handleThemeChange(t.id as JournalTheme);
                            setShowStyleMenu(false);
                          }}
                          className={`p-2 rounded-xl text-xs font-sans border transition-all flex items-center gap-1.5 ${t.bg} ${t.border} ${
                            selectedTheme === t.id ? 'ring-2 ring-[#5A5A40]' : ''
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${t.bg} border border-current`} />
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

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
              className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 cursor-pointer transition-colors"
              title={entry.isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
            >
              <Star className={`w-4 h-4 ${entry.isFavorite ? 'fill-[#5A5A40] text-[#5A5A40]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Location Picker & 1-Click Auto Detect Box */}
        {isSearchingLocation && (
          <div className="absolute top-16 left-6 z-50 w-80 bg-[#FDFCFB] text-[#2D2926] rounded-2xl shadow-xl border border-[#E6E1D6] p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#A8A294]">
                Set Reflection Location
              </span>
              <button
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#5A5A40] text-white text-[10px] font-sans font-semibold uppercase tracking-wider hover:bg-[#4A4A34] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <LocateFixed className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span>{isDetectingLocation ? 'Locating...' : 'Auto-Detect'}</span>
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Or search city, venue, spot..."
              value={locationInput}
              onChange={(e) => handleSearchLocation(e.target.value)}
              className="w-full text-xs font-sans text-[#2D2926] border-b border-[#E6E1D6] bg-transparent focus:outline-none pb-2 mb-2 placeholder:text-[#A8A294]"
            />

            {placePredictions.length > 0 && (
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {placePredictions.map((pred) => (
                  <li key={pred.place_id}>
                    <button
                      onClick={() => handleSelectLocation(pred.place_id, pred.description)}
                      className="w-full text-left text-xs font-sans text-[#5C564E] hover:bg-[#F5F2ED] p-2 rounded-md transition-colors truncate"
                    >
                      {pred.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setIsSearchingLocation(false)}
                className="text-[10px] uppercase tracking-wider font-semibold text-[#A8A294] hover:text-[#5A5A40]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mode Switcher */}
          <div className={`flex items-center p-1 rounded-full text-xs font-medium ${themePalette.pill}`}>
            {(['reflective', 'brainstorm', 'actionable'] as ReflectionMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-3 py-1 rounded-full text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                  selectedMode === mode ? themePalette.activePill : 'opacity-70 hover:opacity-100'
                }`}
              >
                {mode === 'reflective' ? 'Reflect' : mode === 'brainstorm' ? 'Brainstorm' : 'Actions'}
              </button>
            ))}
          </div>

          {/* AI Summarize Action */}
          <button
            id="btn-summarize-entry"
            onClick={handleGenerateSummary}
            disabled={isSummarizing || entry.messages.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans uppercase tracking-wider font-semibold bg-[#EDE8DF] text-[#5A5A40] border border-[#DCD5C8] hover:bg-[#E2DDD2] active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Synthesize conversation into key takeaways and mood analysis"
          >
            {isSummarizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{entry.summary ? 'Re-Synthesize' : 'Synthesize Insights'}</span>
          </button>
        </div>
      </div>

      {/* Main Conversation & Journal Stream */}
      <div className={`flex-1 overflow-y-auto px-4 sm:px-10 py-6 space-y-6 ${getFontClass()}`}>
        {/* AI Summary / Insights Card */}
        {entry.summary && (
          <div className={`p-6 rounded-[28px] border shadow-xs ${themePalette.summaryCard}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-sans font-semibold uppercase tracking-widest">
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
                className="opacity-70 hover:opacity-100 p-1 rounded-md cursor-pointer"
              >
                {showSummaryCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showSummaryCard && (
              <div className="space-y-3 pt-1">
                <p className="text-sm sm:text-base leading-relaxed italic opacity-90">"{entry.summary}"</p>

                {entry.keyTakeaways && entry.keyTakeaways.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-current/10">
                    <span className="text-[10px] uppercase tracking-widest font-sans font-semibold opacity-60 block mb-2">
                      Core Insights:
                    </span>
                    <ul className="space-y-2">
                      {entry.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-normal">
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

        {/* Empty State */}
        {entry.messages.length === 0 ? (
          <div className="py-8 max-w-xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-[#EDE8DF] text-[#5A5A40] flex items-center justify-center mx-auto shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-normal mb-2">What is on your mind today?</h3>
              <p className="text-sm opacity-80 leading-relaxed italic">
                Take a breath and write, record a voice note, or attach photos. Your space is entirely private.
              </p>
            </div>

            <div className="text-left pt-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-widest block mb-3 text-center opacity-60">
                Reflection Prompts
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {INSPIRATION_PROMPTS.slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className={`p-3.5 rounded-2xl border hover:border-[#5A5A40] text-left text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between group shadow-2xs ${themePalette.userBubble}`}
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conversation Stream */
          entry.messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-2xl text-sm sm:text-base leading-relaxed ${
                    isUser
                      ? `${themePalette.userBubble} p-5 rounded-[28px] rounded-tr-none`
                      : `${themePalette.modelBubble} p-6 rounded-[28px] rounded-tl-none`
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current/10 text-[10px] font-sans font-semibold uppercase tracking-widest text-[#5A5A40]">
                      <div className="w-5 h-5 rounded-full bg-[#5A5A40] text-white flex items-center justify-center">
                        <Feather className="w-3 h-3 text-[#E6E1D6]" />
                      </div>
                      <span>Gemini Reflection</span>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div className="markdown-body prose prose-sm max-w-none">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  )}

                  {/* Photos Attachment Grid */}
                  {message.photos && message.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-current/10">
                      {message.photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setLightboxImage(photo)}
                          className="relative rounded-xl overflow-hidden cursor-pointer group border border-black/10 aspect-video bg-black/5"
                        >
                          <img src={photo} alt="Journal Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audio Note Attachment Bar */}
                  {message.audioNote && (
                    <div className="mt-3 p-3 rounded-2xl bg-black/5 border border-current/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => toggleAudioPlayback(message.id, message.audioNote!.url)}
                          className="w-8 h-8 rounded-full bg-[#5A5A40] text-white flex items-center justify-center hover:bg-[#4A4A34] transition-colors cursor-pointer shrink-0"
                        >
                          {playingAudioId === message.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-sans font-medium">
                            <Volume2 className="w-3.5 h-3.5 text-[#5A5A40]" />
                            <span>Voice Note ({message.audioNote.duration}s)</span>
                          </div>
                          {message.audioNote.transcript && (
                            <p className="text-[11px] font-sans opacity-70 italic line-clamp-1">
                              "{message.audioNote.transcript}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] uppercase tracking-wider opacity-60 font-sans mt-1.5 px-2">
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
            <div className={`max-w-md rounded-[28px] p-5 ${themePalette.modelBubble} rounded-tl-none`}>
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
      <div className="p-4 sm:p-6 border-t border-current/10 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Pre-send Attachment Chips */}
          {(attachedPhotos.length > 0 || pendingAudioNote) && (
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {attachedPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-current/20 group">
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeAttachedPhoto(idx)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {pendingAudioNote && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#5A5A40] text-white text-xs font-sans">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice Note ({pendingAudioNote.duration}s)</span>
                  <button onClick={() => setPendingAudioNote(null)} className="p-0.5 hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={`relative rounded-[28px] border focus-within:ring-2 focus-within:ring-[#5A5A40]/25 transition-all p-3.5 sm:p-4 shadow-sm ${themePalette.composerContainer}`}>
            <textarea
              id="input-reflection-message"
              ref={textareaRef}
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                entry.messages.length === 0
                  ? 'Pour your thoughts, feelings, or record a voice note...'
                  : 'Reply or continue your reflection...'
              }
              className={`w-full bg-transparent resize-none text-sm sm:text-base focus:outline-none leading-relaxed ${getFontClass()} ${themePalette.textarea}`}
            />

            <div className="flex items-center justify-between pt-2 border-t border-current/10 mt-1">
              {/* Media Attachment Toolbar */}
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 transition-colors cursor-pointer"
                  title="Attach Photo"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-2 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 transition-colors cursor-pointer"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <span className="text-[10px] uppercase tracking-wider opacity-60 font-sans ml-2">
                  <span className="hidden sm:inline">Cmd/Ctrl + Enter to send</span>
                </span>
              </div>

              <button
                id="btn-send-reflection"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && attachedPhotos.length === 0 && !pendingAudioNote) || isGenerating}
                className="w-10 h-10 rounded-full bg-[#5A5A40] text-white hover:bg-[#4A4A34] active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center"
                title="Send Reflection"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveAudioNote={(url, duration, transcript) => {
          setPendingAudioNote({ url, duration, transcript });
          if (transcript) {
            setInputText((prev) => (prev ? `${prev}\n${transcript}` : transcript));
          }
        }}
        onInsertTranscriptOnly={(transcript) => {
          setInputText((prev) => (prev ? `${prev}\n${transcript}` : transcript));
        }}
      />

      {/* Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img src={lightboxImage} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
