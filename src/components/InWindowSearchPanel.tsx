import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Globe,
  HelpCircle,
  Link2,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';
import { EditableFields } from '../types';

interface InWindowSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alumniName: string;
  defaultQuery: string;
  customSearchUrl?: string;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  isTaller?: boolean;
  onToggleTaller?: () => void;
  widthPercent?: number;
  onSetWidthPercent?: (pct: number) => void;
  // Optional Form Handlers for compatibility
  onApplyField?: (field: keyof EditableFields, value: string) => void;
  onApplyMultipleFields?: (updates: Partial<EditableFields>) => void;
  currentFormData?: EditableFields;
}

export const InWindowSearchPanel: React.FC<InWindowSearchPanelProps> = ({
  isOpen,
  onClose,
  alumniName,
  defaultQuery,
  customSearchUrl,
  isMaximized,
  onToggleMaximize,
  isTaller = false,
  onToggleTaller,
  widthPercent = 50,
  onSetWidthPercent,
}) => {
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [iframeUrl, setIframeUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Compact header mode to drastically increase vertical height for search results
  const [isCompactHeader, setIsCompactHeader] = useState<boolean>(() => {
    return localStorage.getItem('google_search_compact_header') === 'true';
  });

  const toggleCompactHeader = () => {
    setIsCompactHeader((prev) => {
      const next = !prev;
      localStorage.setItem('google_search_compact_header', String(next));
      return next;
    });
  };

  // Helper to build embeddable URL with igu=1
  const computeUrls = (query: string, rawUrl?: string) => {
    let cleanRaw = (rawUrl || '').trim();
    // Check if rawUrl is a formula like =HYPERLINK("...")
    const match = cleanRaw.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanRaw = match[1].trim();
    }

    let embed = '';
    let ext = '';
    let detectedQuery = query;

    if (cleanRaw) {
      let urlWithProto = cleanRaw;
      if (!urlWithProto.startsWith('http://') && !urlWithProto.startsWith('https://')) {
        urlWithProto = 'https://' + urlWithProto;
      }

      try {
        const u = new URL(urlWithProto);
        // If it's a Google Search URL (e.g. google.com, google.co.in, etc.)
        if (
          u.hostname.includes('google.') &&
          (u.pathname.includes('/search') || u.searchParams.has('q'))
        ) {
          // igu=1 allows rendering Google Search inside an iframe without X-Frame-Options blocking
          u.searchParams.set('igu', '1');
          embed = u.toString();
          ext = urlWithProto;
          if (u.searchParams.has('q')) {
            detectedQuery = u.searchParams.get('q') || query;
          }
        } else if (u.hostname.includes('google.')) {
          u.searchParams.set('igu', '1');
          embed = u.toString();
          ext = urlWithProto;
        } else {
          // Direct URL (e.g. web page or search engine)
          embed = urlWithProto;
          ext = urlWithProto;
        }
      } catch {
        embed = `https://www.google.com/search?igu=1&q=${encodeURIComponent(cleanRaw)}`;
        ext = `https://www.google.com/search?q=${encodeURIComponent(cleanRaw)}`;
        detectedQuery = cleanRaw;
      }
    } else {
      embed = `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`;
      ext = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    return { embed, ext, detectedQuery };
  };

  // Sync when defaultQuery or customSearchUrl or alumniName changes
  useEffect(() => {
    const { embed, ext, detectedQuery } = computeUrls(defaultQuery, customSearchUrl);
    setSearchQuery(detectedQuery);
    setIframeUrl(embed);
    setExternalUrl(ext);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [defaultQuery, customSearchUrl, alumniName]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const { embed, ext } = computeUrls(searchQuery);
    setIframeUrl(embed);
    setExternalUrl(ext);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleResetToSheetUrl = () => {
    const { embed, ext, detectedQuery } = computeUrls(defaultQuery, customSearchUrl);
    setSearchQuery(detectedQuery);
    setIframeUrl(embed);
    setExternalUrl(ext);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleQuickTag = (tag: string) => {
    const newQuery = `${alumniName} ${tag}`.trim();
    setSearchQuery(newQuery);
    const { embed, ext } = computeUrls(newQuery);
    setIframeUrl(embed);
    setExternalUrl(ext);
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      id="in-window-google-search-panel"
      style={!isMaximized ? { width: `${widthPercent}%` } : undefined}
      className={`flex flex-col bg-white border-l border-slate-200 shadow-xl transition-all duration-150 ${
        isMaximized
          ? 'fixed inset-y-0 right-0 w-full sm:w-full z-50'
          : isTaller
          ? 'absolute inset-y-0 right-0 h-full z-30 shadow-2xl'
          : 'h-full relative z-20'
      }`}
    >
      {/* Search Header - Compact Mode (Maximizes vertical height for search iframe) */}
      {isCompactHeader ? (
        <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
            </div>
            {customSearchUrl && (
              <span
                title={`Search_URL: ${customSearchUrl}`}
                className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline-flex items-center space-x-0.5 shrink-0"
              >
                <Link2 className="w-2.5 h-2.5" />
                <span>Sheet URL</span>
              </span>
            )}
          </div>

          {/* Compact Inline Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-1 min-w-0">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search Google for ${alumniName}...`}
                className="w-full text-xs pl-7 pr-2 py-1 bg-white border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#A83B24] font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#A83B24] hover:bg-[#912F1B] text-white text-[11px] font-semibold rounded transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              Search
            </button>
          </form>

          {/* Quick Header Controls */}
          <div className="flex items-center space-x-0.5 shrink-0">
            {/* Quick Width Presets */}
            {onSetWidthPercent && !isMaximized && (
              <div className="hidden md:flex items-center space-x-0.5 bg-slate-200/70 p-0.5 rounded text-[10px]">
                <button
                  type="button"
                  onClick={() => onSetWidthPercent(42)}
                  className={`px-1 py-0.2 rounded cursor-pointer ${
                    widthPercent <= 45 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Narrow width (42%)"
                >
                  42%
                </button>
                <button
                  type="button"
                  onClick={() => onSetWidthPercent(52)}
                  className={`px-1 py-0.2 rounded cursor-pointer ${
                    widthPercent > 45 && widthPercent < 62 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Standard width (52%)"
                >
                  52%
                </button>
                <button
                  type="button"
                  onClick={() => onSetWidthPercent(65)}
                  className={`px-1 py-0.2 rounded cursor-pointer ${
                    widthPercent >= 62 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Wide width (65%)"
                >
                  65%
                </button>
              </div>
            )}

            {/* Vertical Height Taller Toggle */}
            {onToggleTaller && !isMaximized && (
              <button
                onClick={onToggleTaller}
                title={isTaller ? 'Exit full-height mode' : 'Taller view: expand vertically over top bar (+75px vertical)'}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isTaller
                    ? 'bg-[#FAF0ED] text-[#A83B24] font-semibold'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                {isTaller ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpToLine className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Compact Header Toggle */}
            <button
              onClick={toggleCompactHeader}
              title="Expand search toolbar & quick pills"
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh Search"
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in new browser tab"
              className="p-1 text-slate-500 hover:text-[#A83B24] hover:bg-slate-200/70 rounded cursor-pointer inline-flex items-center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restore split view' : 'Maximize search window'}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              title="Close search panel"
              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer ml-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Header Mode */
        <div className="px-3.5 py-2.5 bg-[#FAF7F5] border-b border-[#EAE1DA] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-[#FAF0ED] text-[#A83B24] flex items-center justify-center border border-[#ECD5CC] shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-[#A83B24]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                    Google Search
                  </h3>
                  {customSearchUrl ? (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                      <Link2 className="w-2.5 h-2.5 text-emerald-700" />
                      <span>Search_URL from Sheet</span>
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#FAF0ED] text-[#A83B24] border border-[#ECD5CC]">
                      In-Window
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 truncate max-w-[220px] sm:max-w-xs">
                  Target: <strong className="text-slate-700">{alumniName}</strong>
                </p>
              </div>
            </div>

            {/* Action controls */}
            <div className="flex items-center space-x-1">
              {/* Quick Width Presets */}
              {onSetWidthPercent && !isMaximized && (
                <div className="hidden sm:flex items-center space-x-0.5 bg-slate-200/70 p-0.5 rounded text-[10px] mr-1">
                  <button
                    type="button"
                    onClick={() => onSetWidthPercent(42)}
                    className={`px-1.5 py-0.2 rounded cursor-pointer ${
                      widthPercent <= 45 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Narrow width (42%)"
                  >
                    42%
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetWidthPercent(52)}
                    className={`px-1.5 py-0.2 rounded cursor-pointer ${
                      widthPercent > 45 && widthPercent < 62 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Standard width (52%)"
                  >
                    52%
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetWidthPercent(65)}
                    className={`px-1.5 py-0.2 rounded cursor-pointer ${
                      widthPercent >= 62 ? 'bg-white font-bold text-[#A83B24] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Wide width (65%)"
                  >
                    65%
                  </button>
                </div>
              )}

              {/* Vertical Height Taller Toggle */}
              {onToggleTaller && !isMaximized && (
                <button
                  onClick={onToggleTaller}
                  title={isTaller ? 'Exit full-height mode' : 'Taller view: expand vertically over top bar (+75px vertical)'}
                  className={`p-1.5 rounded cursor-pointer transition-colors ${
                    isTaller
                      ? 'bg-[#FAF0ED] text-[#A83B24] font-semibold'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {isTaller ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpToLine className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Compact Header Toggle (gives +90px vertical height) */}
              <button
                onClick={toggleCompactHeader}
                title="Compact header: collapse toolbar for +90px vertical search results"
                className="p-1.5 text-slate-500 hover:text-[#A83B24] hover:bg-slate-200/70 rounded cursor-pointer"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRefresh}
                title="Refresh Search"
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in new browser tab"
                className="inline-flex items-center space-x-1 px-1.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#A83B24] hover:bg-slate-200/70 rounded cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </a>

              <button
                onClick={onToggleMaximize}
                title={isMaximized ? 'Restore split view' : 'Maximize search window'}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onClose}
                title="Close search panel"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Search Query Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#A83B24] font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#A83B24] hover:bg-[#912F1B] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              Search
            </button>
          </form>

          {/* Quick query pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 text-[10.5px]">
            {customSearchUrl && (
              <button
                type="button"
                onClick={handleResetToSheetUrl}
                className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-semibold shrink-0 cursor-pointer shadow-2xs flex items-center space-x-1"
                title="Reset search to the exact Search_URL from the sheet"
              >
                <Link2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>Reset to Sheet URL</span>
              </button>
            )}
            <span className="text-slate-400 shrink-0 text-[10px]">Quick:</span>
            <button
              type="button"
              onClick={() => handleQuickTag('LinkedIn')}
              className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-[#A83B24] hover:text-[#A83B24] text-slate-600 font-medium shrink-0 cursor-pointer shadow-2xs"
            >
              + LinkedIn
            </button>
            <button
              type="button"
              onClick={() => handleQuickTag('IIT Kanpur LinkedIn')}
              className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-[#A83B24] hover:text-[#A83B24] text-slate-600 font-medium shrink-0 cursor-pointer shadow-2xs"
            >
              + IIT Kanpur
            </button>
            <button
              type="button"
              onClick={() => handleQuickTag('Designation Company')}
              className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-[#A83B24] hover:text-[#A83B24] text-slate-600 font-medium shrink-0 cursor-pointer shadow-2xs"
            >
              + Career
            </button>
          </div>
        </div>
      )}

      {/* Frame Container */}
      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-2 text-slate-500">
              <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading Google Search results...</span>
            </div>
          </div>
        )}

        {iframeUrl ? (
          <iframe
            key={iframeKey}
            id="google-search-iframe"
            src={iframeUrl}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            className="w-full h-full border-0 bg-white"
            title={`Google Search - ${alumniName}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No search query available.
          </div>
        )}
      </div>

      {/* Footer / Status bar */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10.5px] text-slate-500 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center space-x-1.5 truncate">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            Live search results for <strong className="text-slate-700">{alumniName}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline font-medium inline-flex items-center space-x-1"
          >
            <span>Open in new tab</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
