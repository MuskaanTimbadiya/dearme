export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  photos?: string[];
  audioNote?: {
    url: string;
    duration: number;
    transcript?: string;
  };
}

export type JournalFontFamily = 'serif' | 'handwritten' | 'sans' | 'mono' | 'editorial';
export type JournalTheme = 'parchment' | 'midnight' | 'sage' | 'rose';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mood?: string;
  summary?: string;
  keyTakeaways?: string[];
  messages: JournalMessage[];
  isFavorite?: boolean;
  fontFamily?: JournalFontFamily;
  theme?: JournalTheme;
  location?: {
    placeId?: string;
    description: string;
    lat?: number;
    lng?: number;
  };
}

export type ReflectionMode = 'reflective' | 'brainstorm' | 'actionable' | 'summary';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}
