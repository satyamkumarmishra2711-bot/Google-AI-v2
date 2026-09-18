import React, { useState, useMemo } from 'react';
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
  Download,
  Copy,
  FileCode,
  SlidersHorizontal,
  FileSpreadsheet,
  CalendarCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FilterState, StatusCounts, AlumniRecord, TodayActionsCount, TodayL1ActionsCount } from '../types';
import {
  EXPORT_FIELDS,
  generateCsv,
  generateTsv,
  generateJson,
  triggerDownload,
} from '../utils/exportUtils';
import { ExportFieldsModal } from './ExportFieldsModal';

interface SidebarProps {
  counts: StatusCounts;
  todayActions?: TodayActionsCount;
  todayL1Actions?: TodayL1ActionsCount;
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
  allRecords?: AlumniRecord[];
  filteredRecords?: AlumniRecord[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  counts,
  todayActions = { total: 0, verified: 0, flagged: 0 },
  todayL1Actions = { total: 0, approved: 0, sentBack: 0, escalated: 0 },
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
  allRecords = [],
  filteredRecords = [],
}) => {
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'verified'>('filtered');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const showExportToast = (msg: string) => {
    setExportFeedback(msg);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const verifiedRecords = useMemo(() => {
    return allRecords.filter(
      (r) => {
        const s = (r.verificationStatus || '').toLowerCase();
        return s.includes('veri') || s === 'approved' || r.sourceChecked === 'TRUE';
      }
    );
  }, [allRecords]);

  const l1Counts = useMemo(() => {
    const verified = allRecords.filter((r) => {
      const s = (r.verificationStatus || '').toLowerCase();
      return s.includes('veri') || s === 'approved';
    });

    const pending = verified.filter((r) => {
      const isSentForUpdate = (r.sentForUpdate || '').toLowerCase().trim() === 'yes' || (r.sentForUpdate || '').toLowerCase().trim() === 'y';
      if (isSentForUpdate) return false;
      return !r.l1Review || r.l1Review.trim() === '';
    }).length;
    const approved = verified.filter((r) => (r.l1Review || '').toLowerCase() === 'approved').length;
    const sentBack = verified.filter((r) => (r.l1Review || '').toLowerCase().includes('sent')).length;
    const escalated = verified.filter((r) => (r.l1Review || '').toLowerCase().includes('escala')).length;

    return {
      totalVerified: verified.length,
      pending,
      approved,
      sentBack,
      escalated,
    };
  }, [allRecords]);

  const targetRecords = useMemo(() => {
    if (exportScope === 'all') return allRecords;
    if (exportScope === 'verified') return verifiedRecords;
    return filteredRecords;
  }, [exportScope, allRecords, verifiedRecords, filteredRecords]);

  const scopeLabel = useMemo(() => {
    if (exportScope === 'all') return 'All Records';
    if (exportScope === 'verified') return 'Verified Records';
    return 'Filtered Records';
  }, [exportScope]);

  const handleQuickExportCsv = () => {
    if (targetRecords.length === 0) {
      showExportToast('No records available to export');
      return;
    }
    const csvContent = generateCsv(targetRecords);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(
      csvContent,
      `alumni_${exportScope}_${dateStr}.csv`,
      'text/csv;charset=utf-8;'
    );
    showExportToast(`✓ Exported ${targetRecords.length} records to CSV!`);
  };

  const handleQuickCopySheets = async () => {
    if (targetRecords.length === 0) {
      showExportToast('No records available to copy');
      return;
    }
    const tsvContent = generateTsv(targetRecords);
    try {
      await navigator.clipboard.writeText(tsvContent);
      showExportToast(`✓ Copied ${targetRecords.length} rows for Google Sheets!`);
    } catch {
      showExportToast('Clipboard access restricted. Use Download CSV.');
    }
  };

  const handleQuickExportJson = () => {
    if (targetRecords.length === 0) {
      showExportToast('No records available to export');
      return;
    }
    const jsonContent = generateJson(targetRecords);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(
      jsonContent,
      `alumni_${exportScope}_${dateStr}.json`,
      'application/json;charset=utf-8;'
    );
    showExportToast(`✓ Exported ${targetRecords.length} records to JSON!`);
  };
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

        {/* Mini Today's Actions Indicator */}
        <div
          className="relative w-8 h-8 rounded-lg bg-[#FAF0ED] border border-[#ECD5CC] flex items-center justify-center text-[#A83B24]"
          title={`Verifier Actions Today: ${todayActions.total} (${todayActions.verified} Verified, ${todayActions.flagged} Flagged)`}
        >
          <CalendarCheck className="w-4 h-4" />
          {todayActions.total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#A83B24] text-[9px] text-white font-mono flex items-center justify-center font-bold">
              {todayActions.total > 99 ? '99+' : todayActions.total}
            </span>
          )}
        </div>

        {/* Mini L1 Today's Actions Indicator */}
        <div
          className="relative w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700"
          title={`L1 Actions Today: ${todayL1Actions.total} (${todayL1Actions.approved} Approved, ${todayL1Actions.sentBack} Sent Back, ${todayL1Actions.escalated} Escalated)`}
        >
          <ShieldCheck className="w-4 h-4" />
          {todayL1Actions.total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-indigo-600 text-[9px] text-white font-mono flex items-center justify-center font-bold">
              {todayL1Actions.total > 99 ? '99+' : todayL1Actions.total}
            </span>
          )}
        </div>

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

        <div className="w-6 h-px bg-[#EAE1DA]" />

        {/* Collapsed Export Button */}
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-[#F0E5DF] hover:text-[#A83B24] transition-colors cursor-pointer"
          title={`Export Data (${targetRecords.length} records available)`}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Field Inspection & Configuration Modal */}
        <ExportFieldsModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          records={targetRecords}
          scopeLabel={scopeLabel}
        />
      </aside>
    );
  }

  return (
    <aside
      id="sidebar-expanded"
      style={{ width }}
      className="shrink-0 bg-[#FAF7F5] border-r border-[#EAE1DA] flex flex-col h-[calc(100vh-4rem)] overflow-y-auto z-10 select-none"
    >
      {/* 1st Panel Top: Today's Actions (Verified or Flagged) */}
      <div className="p-3 border-b border-[#EAE1DA] bg-white/70">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-[#A83B24]" />
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Marked Today
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 font-mono">
            {todayDateFormatted}
          </span>
        </div>

        <div className="bg-gradient-to-br from-[#FAF0ED] to-white rounded-lg p-2.5 border border-[#ECD5CC] shadow-2xs">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600">Actions Today</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-extrabold text-[#A83B24] font-mono leading-none">
                {todayActions.total}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">marked</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-[#ECD5CC]/60 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Verified:</span>
              <strong className="font-mono font-bold">{todayActions.verified}</strong>
            </span>
            <span className="text-orange-700 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span>Flagged:</span>
              <strong className="font-mono font-bold">{todayActions.flagged}</strong>
            </span>
          </div>
        </div>
      </div>

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

      {/* L1 Approver Review Portal Section (Dedicated for Verified Records) */}
      <div className="p-3 border-b border-[#EAE1DA] bg-indigo-50/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              L1 Approval
            </span>
          </div>
          <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
            Verified Only
          </span>
        </div>

        {/* L1 Actions Today Summary Widget */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/60 rounded-lg p-2.5 border border-indigo-200 shadow-2xs mb-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center space-x-1">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-700">L1 Actions Today</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-extrabold text-indigo-700 font-mono leading-none">
                {todayL1Actions.total}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">marked</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-indigo-100/80 flex items-center justify-between text-[10px]">
            <span className="text-emerald-700 font-medium flex items-center space-x-0.5" title="L1 Approved today">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Apprv:</span>
              <strong className="font-mono font-bold">{todayL1Actions.approved}</strong>
            </span>
            <span className="text-amber-700 font-medium flex items-center space-x-0.5" title="L1 Sent back today">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Sent:</span>
              <strong className="font-mono font-bold">{todayL1Actions.sentBack}</strong>
            </span>
            <span className="text-purple-700 font-medium flex items-center space-x-0.5" title="L1 Escalated today">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>Esc:</span>
              <strong className="font-mono font-bold">{todayL1Actions.escalated}</strong>
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            id="filter-l1-all-verified"
            onClick={() => onFilterChange({ status: 'Verified', l1Review: '' })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              filters.status === 'Verified' && !filters.l1Review
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-indigo-100/50'
            }`}
          >
            <span className="truncate">All Verified ({l1Counts.totalVerified})</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium shrink-0 ${
                filters.status === 'Verified' && !filters.l1Review
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-100/80 text-indigo-800'
              }`}
            >
              {l1Counts.totalVerified}
            </span>
          </button>

          <button
            type="button"
            id="filter-l1-awaiting"
            onClick={() => onFilterChange({ status: 'Verified', l1Review: 'Pending' })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              filters.status === 'Verified' && filters.l1Review === 'Pending'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-indigo-100/50'
            }`}
          >
            <span className="truncate">Awaiting L1 Review</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium shrink-0 ${
                filters.status === 'Verified' && filters.l1Review === 'Pending'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-100/80 text-indigo-800'
              }`}
            >
              {l1Counts.pending}
            </span>
          </button>

          <button
            type="button"
            id="filter-l1-approved"
            onClick={() => onFilterChange({ status: 'Verified', l1Review: 'Approved' })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              filters.status === 'Verified' && filters.l1Review === 'Approved'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-emerald-50'
            }`}
          >
            <span className="truncate flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>L1 Approved</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium shrink-0 ${
                filters.status === 'Verified' && filters.l1Review === 'Approved'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {l1Counts.approved}
            </span>
          </button>

          <button
            type="button"
            id="filter-l1-sent-back"
            onClick={() => onFilterChange({ status: 'Verified', l1Review: 'Sent back' })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              filters.status === 'Verified' && filters.l1Review === 'Sent back'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-amber-50'
            }`}
          >
            <span className="truncate flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Sent Back</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium shrink-0 ${
                filters.status === 'Verified' && filters.l1Review === 'Sent back'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {l1Counts.sentBack}
            </span>
          </button>

          <button
            type="button"
            id="filter-l1-escalated"
            onClick={() => onFilterChange({ status: 'Verified', l1Review: 'Escalated' })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              filters.status === 'Verified' && filters.l1Review === 'Escalated'
                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-purple-50'
            }`}
          >
            <span className="truncate flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>Escalated</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10.5px] font-mono font-medium shrink-0 ${
                filters.status === 'Verified' && filters.l1Review === 'Escalated'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {l1Counts.escalated}
            </span>
          </button>
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

      {/* Export Data Section - Placed directly after Refine Records */}
      <div className="p-3 border-t border-[#EAE1DA] bg-[#FAF5F2]/80 text-xs space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Download className="w-3.5 h-3.5 text-[#A83B24]" />
            <span>Export Data</span>
          </span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white border border-[#EAE1DA] text-slate-600">
            {targetRecords.length} records
          </span>
        </div>

        {/* Scope Selector: Filtered vs All vs Verified */}
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Export Scope
          </label>
          <div className="grid grid-cols-3 gap-1 bg-white/90 p-0.5 rounded-lg border border-[#EAE1DA]">
            <button
              type="button"
              id="export-scope-filtered"
              onClick={() => setExportScope('filtered')}
              className={`px-1 py-1 text-[10px] font-bold rounded transition-colors text-center truncate cursor-pointer ${
                exportScope === 'filtered'
                  ? 'bg-[#A83B24] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={`Filtered records (${filteredRecords.length})`}
            >
              Filtered ({filteredRecords.length})
            </button>
            <button
              type="button"
              id="export-scope-all"
              onClick={() => setExportScope('all')}
              className={`px-1 py-1 text-[10px] font-bold rounded transition-colors text-center truncate cursor-pointer ${
                exportScope === 'all'
                  ? 'bg-[#A83B24] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={`All sheet records (${allRecords.length})`}
            >
              All ({allRecords.length})
            </button>
            <button
              type="button"
              id="export-scope-verified"
              onClick={() => setExportScope('verified')}
              className={`px-1 py-1 text-[10px] font-bold rounded transition-colors text-center truncate cursor-pointer ${
                exportScope === 'verified'
                  ? 'bg-[#A83B24] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={`Verified records only (${verifiedRecords.length})`}
            >
              Verified ({verifiedRecords.length})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5 pt-0.5">
          <button
            type="button"
            id="btn-sidebar-download-csv"
            onClick={handleQuickExportCsv}
            disabled={targetRecords.length === 0}
            className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#A83B24] hover:bg-[#8F2F1B] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors active:scale-98"
            title="Download full CSV file compatible with Microsoft Excel and Google Sheets"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV ({EXPORT_FIELDS.length} fields)</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              id="btn-sidebar-copy-sheets"
              onClick={handleQuickCopySheets}
              disabled={targetRecords.length === 0}
              className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 bg-white hover:bg-emerald-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors"
              title="Copy tab-delimited records to clipboard for 1-click paste into Google Sheets"
            >
              <Copy className="w-3 h-3 text-emerald-600" />
              <span>Copy Sheets</span>
            </button>

            <button
              type="button"
              id="btn-sidebar-download-json"
              onClick={handleQuickExportJson}
              disabled={targetRecords.length === 0}
              className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
              title="Download JSON structured array"
            >
              <FileCode className="w-3 h-3 text-slate-500" />
              <span>JSON</span>
            </button>
          </div>

          {/* Inspect All Fields Action */}
          <button
            type="button"
            id="btn-sidebar-inspect-fields"
            onClick={() => setIsExportModalOpen(true)}
            className="w-full inline-flex items-center justify-between px-2.5 py-1.5 bg-white hover:bg-[#FAF0ED] text-[#A83B24] border border-[#EAE1DA] hover:border-[#A83B24]/40 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
            title="Inspect and configure all 37 exportable fields across 6 categories"
          >
            <span className="flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Configure Export Fields</span>
            </span>
            <span className="text-[10px] bg-amber-100 text-[#A83B24] font-bold px-1.5 py-0.5 rounded-full">
              {EXPORT_FIELDS.length} fields
            </span>
          </button>
        </div>

        {/* Feedback message banner */}
        {exportFeedback && (
          <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-[10.5px] text-emerald-800 font-medium flex items-center justify-between animate-in fade-in">
            <span className="truncate">{exportFeedback}</span>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-1 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Field Inspection & Configuration Modal */}
      <ExportFieldsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={targetRecords}
        scopeLabel={scopeLabel}
      />
    </aside>
  );
};
