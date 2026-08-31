import type { ReminderSettings } from '../types';

export const PRESET_REMINDER_PROMPTS = [
  'Time to unpack your day with DearMe 🌿',
  'What is 1 thing you are grateful for today? ✨',
  'Pause & reflect: How are you feeling right now? 💭',
  'What went well today, and what did you learn? 💡',
  'Evening Reset: Release the day before rest 🌙',
  'Morning Intentions: What will ground you today? ☀️',
];

export const DAYS_OF_WEEK = [
  { id: 0, short: 'Sun', label: 'Sunday' },
  { id: 1, short: 'Mon', label: 'Monday' },
  { id: 2, short: 'Tue', label: 'Tuesday' },
  { id: 3, short: 'Wed', label: 'Wednesday' },
  { id: 4, short: 'Thu', label: 'Thursday' },
  { id: 5, short: 'Fri', label: 'Friday' },
  { id: 6, short: 'Sat', label: 'Saturday' },
];

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return getNotificationPermission();
  }
}

/**
  Synthesizes a soft, peaceful chime using Web Audio API so no external sound files are required.
 */
export function playGentleReminderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Create dual oscillator for a soft warm chime tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Soft C5 chord frequency notes (523.25 Hz & 659.25 Hz - E5)
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime);

    // Envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);

    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn('AudioContext chime playback unavailable:', err);
  }
}

export function sendNativeNotification(
  title: string,
  body: string,
  onClick?: () => void
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'dearme-reflection-reminder',
      });

      if (onClick) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          onClick();
          notification.close();
        };
      }
      return true;
    } catch (err) {
      console.warn('Native notification creation error:', err);
      return false;
    }
  }

  return false;
}

export function checkShouldTriggerReminder(
  settings: ReminderSettings,
  now: Date = new Date()
): boolean {
  if (!settings || !settings.enabled) return false;

  const currentDay = now.getDay();
  if (!settings.days || !settings.days.includes(currentDay)) {
    return false;
  }

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  if (currentTimeStr !== settings.time) {
    return false;
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${date}`;

  if (settings.lastTriggeredDate === todayStr) {
    return false;
  }

  return true;
}

export function formatReminderTime(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}
