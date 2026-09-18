export interface AlumniRecord {
  // Identification & Meta
  rowIndex: number; // 1-based row index in Google Sheet (row 2 is first data row)
  sNo: string;
  rollNumber: string;
  assignedDate: string;
  assignedTo: string;
  customId: string;
  fullName: string;
  program: string;
  department: string;
  passingYear: string;
  ageApprox: string;

  // Sent for Update
  sentForUpdate?: string;

  // Existing Data (Reference)
  existingDesignation: string;
  existingOrganization: string;
  existingLinkedIn: string;
  searchUrl: string;

  // AI Extracted Data (Reference)
  aiDesignation: string;
  aiCompany: string;
  aiLinkedIn: string;
  aiLocation: string;
  aiPincode: string;
  aiConfidence: string;

  // Editable / Corrected Data
  correctedDesignation: string;
  correctedCompany: string;
  correctedLinkedIn: string;
  correctedCity: string;
  correctedState: string;
  correctedCountry: string;
  correctedPincode: string;

  // Final Data (Read-only / reference)
  finalDesignation: string;
  finalCompany: string;
  finalLinkedIn: string;
  finalCity: string;
  finalState: string;
  finalCountry: string;
  finalPincode: string;

  // Verification & Audit
  sourceChecked: string;
  primarySource: string;
  verificationStatus: 'Pending' | 'Verified' | 'Flagged' | 'Rejected' | string;
  actionDate?: string;
  anyRemark: string;
  l1Review: string;
  l1Comment: string;
  l1VerificationDate?: string;
  verifiedBy?: string;
  l2Review: string;
  l2Comment: string;

  // Original snapshot for conflict detection
  _rawSnapshot?: Record<string, string>;
}

export interface EditableFields {
  correctedDesignation: string;
  correctedCompany: string;
  correctedLinkedIn: string;
  correctedCity: string;
  correctedState: string;
  correctedCountry: string;
  correctedPincode: string;
  sourceChecked: string;
  primarySource: string;
  verificationStatus: string;
  actionDate?: string;
  anyRemark: string;
  l1Review?: string;
  l1Comment?: string;
  l1VerificationDate?: string;
  verifiedBy?: string;
  sentForUpdate?: string;
}

export interface SheetConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  sheetName: string;
}

export interface StatusCounts {
  all: number;
  pending: number;
  verified: number;
  flagged: number;
  rejected: number;
}

export interface L1ReviewCounts {
  totalVerified: number;
  pending: number;
  approved: number;
  sentBack: number;
  escalated: number;
}

export interface TodayActionsCount {
  total: number;
  verified: number;
  flagged: number;
}

export interface TodayL1ActionsCount {
  total: number;
  approved: number;
  sentBack: number;
  escalated: number;
}

export interface FilterState {
  searchQuery: string;
  status: string; // 'All' | 'Pending' | 'Verified' | 'Flagged' | 'Rejected'
  program: string;
  department: string;
  passingYear: string;
  primarySource: string;
  sourceChecked: string;
  aiConfidence: string;
  l1Review?: string; // 'All' | 'Pending' | 'Approved' | 'Sent back' | 'Escalated'
  appMode?: 'verifier' | 'l1_approver';
}

export interface ConflictDetails {
  recordId: string;
  fullName: string;
  sheetValues: Partial<EditableFields>;
  localValues: Partial<EditableFields>;
  onReload: () => void;
  onForceOverwrite: () => Promise<void>;
}

export type SortField =
  | 'default'
  | 'assignedDate'
  | 'name'
  | 'rollNumber'
  | 'passingYear'
  | 'status'
  | 'aiConfidence';

export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}
