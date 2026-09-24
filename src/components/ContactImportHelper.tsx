import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Loader2,
  Check,
  X,
  Search,
  ExternalLink,
  UserPlus,
  ArrowDownToLine,
  Smartphone,
} from 'lucide-react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Contact } from '../types';
import { GoogleContactsService } from '../services/googleContactsService';
import { Language, TRANSLATIONS } from '../utils/i18n';

export interface ContactImportHelperProps {
  /**
   * Current local contacts state
   */
  contacts: Contact[];
  /**
   * Callback to update the local contacts state with retrieved Google contacts
   */
  onUpdateContacts: (updatedContacts: Contact[] | ((prev: Contact[]) => Contact[])) => void;
  /**
   * Optional callback when new contacts are successfully imported
   */
  onContactsImported?: (newContacts: Contact[]) => void;
  /**
   * Interface language ('bn' | 'en')
   */
  lang?: Language;
  /**
   * Display mode:
   * - 'compact': stylish banner for lists/top bars
   * - 'full': expanded card with contact preview & selection
   * - 'modal': dialog modal overlay
   * - 'button-only': compact trigger button
   */
  mode?: 'compact' | 'full' | 'modal' | 'button-only';
  /**
   * Modal control (when mode is 'modal')
   */
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const ContactImportHelper: React.FC<ContactImportHelperProps> = ({
  contacts,
  onUpdateContacts,
  onContactsImported,
  lang = 'bn',
  mode = 'compact',
  isOpen = true,
  onClose,
  className = '',
}) => {
  const isBn = lang === 'bn';
  const t = TRANSLATIONS[lang];

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'authenticating' | 'fetching' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fetchedContacts, setFetchedContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Filter out contacts already present in local state based on normalized phone or email
  const existingPhoneSet = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      const cleanPhone = c.phone.replace(/[\s\-\+\(\)]/g, '');
      if (cleanPhone) set.add(cleanPhone);
      if (c.email) set.add(c.email.toLowerCase().trim());
    });
    return set;
  }, [contacts]);

  // Google contacts already present in local state
  const googleContactsCount = useMemo(() => {
    return contacts.filter((c) => c.storageLocation === 'google' || c.tag === 'Google').length;
  }, [contacts]);

  /**
   * Main Google People API Authentication & Contact Fetcher
   */
  const handleAuthenticateAndFetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAuthStep('authenticating');

    try {
      let token = GoogleContactsService.getAccessToken();

      // If token is missing, authenticate via Firebase Popup with Google People API Scopes
      if (!token) {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
          throw new Error(
            isBn
              ? 'গুগল এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
              : 'Google OAuth Access Token could not be retrieved. Please try again.'
          );
        }
        token = credential.accessToken;
        GoogleContactsService.setAccessToken(token);
        setCurrentUser(result.user);
      }

      setAuthStep('fetching');

      // Fetch contacts via Google People API (both Connections & Gmail Other Contacts)
      const peopleContacts = await GoogleContactsService.fetchGoogleContacts();
      setFetchedContacts(peopleContacts);

      // Pre-select new contacts (not already existing)
      const newIds = new Set<string>();
      peopleContacts.forEach((c) => {
        const clean = c.phone.replace(/[\s\-\+\(\)]/g, '');
        const emailKey = c.email?.toLowerCase().trim();
        const isDuplicate = (clean && existingPhoneSet.has(clean)) || (emailKey && existingPhoneSet.has(emailKey));
        if (!isDuplicate) {
          newIds.add(c.id);
        }
      });
      setSelectedIds(newIds);

      if (peopleContacts.length === 0) {
        setAuthStep('idle');
        setSuccessMessage(
          isBn
            ? 'আপনার গুগল ও জিমেইল অ্যাকাউন্টে কোনো কন্টাক্ট পাওয়া যায়নি। আপনি নিচের ডেমো বোতাম দিয়ে টেস্ট করতে পারেন।'
            : 'No contacts found in your Google or Gmail account. You can load sample test contacts below.'
        );
      } else {
        setAuthStep('success');
        setSuccessMessage(
          isBn
            ? `গুগল পিপল এপিআই থেকে ${peopleContacts.length}টি কন্টাক্ট লোড হয়েছে (${newIds.size}টি নতুন)!`
            : `Retrieved ${peopleContacts.length} contacts from Google People API (${newIds.size} new)!`
        );
        // If mode is compact or button-only, open the preview/import modal
        if (mode === 'compact' || mode === 'button-only') {
          setShowPreviewModal(true);
        }
      }
    } catch (err: any) {
      setAuthStep('error');
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
            ? 'গুগল সাইন-ইন উইন্ডো বন্ধ করা হয়েছে। পুনরায় চেষ্টা করুন।'
            : 'Google Sign-In window was closed. Please try again.'
        );
      } else {
        setErrorMessage(
          err?.message ||
            (isBn
              ? 'গুগল পিপল এপিআই দিয়ে কন্টাক্ট আনতে সমস্যা হয়েছে।'
              : 'Failed to import contacts via Google People API.')
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [existingPhoneSet, isBn, mode]);

  /**
   * Commit selected Google contacts into local `contacts` state
   */
  const handleCommitImport = useCallback(() => {
    if (fetchedContacts.length === 0) return;

    const toImport = fetchedContacts.filter((c) => selectedIds.has(c.id));
    if (toImport.length === 0) {
      setErrorMessage(
        isBn ? 'অনুগ্রহ করে অন্তত একটি কন্টাক্ট নির্বাচন করুন।' : 'Please select at least one contact to import.'
      );
      return;
    }

    // Merge into local state, updating or prepending new Google contacts
    onUpdateContacts((prevContacts) => {
      const existingMap = new Map<string, Contact>();
      // Keep existing contacts
      prevContacts.forEach((c) => {
        const cleanPhone = c.phone.replace(/[\s\-\+\(\)]/g, '');
        const key = cleanPhone || c.email?.toLowerCase().trim() || c.id;
        existingMap.set(key, c);
      });

      // Merge newly imported Google contacts
      toImport.forEach((c) => {
        const cleanPhone = c.phone.replace(/[\s\-\+\(\)]/g, '');
        const key = cleanPhone || c.email?.toLowerCase().trim() || c.id;
        existingMap.set(key, {
          ...c,
          storageLocation: 'google',
          tag: 'Google',
        });
      });

      return Array.from(existingMap.values());
    });

    if (onContactsImported) {
      onContactsImported(toImport);
    }

    setSuccessMessage(
      isBn
        ? `সফলভাবে ${toImport.length}টি গুগল কন্টাক্ট আপনার অ্যাপের কন্টাক্ট লিস্টে যুক্ত করা হয়েছে!`
        : `Successfully added ${toImport.length} Google contacts to your local contacts list!`
    );

    setShowPreviewModal(false);
    if (mode === 'modal' && onClose) {
      onClose();
    }
  }, [fetchedContacts, isBn, mode, onClose, onContactsImported, onUpdateContacts, selectedIds]);

  /**
   * Load Demo / Sample Google & Gmail Contacts
   */
  const handleLoadDemoContacts = useCallback(() => {
    const demoContacts: Contact[] = [
      {
        id: `google-people-sample-${Date.now()}-1`,
        name: 'রাশেদ খান (Google Contacts)',
        phone: '+8801712345678',
        email: 'rashed.khan@gmail.com',
        company: 'Google Cloud Platform',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: true,
        note: 'Google People API থেকে সিঙ্ক করা',
      },
      {
        id: `google-people-sample-${Date.now()}-2`,
        name: 'সাকিব আল হাসান (Gmail Other)',
        phone: '+8801819988776',
        email: 'shakib.75@gmail.com',
        company: 'Cricket Board',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: false,
        note: 'Gmail Other Contacts থেকে সিঙ্ক করা',
      },
      {
        id: `google-people-sample-${Date.now()}-3`,
        name: 'তানভীর আহমেদ (Workspace)',
        phone: '+8801911223344',
        email: 'tanvir.work@gmail.com',
        company: 'Fintech Solutions',
        tag: 'Google',
        storageLocation: 'google',
        isFavorite: false,
        note: 'Google People API থেকে সিঙ্ক করা',
      },
    ];

    setFetchedContacts(demoContacts);
    setSelectedIds(new Set(demoContacts.map((c) => c.id)));
    setAuthStep('success');
    setShowPreviewModal(true);
    setSuccessMessage(
      isBn
        ? 'পরীক্ষার জন্য ৩টি ডেমো গুগল কন্টাক্ট প্রস্তুত করা হয়েছে। নিচে "ইমপোর্ট সম্পন্ন করুন" চাপুন।'
        : 'Prepared 3 demo Google contacts for testing. Click "Import Selected" to save.'
    );
  }, [isBn]);

  // Filtered contacts in preview list
  const previewList = useMemo(() => {
    if (!searchQuery.trim()) return fetchedContacts;
    const q = searchQuery.toLowerCase().trim();
    return fetchedContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [fetchedContacts, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === previewList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(previewList.map((c) => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 1. Button-only Mode
  if (mode === 'button-only') {
    return (
      <>
        <button
          type="button"
          id="contact-import-helper-btn"
          onClick={handleAuthenticateAndFetch}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          )}
          <span>{isBn ? 'Google কন্টাক্টস আনুন' : 'Import Google Contacts'}</span>
        </button>

        {/* Preview Modal if opened */}
        {showPreviewModal && renderPreviewModal()}
      </>
    );
  }

  // Preview / Selection Modal (reused across modes)
  function renderPreviewModal() {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {isBn ? 'Google People API কন্টাক্ট ইমপোর্ট' : 'Import Google People Contacts'}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {isBn
                    ? `${fetchedContacts.length}টি কন্টাক্ট পাওয়া গেছে (${selectedIds.size}টি নির্বাচিত)`
                    : `${fetchedContacts.length} found (${selectedIds.size} selected)`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {/* Search & Select All Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder={isBn ? 'কন্টাক্ট বা ফোন খুঁজুন...' : 'Search contacts...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shrink-0"
              >
                {selectedIds.size === previewList.length ? (isBn ? 'সব বাদ' : 'Clear') : isBn ? 'সব বাছুন' : 'All'}
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {previewList.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {isBn ? 'কোনো কন্টাক্ট মিল পাওয়া যায়নি।' : 'No matching contacts.'}
                </div>
              ) : (
                previewList.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const cleanPhone = c.phone.replace(/[\s\-\+\(\)]/g, '');
                  const isDuplicate =
                    (cleanPhone && existingPhoneSet.has(cleanPhone)) ||
                    (c.email && existingPhoneSet.has(c.email.toLowerCase().trim()));

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelectContact(c.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                          : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {c.name}
                            </span>
                            {isDuplicate && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                                {isBn ? 'বিদ্যমান' : 'Exists'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                            {c.phone} {c.email ? `• ${c.email}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>
                {isBn
                  ? `নির্বাচিত ${selectedIds.size}টি কন্টাক্ট সেভ করুন`
                  : `Import Selected (${selectedIds.size})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Compact Banner Mode (Standard in Contacts list header)
  return (
    <div
      id="contact-import-helper-banner"
      className={`mx-3 mt-2 p-3 rounded-2xl bg-gradient-to-r from-blue-50/95 via-indigo-50/80 to-blue-50/95 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-blue-950/50 border border-blue-200/80 dark:border-blue-800/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
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
              {isBn ? 'Google People API কন্টাক্ট ইমপোর্টার' : 'Google People API Contact Importer'}
            </p>
            {googleContactsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                {googleContactsCount} {isBn ? 'টি সেভ করা' : 'synced'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
            {currentUser?.email
              ? isBn
                ? `সংযুক্ত: ${currentUser.email} • এক ক্লিকে কন্টাক্ট আপডেট করুন`
                : `Connected: ${currentUser.email} • 1-click update contacts`
              : isBn
              ? 'গুগল পিপল এপিআই দিয়ে জিমেইল ও গুগল কন্টাক্টস সহজে অ্যাপে আনুন'
              : 'Authenticate with Google & fetch contacts into local state'}
          </p>

          {/* Status feedback */}
          {successMessage && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{successMessage}</span>
            </p>
          )}
          {errorMessage && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 truncate flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          id="contact-import-helper-fetch-btn"
          onClick={handleAuthenticateAndFetch}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>
            {googleContactsCount > 0
              ? isBn
                ? 'পুনরায় ফেচ'
                : 'Re-fetch'
              : isBn
              ? 'গুগল কন্টাক্ট আনুন'
              : 'Fetch Contacts'}
          </span>
        </button>

        {googleContactsCount === 0 && (
          <button
            type="button"
            onClick={handleLoadDemoContacts}
            title={isBn ? 'টেস্ট গুগল কন্টাক্ট লোড' : 'Load sample contacts'}
            className="px-2 py-1.5 rounded-xl border border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium transition"
          >
            {isBn ? 'টেস্ট' : 'Demo'}
          </button>
        )}
      </div>

      {showPreviewModal && renderPreviewModal()}
    </div>
  );
};
