import { SheetConfig } from '../types';

export const STORAGE_KEY_CONFIG = 'alumni_portal_sheet_config';

/**
 * Load sheet configuration with dual storage fallback (localStorage + sessionStorage)
 */
export const loadSavedSheetConfig = (): SheetConfig => {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_CONFIG) ||
      sessionStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.spreadsheetId) {
        return {
          spreadsheetUrl: parsed.spreadsheetUrl || '',
          spreadsheetId: parsed.spreadsheetId || '',
          sheetName: parsed.sheetName || 'Sheet1',
        };
      }
    }
  } catch (err) {
    console.warn('Could not read sheet config from storage:', err);
  }

  return {
    spreadsheetUrl: '',
    spreadsheetId: '',
    sheetName: 'Sheet1',
  };
};

/**
 * Persist sheet configuration across both localStorage and sessionStorage
 */
export const persistSheetConfig = (config: SheetConfig): void => {
  try {
    const serialized = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEY_CONFIG, serialized);
    sessionStorage.setItem(STORAGE_KEY_CONFIG, serialized);
  } catch (err) {
    console.warn('Could not save sheet config to storage:', err);
  }
};
