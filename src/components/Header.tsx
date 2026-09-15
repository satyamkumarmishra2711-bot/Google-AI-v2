import React from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  RefreshCw,
  Settings,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { SheetConfig } from '../types';

interface HeaderProps {
  user: User | null;
  accessToken: string | null;
  sheetConfig: SheetConfig;
  sheetTitle: string;
  totalRecords: number;
  isLoading: boolean;
  isSaving: boolean;
  lastSyncedAt: Date | null;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  accessToken,
  sheetConfig,
  sheetTitle,
  totalRecords,
  isLoading,
  isSaving,
  lastSyncedAt,
  onOpenSettings,
  onRefresh,
  onSignIn,
  onSignOut,
}) => {
  const isConnected = !!(accessToken && sheetConfig.spreadsheetId && sheetConfig.sheetName);

  return (
    <header className="bg-white border-b border-[#EAE1DA] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Sheet Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#A83B24] flex items-center justify-center text-white shadow-sm shadow-[#A83B24]/25">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                  Alumni Verification Portal
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FAF4F1] text-[#A83B24] border border-[#ECD5CC]">
                  Direct Sheets Sync
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                {isConnected ? (
                  <span className="flex items-center text-[#A83B24] font-medium space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#A83B24] animate-pulse" />
                    <span>
                      {sheetTitle ? `${sheetTitle} › ` : ''}
                      <strong className="font-semibold text-slate-800">{sheetConfig.sheetName}</strong>
                    </span>
                    {totalRecords > 0 && (
                      <span className="text-slate-400">({totalRecords.toLocaleString()} rows)</span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center text-amber-600 space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Google Sheet not connected</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center space-x-3">
          {isConnected && (
            <>
              {lastSyncedAt && (
                <span className="text-xs text-slate-400 hidden md:inline-block">
                  Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                id="btn-refresh-sheet"
                onClick={onRefresh}
                disabled={isLoading || isSaving}
                title="Refresh latest data from Google Sheet"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-[#FAF4F1] border border-[#EAE1DA] rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#A83B24]' : ''}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              {sheetConfig.spreadsheetId && (
                <a
                  id="link-open-google-sheet"
                  href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open live Google Sheet in new tab"
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-[#A83B24] hover:bg-[#FAF4F1] border border-[#EAE1DA] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Open Sheet</span>
                </a>
              )}
            </>
          )}

          {/* Reconnect button if user is authenticated but token expired */}
          {user && !accessToken && sheetConfig.spreadsheetId && (
            <button
              id="btn-header-reconnect"
              onClick={onSignIn}
              title="Renew Google Sheets session"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Reconnect Sheet</span>
            </button>
          )}

          {/* Connection Settings */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              !isConnected
                ? 'bg-[#A83B24] hover:bg-[#912F1B] text-white border-transparent shadow-sm'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-[#EAE1DA]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isConnected ? 'Sheet Settings' : 'Connect Google Sheet'}</span>
          </button>

          {/* User Profile / Google Sign-In */}
          {user ? (
            <div className="flex items-center pl-2 border-l border-slate-200 space-x-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden xl:block text-left text-xs leading-tight">
                <p className="font-medium text-slate-800 truncate max-w-[130px]">
                  {user.displayName || 'Verifier'}
                </p>
                <p className="text-slate-400 truncate max-w-[130px]">{user.email}</p>
              </div>
              <button
                id="btn-sign-out"
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-sign-in"
              onClick={onSignIn}
              className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
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
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
