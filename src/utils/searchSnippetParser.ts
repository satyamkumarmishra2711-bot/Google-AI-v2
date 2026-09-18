/**
 * Utilities for extracting structured alumni profile data (Designation, Company,
 * LinkedIn URL, Location) from raw Google Search snippets, page titles, and URLs.
 */

export interface ParsedSearchData {
  rawText: string;
  designation?: string;
  company?: string;
  linkedInUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

const KNOWN_DESIGNATION_KEYWORDS = [
  'engineer', 'developer', 'architect', 'scientist', 'researcher', 'manager',
  'director', 'lead', 'vp', 'vice president', 'president', 'head', 'chief',
  'officer', 'ceo', 'cto', 'cfo', 'coo', 'cmo', 'cpo', 'founder', 'co-founder',
  'partner', 'consultant', 'analyst', 'specialist', 'associate', 'professor',
  'assistant professor', 'associate professor', 'lecturer', 'dean', 'fellow',
  'intern', 'advisor', 'administrator', 'executive', 'specialist', 'strategist',
  'member of technical staff', 'principal', 'staff engineer', 'team lead'
];

const KNOWN_INDIAN_CITIES = [
  'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'New Delhi', 'Hyderabad',
  'Chennai', 'Kolkata', 'Pune', 'Gurugram', 'Gurgaon', 'Noida', 'Kanpur',
  'Ahmedabad', 'Jaipur', 'Chandigarh', 'Indore', 'Bhopal', 'Lucknow',
  'Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum', 'Coimbatore',
  'Bhubaneswar', 'Visakhapatnam', 'Nagpur', 'Surat', 'Vadodara', 'Khagaria', 'Patna'
];

export const KNOWN_INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'New Delhi', 'Chandigarh', 'Jammu & Kashmir', 'Jammu and Kashmir',
  'Puducherry', 'Ladakh'
];

const KNOWN_GLOBAL_CITIES = [
  'San Francisco', 'San Jose', 'Mountain View', 'Sunnyvale', 'Palo Alto',
  'Seattle', 'Redmond', 'New York', 'Austin', 'Boston', 'Chicago',
  'London', 'Singapore', 'Berlin', 'Toronto', 'Vancouver', 'Dubai',
  'Sydney', 'Melbourne', 'Tokyo', 'Zurich', 'Amsterdam', 'Dublin'
];

export const KNOWN_COUNTRIES = [
  'India', 'United States', 'USA', 'United Kingdom', 'UK', 'Canada',
  'Australia', 'Germany', 'Singapore', 'United Arab Emirates', 'UAE',
  'France', 'Japan', 'Netherlands', 'Switzerland', 'Sweden', 'Ireland',
  'New Zealand', 'Israel', 'China', 'South Korea', 'Italy', 'Spain',
  'Brazil', 'Russia', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'South Africa',
  'Norway', 'Denmark', 'Finland', 'Belgium', 'Austria', 'Poland', 'Mexico',
  'England', 'Scotland', 'Wales', 'Northern Ireland'
];

/**
 * Parses a location string like "Khagaria, Bihar, India", "Bengaluru, Karnataka",
 * or "United Kingdom · Hybrid" into structured city, state, country, and optional pincode.
 */
export function parseLocationParts(rawLoc: string): {
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
} {
  let text = (rawLoc || '').trim();
  if (!text) return {};

  // Clean workplace mode like "· Hybrid", "· On-site", "· Remote", "· Office"
  text = text.replace(/\s*[-–—|·•]\s*(?:Hybrid|On-site|Remote|In-office|Work from home|Office|Hybrid work|Remote work)\b/gi, '').trim();
  text = text.replace(/^(?:Hybrid|On-site|Remote|In-office)\s*[-–—|·•]\s*/i, '').trim();

  let pincode: string | undefined = undefined;
  const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    pincode = pinMatch[1];
    text = text.replace(pinMatch[0], '').trim();
  }
  text = text.replace(/,\s*$/, '').trim();

  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  const normalizeCountry = (c: string): string => {
    const upper = c.toUpperCase();
    if (upper === 'USA' || upper === 'US' || upper === 'UNITED STATES') return 'United States';
    if (upper === 'UK' || upper === 'UNITED KINGDOM' || upper === 'ENGLAND' || upper === 'SCOTLAND' || upper === 'WALES') return 'United Kingdom';
    if (upper === 'UAE' || upper === 'UNITED ARAB EMIRATES') return 'UAE';
    const found = KNOWN_COUNTRIES.find((kc) => kc.toLowerCase() === c.toLowerCase());
    return found || c;
  };

  if (parts.length >= 4) {
    city = parts.slice(0, parts.length - 2).join(', ');
    state = parts[parts.length - 2];
    country = normalizeCountry(parts[parts.length - 1]);
  } else if (parts.length === 3) {
    city = parts[0];
    state = parts[1];
    country = normalizeCountry(parts[2]);
  } else if (parts.length === 2) {
    city = parts[0];
    const second = parts[1];
    const isIndianState = KNOWN_INDIAN_STATES.some((s) => s.toLowerCase() === second.toLowerCase());
    const isCountry = KNOWN_COUNTRIES.some((c) => c.toLowerCase() === second.toLowerCase());
    if (isIndianState) {
      state = second;
      country = 'India';
    } else if (isCountry) {
      country = normalizeCountry(second);
    } else {
      state = second;
    }
  } else if (parts.length === 1) {
    const single = parts[0];
    const isCountry = KNOWN_COUNTRIES.some((c) => c.toLowerCase() === single.toLowerCase());
    const isIndianState = KNOWN_INDIAN_STATES.some((s) => s.toLowerCase() === single.toLowerCase());
    if (isCountry) {
      country = normalizeCountry(single);
    } else if (isIndianState) {
      state = single;
      country = 'India';
    } else {
      city = single;
    }
  }

  return { city, state, country, pincode };
}

/**
 * Specialized parser for AI Overview responses, key-value summaries, and LLM text:
 * Handles direct concatenated text such as:
 * "Current Designation: Lead Senior Verification EngineerCurrent Company: QualcommCurrent Location: Khagaria, Bihar, India"
 * as well as multiline or alternative labels (Role, Organization, City, LinkedIn).
 */
export function parseAiOverviewResponse(text: string): ParsedSearchData | null {
  const rawText = (text || '').trim();
  if (!rawText) return null;

  // Pattern matches labels even when concatenated without whitespace:
  // e.g. "EngineerCurrent Company:" or "\nCurrent Company:" or "Role:"
  const keyPattern = /(?:^|[\s\r\n]|(?<=[a-z0-9.]))(Current\s+Designation|Designation|Current\s+Job\s+Title|Job\s+Title|Current\s+Role|Role|Current\s+Position|Position|Current\s+Title|Title|Current\s+Company|Company|Current\s+Organization|Organization|Current\s+Employer|Employer|Current\s+Firm|Firm|Current\s+Workplace|Workplace|Current\s+Location|Location|Current\s+City|City|Current\s+State|State|Current\s+Country|Country|Current\s+Pincode|Pincode|Pin\s*Code|Postal\s*Code|Zip\s*Code?|Current\s+LinkedIn|LinkedIn\s+Profile|LinkedIn\s+URL|LinkedIn|Profile\s*URL)\s*:\s*/gi;

  const matches: { label: string; labelStart: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = keyPattern.exec(rawText)) !== null) {
    const fullMatch = m[0];
    const label = m[1];
    const labelStart = m.index + fullMatch.indexOf(label);
    const end = m.index + fullMatch.length;
    matches.push({ label, labelStart, end });
  }

  if (matches.length === 0) return null;

  const result: ParsedSearchData = { rawText };
  let foundAny = false;

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].labelStart : rawText.length;
    let val = rawText.slice(curr.end, nextStart).trim();
    // Clean trailing separators
    val = val.replace(/[;,]$/, '').trim();
    if (!val) continue;

    const lLower = curr.label.toLowerCase();

    if (
      lLower.includes('designation') ||
      lLower.includes('role') ||
      lLower.includes('title') ||
      lLower.includes('position')
    ) {
      result.designation = val;
      foundAny = true;
    } else if (
      lLower.includes('company') ||
      lLower.includes('organization') ||
      lLower.includes('employer') ||
      lLower.includes('firm') ||
      lLower.includes('workplace')
    ) {
      result.company = val;
      foundAny = true;
    } else if (lLower.includes('location')) {
      const locData = parseLocationParts(val);
      if (locData.city) result.city = locData.city;
      if (locData.state) result.state = locData.state;
      if (locData.country) result.country = locData.country;
      if (locData.pincode) result.pincode = locData.pincode;
      foundAny = true;
    } else if (lLower.includes('city')) {
      result.city = val;
      foundAny = true;
    } else if (lLower.includes('state') || lLower.includes('province')) {
      result.state = val;
      foundAny = true;
    } else if (lLower.includes('country')) {
      result.country = val;
      foundAny = true;
    } else if (lLower.includes('pincode') || lLower.includes('postal') || lLower.includes('zip')) {
      result.pincode = val;
      foundAny = true;
    } else if (lLower.includes('linkedin') || lLower.includes('profile')) {
      result.linkedInUrl = cleanUrl(val);
      foundAny = true;
    }
  }

  return foundAny ? result : null;
}

/**
 * Cleans redirect or tracking parameters from URLs copied from Google Search
 */
export function cleanUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // Handle Google redirect wrappers (e.g. google.com/url?q=... or &url=...)
  if (url.includes('google.') && (url.includes('/url?') || url.includes('&url=') || url.includes('?q='))) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const target = parsed.searchParams.get('url') || parsed.searchParams.get('q');
      if (target) {
        url = decodeURIComponent(target);
      }
    } catch {
      const match = url.match(/[?&](?:url|q)=([^&]+)/);
      if (match && match[1]) {
        url = decodeURIComponent(match[1]);
      }
    }
  }

  // Clean LinkedIn URL tracking query parameters
  if (url.includes('linkedin.com')) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      url = `https://${parsed.hostname}${parsed.pathname}`;
      url = url.replace(/\/+$/, '');
    } catch {
      url = url.split('?')[0];
    }
  }

  return url;
}

/**
 * Checks if a string looks like a professional job title / designation
 */
function looksLikeDesignation(str: string): boolean {
  const lower = str.toLowerCase();
  return KNOWN_DESIGNATION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Specialized parser for raw text copied from LinkedIn (e.g. experience section or profile cards):
 * Handles formats like:
 *
 * Single Role:
 * Principal DSP Engineer
 * Airspan Networks · Full-time
 * Feb 2006 - Present · 20 yrs 8 mos
 * United Kingdom · Hybrid
 *
 * Multi-Role at Same Company:
 * Bain & Company
 * Full-time · 3 yrs
 * Consultant
 * Jul 2025 - Present · 1 yr 3 mos
 * Senior Associate Consultant
 * Oct 2024 - Jun 2025 · 9 mos
 * Mumbai, Maharashtra, India · On-site
 * Associate Consultant
 * Oct 2023 - Sep 2024 · 1 yr
 * Mumbai, Maharashtra, India · On-site
 */
export function parseLinkedInExperienceText(text: string): ParsedSearchData | null {
  const rawText = (text || '').trim();
  if (!rawText) return null;

  // Split lines and filter blank
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return null;

  const result: ParsedSearchData = { rawText };
  const lines: string[] = [];

  // 1. Check for LinkedIn URL in any line
  for (const line of rawLines) {
    const urlMatch = line.match(/https?:\/\/[^\s]+/i);
    if (urlMatch && (urlMatch[0].includes('linkedin.com/in/') || urlMatch[0].includes('linkedin.com/pub/'))) {
      result.linkedInUrl = cleanUrl(urlMatch[0]);
    } else if (line.toLowerCase().startsWith('linkedin.com/in/')) {
      result.linkedInUrl = cleanUrl(`https://${line}`);
    } else {
      lines.push(line);
    }
  }

  if (lines.length === 0) {
    return result.linkedInUrl ? result : null;
  }

  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\s+\d{4}\s*[-–—]\s*(?:Present|\w+\s+\d{4}|\d{4})|\b\d{4}\s*[-–—]\s*(?:Present|\d{4})|\b\d+\s*(?:yrs?|years?|mos?|months?)\b/i;
  const isDateLine = (l: string) =>
    dateRegex.test(l) ||
    l.toLowerCase().includes('present ·') ||
    l.toLowerCase().includes('- present') ||
    l.toLowerCase().includes('– present') ||
    l.toLowerCase().includes('— present');

  const empTypeOnlyRegex = /^(?:(?:Full-time|Part-time|Contract|Freelance|Internship|Self-employed|Apprenticeship|Seasonal|Trainee|Permanent)\s*(?:[-–—|·•]\s*(?:\d+\s*(?:yrs?|years?|mos?|months?)\s*)+)?|(?:\d+\s*(?:yrs?|years?|mos?|months?)\s*)+)$/i;
  const empTypeStripRegex = /\s*[-–—|·•]\s*(?:Full-time|Part-time|Contract|Freelance|Internship|Self-employed|Apprenticeship|Seasonal|Trainee|Permanent)\b/gi;
  const workModeRegex = /\s*[-–—|·•]\s*(?:Hybrid|On-site|Remote|In-office|Work from home|Office|Hybrid work|Remote work)\b/i;

  // 2. Scan for any Location line across all lines
  // (In multi-role, location may appear under previous roles like Mumbai, Maharashtra, India · On-site)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isDateLine(line)) continue;
    if (empTypeOnlyRegex.test(line)) continue;

    const hasWorkMode = workModeRegex.test(line);
    let cleaned = line.replace(workModeRegex, '').trim();
    cleaned = cleaned.replace(/^(?:Hybrid|On-site|Remote|In-office)\s*[-–—|·•]\s*/i, '').trim();

    const locData = parseLocationParts(cleaned);
    if (hasWorkMode || (locData.city && locData.state) || locData.country) {
      if (!result.country && locData.country) result.country = locData.country;
      if (!result.state && locData.state) result.state = locData.state;
      if (!result.city && locData.city) result.city = locData.city;
      if (!result.pincode && locData.pincode) result.pincode = locData.pincode;
      if (result.city || result.state || result.country) {
        break;
      }
    }
  }

  // 3. Check for Multi-Role at Same Company Pattern:
  // Line 0: Company (e.g. "Bain & Company")
  // Line 1: "Full-time · 3 yrs" (Matches empTypeOnlyRegex)
  // Line 2: Designation (e.g. "Consultant")
  if (lines.length >= 3 && empTypeOnlyRegex.test(lines[1])) {
    result.company = lines[0].replace(empTypeStripRegex, '').trim();
    const rawDesig = lines[2].replace(empTypeStripRegex, '').trim();
    result.designation = rawDesig;
    const hasAny = !!(result.designation || result.company || result.city || result.state || result.country || result.linkedInUrl);
    return hasAny ? result : null;
  }

  // Also check if Line 0 is Company and Line 1 is already a Designation followed by a Date line:
  // e.g.:
  // Bain & Company
  // Consultant
  // Jul 2025 - Present · 1 yr 3 mos
  if (
    lines.length >= 3 &&
    !isDateLine(lines[0]) &&
    !isDateLine(lines[1]) &&
    isDateLine(lines[2])
  ) {
    const line0Clean = lines[0].replace(empTypeStripRegex, '').trim();
    const line1Clean = lines[1].replace(empTypeStripRegex, '').trim();

    if (looksLikeDesignation(line1Clean) && !looksLikeDesignation(line0Clean)) {
      result.company = line0Clean;
      result.designation = line1Clean;
      const hasAny = !!(result.designation || result.company || result.city || result.state || result.country || result.linkedInUrl);
      return hasAny ? result : null;
    }
  }

  // 4. Single Role Standard Layout
  // Line 0: Designation (e.g. "Principal DSP Engineer")
  // Line 1: Company + EmpType (e.g. "Airspan Networks · Full-time")
  // Line 2: Date
  // Line 3: Location
  let dateLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isDateLine(lines[i])) {
      dateLineIdx = i;
      break;
    }
  }

  const contentLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === dateLineIdx) continue;
    const l = lines[i];
    if (empTypeOnlyRegex.test(l)) continue;
    // skip if line was identified as pure location
    let cleanedLoc = l.replace(workModeRegex, '').trim();
    if (workModeRegex.test(l) && (cleanedLoc.toLowerCase() === (result.city || '').toLowerCase() || cleanedLoc.toLowerCase() === (result.country || '').toLowerCase())) {
      continue;
    }
    contentLines.push(l);
  }

  if (contentLines.length >= 2) {
    const line0 = contentLines[0];
    const line1 = contentLines[1];

    const hasEmpType0 = empTypeStripRegex.test(line0);
    const hasEmpType1 = empTypeStripRegex.test(line1);

    const clean0 = line0.replace(empTypeStripRegex, '').trim();
    const clean1 = line1.replace(empTypeStripRegex, '').trim();

    if (hasEmpType1 || looksLikeDesignation(clean0)) {
      result.designation = clean0;
      result.company = clean1;
    } else if (hasEmpType0 || looksLikeDesignation(clean1)) {
      result.designation = clean1;
      result.company = clean0;
    } else {
      result.designation = clean0;
      result.company = clean1;
    }
  } else if (contentLines.length === 1) {
    const single = contentLines[0];
    const cleanSingle = single.replace(empTypeStripRegex, '').trim();
    if (looksLikeDesignation(cleanSingle)) {
      result.designation = cleanSingle;
    } else {
      result.company = cleanSingle;
    }
  }

  const hasAny = !!(result.designation || result.company || result.city || result.state || result.country || result.linkedInUrl);
  return hasAny ? result : null;
}

/**
 * Intelligently parses raw text / snippet copied from Google Search or clipboard
 */
export function parseSearchSnippet(
  text: string,
  alumniName?: string
): ParsedSearchData {
  const rawText = (text || '').trim();
  const result: ParsedSearchData = { rawText };

  if (!rawText) return result;

  // PRIORITY 1: Check for structured AI Overview / key-value responses (e.g. Current Designation: ... Current Company: ... Current Location: ...)
  const aiParsed = parseAiOverviewResponse(rawText);
  if (
    aiParsed &&
    (aiParsed.designation || aiParsed.company || aiParsed.city || aiParsed.linkedInUrl)
  ) {
    return aiParsed;
  }

  // PRIORITY 2: Check for LinkedIn experience copied format (multiline with designation, company · full-time, dates, location)
  if (rawText.includes('\n') || rawText.includes('·') || rawText.includes('Full-time') || rawText.includes('Present')) {
    const linkedInParsed = parseLinkedInExperienceText(rawText);
    if (linkedInParsed && (linkedInParsed.designation || linkedInParsed.company)) {
      return linkedInParsed;
    }
  }

  // 1. Check for standalone or embedded URLs (especially LinkedIn)
  const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const rawFoundUrl = urlMatch[0];
    const cleaned = cleanUrl(rawFoundUrl);
    if (cleaned.includes('linkedin.com/in/') || cleaned.includes('linkedin.com/pub/')) {
      result.linkedInUrl = cleaned;
    }
  } else if (rawText.toLowerCase().startsWith('linkedin.com/in/')) {
    result.linkedInUrl = cleanUrl(`https://${rawText}`);
  }

  // If the whole string was just a LinkedIn URL, return early
  if (result.linkedInUrl && (rawText === result.linkedInUrl || rawText.length < result.linkedInUrl.length + 10)) {
    return result;
  }

  // 2. Check for Pincode (6-digit Indian PIN)
  const pinMatch = rawText.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    result.pincode = pinMatch[1];
  }

  // 3. Check for Location / City
  for (const city of [...KNOWN_INDIAN_CITIES, ...KNOWN_GLOBAL_CITIES]) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(rawText)) {
      result.city = city;
      if (KNOWN_INDIAN_CITIES.includes(city)) {
        result.country = 'India';
      }
      break;
    }
  }

  // 4. Clean text from common Google Search / LinkedIn artifacts
  let cleanStr = rawText
    // Remove embedded URL from text
    .replace(/https?:\/\/[^\s]+/gi, '')
    // Remove " | LinkedIn", " - LinkedIn", " · LinkedIn"
    .replace(/\s*[-–—|·]\s*LinkedIn.*$/i, '')
    // Remove " - Google Search"
    .replace(/\s*[-–—|·]\s*Google.*$/i, '')
    // Remove trailing ellipsis
    .replace(/\.{3,}$/, '')
    // Remove "View profile", "See connection", etc.
    .replace(/\b(?:View profile|connections|followers)\b/gi, '')
    .trim();

  // If alumniName is provided, strip it from the start of the snippet (e.g. "John Doe - Senior Engineer")
  if (alumniName && alumniName.trim()) {
    const nameParts = alumniName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const escapedFull = alumniName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapedFull}\\s*[-–—|:·•]\\s*`, 'i');
    if (nameRegex.test(cleanStr)) {
      cleanStr = cleanStr.replace(nameRegex, '').trim();
    } else if (nameParts.length > 1) {
      // Try checking if it starts with FirstName LastName
      const shortRegex = new RegExp(`^${firstName}\\s+${lastName}\\s*[-–—|:·•]\\s*`, 'i');
      if (shortRegex.test(cleanStr)) {
        cleanStr = cleanStr.replace(shortRegex, '').trim();
      }
    }
  }

  // 5. Structure parsing for Designation & Company
  // Case A: Contains " at " or " @ " (e.g. "Senior Software Engineer at Google India")
  if (/\s+(?:at|@)\s+/i.test(cleanStr)) {
    const parts = cleanStr.split(/\s+(?:at|@)\s+/i);
    if (parts.length >= 2) {
      result.designation = parts[0].trim();
      let comp = parts[1].trim();
      // If company portion contains comma followed by city (e.g. "Google India, Bengaluru")
      if (comp.includes(',')) {
        const compParts = comp.split(',');
        comp = compParts[0].trim();
        if (!result.city && compParts[1]) {
          result.city = compParts[1].trim();
        }
      }
      // Remove any lingering location words
      comp = comp.replace(/\s*[-–—|·]\s*(?:Bengaluru|Mumbai|Delhi|India|USA|Area).*$/i, '').trim();
      result.company = comp;
      return result;
    }
  }

  // Case B: Delimited by " - ", " – ", " — ", or " | " (e.g. "Vice President - Goldman Sachs")
  const dashParts = cleanStr.split(/\s*[-–—|·•]\s*/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const part0 = dashParts[0];
    const part1 = dashParts[1];

    if (looksLikeDesignation(part0) && !looksLikeDesignation(part1)) {
      result.designation = part0;
      result.company = cleanCompanyPart(part1, result);
      return result;
    } else if (looksLikeDesignation(part1) && !looksLikeDesignation(part0)) {
      result.designation = part1;
      result.company = cleanCompanyPart(part0, result);
      return result;
    } else {
      // Default guess: first part is designation, second is company
      result.designation = part0;
      result.company = cleanCompanyPart(part1, result);
      return result;
    }
  }

  // Case C: Single string - could be just designation or just company
  if (cleanStr) {
    if (looksLikeDesignation(cleanStr)) {
      result.designation = cleanStr;
    } else {
      result.company = cleanStr;
    }
  }

  return result;
}

function cleanCompanyPart(part: string, result: ParsedSearchData): string {
  let c = part;
  if (c.includes(',')) {
    const pieces = c.split(',');
    c = pieces[0].trim();
    if (!result.city && pieces[1]) {
      result.city = pieces[1].trim();
    }
  }
  return c;
}
