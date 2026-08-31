import { describe, it, expect } from 'vitest';
import { getOnThisDayMemories } from '../src/lib/onThisDay';
import type { JournalEntry } from '../src/types';

describe('On This Day Utility (getOnThisDayMemories)', () => {
  const now = new Date(2026, 7, 31); // Aug 31, 2026

  const mockEntries: JournalEntry[] = [
    {
      id: 'e-today',
      userId: 'u1',
      title: 'Today Reflection',
      createdAt: new Date(2026, 7, 31).getTime(),
      updatedAt: new Date(2026, 7, 31).getTime(),
      messages: [],
    },
    {
      id: 'e-1year',
      userId: 'u1',
      title: 'One Year Ago Entry',
      createdAt: new Date(2025, 7, 31).getTime(), // Aug 31, 2025
      updatedAt: new Date(2025, 7, 31).getTime(),
      messages: [],
      mood: 'Hopeful',
    },
    {
      id: 'e-1month',
      userId: 'u1',
      title: 'One Month Ago Entry',
      createdAt: new Date(2026, 6, 31).getTime(), // Jul 31, 2026
      updatedAt: new Date(2026, 6, 31).getTime(),
      messages: [],
    },
    {
      id: 'e-1week',
      userId: 'u1',
      title: 'One Week Ago Entry',
      createdAt: new Date(2026, 7, 24).getTime(), // Aug 24, 2026
      updatedAt: new Date(2026, 7, 24).getTime(),
      messages: [],
    },
  ];

  it('should return 1 Year Ago Today when an exact year match exists', () => {
    const matches = getOnThisDayMemories(mockEntries, now);
    expect(matches).toHaveLength(1);
    expect(matches[0].label).toBe('1 Year Ago Today');
    expect(matches[0].entry.id).toBe('e-1year');
    expect(matches[0].timeAgoText).toBe('1 year ago');
  });

  it('should return 1 Month Ago Today when no year match exists', () => {
    const entriesWithoutYear = mockEntries.filter((e) => e.id !== 'e-1year');
    const matches = getOnThisDayMemories(entriesWithoutYear, now);
    expect(matches).toHaveLength(1);
    expect(matches[0].label).toBe('1 Month Ago Today');
    expect(matches[0].entry.id).toBe('e-1month');
  });

  it('should return 1 Week Ago Today when no year or month match exists', () => {
    const entriesWeekOnly = mockEntries.filter((e) => e.id === 'e-today' || e.id === 'e-1week');
    const matches = getOnThisDayMemories(entriesWeekOnly, now);
    expect(matches).toHaveLength(1);
    expect(matches[0].label).toBe('1 Week Ago Today');
    expect(matches[0].entry.id).toBe('e-1week');
  });

  it('should return empty array if only today entry exists', () => {
    const todayOnly = mockEntries.filter((e) => e.id === 'e-today');
    const matches = getOnThisDayMemories(todayOnly, now);
    expect(matches).toHaveLength(0);
  });
});
