import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileCode,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { AlumniRecord } from '../types';
import {
  EXPORT_FIELDS,
  EXPORT_CATEGORIES,
  generateCsv,
  generateTsv,
  generateJson,
  triggerDownload,
} from '../utils/exportUtils';

interface ExportFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AlumniRecord[];
  scopeLabel: string;
}

export const ExportFieldsModal: React.FC<ExportFieldsModalProps> = ({
  isOpen,
  onClose,
  records,
  scopeLabel,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<keyof AlumniRecord>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key))
  );
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  const toggleKey = (key: keyof AlumniRecord) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedKeys(new Set(EXPORT_FIELDS.map((f) => f.key)));
  };

  const deselectAll = () => {
    setSelectedKeys(new Set());
  };

  const selectPreset = (preset: 'all' | 'verified' | 'aiComparison') => {
    if (preset === 'all') {
      selectAll();
    } else if (preset === 'verified') {
      const verifiedKeys: (keyof AlumniRecord)[] = [
        'sNo',
        'customId',
        'rollNumber',
        'fullName',
        'program',
        'department',
        'passingYear',
        'assignedDate',
        'assignedTo',
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
        'anyRemark',
      ];
      setSelectedKeys(new Set(verifiedKeys));
    } else if (preset === 'aiComparison') {
      const compKeys: (keyof AlumniRecord)[] = [
        'customId',
        'fullName',
        'existingDesignation',
        'aiDesignation',
        'correctedDesignation',
        'existingOrganization',
        'aiCompany',
        'correctedCompany',
        'existingLinkedIn',
        'aiLinkedIn',
        'correctedLinkedIn',
        'aiLocation',
        'correctedCity',
        'correctedCountry',
        'aiConfidence',
        'verificationStatus',
      ];
      setSelectedKeys(new Set(compKeys));
    }
  };

  const handleExportCsv = () => {
    if (selectedKeys.size === 0) {
      showToast('Please select at least one field to export');
      return;
    }
    const csvContent = generateCsv(records, Array.from(selectedKeys));
    const timestamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      csvContent,
      `alumni_export_${scopeLabel.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.csv`,
      'text/csv;charset=utf-8;'
    );
    showToast(`✓ Downloaded CSV (${records.length} rows, ${selectedKeys.size} fields)`);
  };

  const handleCopySheets = async () => {
    if (selectedKeys.size === 0) {
      showToast('Please select at least one field to copy');
      return;
    }
    const tsvContent = generateTsv(records, Array.from(selectedKeys));
    try {
      await navigator.clipboard.writeText(tsvContent);
      showToast(`✓ Copied ${records.length} rows to clipboard for Google Sheets!`);
    } catch {
      showToast('Clipboard copy blocked by browser. Please use Download CSV.');
    }
  };

  const handleExportJson = () => {
    if (selectedKeys.size === 0) {
      showToast('Please select at least one field to export');
      return;
    }
    const jsonContent = generateJson(records, Array.from(selectedKeys));
    const timestamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      jsonContent,
      `alumni_export_${scopeLabel.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.json`,
      'application/json;charset=utf-8;'
    );
    showToast(`✓ Downloaded JSON (${records.length} records)`);
  };

  const filteredFields =
    activeCategory === 'All'
      ? EXPORT_FIELDS
      : EXPORT_FIELDS.filter((f) => f.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A83B24] to-[#C84B34] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Export Fields & Actions</h2>
              <p className="text-[11px] text-amber-100">
                Scope: <span className="font-semibold text-white">{scopeLabel}</span> ({records.length} records) • Selected: {selectedKeys.size} of {EXPORT_FIELDS.length} fields
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Presets Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => selectPreset('all')}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs"
            >
              All Fields ({EXPORT_FIELDS.length})
            </button>
            <button
              type="button"
              onClick={() => selectPreset('verified')}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs"
            >
              Verified Columns (20)
            </button>
            <button
              type="button"
              onClick={() => selectPreset('aiComparison')}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs"
            >
              AI Comparison (16)
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer underline ml-1"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopySheets}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
              title="Copy tab-delimited text ready to paste directly into Google Sheets or Excel"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy for Sheets</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#A83B24] hover:bg-[#8F2F1B] text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Download structured JSON format"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {copiedToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{copiedToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setCopiedToast(null)}
              className="text-emerald-700 underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center space-x-1 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('All')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-[#A83B24] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            All Fields ({EXPORT_FIELDS.length})
          </button>
          {EXPORT_CATEGORIES.map((cat) => {
            const count = EXPORT_FIELDS.filter((f) => f.category === cat).length;
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#A83B24] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Fields List Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredFields.map((field) => {
              const isChecked = selectedKeys.has(field.key);
              return (
                <div
                  key={field.key}
                  onClick={() => toggleKey(field.key)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-white border-[#A83B24]/40 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                    <button
                      type="button"
                      className="shrink-0 text-slate-400 focus:outline-none"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#A83B24]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`font-semibold block truncate ${
                          isChecked ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {field.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {String(field.key)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                    {field.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              CSV includes UTF-8 BOM encoding for seamless display in Microsoft Excel and Google Sheets.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
