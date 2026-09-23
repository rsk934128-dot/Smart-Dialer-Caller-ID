import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogIn,
  UserPlus,
  LogOut,
  ShieldCheck,
  Cloud,
  CloudCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  PhoneCall,
  Sparkles,
  Database,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { loginWithGoogle, loginWithEmail, registerWithEmail, logoutUser } from '../firebase';
import { cloudSyncService, CloudSyncStatus } from '../services/cloudSyncService';
import { Language } from '../utils/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  syncStatus: CloudSyncStatus;
  onOpenBackup?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  syncStatus,
  onOpenBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  if (!isOpen) return null;

  const isBn = lang === 'bn';
  const user = syncStatus.user;

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await loginWithGoogle();
      setSuccessMessage(
        isBn
          ? 'গুগল দিয়ে সফলভাবে লগইন হয়েছে! আপনার ডাটা ক্লাউডে সুরক্ষিত থাকবে।'
          : 'Signed in with Google successfully! Data is now synced with Cloud.'
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage(isBn ? 'লগইন পপআপ বন্ধ করা হয়েছে।' : 'Sign-in popup closed by user.');
      } else {
        setErrorMessage(
          isBn
            ? `লগইন ব্যর্থ হয়েছে: ${msg}`
            : `Authentication failed: ${msg}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন।' : 'Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(isBn ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (activeTab === 'register') {
        await registerWithEmail(email, password, displayName);
        setSuccessMessage(
          isBn
            ? 'অ্যাকাউন্ট রেজিস্ট্রেশন সফল হয়েছে! ডাটা ক্লাউড সিঙ্কে যুক্ত হয়েছে।'
            : 'Registration successful! Your phone data will stay backed up.'
        );
      } else {
        await loginWithEmail(email, password);
        setSuccessMessage(
          isBn
            ? 'লগইন সফল হয়েছে! ক্লাউড থেকে ডাটা সিঙ্ক হচ্ছে।'
            : 'Login successful! Syncing data with cloud.'
        );
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setErrorMessage(isBn ? 'ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে।' : 'Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setErrorMessage(isBn ? 'এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।' : 'Email already registered. Please sign in instead.');
      } else if (msg.includes('operation-not-allowed')) {
        setErrorMessage(
          isBn
            ? 'ইমেইল/পাসওয়ার্ড প্রোভাইডার কনসোলে বন্ধ থাকলে সরাসরি ১-ক্লিক গুগল লগইন ব্যবহার করুন।'
            : 'Email auth not enabled. Please use Google 1-Click sign in.'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setSuccessMessage(isBn ? 'লগআউট সফল হয়েছে।' : 'Logged out successfully.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'লগআউট ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await cloudSyncService.syncAllLocalDataToCloud();
      setSuccessMessage(
        isBn
          ? 'সব কন্টাক্টস, কল লগ ও সেটিংস ক্লাউডে সেভ করা হয়েছে!'
          : 'All contacts and logs saved to Cloud!'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'সিঙ্ক ব্যর্থ হয়েছে');
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <div
      id="firebase-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {user
                  ? (isBn ? 'ক্লাউড ব্যাকআপ ও প্রোফাইল' : 'Cloud Backup & Profile')
                  : (isBn ? 'ইউজার অ্যাকাউন্ট ও ক্লাউড ব্যাকআপ' : 'User Account & Cloud Backup')}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isBn ? 'Firebase Authentication & Firestore' : 'Firebase Cloud Sync'}
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Notification Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {user ? (
            /* Logged-In User Profile & Sync Dashboard */
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-cyan-500 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-lg">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {user.displayName || 'স্মার্ট ডায়ালার ইউজার'}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate font-mono">
                    {user.email}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{isBn ? 'লগইন সক্রিয় (ক্লাউড কানেক্টেড)' : 'Cloud Active'}</span>
                  </span>
                </div>
              </div>

              {/* Cloud Sync Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{isBn ? 'ক্লাউডে সংরক্ষিত ডাটা:' : 'Cloud Synced Data:'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {(() => {
                      if (!syncStatus?.lastSyncedAt) return isBn ? 'সিঙ্ক হয়নি' : 'Not synced';
                      const d =
                        syncStatus.lastSyncedAt instanceof Date
                          ? syncStatus.lastSyncedAt
                          : new Date(syncStatus.lastSyncedAt);
                      if (isNaN(d.getTime())) return isBn ? 'সিঙ্ক হয়নি' : 'Not synced';
                      try {
                        return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${isBn ? 'এ সিঙ্কড' : 'synced'}`;
                      } catch {
                        return isBn ? 'সিঙ্কড' : 'Synced';
                      }
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <p className="text-[10px] text-neutral-400">{isBn ? 'কন্টাক্টস' : 'Contacts'}</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {syncStatus.syncedContactsCount}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <p className="text-[10px] text-neutral-400">{isBn ? 'কল লগস' : 'Call Logs'}</p>
                    <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      {syncStatus.syncedLogsCount}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <p className="text-[10px] text-neutral-400">{isBn ? 'ব্লক লিস্ট' : 'Blocked'}</p>
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {syncStatus.syncedBlockedCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  id="manual-cloud-sync-btn"
                  onClick={handleTriggerManualSync}
                  disabled={isManualSyncing || syncStatus.isSyncing}
                  className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isManualSyncing
                      ? (isBn ? 'ক্লাউড সিঙ্ক হচ্ছে...' : 'Syncing now...')
                      : (isBn ? 'এখনই ক্লাউডে ব্যাকআপ নিন' : 'Sync All Data to Cloud Now')}
                  </span>
                </button>

                {onOpenBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBackup();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isBn ? 'রুম ডিবি ব্যাকআপ ম্যানেজার খুলুন' : 'Open Room DB Backup Manager'}</span>
                  </button>
                )}

                <button
                  id="sign-out-btn"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isBn ? 'লগআউট করুন' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login / Registration Flow */
            <div className="space-y-4">
              {/* Google 1-Click Sign-In Button */}
              <div>
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  type="button"
                  className="w-full py-3 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-2.5 transition shadow-xs"
                >
                  {/* Google G Logo */}
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
                  <span>
                    {isLoading
                      ? (isBn ? 'প্রসেসিং হচ্ছে...' : 'Signing in...')
                      : (isBn ? 'গুগল দিয়ে ১-ক্লিক লগইন / রেজিস্ট্রেশন' : 'Sign In with Google')}
                  </span>
                </button>

                <p className="text-[10px] text-center text-neutral-400 mt-1.5">
                  {isBn
                    ? 'গুগল দিয়ে সাইন ইন করলে সরাসরি কন্টাক্টস ও ডায়ালার ডাটা ক্লাউডে সেভ হবে।'
                    : 'Instant sync for contacts, logs, and blocked numbers.'}
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-neutral-400">
                  {isBn ? 'অথবা ইমেইল ব্যবহার করুন' : 'Or with Email'}
                </span>
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
              </div>

              {/* Tab Selector: Login vs Register */}
              <div className="flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <button
                  type="button"
                  id="tab-login-btn"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'login'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isBn ? 'লগইন (Sign In)' : 'Sign In'}
                </button>
                <button
                  type="button"
                  id="tab-register-btn"
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'register'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isBn ? 'নতুন রেজিস্ট্রেশন' : 'Sign Up'}
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {activeTab === 'register' && (
                  <div>
                    <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      {isBn ? 'আপনার পূর্ণ নাম' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <input
                        id="auth-name-input"
                        type="text"
                        placeholder="যেমন: সাকিব হাসান"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-cyan-500"
                      />
                      <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                    {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-cyan-500"
                    />
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                    {isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min. 6 characters)'}
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-cyan-500"
                    />
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs mt-1"
                >
                  {activeTab === 'register' ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'তৈরি করা হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করুন'}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-center text-neutral-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>{isBn ? 'অফলাইন Room DB + ক্লাউড Firestore সিকিউরড' : 'Offline Room DB + Cloud Firestore Secured'}</span>
        </div>
      </div>
    </div>
  );
};
