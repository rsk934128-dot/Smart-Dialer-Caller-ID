import React, { useState } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ShieldAlert,
  Search,
  Trash2,
  UserPlus,
  Info,
  Clock,
  MapPin,
  CheckCircle,
  FileText,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { CallLog, CallType, Contact, AICallContextSummary } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface CallLogsProps {
  logs: CallLog[];
  lang: Language;
  contacts?: Contact[];
  onInitiateCall: (phone: string, name?: string) => void;
  onOpenAddContact: (phone: string, name?: string) => void;
  onClearLogs: () => void;
  onReportSpam: (phone: string) => void;
  onOpenSmsThread?: (phone: string) => void;
}

export const CallLogs: React.FC<CallLogsProps> = ({
  logs,
  lang,
  contacts = [],
  onInitiateCall,
  onOpenAddContact,
  onClearLogs,
  onReportSpam,
  onOpenSmsThread,
}) => {
  const t = TRANSLATIONS[lang];
  const isBn = lang === 'bn';
  const [filter, setFilter] = useState<'all' | 'missed' | 'outgoing' | 'incoming' | 'spam'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  // AI-driven Call Context Summary state
  const [aiSummary, setAiSummary] = useState<AICallContextSummary | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSelectLog = (log: CallLog) => {
    setSelectedLog(log);
    setAiSummary(null);
    setAiError(null);
    setIsAnalyzingAi(false);
  };

  const handleAnalyzeWithGemini = async (targetLog: CallLog) => {
    if (!targetLog) return;
    setIsAnalyzingAi(true);
    setAiError(null);

    try {
      // Find history of this caller across logs
      const cleanTargetPhone = targetLog.phone.replace(/[^0-9]/g, '');
      const callerHistory = logs.filter((l) => {
        const lClean = l.phone.replace(/[^0-9]/g, '');
        return lClean && lClean === cleanTargetPhone && l.id !== targetLog.id;
      });

      // Find matching contact info if saved
      const matchingContact = contacts.find((c) => {
        const cClean = c.phone.replace(/[^0-9]/g, '');
        return cClean && cClean === cleanTargetPhone;
      });

      const response = await fetch('/api/call-logs/gemini-context-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          log: targetLog,
          callerHistory,
          contact: matchingContact || null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze call context');
      }

      setAiSummary(data.data);
    } catch (err: any) {
      console.error('Call context analysis error:', err);
      setAiError(
        err.message ||
          (isBn
            ? 'কল কনটেক্সট বিশ্লেষণে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।'
            : 'Failed to analyze call context. Please try again.')
      );
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (lang === 'bn') {
      if (mins < 1) return 'এইমাত্র';
      if (mins < 60) return `${mins} মিনিট আগে`;
      if (hours < 24) return `${hours} ঘণ্টা আগে`;
      return `${days} দিন আগে`;
    } else {
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  const getCallIcon = (type: CallType, isSpam?: boolean) => {
    if (isSpam) {
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    }
    switch (type) {
      case 'missed':
      case 'rejected':
        return <PhoneMissed className="w-4 h-4 text-rose-500" />;
      case 'outgoing':
        return <PhoneOutgoing className="w-4 h-4 text-emerald-500" />;
      case 'incoming':
        return <PhoneIncoming className="w-4 h-4 text-sky-500" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'missed' && log.type !== 'missed' && log.type !== 'rejected') return false;
    if (filter === 'outgoing' && log.type !== 'outgoing') return false;
    if (filter === 'incoming' && log.type !== 'incoming') return false;
    if (filter === 'spam' && !log.isSpam) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.name.toLowerCase().includes(q) ||
        log.phone.toLowerCase().includes(q) ||
        (log.spamCategory && log.spamCategory.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div id="call-logs-component" className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="px-4 pt-2 pb-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="call-logs-search"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              id="filter-all-logs"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'all'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.allCalls}
            </button>
            <button
              id="filter-missed-logs"
              onClick={() => setFilter('missed')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'missed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.missedCalls}
            </button>
            <button
              id="filter-incoming-logs"
              onClick={() => setFilter('incoming')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'incoming'
                  ? 'bg-sky-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.incomingCalls}
            </button>
            <button
              id="filter-outgoing-logs"
              onClick={() => setFilter('outgoing')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'outgoing'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.outgoingCalls}
            </button>
            <button
              id="filter-spam-logs"
              onClick={() => setFilter('spam')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'spam'
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {t.spamCalls}
            </button>
          </div>

          {logs.length > 0 && (
            <button
              id="clear-all-logs-btn"
              onClick={onClearLogs}
              title={t.clearLogs}
              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-neutral-400">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">{t.noCallLogs}</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              id={`log-item-${log.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition group cursor-pointer"
              onClick={() => handleSelectLog(log)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  {getCallIcon(log.type, log.isSpam)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold truncate ${
                        log.type === 'missed'
                          ? 'text-rose-600 dark:text-rose-400'
                          : log.isSpam
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {log.name}
                    </p>
                    {log.isSpam && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
                        SPAM {log.spamScore ? `${log.spamScore}%` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    <span>{log.phone}</span>
                    <span>•</span>
                    <span className="font-sans">{formatRelativeTime(log.timestamp)}</span>
                    {log.duration > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(log.duration)}</span>
                      </>
                    )}
                  </div>

                  {log.note && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 max-w-sm truncate">
                      <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{log.note}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Quick Call */}
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  id={`callback-btn-${log.id}`}
                  onClick={() => onInitiateCall(log.phone, log.name)}
                  className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                  title={t.callback}
                >
                  <Phone className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Log Detail Dialog */}
      {selectedLog && (
        <div
          id="log-detail-modal"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 space-y-3.5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {selectedLog.name}
                </h3>
                <p className="text-xs font-mono text-neutral-500 truncate">{selectedLog.phone}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                {getCallIcon(selectedLog.type, selectedLog.isSpam)}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                <span className="text-neutral-400">{t.tabRecents}:</span>
                <span className="font-medium capitalize">{selectedLog.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                <span className="text-neutral-400">Time:</span>
                <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              {selectedLog.duration > 0 && (
                <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                  <span className="text-neutral-400">Duration:</span>
                  <span>{formatDuration(selectedLog.duration)}</span>
                </div>
              )}
              {selectedLog.location && (
                <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                  <span className="text-neutral-400">{t.location}:</span>
                  <span>{selectedLog.location}</span>
                </div>
              )}
              {selectedLog.note && (
                <div className="py-2 border-b border-neutral-100 dark:border-neutral-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t.callNotes || 'কল নোট (Room DB)'}:</span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 p-2 rounded-lg whitespace-pre-wrap">
                    {selectedLog.note}
                  </p>
                </div>
              )}
              {selectedLog.isSpam && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span>{t.highRiskSpam}</span>
                  </div>
                  {selectedLog.spamCategory && <p className="text-[11px]">{selectedLog.spamCategory}</p>}
                </div>
              )}
            </div>

            {/* AI-Driven Context Summary Section (Gemini 3.8 Flash) */}
            <div className="pt-1">
              {!aiSummary ? (
                <div className="space-y-2">
                  <button
                    id="trigger-ai-call-summary-btn"
                    type="button"
                    onClick={() => handleAnalyzeWithGemini(selectedLog)}
                    disabled={isAnalyzingAi}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-75"
                  >
                    {isAnalyzingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{t.aiAnalyzing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{t.aiAnalyzeContext}</span>
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                          Gemini 3.8
                        </span>
                      </>
                    )}
                  </button>

                  {aiError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                      <span className="truncate">{aiError}</span>
                      <button
                        type="button"
                        onClick={() => handleAnalyzeWithGemini(selectedLog)}
                        className="underline text-[11px] font-semibold shrink-0"
                      >
                        {isBn ? 'পুনরায় চেষ্টা' : 'Retry'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  id="ai-call-summary-card"
                  className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/90 to-indigo-50/40 dark:from-neutral-800/90 dark:to-neutral-800/50 border border-blue-200/90 dark:border-indigo-900/60 space-y-2.5 text-xs shadow-2xs"
                >
                  {/* Header: AI badge, Urgency Pill & Re-analyze */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>{t.aiCallContext}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                        Gemini 3.8 Flash
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Urgency Pill */}
                      {aiSummary.urgency === 'urgent' && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{isBn ? 'জরুরি (Urgent)' : 'Urgent'}</span>
                        </span>
                      )}
                      {aiSummary.urgency === 'high' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{isBn ? 'উচ্চ গুরুত্ব (High)' : 'High'}</span>
                        </span>
                      )}
                      {aiSummary.urgency === 'medium' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                          {isBn ? 'মাঝারি (Medium)' : 'Medium'}
                        </span>
                      )}
                      {aiSummary.urgency === 'low' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {isBn ? 'স্বাভাবিক (Low)' : 'Low'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAnalyzeWithGemini(selectedLog)}
                        disabled={isAnalyzingAi}
                        title={t.aiReanalyze}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-700 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Business Intent Badge */}
                  {aiSummary.businessIntent && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                      <span className="text-neutral-400 font-normal">{t.aiBusinessIntent}:</span>
                      <span className="text-blue-600 dark:text-blue-400">{aiSummary.businessIntent}</span>
                    </div>
                  )}

                  {/* Summary Narrative */}
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal bg-white/80 dark:bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60">
                    {aiSummary.summary}
                  </p>

                  {/* Urgency Reason & Pattern Insight */}
                  <div className="space-y-1 text-[11px]">
                    {aiSummary.urgencyReason && (
                      <div className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                          {t.aiUrgency}:
                        </span>
                        <span>{aiSummary.urgencyReason}</span>
                      </div>
                    )}

                    {aiSummary.callerPatternInsight && (
                      <div className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                          {t.aiPatternInsight}:
                        </span>
                        <span>{aiSummary.callerPatternInsight}</span>
                      </div>
                    )}
                  </div>

                  {/* Recommended Action Callout */}
                  {aiSummary.recommendedAction && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
                      <div className="min-w-0 pr-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold block text-blue-600 dark:text-blue-400">
                          {t.aiRecommendedAction}
                        </span>
                        <span className="text-[11px] font-medium leading-tight line-clamp-2">
                          {aiSummary.recommendedAction}
                        </span>
                      </div>
                      {onOpenSmsThread && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSmsThread(selectedLog.phone);
                            setSelectedLog(null);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-semibold flex items-center gap-1 hover:bg-blue-500 transition shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isBn ? 'এসএমএস' : 'SMS'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/40">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        {t.aiKeyTakeaways}:
                      </span>
                      <ul className="space-y-0.5">
                        {aiSummary.keyPoints.map((pt, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300"
                          >
                            <span className="text-blue-500 text-xs shrink-0">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="modal-callback-btn"
                onClick={() => {
                  onInitiateCall(selectedLog.phone, selectedLog.name);
                  setSelectedLog(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>{t.callback}</span>
              </button>

              {!selectedLog.contactId ? (
                <button
                  id="modal-add-contact-btn"
                  onClick={() => {
                    onOpenAddContact(selectedLog.phone, selectedLog.name);
                    setSelectedLog(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.addContact}</span>
                </button>
              ) : (
                <button
                  id="modal-report-spam-btn"
                  onClick={() => {
                    onReportSpam(selectedLog.phone);
                    setSelectedLog(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t.reportSpam}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

