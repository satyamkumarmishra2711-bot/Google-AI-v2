import React from 'react';
import {
  ListFilter,
  CheckCircle,
  Clock,
  Flag,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Building,
  Calendar,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { FilterState, StatusCounts } from '../types';

interface SidebarProps {
  counts: StatusCounts;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  programs: string[];
  departments: string[];
  passingYears: string[];
  primarySources: string[];
  sourcesChecked: string[];
  width?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  counts,
  filters,
  onFilterChange,
  onResetFilters,
  programs,
  departments,
  passingYears,
  primarySources,
  sourcesChecked,
  width = 210,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const percentVerified =
    counts.all > 0 ? Math.round((counts.verified / counts.all) * 100) : 0;

  const statusItems: {
    id: string;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeColor: string;
    badgeColor: string;
  }[] = [
    {
      id: 'All',
      label: 'All Records',
      count: counts.all,
      icon: Layers,
      activeColor: 'bg-[#A83B24] text-white font-semibold shadow-xs',
      badgeColor: 'bg-[#8A2B16] text-white',
    },
    {
      id: 'Pending',
      label: 'Pending',
      count: counts.pending,
      icon: Clock,
      activeColor: 'bg-[#FAF0ED] text-[#A83B24] font-semibold border-l-2 border-[#A83B24]',
      badgeColor: 'bg-[#F2DDD6] text-[#A83B24]',
    },
    {
      id: 'Verified',
      label: 'Verified',
      count: counts.verified,
      icon: CheckCircle,
      activeColor: 'bg-emerald-50 text-emerald-900 font-semibold border-l-2 border-emerald-600',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'Flagged',
      label: 'Flagged',
      count: counts.flagged,
      icon: Flag,
      activeColor: 'bg-orange-50 text-orange-900 font-semibold border-l-2 border-orange-500',
      badgeColor: 'bg-orange-100 text-orange-800',
    },
  ];

  const hasActiveSecondaryFilters =
    filters.program ||
    filters.department ||
    filters.passingYear ||
    filters.primarySource ||
    filters.sourceChecked ||
    filters.aiConfidence;

  if (isCollapsed) {
    return (
      <aside
        id="sidebar-collapsed"
        style={{ width: 48 }}
        className="shrink-0 bg-[#FAF7F5] border-r border-[#EAE1DA] flex flex-col items-center py-3 h-[calc(100vh-4rem)] overflow-y-auto space-y-3 z-10 select-none"
      >
        {/* Expand Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg hover:bg-[#F0E5DF] flex items-center justify-center text-slate-600 hover:text-[#A83B24] transition-colors cursor-pointer"
            title="Expand Sidebar (Live Status & Filters)"
          >
            <PanelLeftOpen className="w-4 h-4 text-slate-700" />
          </button>
        )}

        <div className="w-6 h-px bg-[#EAE1DA]" />

        {/* Status Filter Icons with Count Badges */}
        <div className="flex flex-col space-y-1.5 items-center w-full px-1">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const isSelected = filters.status === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange({ status: item.id })}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#A83B24] text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:bg-[#F0E5DF] hover:text-[#A83B24]'
                }`}
                title={`${item.label}: ${item.count.toLocaleString()} records`}
              >
                <Icon className="w-4 h-4" />
                {item.count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-slate-800 text-[9px] text-white font-mono flex items-center justify-center font-bold scale-90">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-6 h-px bg-[#EAE1DA]" />

        {/* Mini progress indicator */}
        <div
          className="flex flex-col items-center cursor-pointer"
          title={`Verification Progress: ${percentVerified}% (${counts.verified} / ${counts.all})`}
        >
          <span className="text-[10px] font-bold text-[#A83B24] font-mono">
            {percentVerified}%
          </span>
          <div className="w-1.5 h-10 bg-slate-200/80 rounded-full overflow-hidden mt-1 flex flex-col justify-end">
            <div
              className="w-full bg-[#A83B24] rounded-full transition-all duration-500"
              style={{ height: `${percentVerified}%` }}
            />
          </div>
        </div>

        {/* Secondary filter dot indicator */}
        {hasActiveSecondaryFilters && (
          <div
            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
            title="Secondary filters active"
          />
        )}
      </aside>
    );
  }

  return (
    <aside
      id="sidebar-expanded"
      style={{ width }}
      className="shrink-0 bg-[#FAF7F5] border-r border-[#EAE1DA] flex flex-col h-[calc(100vh-4rem)] overflow-y-auto z-10 select-none"
    >
      {/* Live Status Counts Section */}
      <div className="p-3 border-b border-[#EAE1DA]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Status
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-[#A83B24] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A83B24] animate-pulse" />
              Live
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-[#F0E5DF] transition-colors cursor-pointer"
                title="Collapse sidebar to gain workspace width"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <nav className="space-y-1">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const isSelected = filters.status === item.id;
            return (
              <button
                key={item.id}
                id={`filter-status-${item.id.toLowerCase()}`}
                onClick={() => onFilterChange({ status: item.id })}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? `${item.activeColor} shadow-xs font-semibold`
                    : 'text-slate-600 hover:bg-[#F3EBE6]'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Icon className="w-3.5 h-3.5 opacity-80 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span
                  className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-medium shrink-0 ${
                    isSelected ? item.badgeColor : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {item.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Verification Progress bar */}
        <div className="mt-3 pt-2.5 border-t border-[#EAE1DA]">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Verified Progress</span>
            <span className="font-semibold text-[#A83B24]">{percentVerified}%</span>
          </div>
          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#A83B24] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${percentVerified}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>{counts.verified.toLocaleString()} done</span>
            <span>{counts.all.toLocaleString()} total</span>
          </div>
        </div>
      </div>

      {/* Structured Filters */}
      <div className="p-3 space-y-3 flex-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <ListFilter className="w-3.5 h-3.5" />
            <span>Refine Records</span>
          </span>
          {hasActiveSecondaryFilters && (
            <button
              onClick={onResetFilters}
              className="text-[11px] font-medium text-[#A83B24] hover:text-[#912F1B] flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* AI Confidence Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-[#A83B24]" />
            <span>AI Confidence</span>
          </label>
          <select
            id="filter-ai-confidence"
            value={filters.aiConfidence}
            onChange={(e) => onFilterChange({ aiConfidence: e.target.value })}
            className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
          >
            <option value="">All Confidence Levels</option>
            <option value="High">High Confidence (&gt;80%)</option>
            <option value="Medium">Medium Confidence (50-80%)</option>
            <option value="Low">Low Confidence (&lt;50%)</option>
          </select>
        </div>

        {/* Program Filter */}
        {programs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center space-x-1">
              <GraduationCap className="w-3 h-3 text-slate-400" />
              <span>Program</span>
            </label>
            <select
              id="filter-program"
              value={filters.program}
              onChange={(e) => onFilterChange({ program: e.target.value })}
              className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
            >
              <option value="">All Programs ({programs.length})</option>
              {programs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Department Filter */}
        {departments.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center space-x-1">
              <Building className="w-3 h-3 text-slate-400" />
              <span>Department</span>
            </label>
            <select
              id="filter-department"
              value={filters.department}
              onChange={(e) => onFilterChange({ department: e.target.value })}
              className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
            >
              <option value="">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Passing Year */}
        {passingYears.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Passing Year</span>
            </label>
            <select
              id="filter-passing-year"
              value={filters.passingYear}
              onChange={(e) => onFilterChange({ passingYear: e.target.value })}
              className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
            >
              <option value="">All Passing Years ({passingYears.length})</option>
              {passingYears.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Primary Source Filter */}
        {primarySources.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Primary Source</label>
            <select
              id="filter-primary-source"
              value={filters.primarySource}
              onChange={(e) => onFilterChange({ primarySource: e.target.value })}
              className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
            >
              <option value="">All Primary Sources</option>
              {primarySources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Source Checked Filter */}
        {sourcesChecked.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Source Checked</label>
            <select
              id="filter-source-checked"
              value={filters.sourceChecked}
              onChange={(e) => onFilterChange({ sourceChecked: e.target.value })}
              className="w-full text-xs bg-white border border-[#EAE1DA] rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#A83B24] focus:border-[#A83B24]"
            >
              <option value="">All Sources Checked</option>
              {sourcesChecked.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </aside>
  );
};
