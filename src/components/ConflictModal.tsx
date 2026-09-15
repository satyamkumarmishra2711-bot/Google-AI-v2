import React from 'react';
import { AlertTriangle, RotateCcw, Save, X } from 'lucide-react';
import { ConflictDetails } from '../types';

interface ConflictModalProps {
  conflict: ConflictDetails | null;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ conflict, onClose }) => {
  if (!conflict) return null;

  const diffFields = Object.keys(conflict.sheetValues).filter(
    (key) =>
      conflict.sheetValues[key as keyof typeof conflict.sheetValues] !==
      conflict.localValues[key as keyof typeof conflict.localValues]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sheet Record Modified by Another User
              </h2>
              <p className="text-xs text-amber-800">
                Record: <strong>{conflict.fullName}</strong> ({conflict.recordId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Another team member has updated this record directly in Google Sheet since you opened it.
            To prevent accidental overwrites, please review the differences below:
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Field</th>
                  <th className="p-2.5 bg-amber-50/70 text-amber-900">Current in Google Sheet</th>
                  <th className="p-2.5 bg-emerald-50/70 text-emerald-900">Your Pending Edits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diffFields.map((field) => (
                  <tr key={field} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-medium text-slate-700 capitalize">
                      {field.replace(/([A-Z])/g, ' $1')}
                    </td>
                    <td className="p-2.5 text-slate-800 bg-amber-50/30 font-medium">
                      {conflict.sheetValues[field as keyof typeof conflict.sheetValues] || (
                        <span className="text-slate-400 italic">empty</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-800 bg-emerald-50/30 font-medium">
                      {conflict.localValues[field as keyof typeof conflict.localValues] || (
                        <span className="text-slate-400 italic">empty</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              conflict.onReload();
              onClose();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reload Latest from Sheet (Recommended)</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await conflict.onForceOverwrite();
              onClose();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Overwrite Sheet Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
