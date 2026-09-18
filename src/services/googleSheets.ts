import { AlumniRecord, EditableFields, StatusCounts } from '../types';

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed) && !trimmed.includes('/')) {
    return trimmed;
  }
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function colIndexToA1(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export interface SheetMetadata {
  title: string;
  sheets: {
    sheetId: number;
    title: string;
    rowCount?: number;
    columnCount?: number;
  }[];
}

export interface SheetHeaderMap {
  rawHeaders: string[];
  fieldToColIndex: Record<string, number>;
  colIndexToField: Record<number, string>;
}

function normalizeKey(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function cleanSearchUrl(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  // Check for HYPERLINK formula: =HYPERLINK("https://...", "label")
  const match = trimmed.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Check for plain URL in text
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch && urlMatch[0]) {
    return urlMatch[0].trim();
  }
  return trimmed;
}

const FIELD_ALIASES: Record<string, string[]> = {
  sNo: ['sno', 'slno', 'serialno', 'sn'],
  rollNumber: ['rollnumber', 'rollno', 'roll'],
  assignedDate: [
    'assigneddate',
    'assigned_date',
    'assigned date',
    'assignmentdate',
    'assignment_date',
    'assignedon',
    'assigned on',
    'allocationdate',
    'allocation_date',
    'dateassigned',
  ],
  assignedTo: ['assignedto', 'assignee', 'verifier'],
  customId: ['customid', 'id', 'alumniid', 'uid'],
  fullName: ['fullname', 'name', 'alumniname', 'alumni'],
  program: ['program', 'programme', 'degree', 'course'],
  department: ['department', 'dept', 'branch'],
  passingYear: ['passingyear', 'batch', 'year', 'gradyear', 'passyear'],
  ageApprox: ['ageapprox', 'age', 'approxage'],

  existingDesignation: ['existingdesignation', 'designation', 'currentdesignation'],
  existingOrganization: ['existingorganization', 'organization', 'company', 'existingcompany'],
  existingLinkedIn: ['existinglinkedin', 'linkedin', 'linkedinurl', 'linkedinprofile'],
  searchUrl: [
    'searchurl',
    'search_url',
    'searchurls',
    'googlesearch',
    'googlesearchurl',
    'searchlink',
    'googleurl',
    'googlelink',
    'searchedurl',
    'searchlinkurl',
  ],

  aiDesignation: ['aidesignation', 'aipredicteddesignation'],
  aiCompany: ['aicompany', 'aiorganization'],
  aiLinkedIn: ['ailinkedin', 'aiprofile', 'ailinkedinurl'],
  aiLocation: ['ailocation', 'aicity', 'aistate'],
  aiPincode: ['aipincode', 'aizip', 'aipostalcode'],
  aiConfidence: ['aiconfidence', 'confidence', 'confidencelevel'],

  correctedDesignation: ['correcteddesignation'],
  correctedCompany: ['correctedcompany', 'correctedorganization'],
  correctedLinkedIn: ['correctedlinkedin', 'correctedlinkedinurl'],
  correctedCity: ['correctedcity'],
  correctedState: ['correctedstate'],
  correctedCountry: ['correctedcountry'],
  correctedPincode: ['correctedpincode', 'correctedzip'],

  finalDesignation: ['finaldesignation'],
  finalCompany: ['finalcompany'],
  finalLinkedIn: ['finallinkedin'],
  finalCity: ['finalcity'],
  finalState: ['finalstate'],
  finalCountry: ['finalcountry'],
  finalPincode: ['finalpincode'],

  sourceChecked: ['sourcechecked', 'sourceschecked', 'source'],
  primarySource: ['primarysource'],
  verificationStatus: ['verificationstatus', 'status', 'verifystatus'],
  actionDate: [
    'actiondate',
    'action_date',
    'action date',
    'dateaction',
    'date_action',
    'actiontakenon',
    'actiontakendate',
    'actioneddate',
    'actiondateyyyymmdd',
  ],
  anyRemark: ['anyremark', 'remark', 'remarks', 'comment', 'comments', 'verifierremark'],
  sentForUpdate: [
    'sentforupdate',
    'sent_for_update',
    'sent for update',
    'sentforupdates',
    'sent_update',
    'sentupdate',
  ],
  l1Review: [
    'l1review',
    'l1_review',
    'l1 review',
    'l1status',
    'l1_status',
    'l1 status',
    'l1approver',
    'l1decision',
    'l1approval',
  ],
  l1Comment: [
    'l1comment',
    'l1_comment',
    'l1 comment',
    'l1comments',
    'l1_comments',
    'l1 comments',
    'l1remark',
    'l1remarks',
  ],
  l1VerificationDate: [
    'l1verificationdate',
    'l1_verification_date',
    'l1 verification date',
    'l1verifydate',
    'l1_verify_date',
    'l1 verification on',
    'l1date',
    'l1_date',
    'l1 action date',
    'l1actiondate',
  ],
  verifiedBy: [
    'verifiedby',
    'verified_by',
    'verified by',
    'verifieremail',
    'verifiedbyemail',
    'l1verifiedby',
    'l1_verified_by',
    'l1 verified by',
    'l1verifier',
    'verified_by_email',
  ],
  l2Review: ['l2review', 'l2status'],
  l2Comment: ['l2comment', 'l2comments'],
};

export function buildHeaderMap(rawHeaders: string[]): SheetHeaderMap {
  const fieldToColIndex: Record<string, number> = {};
  const colIndexToField: Record<number, string> = {};

  rawHeaders.forEach((header, idx) => {
    const rawTrimmed = (header || '').trim();
    const norm = normalizeKey(rawTrimmed);

    // Direct match for Search_URL header
    if (
      norm === 'searchurl' ||
      norm === 'searchurls' ||
      rawTrimmed.toLowerCase() === 'search_url' ||
      rawTrimmed.toLowerCase() === 'search url'
    ) {
      fieldToColIndex['searchUrl'] = idx;
      colIndexToField[idx] = 'searchUrl';
      return;
    }

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (norm === normalizeKey(field) || aliases.includes(norm)) {
        fieldToColIndex[field] = idx;
        colIndexToField[idx] = field;
        break;
      }
    }
  });

  return { rawHeaders, fieldToColIndex, colIndexToField };
}

export async function fetchSheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=properties.title,sheets.properties`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    throw new Error(
      `Unable to reach Google Sheets API (${err.message || 'Failed to fetch'}). Your access token may have expired or network was interrupted. Please reconnect your Google account.`
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    let message = `Failed to fetch Google Sheet (${res.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  const data = await res.json();
  return {
    title: data.properties?.title || 'Google Sheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function fetchSheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{
  records: AlumniRecord[];
  headerMap: SheetHeaderMap;
  counts: StatusCounts;
}> {
  // Read all values from A1:ZZ
  const range = `${encodeURIComponent(sheetName)}!A1:ZZ`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}?valueRenderOption=FORMATTED_VALUE`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    throw new Error(
      `Unable to read sheet from Google API (${err.message || 'Failed to fetch'}). Your access token may have expired. Please reconnect your Google account.`
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    let message = `Failed to read sheet data (${res.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  const json = await res.json();
  const rawRows: string[][] = json.values || [];

  if (rawRows.length === 0) {
    return {
      records: [],
      headerMap: { rawHeaders: [], fieldToColIndex: {}, colIndexToField: {} },
      counts: { all: 0, pending: 0, verified: 0, flagged: 0, rejected: 0 },
    };
  }

  const rawHeaders = rawRows[0];
  const headerMap = buildHeaderMap(rawHeaders);

  const getVal = (row: string[], field: string): string => {
    const idx = headerMap.fieldToColIndex[field];
    if (idx !== undefined && idx < row.length) {
      return (row[idx] || '').trim();
    }
    return '';
  };

  const records: AlumniRecord[] = [];
  const counts: StatusCounts = {
    all: 0,
    pending: 0,
    verified: 0,
    flagged: 0,
    rejected: 0,
  };

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    // Skip completely empty rows
    if (!row || row.every((c) => !c || c.trim() === '')) continue;

    const rowIndex = r + 1; // 1-based row in Google Sheets
    const customId = getVal(row, 'customId') || `ROW_${rowIndex}`;
    const rollNumber = getVal(row, 'rollNumber');
    const rawStatus = getVal(row, 'verificationStatus');
    
    // Normalize status for counts
    let status = 'Pending';
    const sLower = rawStatus.toLowerCase();
    if (sLower.includes('veri') || sLower === 'approved') {
      status = 'Verified';
      counts.verified++;
    } else if (sLower.includes('flag') || sLower.includes('review') || sLower.includes('hold')) {
      status = 'Flagged';
      counts.flagged++;
    } else if (sLower.includes('reject') || sLower.includes('invalid')) {
      status = 'Rejected';
      counts.rejected++;
    } else {
      status = rawStatus ? rawStatus : 'Pending';
      counts.pending++;
    }
    counts.all++;

    const rawSnapshot: Record<string, string> = {};
    for (const field of [
      'correctedDesignation',
      'correctedCompany',
      'correctedLinkedIn',
      'correctedCity',
      'correctedState',
      'correctedCountry',
      'correctedPincode',
      'sourceChecked',
      'primarySource',
      'verificationStatus',
      'actionDate',
      'anyRemark',
      'l1Review',
      'l1Comment',
      'l1VerificationDate',
      'verifiedBy',
      'sentForUpdate',
    ]) {
      rawSnapshot[field] = getVal(row, field);
    }

    records.push({
      rowIndex,
      sNo: getVal(row, 'sNo') || String(records.length + 1),
      rollNumber,
      assignedDate: getVal(row, 'assignedDate'),
      assignedTo: getVal(row, 'assignedTo'),
      customId,
      fullName: getVal(row, 'fullName') || 'Unnamed Alumni',
      program: getVal(row, 'program'),
      department: getVal(row, 'department'),
      passingYear: getVal(row, 'passingYear'),
      ageApprox: getVal(row, 'ageApprox'),

      sentForUpdate: getVal(row, 'sentForUpdate'),

      existingDesignation: getVal(row, 'existingDesignation'),
      existingOrganization: getVal(row, 'existingOrganization'),
      existingLinkedIn: getVal(row, 'existingLinkedIn'),
      searchUrl: cleanSearchUrl(getVal(row, 'searchUrl')),

      aiDesignation: getVal(row, 'aiDesignation'),
      aiCompany: getVal(row, 'aiCompany'),
      aiLinkedIn: getVal(row, 'aiLinkedIn'),
      aiLocation: getVal(row, 'aiLocation'),
      aiPincode: getVal(row, 'aiPincode'),
      aiConfidence: getVal(row, 'aiConfidence'),

      correctedDesignation: getVal(row, 'correctedDesignation'),
      correctedCompany: getVal(row, 'correctedCompany'),
      correctedLinkedIn: getVal(row, 'correctedLinkedIn'),
      correctedCity: getVal(row, 'correctedCity'),
      correctedState: getVal(row, 'correctedState'),
      correctedCountry: getVal(row, 'correctedCountry'),
      correctedPincode: getVal(row, 'correctedPincode'),

      finalDesignation: getVal(row, 'finalDesignation'),
      finalCompany: getVal(row, 'finalCompany'),
      finalLinkedIn: getVal(row, 'finalLinkedIn'),
      finalCity: getVal(row, 'finalCity'),
      finalState: getVal(row, 'finalState'),
      finalCountry: getVal(row, 'finalCountry'),
      finalPincode: getVal(row, 'finalPincode'),

      sourceChecked: getVal(row, 'sourceChecked'),
      primarySource: getVal(row, 'primarySource'),
      verificationStatus: status,
      actionDate: getVal(row, 'actionDate'),
      anyRemark: getVal(row, 'anyRemark'),
      l1Review: getVal(row, 'l1Review'),
      l1Comment: getVal(row, 'l1Comment'),
      l1VerificationDate: getVal(row, 'l1VerificationDate'),
      verifiedBy: getVal(row, 'verifiedBy'),
      l2Review: getVal(row, 'l2Review'),
      l2Comment: getVal(row, 'l2Comment'),

      _rawSnapshot: rawSnapshot,
    });
  }

  return { records, headerMap, counts };
}

export async function checkRowConflict(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  record: AlumniRecord,
  headerMap: SheetHeaderMap
): Promise<{ hasConflict: boolean; currentSheetValues: Record<string, string>; newRowIndex: number }> {
  let targetRowIndex = record.rowIndex;

  // First verify the row
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}!A${targetRowIndex}:ZZ${targetRowIndex}`;

  const res = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Unable to verify record status in Google Sheet before saving.');
  }

  const json = await res.json();
  const rowVals: string[] = (json.values && json.values[0]) || [];

  const getCol = (field: string) => {
    const idx = headerMap.fieldToColIndex[field];
    return idx !== undefined && idx < rowVals.length ? (rowVals[idx] || '').trim() : '';
  };

  // Verify stable identity (Custom ID or Roll Number)
  const currentId = getCol('customId');
  const currentRoll = getCol('rollNumber');

  // If the row was shifted or doesn't match ID, we search by ID column
  if (
    record.customId &&
    currentId &&
    currentId !== record.customId &&
    (!record.rollNumber || currentRoll !== record.rollNumber)
  ) {
    // Row shifted! Locate exact row in Google Sheet
    const idColIdx = headerMap.fieldToColIndex['customId'];
    if (idColIdx !== undefined) {
      const colLetter = colIndexToA1(idColIdx);
      const searchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          spreadsheetId
        )}/values/${encodeURIComponent(sheetName)}!${colLetter}1:${colLetter}100000`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (searchRes.ok) {
        const sJson = await searchRes.json();
        const colList: string[][] = sJson.values || [];
        const foundIdx = colList.findIndex(
          (c, idx) => idx > 0 && c[0] && c[0].trim() === record.customId
        );
        if (foundIdx !== -1) {
          targetRowIndex = foundIdx + 1;
        }
      }
    }
  }

  const currentSheetValues: Record<string, string> = {
    correctedDesignation: getCol('correctedDesignation'),
    correctedCompany: getCol('correctedCompany'),
    correctedLinkedIn: getCol('correctedLinkedIn'),
    correctedCity: getCol('correctedCity'),
    correctedState: getCol('correctedState'),
    correctedCountry: getCol('correctedCountry'),
    correctedPincode: getCol('correctedPincode'),
    sourceChecked: getCol('sourceChecked'),
    primarySource: getCol('primarySource'),
    verificationStatus: getCol('verificationStatus'),
    actionDate: getCol('actionDate'),
    anyRemark: getCol('anyRemark'),
    l1Review: getCol('l1Review'),
    l1Comment: getCol('l1Comment'),
    l1VerificationDate: getCol('l1VerificationDate'),
    verifiedBy: getCol('verifiedBy'),
    sentForUpdate: getCol('sentForUpdate'),
  };

  // Check against the snapshot captured when this record was loaded
  let hasConflict = false;
  if (record._rawSnapshot) {
    for (const key of Object.keys(currentSheetValues)) {
      const initialSnapshot = record._rawSnapshot[key] || '';
      const currentValInSheet = currentSheetValues[key] || '';
      // If someone else modified it from initial state
      if (initialSnapshot !== currentValInSheet) {
        hasConflict = true;
        break;
      }
    }
  }

  return { hasConflict, currentSheetValues, newRowIndex: targetRowIndex };
}

export async function updateRecordInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  headerMap: SheetHeaderMap,
  updates: EditableFields,
  currentUserEmail?: string,
  syncMode: 'all' | 'l0' | 'l1' = 'all'
): Promise<void> {
  // If actionDate is not set but status is marked Verified/Approved or Flagged, generate today's date
  const statusLower = (updates.verificationStatus || '').toLowerCase();
  const isMarked =
    statusLower.includes('veri') ||
    statusLower === 'approved' ||
    statusLower.includes('flag') ||
    statusLower.includes('reject');

  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const l1ReviewVal = (updates.l1Review || '').trim();
  const isL1Marked = l1ReviewVal !== '';

  const resolvedUpdates: EditableFields = {
    ...updates,
    // Action Date is strictly for L0 action. Never overwrite or auto-set actionDate during L1 review actions.
    actionDate: updates.actionDate !== undefined ? updates.actionDate : (isMarked && syncMode !== 'l1' ? todayStr : ''),
    l1VerificationDate: isL1Marked ? (updates.l1VerificationDate || todayStr) : (updates.l1VerificationDate || ''),
    verifiedBy: isL1Marked ? (updates.verifiedBy || currentUserEmail || '') : (updates.verifiedBy || ''),
  };

  // Build batchUpdate data payload for exact cell ranges based on syncMode
  const data: { range: string; values: string[][] }[] = [];

  let fieldKeys: (keyof EditableFields)[] = [];

  if (syncMode === 'l0') {
    // Only L0 fields are updated in the Google Sheet (never touch L1 columns)
    fieldKeys = [
      'correctedDesignation',
      'correctedCompany',
      'correctedLinkedIn',
      'correctedCity',
      'correctedState',
      'correctedCountry',
      'correctedPincode',
      'sourceChecked',
      'primarySource',
      'verificationStatus',
      'actionDate',
      'anyRemark',
      'sentForUpdate',
    ];
  } else if (syncMode === 'l1') {
    // Only L1 fields are updated in the Google Sheet (never touch L0 columns)
    fieldKeys = [
      'l1Review',
      'l1Comment',
      'l1VerificationDate',
      'verifiedBy',
    ];
  } else {
    // 'all' updates all fields
    fieldKeys = [
      'correctedDesignation',
      'correctedCompany',
      'correctedLinkedIn',
      'correctedCity',
      'correctedState',
      'correctedCountry',
      'correctedPincode',
      'sourceChecked',
      'primarySource',
      'verificationStatus',
      'actionDate',
      'anyRemark',
      'l1Review',
      'l1Comment',
      'l1VerificationDate',
      'verifiedBy',
      'sentForUpdate',
    ];
  }

  for (const field of fieldKeys) {
    const colIdx = headerMap.fieldToColIndex[field];
    if (colIdx !== undefined) {
      const colLetter = colIndexToA1(colIdx);
      data.push({
        range: `${sheetName}!${colLetter}${rowIndex}`,
        values: [[resolvedUpdates[field] ?? '']],
      });
    }
  }

  // Also sync final fields if columns exist in the sheet ONLY for L0 or all
  if (syncMode !== 'l1') {
    const finalMap: Record<string, keyof EditableFields> = {
      finalDesignation: 'correctedDesignation',
      finalCompany: 'correctedCompany',
      finalLinkedIn: 'correctedLinkedIn',
      finalCity: 'correctedCity',
      finalState: 'correctedState',
      finalCountry: 'correctedCountry',
      finalPincode: 'correctedPincode',
    };

    for (const [finalCol, sourceCol] of Object.entries(finalMap)) {
      const colIdx = headerMap.fieldToColIndex[finalCol];
      if (colIdx !== undefined) {
        const colLetter = colIndexToA1(colIdx);
        const val = updates[sourceCol];
        if (val) {
          data.push({
            range: `${sheetName}!${colLetter}${rowIndex}`,
            values: [[val]],
          });
        }
      }
    }
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchUpdate`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Failed to save changes to Google Sheet (${err.message || 'Failed to fetch'}). Your session may have expired. Please reconnect your account.`
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    let message = `Failed to update record in Google Sheet (${res.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || message;
    } catch {}
    throw new Error(message);
  }
}
