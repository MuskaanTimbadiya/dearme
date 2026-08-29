import React, { useState } from 'react';
import {
  Search,
  Trash2,
  Star,
  Calendar,
  MessageSquare,
  Sparkles,
  PlusCircle,
  Image as ImageIcon,
  Mic,
  MapPin,
} from 'lucide-react';
import type { JournalEntry } from '../types';

interface SidebarHistoryProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onToggleFavorite: (entryId: string, isFav: boolean) => void;
  onNewEntry: () => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onToggleFavorite,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (filterFavoriteOnly && !entry.isFavorite) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchTitle = entry.title.toLowerCase().includes(query);
    const matchSummary = entry.summary?.toLowerCase().includes(query);
    const matchMood = entry.mood?.toLowerCase().includes(query);
    const matchLocation = entry.location?.description?.toLowerCase().includes(query);
    const matchMessages = entry.messages.some((m) =>
      m.content.toLowerCase().includes(query)
    );
    return matchTitle || matchSummary || matchMood || matchLocation || matchMessages;
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).toUpperCase();
  };

  return (
    <aside className="w-full md:w-80 h-full flex flex-col bg-[#F5F2ED] border-r border-[#E6E1D6]">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[#E6E1D6] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[11px] uppercase tracking-wider text-[#A8A294] font-sans font-semibold">
              Past Reflections ({entries.length})
            </h2>
          </div>

          <button
            id="btn-sidebar-new"
            onClick={onNewEntry}
            className="p-1 text-[#5A5A40] hover:text-[#2D2926] hover:bg-[#EDE8DF] rounded-md transition-colors cursor-pointer"
            title="Create New Reflection"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A294]" />
          <input
            id="input-sidebar-search"
            type="text"
            placeholder="Search reflections, photos, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-2xl bg-white border border-[#E6E1D6] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] text-[#2D2926] placeholder-[#A8A294]"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-sans uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              filterFavoriteOnly
                ? 'bg-[#EDE8DF] text-[#5A5A40] border border-[#D8D1C4]'
                : 'text-[#8C8578] hover:bg-[#EDE8DF]/60'
            }`}
          >
            <Star className={`w-3 h-3 ${filterFavoriteOnly ? 'fill-[#5A5A40] text-[#5A5A40]' : ''}`} />
            <span>Favorites</span>
          </button>

          <span className="text-[10px] uppercase tracking-widest text-[#A8A294] font-sans">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredEntries.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-[#A8A294]">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-[#D4C9B0] opacity-60" />
            <p className="font-medium text-[#5C564E] mb-1 font-serif text-sm">No reflections found</p>
            <p className="text-[11px] text-[#A8A294]">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Begin your first reflection session.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const isConfirmingDelete = deletingId === entry.id;
            const hasPhotos = entry.messages.some((m) => m.photos && m.photos.length > 0);
            const hasAudio = entry.messages.some((m) => m.audioNote);

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                onClick={() => onSelectEntry(entry.id)}
                className={`group relative p-3.5 rounded-2xl transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#EDE8DF] text-[#2D2926] shadow-xs'
                    : 'hover:bg-[#EDE8DF]/50 text-[#2D2926]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Indicator Dot */}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#5A5A40]'
                        : 'bg-transparent border border-[#A8A294]'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-sm font-serif font-medium text-[#2D2926] truncate">
                        {entry.title || 'Untitled Reflection'}
                      </h4>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(entry.id, !entry.isFavorite);
                          }}
                          title={entry.isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
                          className="p-0.5 text-[#A8A294] hover:text-[#5A5A40] cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              entry.isFavorite ? 'fill-[#5A5A40] text-[#5A5A40]' : ''
                            }`}
                          />
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 bg-red-50 p-0.5 rounded border border-red-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEntry(entry.id);
                                setDeletingId(null);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-medium bg-red-600 text-white rounded cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="px-1 py-0.5 text-[9px] text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(entry.id);
                            }}
                            title="Delete Entry"
                            className="p-0.5 text-[#A8A294] hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mood tag & Badges */}
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                      {entry.mood && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E6E1D6] text-[9px] font-sans uppercase tracking-wider text-[#5A5A40]">
                          {entry.mood}
                        </span>
                      )}
                      {entry.location && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px] font-sans text-[#5A5A40]">
                          <MapPin className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[80px]">{entry.location.description}</span>
                        </span>
                      )}
                      {hasPhotos && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px] font-sans text-[#5A5A40]" title="Contains Photos">
                          <ImageIcon className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {hasAudio && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px] font-sans text-[#5A5A40]" title="Contains Voice Note">
                          <Mic className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#6E675E] line-clamp-1 mb-1.5 leading-normal">
                      {entry.summary ||
                        (entry.messages.length > 0
                          ? entry.messages[entry.messages.length - 1].content
                          : 'Empty reflection...')}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#A8A294] font-sans uppercase tracking-wider">
                      <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>{entry.messages.length}</span>
                        {entry.summary && <Sparkles className="w-2.5 h-2.5 text-[#5A5A40] ml-0.5" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
