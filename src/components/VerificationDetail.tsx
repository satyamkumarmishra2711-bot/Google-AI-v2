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
  ClipboardPaste,
  X,
  ShieldCheck,
  ShieldAlert,
  Linkedin,
} from 'lucide-react';
import { AlumniRecord, EditableFields } from '../types';
import { InWindowSearchPanel } from './InWindowSearchPanel';
import {
  parseSearchSnippet,
  parseLocationParts,
  parseLinkedInExperienceText,
} from '../utils/searchSnippetParser';

interface VerificationDetailProps {
  record: AlumniRecord | null;
  onSave: (updates: EditableFields, andNext: boolean, syncMode?: 'all' | 'l0' | 'l1') => Promise<void>;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isSaving: boolean;
  primarySourceOptions?: string[];
  isL1ApproverMode?: boolean;
  userEmail?: string;
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
  isL1ApproverMode = false,
  userEmail = '',
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
    actionDate: '',
    anyRemark: '',
    l1Review: '',
    l1Comment: '',
    l1VerificationDate: '',
    verifiedBy: '',
    sentForUpdate: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchMaximized, setIsSearchMaximized] = useState(false);

  // 1-Click Auto-Paste from AI Window State
  const [isAiPasteModalOpen, setIsAiPasteModalOpen] = useState(false);
  const [aiPasteInputText, setAiPasteInputText] = useState('');
  const [aiPasteToast, setAiPasteToast] = useState<string | null>(null);

  // 1-Click Auto-Paste from LinkedIn State
  const [isLinkedInPasteModalOpen, setIsLinkedInPasteModalOpen] = useState(false);
  const [linkedInPasteInputText, setLinkedInPasteInputText] = useState('');

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
    // Include standard search/web sources so user can always pick Google Search or LinkedIn
    set.add('Google Search');
    set.add('LinkedIn');
    if (primarySourceOptions) {
      primarySourceOptions.forEach((s) => {
        if (s && s.trim()) set.add(s.trim());
      });
    }
    if (record?.primarySource && record.primarySource.trim()) {
      set.add(record.primarySource.trim());
    }
    if (formData.primarySource && formData.primarySource.trim()) {
      set.add(formData.primarySource.trim());
    }
    return Array.from(set).sort();
  }, [primarySourceOptions, record?.primarySource, formData.primarySource]);

  // Flash highlight animation when a field is populated from Google Search
  const [justUpdatedField, setJustUpdatedField] = useState<string | null>(null);

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
        actionDate: record.actionDate || '',
        anyRemark: record.anyRemark || '',
        l1Review: record.l1Review || '',
        l1Comment: record.l1Comment || '',
        l1VerificationDate: record.l1VerificationDate || '',
        verifiedBy: record.verifiedBy || '',
        sentForUpdate: record.sentForUpdate || '',
      });
      setHasChanges(false);
      setValidationErrors({});
    }
  }, [record?.customId, record?.rowIndex]);

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

  // Direct handlers for Google Search panel copy / transfer
  const handleApplyFieldFromSearch = (field: keyof EditableFields, value: string) => {
    handleFieldChange(field, value);
    setJustUpdatedField(field);
    setTimeout(() => {
      setJustUpdatedField((curr) => (curr === field ? null : curr));
    }, 2800);
  };

  const handleApplyMultipleFieldsFromSearch = (updates: Partial<EditableFields>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
    setHasChanges(true);
    setValidationErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((k) => delete next[k]);
      return next;
    });
    setJustUpdatedField('all');
    setTimeout(() => {
      setJustUpdatedField((curr) => (curr === 'all' ? null : curr));
    }, 2800);
  };

  const showAiToast = (msg: string) => {
    setAiPasteToast(msg);
    setTimeout(() => {
      setAiPasteToast(null);
    }, 5000);
  };

  const processAndApplyAiText = (rawText: string): boolean => {
    if (!rawText || !rawText.trim()) return false;
    const parsed = parseSearchSnippet(rawText, record?.fullName);
    const updates: Partial<EditableFields> = {};

    if (parsed.designation) updates.correctedDesignation = parsed.designation;
    if (parsed.company) updates.correctedCompany = parsed.company;
    if (parsed.linkedInUrl) updates.correctedLinkedIn = parsed.linkedInUrl;
    if (parsed.city) updates.correctedCity = parsed.city;
    if (parsed.state) updates.correctedState = parsed.state;
    if (parsed.country) updates.correctedCountry = parsed.country;
    if (parsed.pincode) updates.correctedPincode = parsed.pincode;

    // Automatically set verification source and sourceChecked = TRUE
    updates.sourceChecked = 'TRUE';
    if (parsed.linkedInUrl) {
      updates.primarySource = 'LinkedIn';
    } else {
      updates.primarySource = 'Google Search';
    }

    const modifiedKeys = Object.keys(updates).filter(
      (k) => k !== 'sourceChecked' && k !== 'primarySource'
    );

    if (modifiedKeys.length > 0) {
      handleApplyMultipleFieldsFromSearch(updates);

      const items: string[] = [];
      if (parsed.designation) items.push(`Designation: "${parsed.designation}"`);
      if (parsed.company) items.push(`Company: "${parsed.company}"`);
      if (parsed.city || parsed.state || parsed.country) {
        items.push(
          `Location: "${[parsed.city, parsed.state, parsed.country].filter(Boolean).join(', ')}"`
        );
      }
      if (parsed.linkedInUrl) items.push('LinkedIn URL attached');

      showAiToast(`✓ Extracted & Pasted to Form: ${items.join(' • ')}`);
      return true;
    }
    return false;
  };

  const handleOneClickPasteFromAi = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const success = processAndApplyAiText(clipText);
          if (success) return;
        }
      }
    } catch {
      // Direct clipboard API may be restricted in iframe
    }
    setIsAiPasteModalOpen(true);
  };

  const processAndApplyLinkedInText = (rawText: string): boolean => {
    if (!rawText || !rawText.trim()) return false;
    const parsed = parseLinkedInExperienceText(rawText) || parseSearchSnippet(rawText, record?.fullName);
    if (!parsed) return false;

    const updates: Partial<EditableFields> = {};

    if (parsed.designation) updates.correctedDesignation = parsed.designation;
    if (parsed.company) updates.correctedCompany = parsed.company;
    if (parsed.linkedInUrl) updates.correctedLinkedIn = parsed.linkedInUrl;
    if (parsed.city) updates.correctedCity = parsed.city;
    if (parsed.state) updates.correctedState = parsed.state;
    if (parsed.country) updates.correctedCountry = parsed.country;
    if (parsed.pincode) updates.correctedPincode = parsed.pincode;

    // Automatically set verification source and sourceChecked = TRUE
    updates.sourceChecked = 'TRUE';
    updates.primarySource = 'LinkedIn';

    const modifiedKeys = Object.keys(updates).filter(
      (k) => k !== 'sourceChecked' && k !== 'primarySource'
    );

    if (modifiedKeys.length > 0) {
      handleApplyMultipleFieldsFromSearch(updates);

      const items: string[] = [];
      if (parsed.designation) items.push(`Designation: "${parsed.designation}"`);
      if (parsed.company) items.push(`Company: "${parsed.company}"`);
      if (parsed.city || parsed.state || parsed.country) {
        items.push(
          `Location: "${[parsed.city, parsed.state, parsed.country].filter(Boolean).join(', ')}"`
        );
      }
      if (parsed.linkedInUrl) items.push('LinkedIn URL attached');

      showAiToast(`✓ LinkedIn Data Extracted: ${items.join(' • ')}`);
      return true;
    }
    return false;
  };

  const handleOneClickPasteFromLinkedIn = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const success = processAndApplyLinkedInText(clipText);
          if (success) return;
        }
      }
    } catch {
      // Direct clipboard API may be restricted in iframe
    }
    setIsLinkedInPasteModalOpen(true);
  };

  const handleCopyExisting = () => {
    if (!record) return;
    setFormData((prev) => ({
      ...prev,
      correctedDesignation: record.existingDesignation || prev.correctedDesignation,
      correctedCompany: record.existingOrganization || prev.correctedCompany,
      correctedLinkedIn: record.existingLinkedIn || prev.correctedLinkedIn,
    }));
    setHasChanges(true);
  };

  const handleCopyLocationSeparated = () => {
    if (!record || !record.aiLocation) return;
    const locParts = parseLocationParts(record.aiLocation);
    setFormData((prev) => ({
      ...prev,
      correctedCity: locParts.city || prev.correctedCity,
      correctedState: locParts.state || prev.correctedState,
      correctedCountry: locParts.country || prev.correctedCountry,
      correctedPincode: record.aiPincode || locParts.pincode || prev.correctedPincode,
    }));
    setHasChanges(true);
    const summary = [
      locParts.city ? `City: "${locParts.city}"` : null,
      locParts.state ? `State: "${locParts.state}"` : null,
      locParts.country ? `Country: "${locParts.country}"` : null,
    ]
      .filter(Boolean)
      .join(' • ');
    showAiToast(`✓ Added to separate cells: ${summary || 'Location parsed'}`);
  };

  const handleCopyAI = () => {
    if (!record) return;
    const locParts = parseLocationParts(record.aiLocation || '');
    setFormData((prev) => ({
      ...prev,
      correctedDesignation: record.aiDesignation || prev.correctedDesignation,
      correctedCompany: record.aiCompany || prev.correctedCompany,
      correctedLinkedIn: record.aiLinkedIn || prev.correctedLinkedIn,
      correctedCity: locParts.city || prev.correctedCity,
      correctedState: locParts.state || prev.correctedState,
      correctedCountry: locParts.country || prev.correctedCountry,
      correctedPincode: record.aiPincode || locParts.pincode || prev.correctedPincode,
      sourceChecked: prev.sourceChecked || '',
      primarySource: prev.primarySource || (availablePrimarySources[0] || ''),
    }));
    setHasChanges(true);
    showAiToast('✓ Copied AI data: City, State, and Country added to separate cells');
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
        actionDate: record.actionDate || '',
        anyRemark: record.anyRemark || '',
        l1Review: record.l1Review || '',
        l1Comment: record.l1Comment || '',
      });
      setHasChanges(false);
      setValidationErrors({});
    }
  };

  const [activeSyncMode, setActiveSyncMode] = useState<'l0' | 'l1' | null>(null);

  const isStatusVerified =
    (formData.verificationStatus || '').toLowerCase().includes('veri') ||
    (formData.verificationStatus || '').toLowerCase() === 'approved' ||
    (record?.verificationStatus || '').toLowerCase().includes('veri') ||
    (record?.verificationStatus || '').toLowerCase() === 'approved';

  const validateL0Form = (): boolean => {
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

  const validateL1Form = (): boolean => {
    const errors: Record<string, string> = {};
    if (!isStatusVerified) {
      errors.l1Review =
        'L1 Sheet Sync is disabled. The record must be marked as Verified before L1 review can be synced.';
      setValidationErrors(errors);
      return false;
    }
    const l1Review = (formData.l1Review || '').trim();
    if (!l1Review) {
      errors.l1Review =
        'L1_Review decision is mandatory for L1 Sync. Please select Approved, Sent back, or Escalated.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // L0 Sheet Sync Action: Only syncs L0 fields, never touches L1 columns
  const handleSaveL0AndNext = async () => {
    if (!validateL0Form()) {
      return;
    }
    setActiveSyncMode('l0');
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const statusLower = (formData.verificationStatus || '').toLowerCase();
    const isMarked =
      statusLower.includes('veri') ||
      statusLower === 'approved' ||
      statusLower.includes('flag') ||
      statusLower.includes('reject');

    let resolvedActionDate = formData.actionDate || record?.actionDate || '';
    if (isMarked && !resolvedActionDate) {
      resolvedActionDate = todayStr;
    }

    const payload: EditableFields = {
      ...formData,
      verificationStatus: formData.verificationStatus || 'Pending',
      actionDate: resolvedActionDate,
    };

    try {
      await onSave(payload, true, 'l0');
      setHasChanges(false);
      setValidationErrors({});
    } finally {
      setActiveSyncMode(null);
    }
  };

  // L1 Sheet Sync Action: Only syncs L1 fields, never touches L0 columns
  const handleSaveL1AndNext = async () => {
    if (!validateL1Form()) {
      return;
    }
    setActiveSyncMode('l1');
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const payload: EditableFields = {
      ...formData,
      l1Review: formData.l1Review || 'Approved',
      l1Comment: formData.l1Comment || '',
      l1VerificationDate: formData.l1VerificationDate || todayStr,
      verifiedBy: formData.verifiedBy || userEmail || 'Logged-in user',
    };

    try {
      await onSave(payload, true, 'l1');
      setHasChanges(false);
      setValidationErrors({});
    } finally {
      setActiveSyncMode(null);
    }
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
              {record.actionDate && (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  • Action Date: <strong className="font-semibold">{record.actionDate}</strong>
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
                  <div className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100/80">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-indigo-950 uppercase tracking-wider">
                        AI Location
                      </span>
                      {record.aiLocation && (
                        <button
                          type="button"
                          id="btn-add-ai-location-sep"
                          onClick={handleCopyLocationSeparated}
                          title="Parse comma-separated location into separate City, State, Country cells"
                          className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200 shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0"
                        >
                          <Copy className="w-2.5 h-2.5 text-indigo-600" />
                          <span>Add to Separate Cells</span>
                        </button>
                      )}
                    </div>
                    <p className="text-slate-800 text-xs font-medium mt-1 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate">{record.aiLocation || '—'}</span>
                    </p>
                    {record.aiLocation && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[9.5px]">
                        {(() => {
                          const parsed = parseLocationParts(record.aiLocation);
                          return (
                            <>
                              {parsed.city && (
                                <span className="bg-white/90 text-slate-700 px-1 py-0.2 rounded border border-indigo-100">
                                  City: <strong className="text-indigo-950">{parsed.city}</strong>
                                </span>
                              )}
                              {parsed.state && (
                                <span className="bg-white/90 text-slate-700 px-1 py-0.2 rounded border border-indigo-100">
                                  State: <strong className="text-indigo-950">{parsed.state}</strong>
                                </span>
                              )}
                              {parsed.country && (
                                <span className="bg-white/90 text-slate-700 px-1 py-0.2 rounded border border-indigo-100">
                                  Country: <strong className="text-indigo-950">{parsed.country}</strong>
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
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

            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
              {/* 1-Click Auto-Paste from AI Window Button */}
              <button
                type="button"
                id="btn-card3-paste-ai"
                onClick={handleOneClickPasteFromAi}
                className="text-xs font-bold text-white bg-gradient-to-r from-[#A83B24] to-[#C84B34] hover:from-[#8f321e] hover:to-[#B33E27] flex items-center space-x-1.5 px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                title="1-Click: Reads copied AI window response, extracts Designation, Company & Location, and auto-fills this form"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                <span>✨ 1-Click Paste from AI Window</span>
              </button>

              {/* 1-Click Paste from LinkedIn Button */}
              <button
                type="button"
                id="btn-card3-paste-linkedin"
                onClick={handleOneClickPasteFromLinkedIn}
                className="text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#004182] flex items-center space-x-1.5 px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                title="1-Click: Reads copied LinkedIn experience text, extracts Designation, Company & Location, and auto-fills this form"
              >
                <Linkedin className="w-3.5 h-3.5 text-white shrink-0" />
                <span>💼 1-Click Paste from LinkedIn</span>
              </button>

              {hasChanges && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-500 hover:text-[#A83B24] flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-[#EAE1DA] hover:bg-[#FAF0ED] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Changes</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Response Applied Notification Toast Banner */}
          {aiPasteToast && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-900 font-medium animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-center space-x-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{aiPasteToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiPasteToast(null)}
                className="text-emerald-700 hover:text-emerald-900 ml-2 text-xs font-semibold cursor-pointer underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveL0AndNext();
            }}
            className="space-y-5"
          >
            {/* Role & Company Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Corrected Designation <span className="text-rose-500">*</span>
                  </label>
                  {(justUpdatedField === 'correctedDesignation' || justUpdatedField === 'all') && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded animate-pulse">
                      ✓ Copied from Search
                    </span>
                  )}
                </div>
                <input
                  id="input-corrected-designation"
                  type="text"
                  placeholder="e.g. Senior Vice President, Engineering"
                  value={formData.correctedDesignation}
                  onChange={(e) => handleFieldChange('correctedDesignation', e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-medium transition-all duration-300 ${
                    justUpdatedField === 'correctedDesignation' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Corrected Company <span className="text-rose-500">*</span>
                  </label>
                  {(justUpdatedField === 'correctedCompany' || justUpdatedField === 'all') && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded animate-pulse">
                      ✓ Copied from Search
                    </span>
                  )}
                </div>
                <input
                  id="input-corrected-company"
                  type="text"
                  placeholder="e.g. Google India Pvt Ltd"
                  value={formData.correctedCompany}
                  onChange={(e) => handleFieldChange('correctedCompany', e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-medium transition-all duration-300 ${
                    justUpdatedField === 'correctedCompany' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Corrected LinkedIn Profile URL
                </label>
                {(justUpdatedField === 'correctedLinkedIn' || justUpdatedField === 'all') && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded animate-pulse">
                    ✓ Copied from Search
                  </span>
                )}
              </div>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="input-corrected-linkedin"
                  type="text"
                  placeholder="https://www.linkedin.com/in/username"
                  value={formData.correctedLinkedIn}
                  onChange={(e) => handleFieldChange('correctedLinkedIn', e.target.value)}
                  className={`w-full text-xs pl-9 pr-12 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] transition-all duration-300 ${
                    justUpdatedField === 'correctedLinkedIn' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Corrected City
                  </label>
                  {(justUpdatedField === 'correctedCity' || justUpdatedField === 'all') && (
                    <span className="text-[9px] font-bold text-emerald-700">✓ Search</span>
                  )}
                </div>
                <input
                  id="input-corrected-city"
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={formData.correctedCity}
                  onChange={(e) => handleFieldChange('correctedCity', e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] transition-all duration-300 ${
                    justUpdatedField === 'correctedCity' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
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
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] transition-all duration-300 ${
                    justUpdatedField === 'correctedState' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
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
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] transition-all duration-300 ${
                    justUpdatedField === 'correctedCountry' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
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
                  className={`w-full text-xs px-3 py-2 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83B24] focus:border-[#A83B24] font-mono transition-all duration-300 ${
                    justUpdatedField === 'correctedPincode' || justUpdatedField === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/40'
                      : 'border-slate-300'
                  }`}
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

            {/* Verification Status Selector */}
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

              {/* L0 Sheet Sync & Next Button placed directly after Any Remark / Notes */}
              <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
                <div className="text-xs text-slate-600 flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">L0 Action:</span>
                  {hasChanges ? (
                    <span className="text-[#A83B24] font-medium flex items-center space-x-1 text-[11.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A83B24]" />
                      <span>Edits ready to sync to Sheet</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11.5px]">Synced</span>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-l0-sheet-sync"
                  onClick={handleSaveL0AndNext}
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-[#A83B24] hover:bg-[#912F1B] active:bg-[#7D2816] rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#A83B24] focus:ring-offset-2 cursor-pointer"
                  title="Sync L0 verification details & corrected fields to Google Sheet (never alters L1 columns)"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving && activeSyncMode === 'l0'
                      ? 'Syncing L0...'
                      : hasNext
                      ? 'L0 Sheet Sync & Next'
                      : 'L0 Sheet Sync'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Separate Section ONLY for Verified Records: L1 Approver Review */}
            {isStatusVerified ? (
              <div
                id="section-l1-approver"
                className="p-4 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 border-2 border-indigo-200/90 rounded-xl space-y-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          L1 Approver Review & Approval
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Verified Records Only
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500">
                        Review verified alumni information, set L1 decision, and record review comments.
                      </p>
                    </div>
                  </div>

                  {formData.l1Review && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border flex items-center space-x-1 ${
                        formData.l1Review === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : formData.l1Review === 'Sent back'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : formData.l1Review === 'Escalated'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>L1 Status: {formData.l1Review}</span>
                    </span>
                  )}
                </div>

                {/* L1_Review Dropdown & Quick 1-Click Selectors */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="select-l1-review"
                      className="block text-xs font-bold text-slate-800"
                    >
                      L1_Review <span className="text-slate-400 font-normal">(Decision Dropdown)</span>
                    </label>
                    {formData.l1Review && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange('l1Review', '')}
                        className="text-[10.5px] text-slate-400 hover:text-slate-600 underline font-normal cursor-pointer"
                      >
                        Reset Selection
                      </button>
                    )}
                  </div>

                  {/* Quick Decision Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      id="btn-l1-approved"
                      onClick={() => handleFieldChange('l1Review', 'Approved')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formData.l1Review === 'Approved'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Approved</span>
                    </button>

                    <button
                      type="button"
                      id="btn-l1-sent-back"
                      onClick={() => handleFieldChange('l1Review', 'Sent back')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formData.l1Review === 'Sent back'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-700 border-slate-300'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Sent back</span>
                    </button>

                    <button
                      type="button"
                      id="btn-l1-escalated"
                      onClick={() => handleFieldChange('l1Review', 'Escalated')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formData.l1Review === 'Escalated'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                          : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border-slate-300'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Escalated</span>
                    </button>
                  </div>

                  {/* Dropdown for L1_Review */}
                  <select
                    id="select-l1-review"
                    value={formData.l1Review || ''}
                    onChange={(e) => handleFieldChange('l1Review', e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Select L1_Review (Approved, Sent back, Escalated) --</option>
                    <option value="Approved">Approved</option>
                    <option value="Sent back">Sent back</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>

                {/* L1 Comment Text Field */}
                <div>
                  <label
                    htmlFor="textarea-l1-comment"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    L1 Comment <span className="text-slate-400 font-normal">(Text field for L1 notes & feedback)</span>
                  </label>
                  <textarea
                    id="textarea-l1-comment"
                    rows={2}
                    placeholder="Enter L1 Approver comment, reason for sending back, or escalation justification..."
                    value={formData.l1Comment || ''}
                    onChange={(e) => handleFieldChange('l1Comment', e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-normal"
                  />
                </div>

                {/* L1 Auto-Audit Metadata info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-indigo-200/60 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-600">L1 Verification Date:</span>
                      <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50 font-medium">
                        {formData.l1VerificationDate || new Date().toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-600">Verified By:</span>
                      <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50 font-medium max-w-[200px] truncate" title={formData.verifiedBy || userEmail || 'Logged-in user'}>
                        {formData.verifiedBy || userEmail || 'Logged-in user'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                id="section-l1-locked"
                className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-between text-xs text-slate-500"
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>L1 Approver Section</strong> is enabled for records marked as{' '}
                    <span className="font-semibold text-emerald-700">Verified</span>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldChange('verificationStatus', 'Verified')}
                  className="text-[11px] font-semibold text-[#A83B24] hover:underline cursor-pointer"
                >
                  Set to Verified
                </button>
              </div>
            )}

            {/* Mandatory Validation Errors Banner */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Please complete mandatory fields before syncing:</span>
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
                  {validationErrors.l1Review && (
                    <li>{validationErrors.l1Review}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Bottom Form Actions: Dedicated L1 Sheet Sync Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center space-x-2">
                <span className="text-slate-400">Values synchronized with Sheet</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* L1 Sheet Sync */}
                <button
                  type="button"
                  id="btn-l1-sheet-sync"
                  onClick={handleSaveL1AndNext}
                  disabled={isSaving || !isStatusVerified}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    !isStatusVerified
                      ? 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 shadow-none'
                      : 'text-white bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 cursor-pointer hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={
                    !isStatusVerified
                      ? 'L1 Sheet Sync is disabled. Record must be marked as Verified first.'
                      : 'Sync L1 Review decision, comment, and verified by to Google Sheet (never alters L0 columns)'
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSaving && activeSyncMode === 'l1'
                      ? 'Syncing L1...'
                      : hasNext
                      ? 'L1 Sheet Sync & Next'
                      : 'L1 Sheet Sync'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
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
            onApplyField={handleApplyFieldFromSearch}
            onApplyMultipleFields={handleApplyMultipleFieldsFromSearch}
            currentFormData={formData}
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
            onApplyField={handleApplyFieldFromSearch}
            onApplyMultipleFields={handleApplyMultipleFieldsFromSearch}
            currentFormData={formData}
          />
        </>
      )}

      {/* 1-Click AI Response Paste Modal Dialog */}
      {isAiPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#A83B24] to-[#C84B34] px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <h3 className="text-sm font-bold">1-Click Paste from AI Window</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPasteModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste the text copied from Google Search or AI Overview. The parser automatically extracts relevant attributes (Designation, Company, Location, LinkedIn) and populates the Google Sheet verification form in 1 click.
              </p>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Sample AI Format:
                </span>
                Current Designation: Lead Senior Verification EngineerCurrent Company: QualcommCurrent Location: Khagaria, Bihar, India
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Paste AI Text (Ctrl+V)
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={aiPasteInputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAiPasteInputText(val);
                    if (
                      val &&
                      (val.includes('Current Designation:') ||
                        val.includes('Current Company:') ||
                        val.includes('Current Location:'))
                    ) {
                      const success = processAndApplyAiText(val);
                      if (success) {
                        setIsAiPasteModalOpen(false);
                        setAiPasteInputText('');
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted) {
                      const success = processAndApplyAiText(pasted);
                      if (success) {
                        e.preventDefault();
                        setIsAiPasteModalOpen(false);
                        setAiPasteInputText('');
                      }
                    }
                  }}
                  placeholder="Press Ctrl+V here to paste the AI response text..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A83B24] font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiPasteModalOpen(false);
                    setAiPasteInputText('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (aiPasteInputText) {
                      const success = processAndApplyAiText(aiPasteInputText);
                      if (success) {
                        setIsAiPasteModalOpen(false);
                        setAiPasteInputText('');
                      }
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#A83B24] hover:bg-[#8f321e] rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Extract & Paste to Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click LinkedIn Experience Paste Modal Dialog */}
      {isLinkedInPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0A66C2] px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Linkedin className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold">1-Click Paste from LinkedIn</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLinkedInPasteModalOpen(false);
                  setLinkedInPasteInputText('');
                }}
                className="text-white/80 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste the experience text copied from LinkedIn. The parser automatically extracts the <strong>Designation</strong>, <strong>Company</strong>, <strong>Location (City/State/Country)</strong>, sets <strong>Primary Source to LinkedIn</strong>, and sets <strong>Source Checked to TRUE</strong> in 1 click.
              </p>

              <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-slate-700 font-mono leading-relaxed space-y-1.5">
                <span className="text-blue-900 block text-[10px] uppercase font-bold">
                  Supported LinkedIn Formats (Single or Multi-Position):
                </span>
                <div className="text-[10px] text-slate-600 bg-white/80 p-1.5 rounded border border-blue-100">
                  <span className="font-semibold text-blue-800">Multi-Role at Company:</span><br />
                  Bain & Company<br />
                  Full-time · 3 yrs<br />
                  Consultant<br />
                  Jul 2025 - Present · 1 yr 3 mos<br />
                  Senior Associate Consultant<br />
                  Mumbai, Maharashtra, India · On-site
                </div>
                <div className="text-[10px] text-slate-600 bg-white/80 p-1.5 rounded border border-blue-100">
                  <span className="font-semibold text-blue-800">Single-Role:</span><br />
                  Principal DSP Engineer<br />
                  Airspan Networks · Full-time<br />
                  Feb 2006 - Present · 20 yrs 8 mos<br />
                  United Kingdom · Hybrid
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Paste LinkedIn Text (Ctrl+V)
                </label>
                <textarea
                  autoFocus
                  rows={5}
                  value={linkedInPasteInputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedInPasteInputText(val);
                    if (val && (val.includes('\n') || val.includes('·') || val.includes('Present'))) {
                      const success = processAndApplyLinkedInText(val);
                      if (success) {
                        setIsLinkedInPasteModalOpen(false);
                        setLinkedInPasteInputText('');
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted) {
                      const success = processAndApplyLinkedInText(pasted);
                      if (success) {
                        e.preventDefault();
                        setIsLinkedInPasteModalOpen(false);
                        setLinkedInPasteInputText('');
                      }
                    }
                  }}
                  placeholder="Press Ctrl+V here to paste the LinkedIn experience text..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2] font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkedInPasteModalOpen(false);
                    setLinkedInPasteInputText('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (linkedInPasteInputText) {
                      const success = processAndApplyLinkedInText(linkedInPasteInputText);
                      if (success) {
                        setIsLinkedInPasteModalOpen(false);
                        setLinkedInPasteInputText('');
                      }
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#004182] rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Linkedin className="w-3.5 h-3.5 text-white" />
                  <span>Extract & Paste to Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
