import React from 'react';
import { X, TrendingUp, BarChart2, Heart, Sparkles, Smile, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { JournalEntry } from '../types';

import { getOnThisDayMemories } from '../lib/onThisDay';

interface MoodTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onSelectEntry?: (entryId: string) => void;
}

export const MoodTrendsModal: React.FC<MoodTrendsModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
}) => {
  if (!isOpen) return null;

  const onThisDayMemories = React.useMemo(() => {
    return getOnThisDayMemories(entries);
  }, [entries]);

  // Process entries over time for time-series trend chart
  const processedTrendData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; entries: number }> = {};
    const now = new Date();

    // Fill last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dateMap[key] = { date: key, entries: 0 };
    }

    entries.forEach((e) => {
      const key = new Date(e.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (dateMap[key]) {
        dateMap[key].entries += 1;
      }
    });

    return Object.values(dateMap);
  }, [entries]);

  // Process overall mood breakdown
  const processedMoodDistribution = React.useMemo(() => {
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const mood = e.mood || 'Unspecified';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const colors = ['#42b883', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    return Object.entries(moodCounts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [entries]);

  const totalEntries = entries.length;
  const favoriteEntries = entries.filter((e) => e.isFavorite).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-[#FDFCFB] text-[#2D2926] rounded-3xl border border-[#E6E1D6] shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#F0EDE8] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 text-[#FDFCFB]" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2D2926] tracking-tight">
                Mood Trends & Mindfulness Insights
              </h2>
              <p className="text-xs text-[#5C564E] font-sans">
                Visual analytics mapping your emotional trajectory and journal activity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#8C857B] hover:text-[#2D2926] hover:bg-[#F5F2ED] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#F5F2EB] p-4 rounded-2xl border border-[#E6E1D6] flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-sans font-black text-[#2D2926]">{totalEntries}</span>
              <p className="text-[11px] font-sans text-[#5C564E]">Total Reflections</p>
            </div>
          </div>

          <div className="bg-[#F5F2EB] p-4 rounded-2xl border border-[#E6E1D6] flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#B5945B]/15 text-[#B5945B]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-sans font-black text-[#2D2926]">{favoriteEntries}</span>
              <p className="text-[11px] font-sans text-[#5C564E]">Starred Reflections</p>
            </div>
          </div>

          <div className="bg-[#F5F2EB] p-4 rounded-2xl border border-[#E6E1D6] flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#6B7F6A]/15 text-[#6B7F6A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-sans font-black text-[#2D2926]">
                {processedMoodDistribution.length}
              </span>
              <p className="text-[11px] font-sans text-[#5C564E]">Unique Mood Tags</p>
            </div>
          </div>
        </div>

        {/* Reflection Activity Chart */}
        <div className="bg-[#F5F2EB] p-5 rounded-2xl border border-[#E6E1D6] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#2D2926]">
            <BarChart2 className="w-4 h-4 text-[#5A5A40]" />
            <span>14-Day Reflection Activity</span>
          </div>
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedTrendData}>
                <defs>
                  <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#78716C" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716C" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2D2926',
                    borderColor: '#5A5A40',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#FDFCFB',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="entries"
                  stroke="#5A5A40"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEntries)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution Bar Chart */}
        <div className="bg-[#F5F2EB] p-5 rounded-2xl border border-[#E6E1D6] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#2D2926]">
            <Smile className="w-4 h-4 text-[#5A5A40]" />
            <span>Mood Tag Breakdown</span>
          </div>
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedMoodDistribution}>
                <XAxis dataKey="name" stroke="#78716C" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716C" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2D2926',
                    borderColor: '#5A5A40',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#FDFCFB',
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {processedMoodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* On This Day Memory Spotlight */}
        {onThisDayMemories.length > 0 && (
          <div className="bg-[#F5F2EB] p-5 rounded-2xl border border-[#E6E1D6] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B5945B]" />
                <h3 className="text-sm font-sans font-bold text-[#2D2926]">
                  On This Day Spotlight — {onThisDayMemories[0].label}
                </h3>
              </div>
              <span className="text-xs text-[#5C564E] font-sans">
                {new Date(onThisDayMemories[0].entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="bg-[#FDFCFB] p-4 rounded-xl border border-[#E6E1D6] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {onThisDayMemories[0].entry.emoji && <span>{onThisDayMemories[0].entry.emoji}</span>}
                  <h4 className="text-sm font-sans font-semibold text-[#2D2926] truncate">
                    {onThisDayMemories[0].entry.title || 'Untitled Reflection'}
                  </h4>
                </div>
                {onThisDayMemories[0].entry.summary && (
                  <p className="text-xs text-[#5C564E] italic line-clamp-1 mt-1">
                    "{onThisDayMemories[0].entry.summary}"
                  </p>
                )}
              </div>

              {onSelectEntry && (
                <button
                  onClick={() => {
                    onSelectEntry(onThisDayMemories[0].entry.id);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A34] text-white text-xs font-sans font-semibold transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  Revisit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
