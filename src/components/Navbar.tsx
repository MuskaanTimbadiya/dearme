import React from 'react';
import { Feather, Plus, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  onNewEntry: () => void;
  onSignOut: () => void;
  isSaving: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  onSignOut,
  isSaving,
}) => {
  return (
    <header className="h-16 border-b border-[#F0EDE8] bg-[#FDFCFB]/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-2xs">
          <Feather className="w-4 h-4 text-[#E6E1D6]" />
        </div>
        <div>
          <span className="font-serif font-semibold text-lg text-[#5A5A40] tracking-tight leading-none block">Aura Reflect</span>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#A8A294] font-sans mt-0.5">
            <ShieldCheck className="w-3 h-3 text-[#5A5A40]" />
            <span>Private Space ({user.email?.split('@')[0]})</span>
          </div>
        </div>
      </div>

      {/* Action Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Firestore Sync Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F2ED] text-[10px] font-sans uppercase tracking-wider font-medium text-[#5A5A40] border border-[#E6E1D6]">
          <span className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-600 animate-ping' : 'bg-[#5A5A40]'}`} />
          <span>{isSaving ? 'Saving to Firestore...' : 'Saved to Firestore'}</span>
        </div>

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
