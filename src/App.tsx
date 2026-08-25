import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout, saveUserJournalEntry, getUserJournalEntries, deleteUserJournalEntry, updateUserEntryFields } from './lib/firebase';
import type { UserProfile, JournalEntry } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { SidebarHistory } from './components/SidebarHistory';
import { ReflectionSession } from './components/ReflectionSession';
import { Feather, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auth state subscriber
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setSelectedEntryId(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries for logged in user
  const fetchEntries = useCallback(async (userId: string) => {
    setIsLoadingEntries(true);
    try {
      const userEntries = await getUserJournalEntries(userId);
      setEntries(userEntries);
      if (userEntries.length > 0) {
        setSelectedEntryId((prev) => prev && userEntries.some((e) => e.id === prev) ? prev : userEntries[0].id);
      } else {
        // Create initial welcoming reflection session
        const initialEntry: JournalEntry = {
          id: 'entry-' + Date.now(),
          userId,
          title: 'My First Reflection',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          mood: 'Contemplative',
        };
        await saveUserJournalEntry(userId, initialEntry);
        setEntries([initialEntry]);
        setSelectedEntryId(initialEntry.id);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchEntries(currentUser.uid);
    }
  }, [currentUser?.uid, fetchEntries]);

  // Create a new entry
  const handleCreateNewEntry = async () => {
    if (!currentUser) return;
    const newEntry: JournalEntry = {
      id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.uid,
      title: 'New Reflection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    setIsSaving(true);
    try {
      await saveUserJournalEntry(currentUser.uid, newEntry);
      setEntries((prev) => [newEntry, ...prev]);
      setSelectedEntryId(newEntry.id);
    } catch (err) {
      console.error('Error creating entry in Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Update entry
  const handleUpdateEntry = async (updated: JournalEntry) => {
    if (!currentUser) return;

    // Update locally first
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );

    // Save to Firestore
    setIsSaving(true);
    try {
      await saveUserJournalEntry(currentUser.uid, updated);
    } catch (err) {
      console.error('Error saving updated entry to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser) return;
    try {
      await deleteUserJournalEntry(currentUser.uid, entryId);
      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);
      if (selectedEntryId === entryId) {
        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (entryId: string, isFav: boolean) => {
    if (!currentUser) return;
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, isFavorite: isFav } : e))
    );
    try {
      await updateUserEntryFields(currentUser.uid, entryId, { isFavorite: isFav });
    } catch (err) {
      console.error('Error toggling favorite in Firestore:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center text-[#2D2926]">
        <div className="w-12 h-12 rounded-full bg-[#5A5A40] text-white flex items-center justify-center mb-4 animate-pulse shadow-sm">
          <Feather className="w-6 h-6 text-[#E6E1D6]" />
        </div>
        <p className="text-xs uppercase tracking-widest font-sans font-medium text-[#A8A294]">
          Opening Aura Reflect...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LandingPage onSignInSuccess={() => {}} />;
  }

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  return (
    <div className="h-screen w-full flex flex-col bg-[#FDFCFB] overflow-hidden text-[#2D2926]">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onNewEntry={handleCreateNewEntry}
        onSignOut={handleSignOut}
        isSaving={isSaving}
      />

      {/* Main Container: Sidebar + Active Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar History */}
        <SidebarHistory
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={(id) => setSelectedEntryId(id)}
          onDeleteEntry={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
          onNewEntry={handleCreateNewEntry}
        />

        {/* Active Reflection Session */}
        {selectedEntry ? (
          <ReflectionSession
            key={selectedEntry.id}
            entry={selectedEntry}
            onUpdateEntry={handleUpdateEntry}
            isSaving={isSaving}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#5C564E] bg-[#FDFCFB]">
            <Feather className="w-10 h-10 text-[#D4C9B0] mb-3" />
            <h3 className="text-lg font-serif font-medium text-[#2D2926] mb-1">No reflection selected</h3>
            <p className="text-xs text-[#A8A294] mb-5">
              Select an entry from your archive or create a fresh reflection space.
            </p>
            <button
              onClick={handleCreateNewEntry}
              className="px-6 py-2.5 rounded-full text-xs font-sans uppercase tracking-wider font-semibold bg-[#5A5A40] text-white hover:bg-[#4A4A34] cursor-pointer shadow-xs"
            >
              Start New Reflection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
