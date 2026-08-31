import React from 'react';
import { Clock, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import type { JournalEntry } from '../types';
import type { OnThisDayMatch } from '../lib/onThisDay';

interface OnThisDayCardProps {
  memory: OnThisDayMatch;
  onSelectEntry: (entryId: string) => void;
  onReflectOnMemory?: (entry: JournalEntry, label: string) => void;
}

export const OnThisDayCard: React.FC<OnThisDayCardProps> = ({
  memory,
  onSelectEntry,
  onReflectOnMemory,
}) => {
  const { label, entry, timeAgoText } = memory;
  const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#5A5A40] to-[#3E3E2B] text-white p-4 shadow-md border border-[#7A7A5C]/40 overflow-hidden animate-in fade-in slide-in-from-top-2">
      {/* Background Ambient Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#8C8C6B]/20 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-sans font-semibold uppercase tracking-wider text-amber-200 border border-white/10">
          <Clock className="w-3 h-3 text-amber-300" />
          <span>{label}</span>
        </div>
        <span className="text-[10px] text-white/70 font-sans font-medium">{formattedDate}</span>
      </div>

      <div className="my-2">
        <div className="flex items-center gap-2">
          {entry.emoji && <span className="text-base">{entry.emoji}</span>}
          <h4 className="text-sm font-sans font-bold text-white truncate leading-snug">
            {entry.title || 'Untitled Reflection'}
          </h4>
        </div>

        {entry.summary && (
          <p className="text-xs font-sans text-white/80 line-clamp-2 mt-1 italic leading-relaxed">
            "{entry.summary}"
          </p>
        )}

        {entry.location?.description && (
          <div className="flex items-center gap-1 text-[10px] text-white/70 mt-1.5">
            <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
            <span className="truncate">{entry.location.description}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-3">
        <button
          onClick={() => onSelectEntry(entry.id)}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-white text-[#3E3E2B] text-xs font-sans font-semibold hover:bg-amber-50 transition-colors cursor-pointer shadow-xs"
        >
          <span>Revisit Entry</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onReflectOnMemory && (
          <button
            onClick={() => onReflectOnMemory(entry, timeAgoText)}
            className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-sans font-semibold transition-colors cursor-pointer border border-white/15"
            title="Start a reflection based on this past memory"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Reflect</span>
          </button>
        )}
      </div>
    </div>
  );
};
