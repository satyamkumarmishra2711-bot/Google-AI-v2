import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save,
  ArrowRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  Sparkles,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  UserCheck,
  Calendar,
  GraduationCap,
  RotateCcw,
  Link2,
} from 'lucide-react';
import { AlumniRecord, EditableFields } from '../types';
import { InWindowSearchPanel } from './InWindowSearchPanel';

interface VerificationDetailProps {
  record: AlumniRecord | null;
  onSave: (updates: EditableFields, andNext: boolean) => Promise<void>;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isSaving: boolean;
  primarySourceOptions?: string[];
}

export const VerificationDetail: React.FC<VerificationDetailProps> = ({
  record,
  onSave,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isSaving,
  primarySourceOptions = [],
}) => {
  const [formData, setFormData] = useState<EditableFields>({
    correctedDesignation: '',
    correctedCompany: '',
    correctedLinkedIn: '',
    correctedCity: '',
    correctedState: '',
    correctedCountry: '',
    correctedPincode: '',
    sourceChecked: '',
    primarySource: '',
    verificationStatus: 'Pending',
    anyRemark: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchMaximized, setIsSearchMaximized] = useState(false);

  // Search Panel Width (%) and Vertical Height (Taller mode) controls
  const [searchWidthPercent, setSearchWidthPercent] = useState<number>(() => {
    const saved = localStorage.getItem('alumni_verifier_search_w_pct');
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed >= 30 && parsed <= 75) return parsed;
    }
    return 52;
  });

  const [isSearchTaller, setIsSearchTaller] = useState<boolean>(() => {
    return localStorage.getItem('alumni_verifier_search_taller') === 'true';
  });

  const handleToggleSearchTaller = () => {
    setIsSearchTaller((prev) => {
      const next = !prev;
      localStorage.setItem('alumni_verifier_search_taller', String(next));
      return next;
    });
  };

  const handleSetSearchWidthPercent = (pct: number) => {
    const clamped = Math.max(30, Math.min(75, pct));
    setSearchWidthPercent(clamped);
    localStorage.setItem('alumni_verifier_search_w_pct', String(clamped));
  };

  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isDraggingSearchDivider, setIsDraggingSearchDivider] = useState(false);

  const startSearchResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSearchDivider(true);
  };

  useEffect(() => {
    if (!isDraggingSearchDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const widthPct = ((rect.right - e.clientX) / rect.width) * 100;
      const clamped = Math.max(30, Math.min(75, Math.round(widthPct)));
      setSearchWidthPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingSearchDivider(false);
      localStorage.setItem('alumni_verifier_search_w_pct', String(searchWidthPercent));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSearchDivider, searchWidthPercent]);

  const defaultSearchQuery = useMemo(() => {
    if (!record) return '';
    const org = record.existingOrganization || record.aiCompany || '';
    return `${record.fullName} ${org} LinkedIn`.trim();
  }, [record?.fullName, record?.existingOrganization, record?.aiCompany]);

  // Unique primary sources collected dynamically from the Google Sheet
  const availablePrimarySources = useMemo(() => {
    const set = new Set<string>();
    if (primarySourceOptions) {
      primarySourceOptions.forEach((s) => {
        if (s && s.trim()) set.add(s.trim());
      });
    }
    if (record?.primarySource && record.primarySource.trim()) {
      set.add(record.primarySource.trim());
    }
    return Array.from(set).sort();
  }, [primarySourceOptions, record?.primarySource]);

  // Sync state whenever selected record changes
  useEffect(() => {
    if (record) {
      const initSourceChecked =
        record.sourceChecked &&
        (record.sourceChecked.toUpperCase() === 'TRUE' ||
          record.sourceChecked.toUpperCase() === 'FALSE')
          ? record.sourceChecked.toUpperCase()
          : '';

      setFormData({
        correctedDesignation: record.correctedDesignation || '',
        correctedCompany: record.correctedCompany || '',
        correctedLinkedIn: record.correctedLinkedIn || '',
        correctedCity: record.correctedCity || '',
        correctedState: record.correctedState || '',
        correctedCountry: record.correctedCountry || '',
        correctedPincode: record.correctedPincode || '',
        sourceChecked: initSourceChecked,
        primarySource: record.primarySource || '',
        verificationStatus: record.verificationStatus || 'Pending',
        anyRemark: record.anyRemark || '',
      });
      setHasChanges(false);
      setValidationErrors({});
    }
  }, [record?.customId, record?.rowIndex]);

  if (!record) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <UserCheck className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-slate-800">No Alumni Record Selected</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select an alumni from the list on the left to review existing details, compare AI extracted
          data, and update your Google Sheet.
        </p>
      </div>
    );
  }

  const handleFieldChange = (field: keyof EditableFields, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear validation error dynamically when field is updated
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCopyExisting = () => {
    setFormData((prev) => ({
      ...prev,
      correctedDesignation: record.existingDesignation || prev.correctedDesignation,
      correctedCompany: record.existingOrganization || prev.correctedCompany,
      correctedLinkedIn: record.existingLinkedIn || prev.correctedLinkedIn,
    }));
    setHasChanges(true);
  };

  const handleCopyAI = () => {
    setFormData((prev) => ({
      ...prev,
      correctedDesignation: record.aiDesignation || prev.correctedDesignation,
      correctedCompany: record.aiCompany || prev.correctedCompany,
      correctedLinkedIn: record.aiLinkedIn || prev.correctedLinkedIn,
      correctedCity: record.aiLocation || prev.correctedCity,
      correctedPincode: record.aiPincode || prev.correctedPincode,
      sourceChecked: prev.sourceChecked || '',
      primarySource: prev.primarySource || (availablePrimarySources[0] || ''),
    }));
    setHasChanges(true);
  };

  const handleResetForm = () => {
    if (record) {
      const initSourceChecked =
        record.sourceChecked &&
        (record.sourceChecked.toUpperCase() === 'TRUE' ||
          record.sourceChecked.toUpperCase() === 'FALSE')
          ? record.sourceChecked.toUpperCase()
          : '';

      setFormData({
        correctedDesignation: record.correctedDesignation || '',
        correctedCompany: record.correctedCompany || '',
        correctedLinkedIn: record.correctedLinkedIn || '',
        correctedCity: record.correctedCity || '',
        correctedState: record.correctedState || '',
        correctedCountry: record.correctedCountry || '',
        correctedPincode: record.correctedPincode || '',
        sourceChecked: initSourceChecked,
        primarySource: record.primarySource || '',
        verificationStatus: record.verificationStatus || 'Pending',
        anyRemark: record.anyRemark || '',
      });
      setHasChanges(false);
      setValidationErrors({});
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Mandatory Rule 1: Verification Status cannot be pending or blank
    const status = (formData.verificationStatus || '').trim();
    if (!status || status.toLowerCase() === 'pending') {
      errors.verificationStatus =
        "Verification Status cannot be 'Pending' or blank. Please select Verified or Flagged.";
    }

    // Mandatory Rule 2: Source Checked must be TRUE or FALSE (Default should be blank)
    const sourceChecked = (formData.sourceChecked || '').trim().toUpperCase();
    if (sourceChecked !== 'TRUE' && sourceChecked !== 'FALSE') {
      errors.sourceChecked =
        'Source Checked is mandatory. Please select TRUE or FALSE.';
    }

    // Mandatory Rule 3: Primary Source (from Sheet) should not be blank
    const primarySource = (formData.primarySource || '').trim();
    if (!primarySource) {
      errors.primarySource =
        'Primary Source (from Sheet) is mandatory and cannot be blank.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAndNext = async () => {
    if (!validateForm()) {
      return;
    }
    await onSave(formData, true);
    setHasChanges(false);
    setValidationErrors({});
  };

  const statusOptions = [
    {
      id: 'Verified',
      label: 'Verified',
      icon: CheckCircle2,
      activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20',
      inactiveColor: 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border-slate-300',
    },
    {
      id: 'Flagged',
      label: 'Flagged',
      icon: AlertTriangle,
      activeColor: 'bg-[#A83B24] text-white border-[#A83B24] shadow-sm ring-2 ring-[#A83B24]/20',
      inactiveColor: 'bg-white text-slate-700 hover:bg-[#FAF0ED] hover:text-[#A83B24] border-slate-300',
    },
  ];

  return (
    <div className="flex-1 bg-[#FAF7F5]/60 flex flex-col h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Top Identity & Navigation Bar */}
      <div className="bg-white border-b border-[#EAE1DA] px-6 py-4 shrink-0 z-20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Alumni Header */}
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {record.fullName || 'Unnamed Alumni'}
              </h2>
              {record.customId && (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-[#EAE1DA]">
                  ID: {record.customId}
                </span>
              )}
              {record.rollNumber && (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[#FAF0ED] text-[#A83B24] border border-[#ECD5CC]">
                  Roll: {record.rollNumber}
                </span>
              )}
              {record.rowIndex && (
                <span className="text-[11px] text-slate-400 font-mono">
                  (Sheet Row #{record.rowIndex})
                </span>
              )}
            </div>

            {/* Academics & Assignment subtitle */}
            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 flex-wrap">
              {record.program && (
                <span className="flex items-center space-x-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{record.program}</span>
                </span>
              )}
              {record.department && <span>• {record.department}</span>}
              {record.passingYear && (
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Batch of {record.passingYear}</span>
                </span>
              )}
              {record.assignedTo && (
                <span className="text-slate-400">
                  • Assigned to: <strong className="text-slate-600">{record.assignedTo}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick External Actions & Prev/Next */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* In-Window Google Search Button */}
            <button
              type="button"
              id="btn-google-search-inwindow"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isSearchOpen
                  ? 'bg-[#A83B24] text-white border-[#A83B24] shadow-xs ring-2 ring-[#A83B24]/20'
                  : 'bg-white hover:bg-[#FAF4F1] text-slate-700 border-[#EAE1DA] shadow-2xs'
              }`}
              title={
                isSearchOpen
                  ? 'Close In-Window Google Search'
                  : record.searchUrl
                  ? `Open Search_URL from Sheet in window: ${record.searchUrl}`
                  : 'Open Google Search inside this window'
              }
            >
              <Search
                className={`w-3.5 h-3.5 ${
                  isSearchOpen ? 'text-white' : 'text-[#A83B24]'
                }`}
              />
              <span>{isSearchOpen ? 'Search Open' : 'Google Search'}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded flex items-center space-x-1 ${
                  isSearchOpen
                    ? 'bg-[#8A2B16] text-white'
                    : record.searchUrl
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[#FAF0ED] text-[#A83B24] border border-[#ECD5CC]'
                }`}
              >
                {record.searchUrl ? (
                  <>
                    <Link2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                    <span>Search_URL</span>
                  </>
                ) : (
                  <span>In-Window</span>
                )}
              </span>
            </button>

            <div className="flex items-center space-x-1 border-l border-[#EAE1DA] pl-2">
              <button
                id="btn-prev-record"
                onClick={onPrevious}
                disabled={!hasPrevious || isSaving}
                title="Previous Record"
                className="p-1.5 text-slate-600 hover:bg-[#FAF0ED] hover:text-[#A83B24] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-next-record"
                onClick={onNext}
                disabled={!hasNext || isSaving}
                title="Next Record"
                className="p-1.5 text-slate-600 hover:bg-[#FAF0ED] hover:text-[#A83B24] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area: Verification Form + In-Window Search Split View */}
      <div ref={workspaceRef} className="flex-1 flex overflow-hidden relative">
        <div
          style={
            isSearchOpen && !isSearchMaximized
              ? { width: `${100 - searchWidthPercent}%` }
              : undefined
          }
          className={`overflow-y-auto p-5 space-y-5 transition-all duration-75 ${
            isSearchOpen && !isSearchMaximized
              ? 'shrink-0'
              : 'max-w-7xl mx-auto w-full flex-1'
          }`}
        >
        {/* Top 2 Comparison Reference Cards: Existing vs AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Existing Official Record (Read-Only) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Existing Record (Official Reference)
                  </h3>
                </div>
                <button
                  onClick={handleCopyExisting}
                  type="button"
                  title="Copy Existing Designation & Company into Corrected Form"
                  className="text-xs text-slate-600 hover:text-emerald-700 flex items-center space-x-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors font-medium border border-slate-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy to Form</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Existing Designation
                  </span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">
                    {record.existingDesignation || (
                      <span className="text-slate-400 font-normal italic">Not recorded</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Existing Organization
                  </span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {record.existingOrganization || (
                        <span className="text-slate-400 font-normal italic">Not recorded</span>
                      )}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Existing LinkedIn
                  </span>
                  {record.existingLinkedIn ? (
                    <div className="mt-0.5 flex items-center space-x-2">
                      <a
                        href={
                          record.existingLinkedIn.startsWith('http')
                            ? record.existingLinkedIn
                            : `https://${record.existingLinkedIn}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs inline-flex items-center space-x-1"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{record.existingLinkedIn}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic mt-0.5">No LinkedIn attached</p>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Sheet Search_URL
                  </span>
                  {record.searchUrl ? (
                    <div className="mt-0.5 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-medium truncate max-w-[200px] text-left underline cursor-pointer inline-flex items-center space-x-1 bg-emerald-50/80 px-2 py-1 rounded border border-emerald-200/80"
                        title={`Click to open in search window: ${record.searchUrl}`}
                      >
                        <Link2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{record.searchUrl}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="px-2 py-1 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer shrink-0"
                      >
                        Open In-Window
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic mt-0.5">No Search_URL in sheet row</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Read-only reference</span>
              <span>Assigned: {record.assignedDate || 'N/A'}</span>
            </div>
          </div>

          {/* Card 2: AI Extracted / Predicted Data (Read-Only) */}
          <div className="bg-white rounded-xl border border-indigo-100 shadow-xs p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-50">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    AI Extracted Data
                  </h3>
                  {record.aiConfidence && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {record.aiConfidence}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopyAI}
                  type="button"
                  title="Copy AI Designation, Company, LinkedIn, and Location into Form"
                  className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium border border-indigo-200"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Copy AI to Form</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-indigo-600/70 uppercase tracking-wider">
                    AI Predicted Designation
                  </span>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">
                    {record.aiDesignation || (
                      <span className="text-slate-400 font-normal italic">No AI prediction</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-indigo-600/70 uppercase tracking-wider">
                    AI Predicted Company
                  </span>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      {record.aiCompany || (
                        <span className="text-slate-400 font-normal italic">No AI prediction</span>
                      )}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-indigo-600/70 uppercase tracking-wider">
                      AI Location
                    </span>
                    <p className="text-slate-800 mt-0.5 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>{record.aiLocation || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-indigo-600/70 uppercase tracking-wider">
                      AI Pincode
                    </span>
                    <p className="text-slate-800 mt-0.5 font-mono">{record.aiPincode || '—'}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-indigo-600/70 uppercase tracking-wider">
                    AI LinkedIn
                  </span>
                  {record.aiLinkedIn ? (
                    <div className="mt-0.5 flex items-center space-x-2">
                      <a
                        href={
                          record.aiLinkedIn.startsWith('http')
                            ? record.aiLinkedIn
                            : `https://${record.aiLinkedIn}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline truncate max-w-xs inline-flex items-center space-x-1"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{record.aiLinkedIn}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic mt-0.5">No AI LinkedIn found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-50 flex items-center justify-between text-[11px] text-indigo-400">
              <span>Automated extraction</span>
              <span>Confidence: {record.aiConfidence || 'Unscored'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Editable Form (Direct Google Sheet Target) */}
        <div className="bg-white rounded-xl border-2 border-[#A83B24]/30 shadow-sm p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#A83B24]" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Verified & Corrected Data
                </h3>
                <span className="text-[11px] font-semibold text-[#A83B24] bg-[#FAF0ED] px-2.5 py-0.5 rounded-full border border-[#ECD5CC]">
                  Google Sheet Direct Target
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Saving updates these 11 fields directly into the live Google Sheet for{' '}
                <strong className="text-slate-700">{record.fullName}</strong>.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {hasChanges && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-500 hover:text-[#A83B24] flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#EAE1DA] hover:bg-[#FAF0ED] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Changes</span>
                </button>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveAndNext();
            }}
            className="space-y-5"
          >
            {/* Status Selector Bar */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Verification Status <span className="text-rose-500">*</span>
                </label>
                {(formData.verificationStatus || '').toLowerCase() === 'pending' || !formData.verificationStatus ? (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Currently Pending in Sheet (Select Verified or Flagged)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-600">
                    Active Status:{' '}
                    <strong
                      className={
                        formData.verificationStatus === 'Verified'
                          ? 'text-emerald-700'
                          : 'text-[#A83B24]'
                      }
                    >
                      {formData.verificationStatus}
                    </strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = formData.verificationStatus === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`btn-status-${opt.id.toLowerCase()}`}
                      onClick={() => handleFieldChange('verificationStatus', opt.id)}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? opt.activeColor
                          : `bg-white text-slate-700 hover:bg-slate-50 border-slate-300 ${
                              validationErrors.verificationStatus ? 'border-rose-400 bg-rose-50/20' : ''
                            }`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {validationErrors.verificationStatus && (
                <p className="text-[11.5px] text-rose-600 font-medium mt-1.5 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationErrors.verificationStatus}</span>
                </p>
              )}
            </div>

            {/* Role & Company Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-corrected-designation"
                  type="text"
                  placeholder="e.g. Senior Vice President, Engineering"
                  value={formData.correctedDesignation}
                  onChange={(e) => handleFieldChange('correctedDesignation', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Company <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-corrected-company"
                  type="text"
                  placeholder="e.g. Google India Pvt Ltd"
                  value={formData.correctedCompany}
                  onChange={(e) => handleFieldChange('correctedCompany', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-medium"
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corrected LinkedIn Profile URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="input-corrected-linkedin"
                  type="text"
                  placeholder="https://www.linkedin.com/in/username"
                  value={formData.correctedLinkedIn}
                  onChange={(e) => handleFieldChange('correctedLinkedIn', e.target.value)}
                  className="w-full text-xs pl-9 pr-12 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24]"
                />
                {formData.correctedLinkedIn && (
                  <a
                    href={
                      formData.correctedLinkedIn.startsWith('http')
                        ? formData.correctedLinkedIn
                        : `https://${formData.correctedLinkedIn}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2 top-2 p-1 text-slate-400 hover:text-[#A83B24]"
                    title="Test LinkedIn Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Location Grid (City, State, Country, Pincode) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected City
                </label>
                <input
                  id="input-corrected-city"
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={formData.correctedCity}
                  onChange={(e) => handleFieldChange('correctedCity', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected State
                </label>
                <input
                  id="input-corrected-state"
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={formData.correctedState}
                  onChange={(e) => handleFieldChange('correctedState', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Country
                </label>
                <input
                  id="input-corrected-country"
                  type="text"
                  placeholder="e.g. India"
                  value={formData.correctedCountry}
                  onChange={(e) => handleFieldChange('correctedCountry', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Pincode
                </label>
                <input
                  id="input-corrected-pincode"
                  type="text"
                  placeholder="e.g. 560001"
                  value={formData.correctedPincode}
                  onChange={(e) => handleFieldChange('correctedPincode', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-mono"
                />
              </div>
            </div>

            {/* Sources & Audit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Source Checked <span className="text-rose-500">*</span>
                  </label>
                  {formData.sourceChecked && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('sourceChecked', '')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline font-normal cursor-pointer"
                    >
                      Clear (Blank)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-source-checked-true"
                    onClick={() => handleFieldChange('sourceChecked', 'TRUE')}
                    className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      (formData.sourceChecked || '').toUpperCase() === 'TRUE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                        : `bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 ${
                            validationErrors.sourceChecked
                              ? 'border-rose-400 bg-rose-50/20'
                              : 'border-slate-300'
                          }`
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>TRUE</span>
                  </button>
                  <button
                    type="button"
                    id="btn-source-checked-false"
                    onClick={() => handleFieldChange('sourceChecked', 'FALSE')}
                    className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      (formData.sourceChecked || '').toUpperCase() === 'FALSE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20'
                        : `bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 ${
                            validationErrors.sourceChecked
                              ? 'border-rose-400 bg-rose-50/20'
                              : 'border-slate-300'
                          }`
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>FALSE</span>
                  </button>
                </div>
                {validationErrors.sourceChecked ? (
                  <p className="text-[11.5px] text-rose-600 font-medium mt-1.5 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationErrors.sourceChecked}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Default is blank. Choose TRUE or FALSE to verify.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Source <span className="text-slate-400 font-normal">(from Sheet)</span>{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="select-primary-source"
                    value={formData.primarySource}
                    onChange={(e) => handleFieldChange('primarySource', e.target.value)}
                    className={`w-full text-xs px-3 py-2.5 bg-white border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-medium ${
                      validationErrors.primarySource
                        ? 'border-rose-400 ring-1 ring-rose-300 bg-rose-50/20'
                        : 'border-slate-300'
                    }`}
                  >
                    <option value="">-- Select Primary Source from Sheet (Required *) --</option>
                    {availablePrimarySources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                    {availablePrimarySources.length === 0 && (
                      <option value="" disabled>
                        No primary source values found in Sheet yet
                      </option>
                    )}
                  </select>
                </div>
                {validationErrors.primarySource ? (
                  <p className="text-[11.5px] text-rose-600 font-medium mt-1.5 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationErrors.primarySource}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct values populated from the connected Google Sheet.
                  </p>
                )}
              </div>
            </div>

            {/* Any Remark */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Any Remark / Notes
              </label>
              <textarea
                id="textarea-any-remark"
                rows={2}
                placeholder="Add verification justification, phone confirmation notes, or discrepancies..."
                value={formData.anyRemark}
                onChange={(e) => handleFieldChange('anyRemark', e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24]"
              />
            </div>

            {/* Mandatory Validation Errors Banner */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Please complete all mandatory fields before saving:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-rose-700 text-[11.5px] font-medium">
                  {validationErrors.verificationStatus && (
                    <li>{validationErrors.verificationStatus}</li>
                  )}
                  {validationErrors.sourceChecked && (
                    <li>{validationErrors.sourceChecked}</li>
                  )}
                  {validationErrors.primarySource && (
                    <li>{validationErrors.primarySource}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Bottom Form Actions: Combined Save to Sheet & Next Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center space-x-2">
                {hasChanges ? (
                  <span className="text-[#A83B24] font-medium flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-[#A83B24]" />
                    <span>Edits ready to push to Google Sheet</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Values matched with Sheet</span>
                )}
              </div>

              <div className="w-full sm:w-auto">
                <button
                  type="submit"
                  id="btn-save-and-next"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 text-xs font-bold text-white bg-[#A83B24] hover:bg-[#912F1B] active:bg-[#7D2816] rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#A83B24] focus:ring-offset-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Saving to Sheet...'
                      : hasNext
                      ? 'Save to Sheet & Next'
                      : 'Save to Sheet (Final Record)'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Draggable Divider between form and search panel (Standard Mode) */}
        {isSearchOpen && !isSearchMaximized && !isSearchTaller && (
          <div
            onMouseDown={startSearchResize}
            onDoubleClick={() => handleSetSearchWidthPercent(52)}
            title="Drag to resize search window width (double-click to reset 52%)"
            className="w-1.5 hover:w-2.5 bg-slate-200 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize z-20 shrink-0 transition-all flex items-center justify-center select-none group"
          >
            <div className="w-0.5 h-8 bg-slate-400 group-hover:bg-white rounded-full transition-colors" />
          </div>
        )}

        {/* In-Window Google Search Panel (Standard Height Mode) */}
        {isSearchOpen && !isSearchTaller && (
          <InWindowSearchPanel
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            alumniName={record.fullName || 'Alumni'}
            defaultQuery={defaultSearchQuery}
            customSearchUrl={record.searchUrl}
            isMaximized={isSearchMaximized}
            onToggleMaximize={() => setIsSearchMaximized((prev) => !prev)}
            isTaller={isSearchTaller}
            onToggleTaller={handleToggleSearchTaller}
            widthPercent={searchWidthPercent}
            onSetWidthPercent={handleSetSearchWidthPercent}
          />
        )}
      </div>

      {/* In-Window Google Search Panel (Taller Full-Height Mode - spans vertically over top identity bar) */}
      {isSearchOpen && isSearchTaller && (
        <>
          {!isSearchMaximized && (
            <div
              onMouseDown={startSearchResize}
              onDoubleClick={() => handleSetSearchWidthPercent(52)}
              style={{ right: `${searchWidthPercent}%` }}
              title="Drag to resize search window width (double-click to reset 52%)"
              className="absolute inset-y-0 w-2 -mr-1 hover:w-3.5 bg-blue-400/20 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize z-40 transition-all flex items-center justify-center select-none group"
            >
              <div className="w-0.5 h-10 bg-blue-500 group-hover:bg-white rounded-full shadow-xs" />
            </div>
          )}
          <InWindowSearchPanel
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            alumniName={record.fullName || 'Alumni'}
            defaultQuery={defaultSearchQuery}
            customSearchUrl={record.searchUrl}
            isMaximized={isSearchMaximized}
            onToggleMaximize={() => setIsSearchMaximized((prev) => !prev)}
            isTaller={isSearchTaller}
            onToggleTaller={handleToggleSearchTaller}
            widthPercent={searchWidthPercent}
            onSetWidthPercent={handleSetSearchWidthPercent}
          />
        </>
      )}
    </div>
  );
};
