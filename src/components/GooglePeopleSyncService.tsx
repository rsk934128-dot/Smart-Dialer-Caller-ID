import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2,
  UserCheck,
  Check,
  X,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Contact } from '../types';
import { GoogleContactsService } from '../services/googleContactsService';
import { Language, TRANSLATIONS } from '../utils/i18n';

export interface GooglePeopleSyncServiceProps {
  contacts: Contact[];
  onContactsFetched: (contacts: Contact[]) => void;
  lang?: Language;
  variant?: 'banner' | 'card' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const GooglePeopleSyncService: React.FC<GooglePeopleSyncServiceProps> = ({
  contacts,
  onContactsFetched,
  lang = 'bn',
  variant = 'banner',
  isOpen = false,
  onClose,
  className = '',
}) => {
  const isBn = lang === 'bn';
  const t = TRANSLATIONS[lang];

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedGoogleContacts, setFetchedGoogleContacts] = useState<Contact[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Monitor auth state changes and sync user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        GoogleContactsService.setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const googleContactsInState = contacts.filter(
    (c) => c.storageLocation === 'google' || c.tag === 'Google'
  );

  /**
   * Primary Action: Authenticate with Google People API & Fetch Contacts
   */
  const handleAuthenticateAndSync = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      let token = GoogleContactsService.getAccessToken();

      // If no token cached in memory, prompt Google sign-in with People API scopes
      if (!token) {
        setIsAuthenticating(true);
        const authResult = await GoogleContactsService.signInWithGoogleContacts();
        token = authResult.accessToken;
        setCurrentUser(authResult.user);
        setIsAuthenticating(false);
      }

      // Fetch contacts via Google People API (both connections & Gmail otherContacts)
      const fetched = await GoogleContactsService.fetchGoogleContacts();
      setFetchedGoogleContacts(fetched);

      if (fetched.length > 0) {
        // Feed fetched contacts into the existing contacts state
        onContactsFetched(fetched);
        setLastSyncTime(Date.now());
        setStatusMessage(
          isBn
            ? `সফলভাবে ${fetched.length} টি গুগল ও জিমেইল কন্টাক্ট আপনার কন্টাক্ট লিস্টে সিঙ্ক করা হয়েছে!`
            : `Successfully synced ${fetched.length} contacts from Google People API!`
        );
      } else {
        setStatusMessage(
          isBn
            ? 'আপনার গুগল অ্যাকাউন্টে কোনো নম্বর পাওয়া যায়নি। আপনি চাইলে টেস্ট কন্টাক্ট লোড করতে পারেন।'
            : 'No contacts found in Google Account. You can load sample test contacts.'
        );
      }
    } catch (err: any) {
      const isClosed =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('popup-blocked');

      if (isClosed) {
        setErrorMessage(
          isBn
            ? 'সাইন-ইন উইন্ডো বন্ধ করা হয়েছে। কন্টাক্ট সিঙ্ক করতে আবার চেষ্টা করুন।'
            : 'Google Sign-in popup was closed. Please try again.'
        );
      } else {
        setErrorMessage(
          err?.message ||
            (isBn
              ? 'গুগল পিপল এপিআই থেকে কন্টাক্ট লোড করতে সমস্যা হয়েছে।'
              : 'Failed to fetch contacts from Google People API.')
        );
      }
    } finally {
      setIsAuthenticating(false);
      setIsFetching(false);
    }
  }, [isBn, onContactsFetched]);

  /**
   * Load Demo Google & Gmail contacts for testing when Google account is empty
   */
  const handleLoadSampleContacts = useCallback(() => {
    const sampleContacts: Contact[] = [
      {
        id: `google-people-sample-1`,
        name: 'রাশেদ খান (Google Contacts)',
        phone: '+8801712345678',
        email: 'rashed.khan@gmail.com',
        company: 'Google Workspace',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: true,
        note: 'Google People API থেকে সিঙ্ক করা',
      },
      {
        id: `google-people-sample-2`,
        name: 'সাকিব আল হাসান (Gmail)',
        phone: '+8801819988776',
        email: 'shakib.75@gmail.com',
        company: 'Cricket Operations',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: false,
        note: 'Gmail Other Contacts থেকে সিঙ্ক করা',
      },
      {
        id: `google-people-sample-3`,
        name: 'তানভীর আহমেদ (Work)',
        phone: '+8801911223344',
        email: 'tanvir.work@gmail.com',
        company: 'Fintech Solutions',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: false,
        note: 'Google People API থেকে সিঙ্ক করা',
      },
    ];

    onContactsFetched(sampleContacts);
    setLastSyncTime(Date.now());
    setStatusMessage(
      isBn
        ? 'পরীক্ষার জন্য ৩টি গুগল ও জিমেইল কন্টাক্ট যুক্ত করা হয়েছে!'
        : 'Loaded 3 sample Google People contacts for testing!'
    );
  }, [isBn, onContactsFetched]);

  // Modal variant implementation
  if (variant === 'modal') {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{isBn ? 'Google People API সার্ভিস' : 'Google People API Service'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold">
                    OAuth 2.0
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isBn
                    ? 'গুগল ও জিমেইলে সেভ করা কন্টাক্ট সরাসরি আপনার কন্টাক্ট লিস্টে সিঙ্ক করুন'
                    : 'Authenticate & sync Google People contacts into contacts state'}
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 overflow-y-auto">
            {/* Status alerts */}
            {statusMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Account Status Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBn ? 'সংযুক্ত অ্যাকাউন্ট' : 'Google Account'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                  {currentUser ? (isBn ? 'কানেক্টেড' : 'Connected') : (isBn ? 'লগইন প্রয়োজন' : 'Sign-in needed')}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-900 dark:text-neutral-100 font-bold truncate">
                {currentUser?.email || 'rasadsk750@gmail.com'}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isBn
                  ? `বর্তমানে অ্যাপে ${googleContactsInState.length} টি গুগল কন্টাক্ট লোড করা রয়েছে।`
                  : `Currently ${googleContactsInState.length} Google contacts in local state.`}
              </p>
            </div>

            {/* Sync Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleAuthenticateAndSync}
                disabled={isFetching || isAuthenticating}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isFetching || isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'কন্টাক্ট ফেচ ও সিঙ্ক হচ্ছে...' : 'Fetching Google People Contacts...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{isBn ? 'Google People API থেকে সিঙ্ক করুন' : 'Sync Google People Contacts'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLoadSampleContacts}
                className="w-full py-2 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition"
              >
                {isBn ? 'পরীক্ষার জন্য ডেমো কন্টাক্ট যোগ করুন' : 'Load Sample People Contacts'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Banner Variant (renders directly in ContactsView)
  return (
    <div
      className={`mx-3 mt-2 p-3 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 text-blue-600 shadow-2xs flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {isBn ? 'Google People API কন্টাক্ট সিঙ্ক' : 'Google People API Contacts'}
            </p>
            {googleContactsInState.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                {googleContactsInState.length} {isBn ? 'টি সংরক্ষিত' : 'synced'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
            {googleContactsInState.length > 0
              ? isBn
                ? `গুগল অ্যাকাউন্ট (${currentUser?.email || 'সংযুক্ত'}) থেকে নম্বর সিঙ্ক রয়েছে`
                : `Synced with Google Account (${currentUser?.email || 'Connected'})`
              : isBn
              ? 'গুগল ও জিমেইল থেকে সেভ করা নম্বর অ্যাপের কন্টাক্ট তালিকায় সরাসরি আনুন'
              : 'Import contacts directly from Google People API into contacts state'}
          </p>
          {statusMessage && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
              ✓ {statusMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 truncate">
              ⚠ {errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          id="google-people-sync-now-btn"
          onClick={handleAuthenticateAndSync}
          disabled={isFetching || isAuthenticating}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
        >
          {isFetching || isAuthenticating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>
            {googleContactsInState.length > 0
              ? isBn
                ? 'পুনরায় সিঙ্ক'
                : 'Re-sync'
              : isBn
              ? 'Google কন্টাক্ট আনুন'
              : 'Fetch Contacts'}
          </span>
        </button>

        {googleContactsInState.length === 0 && (
          <button
            type="button"
            onClick={handleLoadSampleContacts}
            title={isBn ? 'টেস্ট গুগল কন্টাক্ট লোড' : 'Load sample contacts'}
            className="px-2 py-1.5 rounded-xl border border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium transition"
          >
            {isBn ? 'টেস্ট' : 'Demo'}
          </button>
        )}
      </div>
    </div>
  );
};
