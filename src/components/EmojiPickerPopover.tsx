import React, { useState } from 'react';
import { Smile, Search, X } from 'lucide-react';

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Mindfulness & Nature',
    emojis: ['🌿', '✨', '🧘', '🍃', '🕊️', '🌸', '🌻', '🌱', '🌊', '☀️', '🌙', '🌧️', '🌈', '🌌', '☕', '🍵', '🕯️'],
  },
  {
    name: 'Moods & Feelings',
    emojis: ['😌', '😊', '💖', '💭', '🥺', '🤔', '🥳', '😴', '🙃', '🌤️', '💫', '⚡', '🤍', '🤎', '💚', '💙', '💜'],
  },
  {
    name: 'Journal & Life',
    emojis: ['📖', '✍️', '💡', '🎨', '🎧', '🪴', '🏡', '🏞️', '⭐', '🎁', '🙏', '❤️', '🔥', '🎉', '🍀', '🐾', '🎶'],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

  return (
    <div className="absolute bottom-14 left-2 z-50 w-72 bg-[#FDFCFB] text-[#2D2926] rounded-2xl shadow-xl border border-[#E6E1D6] p-3 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-sans font-semibold text-[#5A5A40]">
          <Smile className="w-4 h-4 text-[#5A5A40]" />
          <span>Select Emoji</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-[#A8A294] hover:text-[#5A5A40] hover:bg-[#F5F2ED] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <div key={idx}>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#A8A294] block mb-1.5">
              {cat.name}
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {cat.emojis.map((emoji, eIdx) => (
                <button
                  key={eIdx}
                  onClick={() => {
                    onSelectEmoji(emoji);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-xl hover:bg-[#EDE8DF] text-base flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
