import React from 'react';
import { Bell, Sparkles, X, ArrowRight } from 'lucide-react';

interface ReminderBannerProps {
  prompt: string;
  onStartReflection: () => void;
  onDismiss: () => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  prompt,
  onStartReflection,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 bg-[#FDFCFB] border border-[#D4C9B0] rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-[#5A5A40]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Reflection Time</span>
            </div>
            <button
              onClick={onDismiss}
              className="text-[#A8A294] hover:text-[#5A5A40] p-1 rounded-lg hover:bg-[#F5F2ED] transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs font-sans text-[#2D2926] font-medium leading-snug mb-3">
            {prompt || 'Time to unpack your day with DearMe 🌿'}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartReflection}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#5A5A40] hover:bg-[#4A4A34] text-white text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <span>Start Reflection</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-full text-xs font-sans text-[#8C857B] hover:text-[#2D2926] transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
