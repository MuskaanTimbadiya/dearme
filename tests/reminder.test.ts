import { describe, it, expect } from 'vitest';
import {
  checkShouldTriggerReminder,
  formatReminderTime,
} from '../src/lib/reminderManager';
import type { ReminderSettings } from '../src/types';

describe('Reflection Reminder Manager (reminderManager)', () => {
  const baseSettings: ReminderSettings = {
    enabled: true,
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6], // Everyday
    prompt: 'Time to unpack your day with DearMe 🌿',
    soundEnabled: true,
  };

  it('should return false if reminders are disabled', () => {
    const disabledSettings = { ...baseSettings, enabled: false };
    const mockNow = new Date('2026-08-31T20:00:00');
    expect(checkShouldTriggerReminder(disabledSettings, mockNow)).toBe(false);
  });

  it('should return false if current day of week is not in scheduled days', () => {
    // 2026-08-31 is a Monday (day 1)
    const weekdayOnlySettings = { ...baseSettings, days: [0, 6] }; // Sun, Sat only
    const mockNow = new Date('2026-08-31T20:00:00');
    expect(checkShouldTriggerReminder(weekdayOnlySettings, mockNow)).toBe(false);
  });

  it('should return false if current time does not match scheduled time', () => {
    const mockNow = new Date('2026-08-31T19:59:00');
    expect(checkShouldTriggerReminder(baseSettings, mockNow)).toBe(false);
  });

  it('should return false if reminder was already triggered today', () => {
    const alreadyTriggered = { ...baseSettings, lastTriggeredDate: '2026-08-31' };
    const mockNow = new Date('2026-08-31T20:00:00');
    expect(checkShouldTriggerReminder(alreadyTriggered, mockNow)).toBe(false);
  });

  it('should return true when enabled, day matches, time matches, and not triggered today', () => {
    const mockNow = new Date('2026-08-31T20:00:00');
    expect(checkShouldTriggerReminder(baseSettings, mockNow)).toBe(true);
  });

  it('should format 24h time string into friendly 12h AM/PM format', () => {
    expect(formatReminderTime('20:00')).toBe('8:00 PM');
    expect(formatReminderTime('09:15')).toBe('9:15 AM');
    expect(formatReminderTime('00:30')).toBe('12:30 AM');
    expect(formatReminderTime('12:00')).toBe('12:00 PM');
  });
});
