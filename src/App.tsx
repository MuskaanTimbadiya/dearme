import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout, fetchUserProfile, saveUserJournalEntry, getUserJournalEntries, deleteUserJournalEntry, updateUserEntryFields } from './lib/firebase';
import type { UserProfile, JournalEntry } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { SidebarHistory } from './components/SidebarHistory';
import { ReflectionSession } from './components/ReflectionSession';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBanner } from './components/ErrorBanner';
import { sanitizeUserFacingError } from './lib/errorUtils';
import { Feather } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  type FailedOperation = {
    type: 'create' | 'update' | 'delete' | 'favorite';
    payload: any;
    entryId: string;
    errorMessage: string;
  };
  const [failedOp, setFailedOp] = useState<FailedOperation | null>(null);

  // Auth state subscriber
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await fetchUserProfile(user);
          setCurrentUser(profile);
        } catch (err) {
          console.error('Failed to fetch profile', err);
        }
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
    try {
      const userEntries = await getUserJournalEntries(userId);
      setEntries(userEntries);
      if (userEntries.length > 0) {
        setSelectedEntryId((prev) => prev && userEntries.some((e) => e.id === prev) ? prev : userEntries[0].id);
      } else {
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
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchEntries(currentUser.uid);
    }
  }, [currentUser?.uid, fetchEntries]);

  const handleRetryOp = () => {
    if (!failedOp) return;
    const { type, payload, entryId } = failedOp;
    
    if (type === 'create') {
      retryCreateEntry(payload);
    } else if (type === 'update') {
      handleUpdateEntry(payload).catch(() => {});
    } else if (type === 'delete') {
      handleDeleteEntry(entryId);
    } else if (type === 'favorite') {
      handleToggleFavorite(entryId, payload.isFavorite);
    }
  };

  const retryCreateEntry = async (entry: JournalEntry) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await saveUserJournalEntry(currentUser.uid, entry);
      setEntries((prev) => [entry, ...prev]);
      setSelectedEntryId(entry.id);
      setFailedOp(null);
    } catch (err: any) {
      const sanitized = sanitizeUserFacingError(err, 'Failed to create reflection entry. Please try again.');
      setFailedOp({ type: 'create', payload: entry, entryId: entry.id, errorMessage: sanitized });
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new entry
  const handleCreateNewEntry = () => {
    if (!currentUser) return;
    const newEntry: JournalEntry = {
      id: 'entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.uid,
      title: 'New Reflection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    retryCreateEntry(newEntry);
  };

  // Update entry
  const handleUpdateEntry = async (updated: JournalEntry) => {
    if (!currentUser) return;

    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );

    setIsSaving(true);
    try {
      await saveUserJournalEntry(currentUser.uid, updated);
      setFailedOp(null);
    } catch (err: any) {
      const sanitized = sanitizeUserFacingError(err, 'Failed to save reflection changes. Please try again.');
      setFailedOp({ type: 'update', payload: updated, entryId: updated.id, errorMessage: sanitized });
      throw err;
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
      setFailedOp(null);
    } catch (err: any) {
      const sanitized = sanitizeUserFacingError(err, 'Failed to delete reflection entry. Please try again.');
      setFailedOp({ type: 'delete', payload: null, entryId, errorMessage: sanitized });
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
      setFailedOp(null);
    } catch (err: any) {
      const sanitized = sanitizeUserFacingError(err, 'Failed to update favorite status. Please try again.');
      setFailedOp({ type: 'favorite', payload: { isFavorite: isFav }, entryId, errorMessage: sanitized });
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
          Opening DearMe...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LandingPage onSignInSuccess={() => {}} />;
  }

  if (window.location.pathname === '/admin' && currentUser.isAdmin) {
    return <AdminDashboard user={currentUser} />;
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
      {currentUser.isAdmin && (
        <div className="bg-[#5A5A40] text-[#E6E1D6] px-4 py-1.5 flex items-center justify-between shrink-0 text-xs font-sans">
          <span className="font-semibold uppercase tracking-widest">Admin Mode</span>
          <button onClick={() => window.location.href = '/admin'} className="hover:text-white underline decoration-dotted underline-offset-4 cursor-pointer">
            View Dashboard
          </button>
        </div>
      )}

      {failedOp && (
        <div className="px-6 py-2 bg-[#FDFCFB] shrink-0 border-b border-[#F0EDE8]">
          <ErrorBanner 
            message={failedOp.errorMessage} 
            onRetry={handleRetryOp} 
            onDismiss={() => setFailedOp(null)} 
          />
        </div>
      )}

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
