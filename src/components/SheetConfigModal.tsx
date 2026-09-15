import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Link,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { SheetConfig } from '../types';
import { extractSpreadsheetId, fetchSheetMetadata } from '../services/googleSheets';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onSaveConfig: (newConfig: SheetConfig) => Promise<void>;
  accessToken: string | null;
  onSignInPrompt: () => void;
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  accessToken,
  onSignInPrompt,
}) => {
  const [urlInput, setUrlInput] = useState(config.spreadsheetUrl || config.spreadsheetId || '');
  const [tabInput, setTabInput] = useState(config.sheetName || 'Sheet1');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isFetchingTabs, setIsFetchingTabs] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    detectedTabs?: string[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setUrlInput(config.spreadsheetUrl || config.spreadsheetId || '');
    setTabInput(config.sheetName || 'Sheet1');
    setTestResult(null);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const currentSpreadsheetId = extractSpreadsheetId(urlInput);

  const handleFetchTabs = async () => {
    if (!currentSpreadsheetId) {
      setTestResult({
        success: false,
        message: 'Please enter a valid Google Sheet URL or Spreadsheet ID first.',
      });
      return;
    }

    if (!accessToken) {
      setTestResult({
        success: false,
        message: 'Google authorization required. Please sign in with Google first.',
      });
      onSignInPrompt();
      return;
    }

    setIsFetchingTabs(true);
    setTestResult(null);

    try {
      const meta = await fetchSheetMetadata(accessToken, currentSpreadsheetId);
      const tabNames = meta.sheets.map((s) => s.title);
      setAvailableTabs(tabNames);

      if (tabNames.length > 0 && !tabNames.includes(tabInput)) {
        setTabInput(tabNames[0]);
      }

      setTestResult({
        success: true,
        message: `Successfully connected to "${meta.title}". Found ${tabNames.length} sheet tabs.`,
        detectedTabs: tabNames,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message:
          err.message ||
          'Could not access this Google Sheet. Ensure your Google account has permission to view/edit it.',
      });
    } finally {
      setIsFetchingTabs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpreadsheetId) {
      setTestResult({
        success: false,
        message: 'Spreadsheet URL or ID is required.',
      });
      return;
    }

    if (!tabInput.trim()) {
      setTestResult({
        success: false,
        message: 'Sheet/tab name is required (e.g. Sheet1).',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveConfig({
        spreadsheetUrl: urlInput.trim(),
        spreadsheetId: currentSpreadsheetId,
        sheetName: tabInput.trim(),
      });
      onClose();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheet Connection</h2>
              <p className="text-xs text-slate-500">Configure your single source of truth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Auth reminder if not signed in */}
          {!accessToken && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Google Authorization Required</strong>
                <span>
                  To read and write directly to your Google Sheet, please sign in with Google using
                  the button below.
                </span>
                <button
                  type="button"
                  onClick={onSignInPrompt}
                  className="mt-2 block px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs"
                >
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

          {/* Google Sheet URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Sheet URL or Spreadsheet ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="input-sheet-url"
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setTestResult(null);
                }}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                required
              />
            </div>
            {currentSpreadsheetId && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Detected ID: <strong className="text-slate-700">{currentSpreadsheetId}</strong>
              </p>
            )}
          </div>

          {/* Sheet / Tab Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Sheet / Tab Name <span className="text-rose-500">*</span>
              </label>
              {accessToken && currentSpreadsheetId && (
                <button
                  type="button"
                  onClick={handleFetchTabs}
                  disabled={isFetchingTabs}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingTabs ? 'animate-spin' : ''}`} />
                  <span>Fetch Tabs</span>
                </button>
              )}
            </div>

            {availableTabs.length > 0 ? (
              <select
                id="select-sheet-tab"
                value={tabInput}
                onChange={(e) => setTabInput(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {availableTabs.map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="input-sheet-tab-name"
                type="text"
                placeholder="e.g. Sheet1, Alumni_Records, Master"
                value={tabInput}
                onChange={(e) => setTabInput(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              The exact name of the tab in your spreadsheet where alumni rows are stored.
            </p>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold block">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Help box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Direct Google Sheet Requirements</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
              <li>Your signed-in Google account must have edit access to the Sheet.</li>
              <li>First row of the tab must contain the column headers (e.g. Roll Number, Custom ID, Full Name).</li>
              <li>Updates will write directly to the Sheet row using Custom ID or Roll Number.</li>
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !currentSpreadsheetId}
              id="btn-save-sheet-config"
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <span>{isSaving ? 'Connecting...' : 'Save & Connect'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
