import React from 'react';
import { Flame, Plus, LogOut, ShieldCheck, User as UserIcon, BarChart2, HelpCircle } from 'lucide-react';
import type { JournalEntry, UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  entries?: JournalEntry[];
  onNewEntry: () => void;
  onSignOut: () => void;
  isSaving: boolean;
  onOpenInsights?: () => void;
  onOpenOnboarding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  entries = [],
  onNewEntry,
  onSignOut,
  isSaving,
  onOpenInsights,
  onOpenOnboarding,
}) => {
  const calculateStreak = () => {
    if (!entries || entries.length === 0) return 0;
    const uniqueDays = new Set(
      entries.map((e) => new Date(e.createdAt).toISOString().split('T')[0])
    );
    return uniqueDays.size;
  };

  const streak = calculateStreak();

  return (
    <header className="h-16 border-b border-white/30 bg-white/70 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#35495e] to-[#42b883] text-white flex items-center justify-center shadow-xs">
          <span className="font-tech-heading font-black text-sm tracking-tighter text-white">DM</span>
        </div>
        <div>
          <span className="font-tech-heading font-bold text-lg text-slate-800 tracking-tight leading-none block">DearMe</span>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-sans-body mt-0.5">
            <ShieldCheck className="w-3 h-3 text-[#42b883]" />
            <span>Private Space ({user.email?.split('@')[0]})</span>
          </div>
        </div>
      </div>

      {/* Action Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Streak Counter Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel border border-amber-500/30 text-amber-600 text-xs font-tech-heading font-bold shadow-2xs"
          title={`${streak} unique reflection days logged`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
          <span>{streak} Day Streak</span>
        </div>

        {/* Insights / Mood Trends Button */}
        {onOpenInsights && (
          <button
            onClick={onOpenInsights}
            className="p-2 rounded-full glass-panel hover:bg-white/80 transition-colors text-slate-700 cursor-pointer"
            title="View Mood Trends & Insights"
          >
            <BarChart2 className="w-4 h-4 text-[#42b883]" />
          </button>
        )}

        {/* Onboarding Help Button */}
        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="p-2 rounded-full glass-panel hover:bg-white/80 transition-colors text-slate-700 cursor-pointer"
            title="Take Tooltip Tour"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
          </button>
        )}

        {/* New Session Button */}
        <button
          id="btn-navbar-new-entry"
          onClick={onNewEntry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans uppercase tracking-wider font-semibold bg-[#5A5A40] text-white hover:bg-[#4A4A34] active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Reflection</span>
        </button>

        {/* User avatar & Sign Out */}
        <div className="flex items-center pl-3 border-l border-[#F0EDE8] gap-2.5">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full border border-[#D4C9B0] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#D4C9B0] text-white flex items-center justify-center text-xs font-sans font-bold">
              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ME'}
            </div>
          )}

          <button
            id="btn-navbar-logout"
            onClick={onSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#A8A294] hover:text-[#5A5A40] hover:bg-[#F5F2ED] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
