import { AlumniRecord } from '../types';

export interface ExportField {
  key: keyof AlumniRecord;
  label: string;
  category:
    | 'Identity & Meta'
    | 'Existing Sheet Data'
    | 'AI Extracted Data'
    | 'Corrected & Verified'
    | 'Final Output'
    | 'Verification & Audit';
  description?: string;
}

export const EXPORT_FIELDS: ExportField[] = [
  // Identity & Meta
  { key: 'sNo', label: 'S.No', category: 'Identity & Meta' },
  { key: 'rowIndex', label: 'Sheet Row #', category: 'Identity & Meta' },
  { key: 'customId', label: 'Custom ID', category: 'Identity & Meta' },
  { key: 'rollNumber', label: 'Roll Number', category: 'Identity & Meta' },
  { key: 'fullName', label: 'Full Name', category: 'Identity & Meta' },
  { key: 'program', label: 'Program', category: 'Identity & Meta' },
  { key: 'department', label: 'Department', category: 'Identity & Meta' },
  { key: 'passingYear', label: 'Passing Year', category: 'Identity & Meta' },
  { key: 'ageApprox', label: 'Age Approx', category: 'Identity & Meta' },
  { key: 'assignedDate', label: 'Assigned Date', category: 'Identity & Meta' },
  { key: 'assignedTo', label: 'Assigned To', category: 'Identity & Meta' },

  // Existing Sheet Data
  { key: 'existingDesignation', label: 'Existing Designation', category: 'Existing Sheet Data' },
  { key: 'existingOrganization', label: 'Existing Organization', category: 'Existing Sheet Data' },
  { key: 'existingLinkedIn', label: 'Existing LinkedIn', category: 'Existing Sheet Data' },
  { key: 'searchUrl', label: 'Search URL', category: 'Existing Sheet Data' },

  // AI Extracted Data
  { key: 'aiDesignation', label: 'AI Designation', category: 'AI Extracted Data' },
  { key: 'aiCompany', label: 'AI Company', category: 'AI Extracted Data' },
  { key: 'aiLinkedIn', label: 'AI LinkedIn', category: 'AI Extracted Data' },
  { key: 'aiLocation', label: 'AI Location', category: 'AI Extracted Data' },
  { key: 'aiPincode', label: 'AI Pincode', category: 'AI Extracted Data' },
  { key: 'aiConfidence', label: 'AI Confidence', category: 'AI Extracted Data' },

  // Corrected & Verified (Team Corrections)
  { key: 'correctedDesignation', label: 'Corrected Designation', category: 'Corrected & Verified' },
  { key: 'correctedCompany', label: 'Corrected Company', category: 'Corrected & Verified' },
  { key: 'correctedLinkedIn', label: 'Corrected LinkedIn', category: 'Corrected & Verified' },
  { key: 'correctedCity', label: 'Corrected City', category: 'Corrected & Verified' },
  { key: 'correctedState', label: 'Corrected State', category: 'Corrected & Verified' },
  { key: 'correctedCountry', label: 'Corrected Country', category: 'Corrected & Verified' },
  { key: 'correctedPincode', label: 'Corrected Pincode', category: 'Corrected & Verified' },

  // Final Output
  { key: 'finalDesignation', label: 'Final Designation', category: 'Final Output' },
  { key: 'finalCompany', label: 'Final Company', category: 'Final Output' },
  { key: 'finalLinkedIn', label: 'Final LinkedIn', category: 'Final Output' },
  { key: 'finalCity', label: 'Final City', category: 'Final Output' },
  { key: 'finalState', label: 'Final State', category: 'Final Output' },
  { key: 'finalCountry', label: 'Final Country', category: 'Final Output' },
  { key: 'finalPincode', label: 'Final Pincode', category: 'Final Output' },

  // Verification & Audit
  { key: 'verificationStatus', label: 'Verification Status', category: 'Verification & Audit' },
  { key: 'actionDate', label: 'Action Date', category: 'Verification & Audit' },
  { key: 'sourceChecked', label: 'Source Checked', category: 'Verification & Audit' },
  { key: 'primarySource', label: 'Primary Source', category: 'Verification & Audit' },
  { key: 'anyRemark', label: 'Any Remark', category: 'Verification & Audit' },
  { key: 'l1Review', label: 'L1 Review', category: 'Verification & Audit' },
  { key: 'l1Comment', label: 'L1 Comment', category: 'Verification & Audit' },
  { key: 'l2Review', label: 'L2 Review', category: 'Verification & Audit' },
  { key: 'l2Comment', label: 'L2 Comment', category: 'Verification & Audit' },
];

export const EXPORT_CATEGORIES = [
  'Identity & Meta',
  'Existing Sheet Data',
  'AI Extracted Data',
  'Corrected & Verified',
  'Final Output',
  'Verification & Audit',
] as const;

/**
 * Formats a single field value safely as a CSV escaped string
 */
function escapeCsvValue(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generate UTF-8 encoded CSV string with BOM for Excel/Google Sheets compatibility
 */
export function generateCsv(
  records: AlumniRecord[],
  selectedFieldKeys?: (keyof AlumniRecord)[]
): string {
  const activeFields = selectedFieldKeys && selectedFieldKeys.length > 0
    ? EXPORT_FIELDS.filter((f) => selectedFieldKeys.includes(f.key))
    : EXPORT_FIELDS;

  const headerRow = activeFields.map((f) => escapeCsvValue(f.label)).join(',');

  const rows = records.map((record) => {
    return activeFields
      .map((f) => escapeCsvValue(record[f.key]))
      .join(',');
  });

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Excel displays special characters accurately
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Generate Tab-Separated Values (TSV) for direct Ctrl+V copy-paste into Google Sheets / Excel
 */
export function generateTsv(
  records: AlumniRecord[],
  selectedFieldKeys?: (keyof AlumniRecord)[]
): string {
  const activeFields = selectedFieldKeys && selectedFieldKeys.length > 0
    ? EXPORT_FIELDS.filter((f) => selectedFieldKeys.includes(f.key))
    : EXPORT_FIELDS;

  const headerRow = activeFields
    .map((f) => f.label.replace(/[\t\r\n]/g, ' '))
    .join('\t');

  const rows = records.map((record) => {
    return activeFields
      .map((f) => {
        const val = record[f.key];
        const str = val !== undefined && val !== null ? String(val) : '';
        return str.replace(/[\t\r\n]/g, ' ');
      })
      .join('\t');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Generate formatted JSON array string
 */
export function generateJson(
  records: AlumniRecord[],
  selectedFieldKeys?: (keyof AlumniRecord)[]
): string {
  const activeFields = selectedFieldKeys && selectedFieldKeys.length > 0
    ? EXPORT_FIELDS.filter((f) => selectedFieldKeys.includes(f.key))
    : EXPORT_FIELDS;

  const exportedList = records.map((record) => {
    const item: Record<string, unknown> = {};
    for (const f of activeFields) {
      item[f.label] = record[f.key] ?? '';
    }
    return item;
  });

  return JSON.stringify(exportedList, null, 2);
}

/**
 * Trigger client-side file download
 */
export function triggerDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
