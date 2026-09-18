import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken,
} from './services/firebaseAuth';
import {
  fetchSheetRows,
  fetchSheetMetadata,
  updateRecordInSheet,
  checkRowConflict,
  SheetHeaderMap,
} from './services/googleSheets';
import {
  AlumniRecord,
  EditableFields,
  FilterState,
  SheetConfig,
  StatusCounts,
  TodayActionsCount,
  TodayL1ActionsCount,
  ConflictDetails,
  SortOption,
} from './types';
import {
  loadSavedSheetConfig,
  persistSheetConfig,
} from './config/sheetConfigStorage';

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isDateToday = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.trim();
  if (!clean) return false;

  const d = new Date();
  const todayYear = d.getFullYear();
  const todayMonth = d.getMonth();
  const todayDate = d.getDate();
  const todayISO = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

  if (clean.startsWith(todayISO)) return true;

  // DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    if (year === todayYear && month === todayMonth && day === todayDate) {
      return true;
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    if (year === todayYear && month === todayMonth && day === todayDate) {
      return true;
    }
  }

  // General Date parse fallback
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const parsedDate = new Date(parsed);
    if (
      parsedDate.getFullYear() === todayYear &&
      parsedDate.getMonth() === todayMonth &&
      parsedDate.getDate() === todayDate
    ) {
      return true;
    }
  }

  return false;
};

const loadTodayActionsMap = (): Record<string, { status: string; date: string }> => {
  try {
    const raw = localStorage.getItem('alumni_actions_today_v1');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const today = getTodayDateStr();
    const valid: Record<string, { status: string; date: string }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && (v as any).date === today) {
        valid[k] = v as any;
      }
    }
    return valid;
  } catch {
    return {};
  }
};

const loadTodayL1ActionsMap = (): Record<string, { l1Review: string; date: string }> => {
  try {
    const raw = localStorage.getItem('alumni_l1_actions_today_v1');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const today = getTodayDateStr();
    const valid: Record<string, { l1Review: string; date: string }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && (v as any).date === today) {
        valid[k] = v as any;
      }
    }
    return valid;
  } catch {
    return {};
  }
};
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AlumniList } from './components/AlumniList';
import { VerificationDetail } from './components/VerificationDetail';
import { SheetConfigModal } from './components/SheetConfigModal';
import { ConflictModal } from './components/ConflictModal';
import { usePanelResize } from './hooks/usePanelResize';
import {
  FileSpreadsheet,
  AlertCircle,
  LogIn,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setToken] = useState<string | null>(getAccessToken());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Sheet configuration state (with dual storage persistence)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(loadSavedSheetConfig);
  const [sheetTitle, setSheetTitle] = useState<string>('');

  // Data & loading state
  const [records, setRecords] = useState<AlumniRecord[]>([]);
  const [headerMap, setHeaderMap] = useState<SheetHeaderMap | null>(null);
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    pending: 0,
    verified: 0,
    flagged: 0,
    rejected: 0,
  });

  // Track actions (Verified or Flagged) marked today
  const [localTodayActionsMap, setLocalTodayActionsMap] = useState<
    Record<string, { status: string; date: string }>
  >(loadTodayActionsMap);

  // Track L1 actions (Approved, Sent back, Escalated) marked today
  const [localTodayL1ActionsMap, setLocalTodayL1ActionsMap] = useState<
    Record<string, { l1Review: string; date: string }>
  >(loadTodayL1ActionsMap);

  const todayActions = useMemo<TodayActionsCount>(() => {
    const map: Record<string, { status: string; date: string }> = { ...localTodayActionsMap };
    const today = getTodayDateStr();

    // Calculate Actions Today strictly from sheet records matching Column "Action Date" (excluding L1 actions)
    records.forEach((r) => {
      const key = r.customId || r.rollNumber || String(r.rowIndex);
      if (!map[key] && isDateToday(r.actionDate || '')) {
        const s = (r.verificationStatus || '').toLowerCase();
        if (s.includes('veri') || s === 'approved') {
          map[key] = { status: 'Verified', date: today };
        } else if (s.includes('flag') || s.includes('review') || s.includes('hold')) {
          map[key] = { status: 'Flagged', date: today };
        }
      }
    });

    let verified = 0;
    let flagged = 0;
    for (const item of Object.values(map)) {
      if (item.date === today) {
        if (item.status === 'Verified') verified++;
        else if (item.status === 'Flagged') flagged++;
      }
    }

    return {
      total: verified + flagged,
      verified,
      flagged,
    };
  }, [localTodayActionsMap, records]);

  const todayL1Actions = useMemo<TodayL1ActionsCount>(() => {
    const map: Record<string, { l1Review: string; date: string }> = { ...localTodayL1ActionsMap };
    const today = getTodayDateStr();

    // Calculate L1 Actions strictly from sheet records matching Column "L1 Verification Date"
    records.forEach((r) => {
      const key = r.customId || r.rollNumber || String(r.rowIndex);
      if (!map[key] && isDateToday(r.l1VerificationDate || '')) {
        const l1 = (r.l1Review || '').trim();
        if (l1) {
          map[key] = { l1Review: l1, date: today };
        }
      }
    });

    let approved = 0;
    let sentBack = 0;
    let escalated = 0;
    for (const item of Object.values(map)) {
      if (item.date === today) {
        const s = (item.l1Review || '').toLowerCase();
        if (s === 'approved') approved++;
        else if (s.includes('sent')) sentBack++;
        else if (s.includes('escala')) escalated++;
      }
    }

    return {
      total: approved + sentBack + escalated,
      approved,
      sentBack,
      escalated,
    };
  }, [localTodayL1ActionsMap, records]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);

  // Selection & Pagination
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'default',
    order: 'asc',
    label: 'Sheet Row Order',
  });

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    status: 'All',
    program: '',
    department: '',
    passingYear: '',
    primarySource: '',
    sourceChecked: '',
    aiConfidence: '',
  });

  // Panel 1 (Sidebar) sizing & collapsible state
  const {
    width: sidebarWidth,
    startResizing: startSidebarResize,
    resetWidth: resetSidebarWidth,
  } = usePanelResize({
    storageKey: 'alumni_verifier_sidebar_w',
    defaultWidth: 210,
    minWidth: 160,
    maxWidth: 320,
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('alumni_verifier_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('alumni_verifier_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Panel 2 (Alumni List) sizing & compact mode state
  const {
    width: listWidth,
    startResizing: startListResize,
    resetWidth: resetListWidth,
  } = usePanelResize({
    storageKey: 'alumni_verifier_list_w',
    defaultWidth: 260,
    minWidth: 200,
    maxWidth: 420,
  });

  const [isListCompact, setIsListCompact] = useState<boolean>(() => {
    return localStorage.getItem('alumni_verifier_list_compact') === 'true';
  });

  const handleToggleListCompact = () => {
    setIsListCompact((prev) => {
      const next = !prev;
      localStorage.setItem('alumni_verifier_list_compact', String(next));
      return next;
    });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setToken(token);
          setAccessToken(token);
        }
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handler: Sign in with Google
  const handleSignIn = async () => {
    try {
      setErrorMessage(null);
      const res = await googleSignIn();
      setUser(res.user);
      setToken(res.accessToken);
      setAccessToken(res.accessToken);
      setToastMessage({
        text: `Signed in as ${res.user.displayName || res.user.email}`,
        type: 'success',
      });
      if (sheetConfig.spreadsheetId && sheetConfig.sheetName) {
        await loadSheetData(res.accessToken, sheetConfig);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setRecords([]);
    setSelectedCustomId(null);
    setCounts({ all: 0, pending: 0, verified: 0, flagged: 0, rejected: 0 });
    setToastMessage({ text: 'Signed out successfully.', type: 'success' });
  };

  // Fetch sheet data
  const loadSheetData = useCallback(
    async (token: string, config: SheetConfig) => {
      if (!token || !config.spreadsheetId || !config.sheetName) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Fetch metadata for sheet title
        try {
          const meta = await fetchSheetMetadata(token, config.spreadsheetId);
          setSheetTitle(meta.title);
        } catch {
          // If metadata fails, proceed with rows
        }

        const data = await fetchSheetRows(token, config.spreadsheetId, config.sheetName);
        setRecords(data.records);
        setHeaderMap(data.headerMap);
        setCounts(data.counts);
        setLastSyncedAt(new Date());

        // Retain selection if valid, else select first record
        setSelectedCustomId((prev) => {
          if (prev && data.records.some((r) => r.customId === prev)) {
            return prev;
          }
          return data.records.length > 0 ? data.records[0].customId : null;
        });

        setToastMessage({
          text: `Loaded ${data.records.length.toLocaleString()} records from ${config.sheetName}`,
          type: 'success',
        });
      } catch (err: any) {
        console.error('Failed to load Google Sheet:', err);
        const errMsg = (err.message || '').toLowerCase();
        if (
          errMsg.includes('401') ||
          errMsg.includes('unauthorized') ||
          errMsg.includes('invalid credentials') ||
          errMsg.includes('token') ||
          errMsg.includes('failed to fetch') ||
          errMsg.includes('unable to reach') ||
          errMsg.includes('session may have expired')
        ) {
          setToken(null);
          setAccessToken(null);
          setErrorMessage(
            'Google Sheets session expired or authorization required. Please click "Reconnect with Google" to refresh access.'
          );
        } else {
          setErrorMessage(
            err.message ||
              'Could not load data from Google Sheet. Check permissions or spreadsheet URL.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger load when authenticated and config is present
  useEffect(() => {
    if (accessToken && sheetConfig.spreadsheetId && sheetConfig.sheetName) {
      loadSheetData(accessToken, sheetConfig);
    }
  }, [accessToken, sheetConfig.spreadsheetId, sheetConfig.sheetName, loadSheetData]);

  // Handle Save Sheet Configuration with dual persistence
  const handleSaveConfig = async (newConfig: SheetConfig) => {
    setSheetConfig(newConfig);
    persistSheetConfig(newConfig);

    const token = accessToken || getAccessToken();
    if (token) {
      await loadSheetData(token, newConfig);
    } else {
      setIsConfigModalOpen(false);
      await handleSignIn();
    }
  };

  // Derive unique filter options from live data
  const { programs, departments, passingYears, primarySources, sourcesChecked } = useMemo(() => {
    const progSet = new Set<string>();
    const deptSet = new Set<string>();
    const yearSet = new Set<string>();
    const pSourceSet = new Set<string>();
    const sCheckedSet = new Set<string>();

    for (const r of records) {
      if (r.program) progSet.add(r.program);
      if (r.department) deptSet.add(r.department);
      if (r.passingYear) yearSet.add(r.passingYear);
      if (r.primarySource) pSourceSet.add(r.primarySource);
      if (r.sourceChecked) sCheckedSet.add(r.sourceChecked);
    }

    return {
      programs: Array.from(progSet).sort(),
      departments: Array.from(deptSet).sort(),
      passingYears: Array.from(yearSet).sort((a, b) => Number(b) - Number(a)),
      primarySources: Array.from(pSourceSet).sort(),
      sourcesChecked: Array.from(sCheckedSet).sort(),
    };
  }, [records]);

  // Search and Filter records
  const filteredRecords = useMemo(() => {
    const q = filters.searchQuery.toLowerCase().trim();
    const statusFilter = filters.status;
    const progFilter = filters.program;
    const deptFilter = filters.department;
    const yearFilter = filters.passingYear;
    const pSourceFilter = filters.primarySource;
    const sCheckedFilter = filters.sourceChecked;
    const aiConfFilter = filters.aiConfidence;

    return records.filter((rec) => {
      // Status filter
      if (statusFilter !== 'All') {
        const s = (rec.verificationStatus || 'Pending').toLowerCase();
        if (statusFilter === 'Pending' && !s.includes('pend') && s !== '') return false;
        if (statusFilter === 'Verified' && !s.includes('veri') && s !== 'approved') return false;
        if (statusFilter === 'Flagged' && !s.includes('flag') && !s.includes('review') && !s.includes('hold')) return false;
        if (statusFilter === 'Rejected' && !s.includes('reject') && !s.includes('invalid')) return false;
      }

      // L1 Review filter (applies specifically to Verified records)
      if (filters.l1Review) {
        const l1Val = (rec.l1Review || '').toLowerCase().trim();
        if (filters.l1Review === 'Pending') {
          const isSentForUpdate =
            (rec.sentForUpdate || '').toLowerCase().trim() === 'yes' ||
            (rec.sentForUpdate || '').toLowerCase().trim() === 'y';
          if (isSentForUpdate) return false;
          if (l1Val !== '') return false;
        } else if (filters.l1Review === 'Approved') {
          if (l1Val !== 'approved') return false;
        } else if (filters.l1Review === 'Sent back') {
          if (!l1Val.includes('sent')) return false;
        } else if (filters.l1Review === 'Escalated') {
          if (!l1Val.includes('escala')) return false;
        }
      }

      // Dropdown filters
      if (progFilter && rec.program !== progFilter) return false;
      if (deptFilter && rec.department !== deptFilter) return false;
      if (yearFilter && rec.passingYear !== yearFilter) return false;
      if (pSourceFilter && rec.primarySource !== pSourceFilter) return false;
      if (sCheckedFilter && rec.sourceChecked !== sCheckedFilter) return false;

      // AI Confidence filter
      if (aiConfFilter) {
        const confVal = parseFloat(rec.aiConfidence || '0');
        const confLower = (rec.aiConfidence || '').toLowerCase();
        if (aiConfFilter === 'High' && confVal < 80 && !confLower.includes('high')) return false;
        if (
          aiConfFilter === 'Medium' &&
          (confVal < 50 || confVal >= 80) &&
          !confLower.includes('medium')
        )
          return false;
        if (aiConfFilter === 'Low' && (confVal >= 50 || confVal === 0) && !confLower.includes('low'))
          return false;
      }

      // Keyword search across 6 key fields
      if (q) {
        const match =
          (rec.fullName && rec.fullName.toLowerCase().includes(q)) ||
          (rec.rollNumber && rec.rollNumber.toLowerCase().includes(q)) ||
          (rec.customId && rec.customId.toLowerCase().includes(q)) ||
          (rec.existingOrganization && rec.existingOrganization.toLowerCase().includes(q)) ||
          (rec.existingDesignation && rec.existingDesignation.toLowerCase().includes(q)) ||
          (rec.existingLinkedIn && rec.existingLinkedIn.toLowerCase().includes(q)) ||
          (rec.correctedCompany && rec.correctedCompany.toLowerCase().includes(q)) ||
          (rec.aiCompany && rec.aiCompany.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    });
  }, [records, filters]);

  // Apply sorting to filtered records
  const sortedFilteredRecords = useMemo(() => {
    if (sortOption.field === 'default') {
      return filteredRecords;
    }
    return [...filteredRecords].sort((a, b) => {
      let cmp = 0;
      switch (sortOption.field) {
        case 'assignedDate': {
          const parseDateToTime = (str: string): number => {
            if (!str || !str.trim()) return 0;
            const s = str.trim();
            // Handle DD/MM/YYYY or DD-MM-YYYY
            const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
            if (dmy) {
              const day = parseInt(dmy[1], 10);
              const month = parseInt(dmy[2], 10) - 1;
              const year = parseInt(dmy[3], 10);
              const hour = dmy[4] ? parseInt(dmy[4], 10) : 0;
              const min = dmy[5] ? parseInt(dmy[5], 10) : 0;
              const sec = dmy[6] ? parseInt(dmy[6], 10) : 0;
              return new Date(year, month, day, hour, min, sec).getTime() || 0;
            }
            const t = Date.parse(s);
            return isNaN(t) ? 0 : t;
          };
          const timeA = parseDateToTime(a.assignedDate);
          const timeB = parseDateToTime(b.assignedDate);
          if (timeA && timeB) {
            cmp = timeA - timeB;
          } else if (timeA && !timeB) {
            cmp = 1;
          } else if (!timeA && timeB) {
            cmp = -1;
          } else {
            cmp = (a.assignedDate || '').localeCompare(b.assignedDate || '', undefined, { numeric: true });
          }
          break;
        }
        case 'name':
          cmp = (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' });
          break;
        case 'rollNumber':
          cmp = (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
          break;
        case 'passingYear': {
          const yearA = parseInt(a.passingYear) || 0;
          const yearB = parseInt(b.passingYear) || 0;
          cmp = yearA - yearB;
          break;
        }
        case 'status':
          cmp = (a.verificationStatus || '').localeCompare(b.verificationStatus || '');
          break;
        case 'aiConfidence': {
          const confA = parseFloat(a.aiConfidence || '0') || 0;
          const confB = parseFloat(b.aiConfidence || '0') || 0;
          cmp = confA - confB;
          break;
        }
        default:
          cmp = 0;
      }
      return sortOption.order === 'asc' ? cmp : -cmp;
    });
  }, [filteredRecords, sortOption]);

  // Paginated slice
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFilteredRecords.slice(start, start + pageSize);
  }, [sortedFilteredRecords, currentPage, pageSize]);

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize, sortOption]);

  // Selected Record instance
  const selectedRecord = useMemo(() => {
    if (!selectedCustomId) return null;
    return records.find((r) => r.customId === selectedCustomId) || null;
  }, [records, selectedCustomId]);

  // Index in sorted filtered list for Next / Prev
  const currentFilteredIndex = useMemo(() => {
    if (!selectedCustomId) return -1;
    return sortedFilteredRecords.findIndex((r) => r.customId === selectedCustomId);
  }, [sortedFilteredRecords, selectedCustomId]);

  const handleSelectRecord = (record: AlumniRecord) => {
    setSelectedCustomId(record.customId);
  };

  const handleNextRecord = () => {
    if (currentFilteredIndex >= 0 && currentFilteredIndex < sortedFilteredRecords.length - 1) {
      const nextRec = sortedFilteredRecords[currentFilteredIndex + 1];
      setSelectedCustomId(nextRec.customId);

      // Adjust page if next record is on the next page
      const nextIndex = currentFilteredIndex + 1;
      const targetPage = Math.floor(nextIndex / pageSize) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  const handlePreviousRecord = () => {
    if (currentFilteredIndex > 0) {
      const prevRec = sortedFilteredRecords[currentFilteredIndex - 1];
      setSelectedCustomId(prevRec.customId);

      const prevIndex = currentFilteredIndex - 1;
      const targetPage = Math.floor(prevIndex / pageSize) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  // Core Verification Save Action directly to Google Sheet with L0 / L1 isolation
  const handleSaveVerification = async (
    updates: EditableFields,
    andNext: boolean,
    syncMode: 'all' | 'l0' | 'l1' = 'all'
  ) => {
    if (!selectedRecord) return;
    if (!accessToken) {
      setErrorMessage('Google authorization is required to update Google Sheet.');
      setIsConfigModalOpen(true);
      return;
    }
    if (!headerMap) {
      setErrorMessage('Sheet header schema is not loaded.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const email = user?.email || '';
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isL1 = (updates.l1Review || '').trim() !== '';

    const isAlreadyVerified =
      (selectedRecord.verificationStatus || '').toLowerCase().includes('veri') ||
      (selectedRecord.verificationStatus || '').toLowerCase() === 'approved';

    let resolvedActionDate = updates.actionDate !== undefined ? updates.actionDate : (selectedRecord.actionDate || '');
    let resolvedStatus = updates.verificationStatus !== undefined ? updates.verificationStatus : (selectedRecord.verificationStatus || 'Pending');

    // If syncing L1 only, never alter L0 actionDate or verificationStatus
    if (syncMode === 'l1' || isAlreadyVerified) {
      resolvedActionDate = selectedRecord.actionDate || '';
      resolvedStatus = selectedRecord.verificationStatus || 'Verified';
    }

    const finalUpdates: EditableFields = {
      ...updates,
      verificationStatus: resolvedStatus,
      actionDate: resolvedActionDate,
      l1VerificationDate: isL1 ? (updates.l1VerificationDate || todayStr) : (updates.l1VerificationDate || ''),
      verifiedBy: isL1 ? (updates.verifiedBy || email) : (updates.verifiedBy || ''),
    };

    try {
      // Step 1: Concurrency Conflict Check before updating
      const conflictCheck = await checkRowConflict(
        accessToken,
        sheetConfig.spreadsheetId,
        sheetConfig.sheetName,
        selectedRecord,
        headerMap
      );

      if (conflictCheck.hasConflict) {
        // Multi-user conflict detected! Prompt with ConflictModal
        setIsSaving(false);
        setConflictDetails({
          recordId: selectedRecord.customId || selectedRecord.rollNumber,
          fullName: selectedRecord.fullName,
          sheetValues: conflictCheck.currentSheetValues,
          localValues: finalUpdates,
          onReload: () => {
            // Reload this record from fresh sheet values
            setRecords((prev) =>
              prev.map((r) => {
                if (r.customId === selectedRecord.customId) {
                  return {
                    ...r,
                    ...conflictCheck.currentSheetValues,
                    rowIndex: conflictCheck.newRowIndex,
                    _rawSnapshot: conflictCheck.currentSheetValues,
                  };
                }
                return r;
              })
            );
            setToastMessage({
              text: 'Reloaded latest values from Google Sheet.',
              type: 'success',
            });
          },
          onForceOverwrite: async () => {
            // User confirmed overwrite
            setIsSaving(true);
            await updateRecordInSheet(
              accessToken,
              sheetConfig.spreadsheetId,
              sheetConfig.sheetName,
              conflictCheck.newRowIndex,
              headerMap,
              finalUpdates,
              email,
              syncMode
            );
            applyLocalUpdate(finalUpdates, conflictCheck.newRowIndex, syncMode);
            setIsSaving(false);
            setToastMessage({
              text: `Overwritten and saved to Google Sheet row #${conflictCheck.newRowIndex}!`,
              type: 'success',
            });
            if (andNext) handleNextRecord();
          },
        });
        return;
      }

      // Step 2: Update record in Google Sheet directly with specified syncMode
      await updateRecordInSheet(
        accessToken,
        sheetConfig.spreadsheetId,
        sheetConfig.sheetName,
        conflictCheck.newRowIndex,
        headerMap,
        finalUpdates,
        email,
        syncMode
      );

      // Step 3: Apply optimistic update to local state & recompute counts
      applyLocalUpdate(finalUpdates, conflictCheck.newRowIndex, syncMode);

      const toastLabel =
        syncMode === 'l0'
          ? `L0 Sheet Sync successful for "${selectedRecord.fullName}"!`
          : syncMode === 'l1'
          ? `L1 Sheet Sync successful for "${selectedRecord.fullName}"!`
          : `Saved "${selectedRecord.fullName}" directly to Google Sheet!`;

      setToastMessage({
        text: toastLabel,
        type: 'success',
      });

      // Step 4: Advance to next record if requested
      if (andNext) {
        handleNextRecord();
      }
    } catch (err: any) {
      console.error('Error saving to Google Sheet:', err);
      setErrorMessage(
        err.message || 'Failed to update record in Google Sheet. Please check sheet permissions.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const applyLocalUpdate = (
    updates: EditableFields,
    verifiedRowIndex: number,
    syncMode: 'all' | 'l0' | 'l1' = 'all'
  ) => {
    if (!selectedRecord) return;

    const oldStatus = selectedRecord.verificationStatus || 'Pending';
    const newStatus = syncMode === 'l1' ? oldStatus : (updates.verificationStatus || 'Pending');

    // Update record in list according to syncMode
    setRecords((prev) =>
      prev.map((r) => {
        if (r.customId === selectedRecord.customId) {
          const rawSnap: Record<string, string> = { ...(r._rawSnapshot || {}) };
          for (const [k, v] of Object.entries(updates)) {
            if (syncMode === 'l1') {
              if (['l1Review', 'l1Comment', 'l1VerificationDate', 'verifiedBy'].includes(k)) {
                rawSnap[k] = v;
              }
            } else if (syncMode === 'l0') {
              if (!['l1Review', 'l1Comment', 'l1VerificationDate', 'verifiedBy'].includes(k)) {
                rawSnap[k] = v;
              }
            } else {
              rawSnap[k] = v;
            }
          }

          const updated: AlumniRecord = {
            ...r,
            rowIndex: verifiedRowIndex,
            _rawSnapshot: rawSnap,
          };

          if (syncMode === 'l1') {
            updated.l1Review = updates.l1Review;
            updated.l1Comment = updates.l1Comment;
            updated.l1VerificationDate = updates.l1VerificationDate;
            updated.verifiedBy = updates.verifiedBy;
          } else if (syncMode === 'l0') {
            updated.correctedDesignation = updates.correctedDesignation;
            updated.correctedCompany = updates.correctedCompany;
            updated.correctedLinkedIn = updates.correctedLinkedIn;
            updated.correctedCity = updates.correctedCity;
            updated.correctedState = updates.correctedState;
            updated.correctedCountry = updates.correctedCountry;
            updated.correctedPincode = updates.correctedPincode;
            updated.sourceChecked = updates.sourceChecked;
            updated.primarySource = updates.primarySource;
            updated.verificationStatus = updates.verificationStatus;
            updated.actionDate = updates.actionDate;
            updated.anyRemark = updates.anyRemark;
            updated.sentForUpdate = updates.sentForUpdate;
            if (updates.correctedDesignation) updated.finalDesignation = updates.correctedDesignation;
            if (updates.correctedCompany) updated.finalCompany = updates.correctedCompany;
            if (updates.correctedLinkedIn) updated.finalLinkedIn = updates.correctedLinkedIn;
            if (updates.correctedCity) updated.finalCity = updates.correctedCity;
            if (updates.correctedState) updated.finalState = updates.correctedState;
            if (updates.correctedCountry) updated.finalCountry = updates.correctedCountry;
            if (updates.correctedPincode) updated.finalPincode = updates.correctedPincode;
          } else {
            Object.assign(updated, updates);
          }

          return updated;
        }
        return r;
      })
    );

    // Update status counts if status changed (only during L0 or All sync)
    if (syncMode !== 'l1' && oldStatus !== newStatus) {
      setCounts((prev) => {
        const next = { ...prev };
        const decKey = (s: string) => {
          const l = s.toLowerCase();
          if (l.includes('veri') || l === 'approved') return 'verified';
          if (l.includes('flag') || l.includes('review') || l.includes('hold')) return 'flagged';
          if (l.includes('reject') || l.includes('invalid')) return 'rejected';
          return 'pending';
        };
        const incKey = (s: string) => decKey(s);

        const from = decKey(oldStatus);
        const to = incKey(newStatus);
        if (from !== to) {
          next[from as keyof StatusCounts] = Math.max(0, next[from as keyof StatusCounts] - 1);
          next[to as keyof StatusCounts] = next[to as keyof StatusCounts] + 1;
        }
        return next;
      });
    }

    const recordKey =
      selectedRecord.customId ||
      selectedRecord.rollNumber ||
      String(selectedRecord.rowIndex || verifiedRowIndex);
    const today = getTodayDateStr();

    // Update today's marked L0 actions (strictly if L0 or All)
    if (syncMode !== 'l1') {
      const lStatus = newStatus.toLowerCase();
      const isActionDateToday = isDateToday(updates.actionDate || selectedRecord.actionDate || '');

      if (isActionDateToday) {
        if (lStatus.includes('veri') || lStatus === 'approved') {
          setLocalTodayActionsMap((prev) => {
            const next = { ...prev, [recordKey]: { status: 'Verified', date: today } };
            try {
              localStorage.setItem('alumni_actions_today_v1', JSON.stringify(next));
            } catch {}
            return next;
          });
        } else if (lStatus.includes('flag') || lStatus.includes('review') || lStatus.includes('hold')) {
          setLocalTodayActionsMap((prev) => {
            const next = { ...prev, [recordKey]: { status: 'Flagged', date: today } };
            try {
              localStorage.setItem('alumni_actions_today_v1', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } else {
        setLocalTodayActionsMap((prev) => {
          if (!prev[recordKey]) return prev;
          const next = { ...prev };
          delete next[recordKey];
          try {
            localStorage.setItem('alumni_actions_today_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    }

    // Update today's marked L1 actions (Approved, Sent back, Escalated) strictly if L1 or All
    if (syncMode !== 'l0') {
      const l1Decision = updates.l1Review !== undefined ? updates.l1Review.trim() : (selectedRecord.l1Review || '').trim();
      if (l1Decision) {
        setLocalTodayL1ActionsMap((prev) => {
          const next = { ...prev, [recordKey]: { l1Review: l1Decision, date: today } };
          try {
            localStorage.setItem('alumni_l1_actions_today_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
      } else if (updates.l1Review !== undefined && !l1Decision) {
        setLocalTodayL1ActionsMap((prev) => {
          if (!prev[recordKey]) return prev;
          const next = { ...prev };
          delete next[recordKey];
          try {
            localStorage.setItem('alumni_l1_actions_today_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* App Top Header */}
      <Header
        user={user}
        accessToken={accessToken}
        sheetConfig={sheetConfig}
        sheetTitle={sheetTitle}
        totalRecords={counts.all}
        isLoading={isLoading}
        isSaving={isSaving}
        lastSyncedAt={lastSyncedAt}
        onOpenSettings={() => setIsConfigModalOpen(true)}
        onRefresh={() => accessToken && loadSheetData(accessToken, sheetConfig)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {(!accessToken || errorMessage.toLowerCase().includes('google') || errorMessage.toLowerCase().includes('session') || errorMessage.toLowerCase().includes('reconnect')) && (
              <button
                type="button"
                id="btn-error-banner-reconnect"
                onClick={handleSignIn}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Reconnect with Google</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Configure Sheet</span>
            </button>
            {accessToken && (
              <button
                type="button"
                onClick={() => loadSheetData(accessToken, sheetConfig)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-900 font-semibold text-xs ml-2 cursor-pointer underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs flex items-center space-x-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Session Expired Reconnect Banner when records are already in memory */}
      {!accessToken && sheetConfig.spreadsheetId && records.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Google authorization expired. Your loaded records are safe. Please reconnect to save changes directly to Google Sheets.
            </span>
          </div>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Reconnect Google Sheet</span>
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      {!sheetConfig.spreadsheetId ? (
        // Not Configured State
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Connect Your Google Sheet
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                The application connects directly to your Google Sheet as the single source of
                truth. Read records, compare AI results, and save verifications directly.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">What you will need:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                <li>Google Sheet URL or Spreadsheet ID</li>
                <li>The tab name (e.g. <code className="text-emerald-700">Sheet1</code>)</li>
                <li>Edit permissions on the spreadsheet</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                id="btn-onboarding-connect-sheet"
                onClick={() => setIsConfigModalOpen(true)}
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Configure Google Sheet Connection</span>
              </button>
            </div>
          </div>
        </main>
      ) : !accessToken && records.length === 0 ? (
        // Needs Google Auth State (only if no records loaded yet)
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <LogIn className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Google Authorization Required
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                To read and update records directly in your Google Sheet (
                <strong className="text-slate-700">{sheetConfig.sheetName}</strong>), please sign in
                with your authorized Google account.
              </p>
            </div>

            <button
              id="btn-workspace-sign-in"
              onClick={handleSignIn}
              disabled={isAuthLoading}
              className="w-full inline-flex items-center justify-center space-x-2.5 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google to Connect</span>
            </button>
          </div>
        </main>
      ) : (
        // 3-Pane Split View: Sidebar, Alumni List, Verification Detail
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Live Status Counts & Secondary Filters (Resizable & Collapsible) */}
          <Sidebar
            counts={counts}
            todayActions={todayActions}
            todayL1Actions={todayL1Actions}
            filters={filters}
            onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
            onResetFilters={() =>
              setFilters({
                searchQuery: '',
                status: 'All',
                program: '',
                department: '',
                passingYear: '',
                primarySource: '',
                sourceChecked: '',
                aiConfidence: '',
              })
            }
            programs={programs}
            departments={departments}
            passingYears={passingYears}
            primarySources={primarySources}
            sourcesChecked={sourcesChecked}
            width={sidebarWidth}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            allRecords={records}
            filteredRecords={sortedFilteredRecords}
          />

          {/* Draggable Divider between 1st Panel (Sidebar) and 2nd Panel (Alumni List) */}
          {!isSidebarCollapsed && (
            <div
              onMouseDown={startSidebarResize}
              onDoubleClick={resetSidebarWidth}
              title="Drag to resize sidebar width (double-click to reset 210px)"
              className="w-1 hover:w-2 bg-[#EAE1DA] hover:bg-[#A83B24] active:bg-[#912F1B] cursor-col-resize z-10 shrink-0 transition-all select-none flex items-center justify-center group"
            >
              <div className="w-0.5 h-6 bg-slate-300 group-hover:bg-white rounded-full transition-colors" />
            </div>
          )}

          {/* Middle Column: Alumni List & Search & Pagination (Compact & Resizable) */}
          <AlumniList
            records={paginatedRecords}
            selectedRecord={selectedRecord}
            onSelectRecord={handleSelectRecord}
            filters={filters}
            onSearchChange={(search) => setFilters((prev) => ({ ...prev, searchQuery: search }))}
            totalFiltered={sortedFilteredRecords.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            width={listWidth}
            isCompact={isListCompact}
            onToggleCompact={handleToggleListCompact}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          {/* Draggable Divider between 2nd Panel (Alumni List) and 3rd Panel (Action Window / Verification) */}
          <div
            onMouseDown={startListResize}
            onDoubleClick={resetListWidth}
            title="Drag to resize alumni list width (double-click to reset 260px)"
            className="w-1 hover:w-2 bg-[#EAE1DA] hover:bg-[#A83B24] active:bg-[#912F1B] cursor-col-resize z-10 shrink-0 transition-all select-none flex items-center justify-center group"
          >
            <div className="w-0.5 h-6 bg-slate-300 group-hover:bg-white rounded-full transition-colors" />
          </div>

          {/* Right Workspace: Verification Detail & Comparison & Action Window (Google Search) */}
          <VerificationDetail
            record={selectedRecord}
            onSave={handleSaveVerification}
            onPrevious={handlePreviousRecord}
            onNext={handleNextRecord}
            hasPrevious={currentFilteredIndex > 0}
            hasNext={currentFilteredIndex >= 0 && currentFilteredIndex < sortedFilteredRecords.length - 1}
            isSaving={isSaving}
            primarySourceOptions={primarySources}
            userEmail={user?.email || ''}
          />
        </div>
      )}

      {/* Sheet Configuration Modal */}
      <SheetConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={sheetConfig}
        onSaveConfig={handleSaveConfig}
        accessToken={accessToken}
        onSignInPrompt={handleSignIn}
      />

      {/* Multi-User Concurrency Conflict Modal */}
      <ConflictModal
        conflict={conflictDetails}
        onClose={() => setConflictDetails(null)}
      />
    </div>
  );
}
