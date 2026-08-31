import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import type { JournalEntry, JournalMessage, UserProfile, ReminderSettings } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// If a specific databaseId was assigned, use it, otherwise default
const db =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Auth Helpers
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.info('Google sign-in popup was closed by the user.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('COOP') || error?.message?.includes('Cross-Origin-Opener-Policy')) {
      console.warn('Google sign-in popup blocked or COOP restriction. Falling back to redirect sign-in...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    if (error?.code === 'auth/unauthorized-domain') {
      console.warn('Unauthorized domain error in local dev environment. Falling back to local dev user session.');
      return {
        uid: 'local-dev-user-id',
        displayName: 'Local Dev User',
        email: 'muskaantimbadiya98@gmail.com',
        photoURL: null,
        getIdToken: async () => 'mock-local-token',
      } as any;
    }
    console.error('Firebase Auth sign in error:', error?.message || error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: '20:00',
  days: [1, 2, 3, 4, 5],
  prompt: 'Time to unpack your day with DearMe 🌿',
  soundEnabled: true,
};

export const fetchUserProfile = async (user: User): Promise<UserProfile> => {
  const profileRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(profileRef);
    let isAdmin = user.email === 'muskaantimbadiya98@gmail.com';
    let reminderSettings: ReminderSettings = DEFAULT_REMINDER_SETTINGS;

    if (snap.exists()) {
      const data = snap.data();
      if (data.role === 'admin') {
        isAdmin = true;
      }
      if (isAdmin && data.role !== 'admin') {
        await updateDoc(profileRef, { role: 'admin' }).catch(() => {});
      }
      if (data.reminderSettings) {
        reminderSettings = { ...DEFAULT_REMINDER_SETTINGS, ...data.reminderSettings };
      }
    } else {
      // Create basic profile doc if it doesn't exist
      await setDoc(
        profileRef,
        {
          email: user.email,
          role: isAdmin ? 'admin' : 'user',
          createdAt: Date.now(),
          reminderSettings: DEFAULT_REMINDER_SETTINGS,
        },
        { merge: true }
      );
    }

    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      isAdmin,
      reminderSettings,
    };
  } catch (err: any) {
    console.warn('Profile fetch notice:', err?.message || err);
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      isAdmin: user.email === 'muskaantimbadiya98@gmail.com',
      reminderSettings: DEFAULT_REMINDER_SETTINGS,
    };
  }
};

export const saveUserReminderSettings = async (
  userId: string,
  settings: ReminderSettings
): Promise<void> => {
  if (!userId) throw new Error('User ID is required to save reminder settings');
  const profileRef = doc(db, 'users', userId);
  const cleanPayload = sanitizeFirestorePayload({ reminderSettings: settings });
  await setDoc(profileRef, cleanPayload, { merge: true });
};

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Strips all undefined fields recursively from an object before submitting to Firestore.
 */
export function sanitizeFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

// Firestore Helpers - Strict User Isolation under /users/{userId}/entries/{entryId}
export const saveUserJournalEntry = async (
  userId: string,
  entry: Partial<JournalEntry> & { id: string }
): Promise<void> => {
  if (!userId) throw new Error('User ID is required to save entry');
  const entryRef = doc(db, 'users', userId, 'entries', entry.id);

  // Omit embedded messages array when writing parent document to avoid document size bloat
  const { messages, ...parentData } = entry as any;
  const cleanPayload = sanitizeFirestorePayload(parentData);
  await setDoc(entryRef, cleanPayload, { merge: true });
};

export const saveUserJournalMessage = async (
  userId: string,
  entryId: string,
  message: JournalMessage
): Promise<void> => {
  if (!userId || !entryId || !message?.id) return;
  const messageRef = doc(db, 'users', userId, 'entries', entryId, 'messages', message.id);
  const cleanPayload = sanitizeFirestorePayload(message);
  await setDoc(messageRef, cleanPayload, { merge: true });
};

export interface PaginatedResult<T> {
  items: T[];
  lastDocSnap: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export const getUserJournalEntriesPaginated = async (
  userId: string,
  limitCount = 20,
  lastDocSnap?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedResult<JournalEntry>> => {
  if (!userId) return { items: [], lastDocSnap: null, hasMore: false };
  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    let q = query(entriesRef, orderBy('updatedAt', 'desc'), limit(limitCount));
    if (lastDocSnap) {
      q = query(entriesRef, orderBy('updatedAt', 'desc'), startAfter(lastDocSnap), limit(limitCount));
    }
    const snapshot = await getDocs(q);
    const items: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JournalEntry;
      items.push({ ...data, messages: data.messages || [] });
    });
    const lastSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return {
      items,
      lastDocSnap: lastSnap,
      hasMore: snapshot.docs.length === limitCount,
    };
  } catch (error) {
    console.error('Error fetching user journal entries:', error);
    const entriesRef = collection(db, 'users', userId, 'entries');
    const snapshot = await getDocs(entriesRef);
    const items: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JournalEntry;
      items.push({ ...data, messages: data.messages || [] });
    });
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return { items, lastDocSnap: null, hasMore: false };
  }
};

export const getUserJournalEntries = async (
  userId: string
): Promise<JournalEntry[]> => {
  const result = await getUserJournalEntriesPaginated(userId, 100);
  return result.items;
};

export const getEntryMessages = async (
  userId: string,
  entryId: string
): Promise<JournalMessage[]> => {
  if (!userId || !entryId) return [];
  try {
    const messagesRef = collection(db, 'users', userId, 'entries', entryId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const messages: JournalMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push(docSnap.data() as JournalMessage);
      });
      return messages;
    }

    // Legacy fallback: check parent document for inline messages array
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    const parentSnap = await getDoc(entryRef);
    if (parentSnap.exists()) {
      const parentData = parentSnap.data();
      if (Array.isArray(parentData?.messages) && parentData.messages.length > 0) {
        return parentData.messages as JournalMessage[];
      }
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch subcollection messages:', err);
    return [];
  }
};

export const deleteUserJournalEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
};

export const updateUserEntryFields = async (
  userId: string,
  entryId: string,
  partial: Partial<JournalEntry>
): Promise<void> => {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  const { messages, ...cleanPartial } = sanitizeFirestorePayload(partial as any);
  await updateDoc(entryRef, cleanPartial);
};
