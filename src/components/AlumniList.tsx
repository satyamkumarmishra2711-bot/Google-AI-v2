import React from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Building2,
  Briefcase,
  X,
  User,
  Rows3,
  LayoutList,
  ArrowUpDown,
} from 'lucide-react';
import { AlumniRecord, FilterState, SortOption, SortField, SortOrder } from '../types';

export const SORT_PRESETS: SortOption[] = [
  { field: 'default', order: 'asc', label: 'Sheet Row Order' },
  { field: 'name', order: 'asc', label: 'Name (A → Z)' },
  { field: 'name', order: 'desc', label: 'Name (Z → A)' },
  { field: 'rollNumber', order: 'asc', label: 'Roll No (Ascending)' },
  { field: 'rollNumber', order: 'desc', label: 'Roll No (Descending)' },
  { field: 'passingYear', order: 'desc', label: 'Batch (Newest First)' },
  { field: 'passingYear', order: 'asc', label: 'Batch (Oldest First)' },
  { field: 'status', order: 'asc', label: 'Status (Pending First)' },
  { field: 'status', order: 'desc', label: 'Status (Verified First)' },
  { field: 'aiConfidence', order: 'desc', label: 'AI Confidence (High → Low)' },
];

interface AlumniListProps {
  records: AlumniRecord[];
  selectedRecord: AlumniRecord | null;
  onSelectRecord: (record: AlumniRecord) => void;
  filters: FilterState;
  onSearchChange: (search: string) => void;
  totalFiltered: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading: boolean;
  width?: number;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  sortOption?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

export const AlumniList: React.FC<AlumniListProps> = ({
  records,
  selectedRecord,
  onSelectRecord,
  filters,
  onSearchChange,
  totalFiltered,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  width = 260,
  isCompact = false,
  onToggleCompact,
  sortOption = { field: 'default', order: 'asc', label: 'Sheet Row Order' },
  onSortChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const getStatusBadgeClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('veri') || s === 'approved') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('flag') || s.includes('review') || s.includes('hold')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (s.includes('reject') || s.includes('invalid')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-[#FAF0ED] text-[#A83B24] border-[#ECD5CC]';
  };

  const isCustomSortActive = sortOption.field !== 'default';

  return (
    <div
      id="alumni-list-panel"
      style={{ width }}
      className="shrink-0 bg-[#FAF7F5]/40 border-r border-[#EAE1DA] flex flex-col h-[calc(100vh-4rem)] select-none"
    >
      {/* Search & Sort Input Header */}
      <div className="p-2.5 bg-white border-b border-[#EAE1DA] space-y-2">
        {/* Search Input and View Toggle */}
        <div className="flex items-center space-x-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              id="input-alumni-search"
              type="text"
              placeholder="Search Name, Roll, Org..."
              value={filters.searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-[#EAE1DA] rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24] transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onToggleCompact && (
            <button
              type="button"
              onClick={onToggleCompact}
              title={isCompact ? 'Switch to detailed card view' : 'Switch to compact list view'}
              className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                isCompact
                  ? 'bg-[#FAF0ED] border-[#ECD5CC] text-[#A83B24]'
                  : 'bg-slate-50 border-[#EAE1DA] text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isCompact ? <LayoutList className="w-3.5 h-3.5" /> : <Rows3 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Sort Row & Count */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Sort Selector */}
          <div className="flex items-center space-x-1 min-w-0 flex-1">
            <ArrowUpDown className="w-3 h-3 text-[#A83B24] shrink-0" />
            <select
              id="select-alumni-sort"
              value={`${sortOption.field}:${sortOption.order}`}
              onChange={(e) => {
                if (!onSortChange) return;
                const [field, order] = e.target.value.split(':') as [SortField, SortOrder];
                const found = SORT_PRESETS.find((p) => p.field === field && p.order === order);
                onSortChange(
                  found || {
                    field,
                    order,
                    label: e.target.options[e.target.selectedIndex]?.text || 'Sorted',
                  }
                );
              }}
              title="Sort alumni records"
              className="w-full max-w-[140px] text-[10px] py-0.5 px-1.5 bg-slate-50 hover:bg-[#FAF4F1] border border-[#EAE1DA] rounded text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#A83B24] cursor-pointer truncate"
            >
              {SORT_PRESETS.map((p) => (
                <option key={`${p.field}:${p.order}`} value={`${p.field}:${p.order}`}>
                  {p.label}
                </option>
              ))}
            </select>
            {isCustomSortActive && onSortChange && (
              <button
                type="button"
                onClick={() =>
                  onSortChange({ field: 'default', order: 'asc', label: 'Sheet Row Order' })
                }
                title="Reset to Sheet row order"
                className="text-[9.5px] p-0.5 rounded text-slate-400 hover:text-[#A83B24] cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-[9.5px] text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-[#EAE1DA] rounded px-1 py-0.5 text-slate-700 font-medium text-[10px] focus:outline-none cursor-pointer"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Record count summary */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5 pt-0.5 border-t border-slate-100">
          <span className="truncate">
            {isLoading ? (
              'Filtering...'
            ) : (
              <>
                <strong className="text-slate-700">{totalFiltered.toLocaleString()}</strong> records
              </>
            )}
          </span>
          {isCustomSortActive && (
            <span className="text-[9px] text-[#A83B24] font-medium truncate max-w-[120px]">
              Sorted: {sortOption.label.replace(/\s*\(.*\)/, '')}
            </span>
          )}
        </div>
      </div>

      {/* Record List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#EAE1DA]/60">
        {records.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <User className="w-7 h-7 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium text-slate-600">No alumni match</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Adjust search keywords or status.
            </p>
            {filters.searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="mt-2.5 inline-flex items-center px-2.5 py-1 text-xs font-medium text-[#A83B24] bg-[#FAF0ED] rounded-lg hover:bg-[#F2DDD6] cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          records.map((rec) => {
            const isSelected = selectedRecord?.customId === rec.customId;
            const hasAi = !!(rec.aiDesignation || rec.aiCompany);

            // COMPACT VIEW: Name is kept standard size, rest of text is decreased
            if (isCompact) {
              return (
                <button
                  key={rec.customId || `row-${rec.rowIndex}`}
                  id={`record-item-${rec.customId || rec.rowIndex}`}
                  onClick={() => onSelectRecord(rec)}
                  className={`w-full text-left px-2.5 py-1.5 transition-all relative block cursor-pointer border-l-2 ${
                    isSelected
                      ? 'bg-white shadow-xs ring-2 ring-[#A83B24] ring-inset border-l-[#A83B24] z-10'
                      : 'hover:bg-[#FAF6F4] bg-[#FAF7F5]/30 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center space-x-1 truncate">
                      {rec.customId && (
                        <span className="text-[8.5px] font-mono font-medium px-1 rounded bg-slate-200/60 text-slate-600 shrink-0">
                          {rec.customId}
                        </span>
                      )}
                      {/* Name kept same size */}
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {rec.fullName || 'Unnamed Alumni'}
                      </span>
                    </div>
                    <span
                      className={`text-[8px] font-medium px-1 py-0 rounded-full border shrink-0 ${getStatusBadgeClass(
                        rec.verificationStatus
                      )}`}
                    >
                      {rec.verificationStatus || 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-500 truncate">
                    <span className="truncate">
                      {[rec.existingDesignation, rec.existingOrganization].filter(Boolean).join(' @ ') ||
                        'No role recorded'}
                    </span>
                    {hasAi && (
                      <Sparkles className="w-2.5 h-2.5 text-[#A83B24] shrink-0 ml-1" title="AI Data available" />
                    )}
                  </div>
                </button>
              );
            }

            // STANDARD DETAILED VIEW:
            // Name is kept the same size (text-xs font-semibold)
            // Rest of text size is decreased (ID, roll, role, company, academics: 8.5px - 9.5px)
            return (
              <button
                key={rec.customId || `row-${rec.rowIndex}`}
                id={`record-item-${rec.customId || rec.rowIndex}`}
                onClick={() => onSelectRecord(rec)}
                className={`w-full text-left p-2.5 transition-all relative block cursor-pointer border-l-2 ${
                  isSelected
                    ? 'bg-white shadow-sm ring-2 ring-[#A83B24] ring-inset border-l-[#A83B24] z-10'
                    : 'hover:bg-[#FAF6F4] bg-[#FAF7F5]/30 border-l-transparent'
                }`}
              >
                {/* Top Identifiers Row: decreased text size */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 truncate">
                    {rec.customId && (
                      <span className="text-[8.5px] font-mono font-medium px-1.5 py-0 rounded bg-slate-200/60 text-slate-600 shrink-0">
                        {rec.customId}
                      </span>
                    )}
                    {rec.rollNumber && (
                      <span className="text-[8.5px] font-mono text-slate-400 shrink-0">
                        {rec.rollNumber}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[8.5px] font-medium px-1.5 py-0 rounded-full border shrink-0 ${getStatusBadgeClass(
                      rec.verificationStatus
                    )}`}
                  >
                    {rec.verificationStatus || 'Pending'}
                  </span>
                </div>

                {/* Name: KEPT THE SAME SIZE */}
                <h2 className="text-xs font-semibold text-slate-900 truncate mb-0.5">
                  {rec.fullName || 'Unnamed Alumni'}
                </h2>

                {/* Existing Role & Org: Decreased text size */}
                <div className="space-y-0.5 text-[9.5px] text-slate-600">
                  {rec.existingDesignation && (
                    <p className="flex items-center space-x-1 truncate">
                      <Briefcase className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.existingDesignation}</span>
                    </p>
                  )}
                  {rec.existingOrganization && (
                    <p className="flex items-center space-x-1 truncate text-slate-500">
                      <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.existingOrganization}</span>
                    </p>
                  )}
                </div>

                {/* Footer details: AI indicator & Degree: Decreased text size */}
                <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[8.5px] text-slate-400">
                  <span className="truncate">
                    {[rec.program, rec.department, rec.passingYear ? `'${rec.passingYear.slice(-2)}` : '']
                      .filter(Boolean)
                      .join(' • ') || 'No Academics'}
                  </span>
                  {hasAi && (
                    <span
                      title={`AI Confidence: ${rec.aiConfidence || 'N/A'}`}
                      className="flex items-center space-x-0.5 text-[#A83B24] bg-[#FAF0ED] px-1 py-0 rounded font-medium shrink-0 ml-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{rec.aiConfidence ? `${rec.aiConfidence}` : 'AI'}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-2 bg-white border-t border-[#EAE1DA] flex items-center justify-between text-[10.5px] text-slate-600">
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || isLoading}
            title="First Page"
            className="p-1 rounded hover:bg-[#FAF4F1] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            title="Previous Page"
            className="p-1 rounded hover:bg-[#FAF4F1] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[10px] font-medium text-slate-500">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            title="Next Page"
            className="p-1 rounded hover:bg-[#FAF4F1] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || isLoading}
            title="Last Page"
            className="p-1 rounded hover:bg-[#FAF4F1] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

