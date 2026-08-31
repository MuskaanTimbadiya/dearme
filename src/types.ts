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
  reactions?: string[];
}

export type JournalFontFamily = 'serif' | 'handwritten' | 'sans' | 'mono' | 'editorial';
export type JournalTheme = 'parchment' | 'midnight' | 'sage' | 'rose';
export type AppLanguage = 'en' | 'hi' | 'gu';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  emoji?: string;
  mood?: string;
  moods?: string[];
  summary?: string;
  keyTakeaways?: string[];
  callback_facts?: string[];
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

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm format, e.g., '20:00'
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  prompt: string;
  soundEnabled: boolean;
  lastTriggeredDate?: string; // YYYY-MM-DD to avoid duplicate triggers on same day
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
  reminderSettings?: ReminderSettings;
}
