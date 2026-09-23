import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Search,
  Check,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';
import { Contact } from '../types';
import { GoogleContactsService } from '../services/googleContactsService';
import { Language } from '../utils/i18n';
import { auth } from '../firebase';

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onImportContacts: (contacts: Contact[]) => void;
  existingContacts: Contact[];
}

export const GoogleContactsModal: React.FC<GoogleContactsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onImportContacts,
  existingContacts,
}) => {
  const isBn = lang === 'bn';
  const [isLoading, setIsLoading] = useState(false);
  const [googleContacts, setGoogleContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
    }
  }, [isOpen]);

  const checkAuthStatus = async () => {
    const token = await GoogleContactsService.getAccessToken();
    const currentUser = auth.currentUser;
    if (token && currentUser) {
      setIsAuthenticated(true);
      setUserEmail(currentUser.email);
      handleFetchContacts();
    } else {
      setIsAuthenticated(false);
      setUserEmail(currentUser?.email || null);
    }
  };

  const handleSignInAndFetch = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await GoogleContactsService.signInWithGoogleContacts();
      setIsAuthenticated(true);
      setUserEmail(res.user.email);
      await handleFetchContacts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Contacts সাইন-ইনে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchContacts = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const contacts = await GoogleContactsService.fetchGoogleContacts();
      setGoogleContacts(contacts);
      // Pre-select all fetched contacts that aren't already duplicate
      const initialSelected = new Set<string>();
      contacts.forEach((c) => {
        const isDuplicate = existingContacts.some(
          (ex) => ex.phone.replace(/[\s\-\+]/g, '') === c.phone.replace(/[\s\-\+]/g, '')
        );
        if (!isDuplicate) {
          initialSelected.add(c.id);
        }
      });
      setSelectedIds(initialSelected);
      setSuccessMessage(
        isBn
          ? `গুগল কন্টাক্টস থেকে ${contacts.length} টি কন্টাক্ট লোড হয়েছে!`
          : `Loaded ${contacts.length} contacts from Google Contacts!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'কন্টাক্ট লোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleImportSelected = () => {
    const toImport = googleContacts.filter((c) => selectedIds.has(c.id));
    if (toImport.length === 0) return;

    onImportContacts(toImport);
    setSuccessMessage(
      isBn
        ? `সফলভাবে ${toImport.length} টি গুগল কন্টাক্ট অ্যাপে ইমপোর্ট করা হয়েছে!`
        : `Successfully imported ${toImport.length} Google contacts!`
    );
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const filteredContacts = googleContacts.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <span>{isBn ? 'গুগল কন্টাক্টস সিঙ্ক' : 'Google Contacts Sync'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold">
                  People API
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isBn
                  ? 'আপনার গুগল অ্যাকাউন্টের কন্টাক্ট সরাসরি অ্যাপে আনুন'
                  : 'Import and sync contacts directly from your Google Account'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Account Banner or Sign-In Button */}
          {!isAuthenticated ? (
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'গুগল অ্যাকাউন্টের কন্টাক্ট লিঙ্ক করুন' : 'Connect your Google Account'}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  {isBn
                    ? 'আপনার গুগল পিপল এপিআই দিয়ে কন্টাক্ট তালিকা রিড করার অনুমতি দিন। আপনার ডেটা সম্পূর্ণ নিরাপদ।'
                    : 'Grant permission to fetch and sync your personal Google Contacts. Your data stays strictly on your device.'}
                </p>
              </div>

              {/* Official styled Google Sign In Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleSignInAndFetch}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-semibold text-xs flex items-center gap-2.5 shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  )}
                  <span>{isBn ? 'Google দিয়ে সাইন-ইন ও অনুমতি দিন' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Account summary bar */}
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {userEmail || 'Google Account'}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>{isBn ? 'কন্টাক্টস রিড করার অনুমতি সক্রিয়' : 'Contacts OAuth Connected'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFetchContacts}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                  <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
                </button>
              </div>

              {/* Search & Selection Control */}
              {googleContacts.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder={isBn ? 'গুগল কন্টাক্ট খুঁজুন...' : 'Search Google contacts...'}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={toggleSelectAll}
                    className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shrink-0"
                  >
                    {selectedIds.size === filteredContacts.length
                      ? isBn
                        ? 'সব বাদ দিন'
                        : 'Deselect All'
                      : isBn
                      ? 'সব বাছুন'
                      : 'Select All'}
                  </button>
                </div>
              )}

              {/* Contacts List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {isLoading && googleContacts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>{isBn ? 'গুগল থেকে কন্টাক্ট সংগ্রহ করা হচ্ছে...' : 'Fetching Google contacts...'}</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    {googleContacts.length === 0
                      ? isBn
                        ? 'আপনার গুগল অ্যাকাউন্টে কোনো কন্টাক্ট পাওয়া যায়নি।'
                        : 'No contacts found in your Google Account.'
                      : isBn
                      ? 'কোনো কন্টাক্ট মিল পাওয়া যায়নি।'
                      : 'No matching contacts found.'}
                  </div>
                ) : (
                  filteredContacts.map((c) => {
                    const isSelected = selectedIds.has(c.id);
                    const isAlreadyImported = existingContacts.some(
                      (ex) => ex.phone.replace(/[\s\-\+]/g, '') === c.phone.replace(/[\s\-\+]/g, '')
                    );

                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleSelectContact(c.id)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                            : 'bg-white dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
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
                              {isAlreadyImported && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                  {isBn ? 'বিদ্যমান' : 'Exists'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                              {c.phone}
                            </span>
                          </div>
                        </div>

                        {c.email && (
                          <span className="text-[10px] text-neutral-400 truncate max-w-[100px] hidden sm:inline">
                            {c.email}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>

          {isAuthenticated && (
            <button
              onClick={handleImportSelected}
              disabled={selectedIds.size === 0 || isLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isBn
                  ? `নির্বাচিত ${selectedIds.size} টি ইমপোর্ট করুন`
                  : `Import Selected (${selectedIds.size})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
