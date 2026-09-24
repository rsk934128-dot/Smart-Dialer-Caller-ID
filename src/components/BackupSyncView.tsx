import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Phone,
  Users,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Download,
  Lock,
  LogIn,
  Check,
  Zap,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { BackupMetadata, RoomDbMetrics } from '../types';
import { roomDbService } from '../db/roomDatabaseService';
import { cloudSyncService, CloudSyncStatus } from '../services/cloudSyncService';
import { auth, loginWithGoogle } from '../firebase';

interface BackupSyncViewProps {
  lang: Language;
  onOpenAuth?: () => void;
  onCloseModal?: () => void;
}

export const BackupSyncView: React.FC<BackupSyncViewProps> = ({
  lang,
  onOpenAuth,
  onCloseModal,
}) => {
  const t = TRANSLATIONS[lang];
  const isBn = lang === 'bn';

  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() =>
    cloudSyncService.getStatus()
  );
  const [metrics, setMetrics] = useState<RoomDbMetrics | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupMetadata | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ step: string; percent: number }>({
    step: '',
    percent: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Subscribe to sync service
  useEffect(() => {
    const unsub = cloudSyncService.subscribe((status) => {
      setSyncStatus(status);
      if (status.lastSyncedAt) {
        // Refresh backup info whenever sync state changes
        loadBackupData();
      }
    });
    return () => unsub();
  }, []);

  const loadBackupData = async () => {
    try {
      const [m, b] = await Promise.all([
        roomDbService.getMetrics(),
        roomDbService.getLastBackupInfo(),
      ]);
      setMetrics(m);
      if (b) {
        setLastBackup(b);
      } else if (syncStatus?.lastSyncedAt) {
        const d =
          syncStatus.lastSyncedAt instanceof Date
            ? syncStatus.lastSyncedAt
            : new Date(syncStatus.lastSyncedAt);
        if (!isNaN(d.getTime())) {
          setLastBackup({
            timestamp: d.toISOString(),
            contactsCount: syncStatus.syncedContactsCount || m.contactsCount,
            callLogsCount: syncStatus.syncedLogsCount || m.callLogsCount,
            blockedCount: syncStatus.syncedBlockedCount || m.spamCount,
            messagesCount: m.messagesCount || 0,
            totalEntities:
              (syncStatus.syncedContactsCount || m.contactsCount) +
              (syncStatus.syncedLogsCount || m.callLogsCount) +
              (syncStatus.syncedBlockedCount || m.spamCount),
            source: 'room_to_firestore',
            status: 'success',
          });
        }
      }
    } catch (e) {
      console.error('Failed to load backup metrics:', e);
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  // Format date helper
  const formatBackupDate = (isoString?: string | null): { full: string; relative: string } => {
    if (!isoString) {
      return {
        full: isBn ? 'কোনো ব্যাকআপ নেই' : 'No backup yet',
        relative: isBn ? 'কখনো নয়' : 'Never',
      };
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return {
        full: isBn ? 'অজানা তারিখ' : 'Unknown date',
        relative: isBn ? 'কখনো নয়' : 'Never',
      };
    }

    const locale = isBn ? 'bn-BD' : 'en-US';
    const datePart = d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (diffSec < 45) {
      relative = isBn ? 'এইমাত্র' : 'Just now';
    } else if (diffMin < 60) {
      relative = isBn ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
    } else if (diffHours < 24) {
      relative = isBn ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
    } else {
      relative = isBn ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    }

    return {
      full: `${datePart}, ${timePart}`,
      relative,
    };
  };

  // Trigger manual full sync
  const handleTriggerFullBackup = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg(
        isBn
          ? 'ক্লাউড ফায়ারস্টোরে ব্যাকআপ রাখতে আপনার অ্যাকাউন্ট লগইন করুন।'
          : 'Please sign in to backup Room DB to Google Cloud Firestore.'
      );
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    setIsSyncing(true);
    setSyncProgress({
      step: isBn ? 'রুম ডিবি ডাটাবেজ প্রস্তুত করা হচ্ছে...' : 'Initializing Room DB tables...',
      percent: 15,
    });

    try {
      const result = await cloudSyncService.syncAllLocalDataToCloud((step, percent) => {
        setSyncProgress({ step, percent });
      });

      setLastBackup(result);
      await loadBackupData();

      setSuccessMsg(
        isBn
          ? `সফলভাবে ব্যাকআপ সম্পন্ন হয়েছে! ${result.contactsCount}টি কন্টাক্ট, ${result.callLogsCount}টি কল হিস্টোরি ও ${result.blockedCount}টি ব্লক নম্বর ফায়ারস্টোরে আপলোড হয়েছে।`
          : `Full backup succeeded! Synced ${result.contactsCount} contacts, ${result.callLogsCount} call logs, and ${result.blockedCount} blocked numbers to Firestore.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        isBn
          ? `ব্যাকআপ ব্যর্থ হয়েছে: ${msg}`
          : `Backup failed: ${msg}`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // 1-Click Google Sign In for instant backup
  const handleInstantGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      await loadBackupData();
      // Auto trigger backup right after signing in
      setTimeout(() => {
        handleTriggerFullBackup();
      }, 500);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as any).code : '';
      const isClosed =
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked' ||
        err.includes('popup-closed-by-user') ||
        err.includes('cancelled-popup-request') ||
        err.includes('popup-blocked');
      if (!isClosed) {
        setErrorMsg(isBn ? `সাইন ইন ব্যর্থ হয়েছে: ${err}` : `Sign-in failed: ${err}`);
      } else {
        setErrorMsg(isBn ? 'সাইন-ইন পপআপ বন্ধ বা বাতিল করা হয়েছে।' : 'Sign-in popup was cancelled or closed.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Offline Room DB JSON export
  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const dump = await roomDbService.exportDatabaseJson();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart_dialer_room_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  let syncTimestampString: string | undefined = undefined;
  if (syncStatus?.lastSyncedAt) {
    const d =
      syncStatus.lastSyncedAt instanceof Date
        ? syncStatus.lastSyncedAt
        : new Date(syncStatus.lastSyncedAt);
    if (!isNaN(d.getTime())) {
      syncTimestampString = d.toISOString();
    }
  }
  const backupDateInfo = formatBackupDate(lastBackup?.timestamp || syncTimestampString);
  const user = syncStatus.user || auth.currentUser;

  return (
    <div id="backup-sync-view" className="space-y-4 animate-fadeIn">
      {/* Top Banner / Card */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-800/80 p-4 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-cyan-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-cyan-950/20 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <span>{t.backupTabFull}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  SQLite ➔ Firestore
                </span>
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                {t.backupDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Engine Pipeline Status */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100 dark:border-blue-900/60 flex-wrap gap-2">
          {/* Room DB Status */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {isBn ? 'রুম ডিবি:' : 'Room DB:'}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {isBn ? 'সক্রিয় (Offline-First)' : 'Active (Offline-First)'}
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-blue-400 hidden sm:inline" />

          {/* Firestore Cloud Status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {isBn ? 'ফায়ারস্টোর:' : 'Firestore:'}
            </span>
            <span
              className={`font-medium ${
                user
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {user
                ? isBn
                  ? 'সংযুক্ত (Connected)'
                  : 'Connected'
                : isBn
                ? 'লগইন প্রয়োজন'
                : 'Sign-in required'}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* LAST SUCCESSFUL BACKUP CARD */}
      <div
        id="last-backup-card"
        className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {t.backupLastSuccess}
              </h4>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {isBn ? 'রুম ডিবি মেটাডাটা ও ক্লাউড রেজিস্ট্রি' : 'Room DB Metadata & Cloud Registry'}
              </p>
            </div>
          </div>

          {lastBackup ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <Check className="w-3 h-3" />
              <span>{backupDateInfo.relative}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-3 h-3" />
              <span>{isBn ? 'কোনো ব্যাকআপ নেই' : 'No Backup'}</span>
            </span>
          )}
        </div>

        {/* Date Display */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-[10px] text-neutral-400 font-medium">
                {t.backupLastSuccess}
              </p>
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {lastBackup ? backupDateInfo.full : t.backupNeverRun}
              </p>
            </div>
          </div>

          {lastBackup?.timestamp && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-mono text-neutral-400 block">
                {new Date(lastBackup.timestamp).toISOString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ROOM DB ENTITIES INCLUDED IN BACKUP */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {t.backupEntitiesTitle}
            </h4>
          </div>
          <span className="text-[10px] font-mono font-semibold text-neutral-400">
            Room DB v2.0
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          {/* Contacts */}
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.backupContacts}</span>
            </div>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              {metrics?.contactsCount ?? '...'}
            </p>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
              users/{'{uid}'}/contacts
            </p>
          </div>

          {/* Call Logs */}
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
              <Phone className="w-3.5 h-3.5 text-cyan-600" />
              <span>{t.backupCallLogs}</span>
            </div>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              {metrics?.callLogsCount ?? '...'}
            </p>
            <p className="text-[9px] text-cyan-600 dark:text-cyan-400 font-medium">
              users/{'{uid}'}/call_logs
            </p>
          </div>

          {/* Blocked Spam */}
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>{t.backupBlocked}</span>
            </div>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              {metrics?.spamCount ?? '...'}
            </p>
            <p className="text-[9px] text-rose-600 dark:text-rose-400 font-medium">
              users/{'{uid}'}/blocked_numbers
            </p>
          </div>

          {/* Messages */}
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.backupMessages}</span>
            </div>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              {metrics?.messagesCount ?? '...'}
            </p>
            <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">
              Local Room SQLite
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Sync Progress Display */}
      {isSyncing && (
        <div className="rounded-2xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-4 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-100">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>{syncProgress.step || t.backupSyncing}</span>
            </span>
            <span className="font-mono text-blue-600 dark:text-blue-400">{syncProgress.percent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(syncProgress.percent, 8)}%` }}
            />
          </div>
        </div>
      )}

      {/* AUTH STATUS / SIGN IN CALLOUT */}
      {!user && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-100">
                {isBn ? 'ফায়ারস্টোর ক্লাউড সিঙ্ক করতে সাইন ইন করুন' : 'Sign in to enable Cloud Firestore Backup'}
              </h5>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed mt-0.5">
                {isBn
                  ? 'গুগল বা ইমেইল দিয়ে সাইন ইন করলে আপনার রুম ডিবি ব্যাকআপ ক্লাউড ফায়ারস্টোরে সংরক্ষিত হবে এবং যেকোনো ডিভাইসে রিস্টোর করা যাবে।'
                  : 'Signing in links your offline Room DB to Google Cloud Firestore, enabling multi-device synchronization and automatic cloud restore.'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              id="backup-google-signin-btn"
              type="button"
              onClick={handleInstantGoogleSignIn}
              disabled={isLoggingIn}
              className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
              <span>{isLoggingIn ? (isBn ? 'লগইন হচ্ছে...' : 'Signing in...') : (isBn ? 'গুগল সাইন ইন' : 'Google Sign In')}</span>
            </button>

            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition"
              >
                {isBn ? 'ইমেইল লগইন' : 'Email Sign In'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* User Connected Card */}
      {user && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-3 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-emerald-500 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                Firestore User ID: {user.uid.slice(0, 12)}...
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isBn ? 'ক্লাউড সক্রিয়' : 'Connected'}</span>
          </span>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="space-y-2 pt-1">
        {/* Main Manual Trigger Button */}
        <button
          id="trigger-full-backup-btn"
          type="button"
          onClick={handleTriggerFullBackup}
          disabled={isSyncing}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing
              ? isBn
                ? 'রুম ডিবি ফায়ারস্টোরে সিঙ্ক হচ্ছে...'
                : 'Syncing Room DB to Firestore...'
              : t.backupTriggerBtn}
          </span>
        </button>

        {/* Offline JSON Export Button */}
        <button
          id="export-room-json-btn"
          type="button"
          onClick={handleExportJson}
          disabled={isExporting}
          className="w-full py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>
            {isExporting
              ? isBn
                ? 'এক্সপোর্ট হচ্ছে...'
                : 'Exporting JSON...'
              : isBn
              ? 'লোকাল JSON ব্যাকআপ ফাইল ডাউনলোড করুন (Offline File)'
              : 'Download Offline JSON Backup File'}
          </span>
        </button>
      </div>

      {/* Technical Architecture Footnote */}
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 p-2.5 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/50 space-y-1">
        <p className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span>{isBn ? 'ব্যাকআপ টেকনিক্যাল মেকানিজম:' : 'Backup Technical Architecture:'}</span>
        </p>
        <p className="leading-relaxed">
          {isBn
            ? 'ডিভাইসে সব কল ও কন্টাক্ট সাব-মিলিমিটার গতির অ্যান্ড্রয়েড Room DB (Dexie.js IndexedDB/SQLite) এ সংরক্ষিত থাকে। ব্যাকআপ শুরু করলে সম্পূর্ণ টেবিল ডেটা গুগল ক্লাউড ফায়ারস্টোর (Firestore NoSQL) এ ব্যাচ-আপলোড হয় এবং লোকাল মেটাডাটাতে সর্বশেষ তারিখ ও সময় স্থায়ীভাবে লিপিবদ্ধ থাকে।'
            : 'All calls and contacts reside locally in the Android Room DB (Dexie.js SQLite engine) for instant sub-millisecond lookups. Triggering backup syncs all records to Google Cloud Firestore, recording the timestamp in Room DB metadata.'}
        </p>
      </div>
    </div>
  );
};
