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
} from 'lucide-react';
import { CallLog, CallType } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface CallLogsProps {
  logs: CallLog[];
  lang: Language;
  onInitiateCall: (phone: string, name?: string) => void;
  onOpenAddContact: (phone: string, name?: string) => void;
  onClearLogs: () => void;
  onReportSpam: (phone: string) => void;
}

export const CallLogs: React.FC<CallLogsProps> = ({
  logs,
  lang,
  onInitiateCall,
  onOpenAddContact,
  onClearLogs,
  onReportSpam,
}) => {
  const t = TRANSLATIONS[lang];
  const [filter, setFilter] = useState<'all' | 'missed' | 'outgoing' | 'incoming' | 'spam'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

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
              onClick={() => setSelectedLog(log)}
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
            className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedLog.name}
                </h3>
                <p className="text-xs font-mono text-neutral-500">{selectedLog.phone}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                {getCallIcon(selectedLog.type, selectedLog.isSpam)}
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
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

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
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
