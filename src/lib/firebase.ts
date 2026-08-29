import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
} from 'firebase/firestore';
import type { JournalEntry, UserProfile } from '../types';
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
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup was blocked by the browser.');
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this window and try again.');
    }
    console.error('Firebase Auth sign in error:', error?.message || error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const fetchUserProfile = async (user: User): Promise<UserProfile> => {
  const profileRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(profileRef);
    let isAdmin = user.email === 'muskaantimbadiya98@gmail.com';

    if (snap.exists()) {
      if (snap.data().role === 'admin') {
        isAdmin = true;
      }
    } else {
      // Create basic profile doc if it doesn't exist
      await setDoc(
        profileRef,
        {
          email: user.email,
          role: isAdmin ? 'admin' : 'user',
          createdAt: Date.now(),
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
    };
  } catch (err: any) {
    console.warn('Profile fetch notice:', err?.message || err);
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      isAdmin: user.email === 'muskaantimbadiya98@gmail.com',
    };
  }
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
  entry: JournalEntry
): Promise<void> => {
  if (!userId) throw new Error('User ID is required to save entry');
  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  const cleanPayload = sanitizeFirestorePayload(entry);
  await setDoc(entryRef, cleanPayload, { merge: true });
};

export const getUserJournalEntries = async (
  userId: string
): Promise<JournalEntry[]> => {
  if (!userId) return [];
  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });
    return entries;
  } catch (error) {
    console.error('Error fetching user journal entries:', error);
    // If indexing or order issue occurs, fallback to unconstrained read and sort in-memory
    const entriesRef = collection(db, 'users', userId, 'entries');
    const snapshot = await getDocs(entriesRef);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });
    return entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
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
  const cleanPartial = sanitizeFirestorePayload(partial);
  await updateDoc(entryRef, cleanPartial);
};
