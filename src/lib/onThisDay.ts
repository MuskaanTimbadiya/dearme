import type { JournalEntry } from '../types';

export interface OnThisDayMatch {
  label: string; // e.g. '1 Year Ago Today', '1 Month Ago Today', '1 Week Ago Today', 'Past Memory'
  entry: JournalEntry;
  timeAgoText: string;
}

export function getOnThisDayMemories(entries: JournalEntry[], now = new Date()): OnThisDayMatch[] {
  if (!entries || entries.length === 0) return [];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  const currentDayTime = new Date(currentYear, currentMonth, currentDate).getTime();

  const matches: OnThisDayMatch[] = [];
  const matchedEntryIds = new Set<string>();

  // Filter out entries created today
  const pastEntries = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return !(d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate);
  });

  if (pastEntries.length === 0) return [];

  // 1. Exact Month & Day Match in a previous year (e.g., 1 Year Ago, 2 Years Ago)
  pastEntries.forEach((e) => {
    const d = new Date(e.createdAt);
    if (d.getMonth() === currentMonth && d.getDate() === currentDate && d.getFullYear() < currentYear) {
      const yearsDiff = currentYear - d.getFullYear();
      const label = yearsDiff === 1 ? '1 Year Ago Today' : `${yearsDiff} Years Ago Today`;
      matches.push({
        label,
        entry: e,
        timeAgoText: `${yearsDiff} year${yearsDiff > 1 ? 's' : ''} ago`,
      });
      matchedEntryIds.add(e.id);
    }
  });

  // 2. Same Day of Month in a previous month (e.g. 1 Month Ago, 2 Months Ago)
  if (matches.length === 0) {
    pastEntries.forEach((e) => {
      if (matchedEntryIds.has(e.id)) return;
      const d = new Date(e.createdAt);
      const monthDiff = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
      if (d.getDate() === currentDate && monthDiff >= 1 && monthDiff <= 12) {
        const label = monthDiff === 1 ? '1 Month Ago Today' : `${monthDiff} Months Ago Today`;
        matches.push({
          label,
          entry: e,
          timeAgoText: `${monthDiff} month${monthDiff > 1 ? 's' : ''} ago`,
        });
        matchedEntryIds.add(e.id);
      }
    });
  }

  // 3. Exact 7-day multiples (e.g., 1 Week Ago, 2 Weeks Ago)
  if (matches.length === 0) {
    pastEntries.forEach((e) => {
      if (matchedEntryIds.has(e.id)) return;
      const d = new Date(e.createdAt);
      const entryDayTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const daysDiff = Math.round((currentDayTime - entryDayTime) / (24 * 60 * 60 * 1000));
      if (daysDiff > 0 && daysDiff % 7 === 0 && daysDiff <= 60) {
        const weeksDiff = daysDiff / 7;
        const label = weeksDiff === 1 ? '1 Week Ago Today' : `${weeksDiff} Weeks Ago Today`;
        matches.push({
          label,
          entry: e,
          timeAgoText: `${weeksDiff} week${weeksDiff > 1 ? 's' : ''} ago`,
        });
        matchedEntryIds.add(e.id);
      }
    });
  }

  // 4. Fallback: Surface the closest past memory (if no exact date match)
  if (matches.length === 0 && pastEntries.length > 0) {
    const sortedByTimeAgo = [...pastEntries].sort((a, b) => b.createdAt - a.createdAt);
    const memory = sortedByTimeAgo[0];
    const daysAgo = Math.max(1, Math.round((currentDayTime - memory.createdAt) / (24 * 60 * 60 * 1000)));
    matches.push({
      label: 'Past Memory',
      entry: memory,
      timeAgoText: `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`,
    });
  }

  return matches;
}
