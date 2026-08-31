import React from 'react';
import { Flame, Plus, LogOut, ShieldCheck, User as UserIcon, BarChart2, HelpCircle, Bell } from 'lucide-react';
import type { JournalEntry, UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  entries?: JournalEntry[];
  onNewEntry: () => void;
  onSignOut: () => void;
  isSaving: boolean;
  onOpenInsights?: () => void;
  onOpenOnboarding?: () => void;
  onOpenReminders?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  entries = [],
  onNewEntry,
  onSignOut,
  isSaving,
  onOpenInsights,
  onOpenOnboarding,
  onOpenReminders,
}) => {
  const calculateStreak = () => {
    if (!entries || entries.length === 0) return 0;
    const uniqueDays = new Set(
      entries.map((e) => new Date(e.createdAt).toISOString().split('T')[0])
    );
    return uniqueDays.size;
  };

  const streak = calculateStreak();
  const isReminderEnabled = user.reminderSettings?.enabled ?? false;

  return (
    <header className="h-16 border-b border-[#E6E1D6] bg-[#FDFCFB] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
          <span className="font-serif font-bold text-base text-[#FDFCFB]">DM</span>
        </div>
        <div>
          <span className="font-serif font-semibold text-lg text-[#2D2926] tracking-tight leading-none block">DearMe</span>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8C857B] font-sans mt-0.5">
            <ShieldCheck className="w-3 h-3 text-[#5A5A40]" />
            <span>Private Space ({user.email?.split('@')[0]})</span>
          </div>
        </div>
      </div>

      {/* Action Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Streak Counter Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-sans font-semibold shadow-2xs"
          title={`${streak} unique reflection days logged`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>{streak} Day Streak</span>
        </div>

        {/* Reminders Button */}
        {onOpenReminders && (
          <button
            id="btn-navbar-reminders"
            onClick={onOpenReminders}
            className="relative p-2 rounded-full bg-white border border-[#E6E1D6] hover:bg-[#F9F8F6] transition-colors text-[#5A5A40] cursor-pointer shadow-2xs"
            title={isReminderEnabled ? 'Reflection Reminders Active' : 'Configure Reflection Reminders'}
          >
            <Bell className="w-4 h-4 text-[#5A5A40]" />
            {isReminderEnabled && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#5A5A40] ring-2 ring-white" />
            )}
          </button>
        )}

        {/* Insights / Mood Trends Button */}
        {onOpenInsights && (
          <button
            onClick={onOpenInsights}
            className="p-2 rounded-full bg-white border border-[#E6E1D6] hover:bg-[#F9F8F6] transition-colors text-[#5A5A40] cursor-pointer shadow-2xs"
            title="View Mood Trends & Insights"
          >
            <BarChart2 className="w-4 h-4 text-[#5A5A40]" />
          </button>
        )}

        {/* Onboarding Help Button */}
        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="p-2 rounded-full bg-white border border-[#E6E1D6] hover:bg-[#F9F8F6] transition-colors text-[#5A5A40] cursor-pointer shadow-2xs"
            title="Take Tooltip Tour"
          >
            <HelpCircle className="w-4 h-4 text-[#5A5A40]" />
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
