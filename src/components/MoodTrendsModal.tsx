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

interface MoodTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
}

export const MoodTrendsModal: React.FC<MoodTrendsModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl glass-panel-dark text-white rounded-3xl border border-white/20 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#35495e] to-[#42b883] flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-tech-heading font-bold text-white tracking-tight">
                Mood Trends & Mindfulness Insights
              </h2>
              <p className="text-xs text-slate-400 font-sans-body">
                Visual analytics mapping your emotional trajectory and journal activity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#42b883]/20 text-[#42b883]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-tech-heading font-black text-white">{totalEntries}</span>
              <p className="text-[11px] font-sans-body text-slate-400">Total Reflections</p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-tech-heading font-black text-white">{favoriteEntries}</span>
              <p className="text-[11px] font-sans-body text-slate-400">Starred Reflections</p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-tech-heading font-black text-white">
                {processedMoodDistribution.length}
              </span>
              <p className="text-[11px] font-sans-body text-slate-400">Unique Mood Tags</p>
            </div>
          </div>
        </div>

        {/* Reflection Activity Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-tech-heading font-semibold text-slate-300">
            <BarChart2 className="w-4 h-4 text-[#42b883]" />
            <span>14-Day Reflection Activity</span>
          </div>
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedTrendData}>
                <defs>
                  <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#42b883" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#42b883" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="entries"
                  stroke="#42b883"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEntries)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution Bar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-tech-heading font-semibold text-slate-300">
            <Smile className="w-4 h-4 text-indigo-400" />
            <span>Mood Tag Breakdown</span>
          </div>
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedMoodDistribution}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
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
      </div>
    </div>
  );
};
