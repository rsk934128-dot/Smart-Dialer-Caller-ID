import React, { useState, useEffect } from 'react';
import {
  Ban,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Phone,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  X,
  Copy,
  Check,
  Lock,
  Sparkles,
  PhoneOff,
  Filter,
} from 'lucide-react';
import { SpamEntity } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { roomDbService } from '../db/roomDatabaseService';
import { cloudSyncService } from '../services/cloudSyncService';

interface BlockedNumbersManagerProps {
  lang: Language;
  onInitiateCall: (phone: string, name?: string) => void;
}

const PRESET_CATEGORIES = [
  'আর্থিক প্রতারণা (Scam)',
  'টেলিমার্কেটিং (Telemarketing)',
  'রোবোকল ও ভয়েস অ্যাড (Robocall)',
  'ব্যক্তিগত ব্লক (Personal)',
  'অবাঞ্ছিত কল / হয়রানি (Harassment)',
];

export const BlockedNumbersManager: React.FC<BlockedNumbersManagerProps> = ({
  lang,
  onInitiateCall,
}) => {
  const t = TRANSLATIONS[lang];
  const isBn = lang === 'bn';

  const [blockedList, setBlockedList] = useState<SpamEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpamProtectionOn, setIsSpamProtectionOn] = useState<boolean>(() =>
    roomDbService.isSpamProtectionEnabled()
  );
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(PRESET_CATEGORIES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Load blocked list from Room Database
  const refreshList = async () => {
    try {
      const entities = await roomDbService.getBlockedEntities();
      setBlockedList(entities);
    } catch (err) {
      console.error('Failed to load blocked entities:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    refreshList();

    const unsubscribe = roomDbService.subscribe(() => {
      if (!isMounted) return;
      refreshList();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 2800);
  };

  // Toggle Spam Protection Shield
  const handleToggleSpamProtection = () => {
    const next = !isSpamProtectionOn;
    setIsSpamProtectionOn(next);
    roomDbService.setSpamProtectionEnabled(next);
    showToast(
      next
        ? isBn
          ? 'ইনকামিং স্প্যাম প্রোটেকশন সক্রিয় করা হয়েছে'
          : 'Incoming Spam Protection enabled'
        : isBn
        ? 'ইনকামিং স্প্যাম প্রোটেকশন বন্ধ করা হয়েছে'
        : 'Incoming Spam Protection disabled'
    );
  };

  // Unblock a number
  const handleUnblock = async (phone: string, name?: string) => {
    await roomDbService.unblockNumber(phone);
    cloudSyncService.removeBlockedNumberFromCloud(phone).catch(console.error);
    showToast(
      isBn
        ? `${name || phone} সফলভাবে আনব্লক করা হয়েছে!`
        : `${name || phone} unblocked successfully!`
    );
  };

  // Delete completely from spam table
  const handleDeleteRecord = async (phone: string) => {
    await roomDbService.deleteBlockedRecord(phone);
    cloudSyncService.removeBlockedNumberFromCloud(phone).catch(console.error);
    showToast(isBn ? 'ব্লকলিস্ট থেকে মুছে ফেলা হয়েছে' : 'Removed from blocklist');
  };

  // Add a new blocked number
  const handleAddBlockedNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = newPhone.trim();
    if (!cleanPhone) {
      setFormError(isBn ? 'অনুগ্রহ করে একটি ফোন নম্বর লিখুন' : 'Please enter a phone number');
      return;
    }

    if (cleanPhone.replace(/[^0-9]/g, '').length < 6) {
      setFormError(
        isBn
          ? 'কমপক্ষে ৬ ডিজিটের বৈধ ফোন নম্বর লিখুন'
          : 'Enter a valid phone number with at least 6 digits'
      );
      return;
    }

    const displayName = newName.trim() || (isBn ? 'ব্লককৃত নম্বর' : 'Blocked Number');
    await roomDbService.blockNumber(cleanPhone, displayName, newCategory);
    cloudSyncService.saveBlockedNumberToCloud(cleanPhone, displayName).catch(console.error);

    // Reset Form
    setNewPhone('');
    setNewName('');
    setNewCategory(PRESET_CATEGORIES[0]);
    setShowAddForm(false);
    showToast(
      isBn
        ? `${cleanPhone} সফলভাবে ব্লকলিস্টে যুক্ত হয়েছে!`
        : `${cleanPhone} added to blocklist!`
    );
  };

  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Filtered blocked list
  const filteredList = blockedList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.phone.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div id="blocked-numbers-management-view" className="space-y-4 animate-fadeIn">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-neutral-900/95 text-white text-xs font-semibold shadow-xl border border-neutral-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. Spam Protection Master Toggle Card */}
      <div
        id="spam-protection-shield-card"
        className={`p-4 rounded-3xl border transition-all duration-300 shadow-sm ${
          isSpamProtectionOn
            ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-neutral-900 border-emerald-300 dark:border-emerald-800'
            : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition shadow-md ${
                isSpamProtectionOn
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500'
              }`}
            >
              {isSpamProtectionOn ? (
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {t.incomingSpamProtection}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isSpamProtectionOn
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {isSpamProtectionOn ? t.protectionActive : t.protectionInactive}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {t.spamProtectionDesc}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            id="toggle-spam-protection-switch"
            role="switch"
            aria-checked={isSpamProtectionOn}
            onClick={handleToggleSpamProtection}
            className={`w-13 h-7 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              isSpamProtectionOn ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
            }`}
            title={isSpamProtectionOn ? 'Disable Spam Protection' : 'Enable Spam Protection'}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>

        {/* Protection Features Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isSpamProtectionOn ? 'text-emerald-600' : 'text-neutral-400'}`} />
            <span>{isBn ? 'হাই-রিস্ক স্প্যাম ব্লক' : 'High-risk auto block'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isSpamProtectionOn ? 'text-emerald-600' : 'text-neutral-400'}`} />
            <span>{isBn ? 'প্রতারণা ও লটারি ফিল্টার' : 'Scam pattern filter'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 col-span-2 sm:col-span-1">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isSpamProtectionOn ? 'text-emerald-600' : 'text-neutral-400'}`} />
            <span>{isBn ? 'সাইলেন্ট রিংটোন মোড' : 'Silent spam ring'}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Header & Add Blocked Number Action */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
            <Ban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {t.blockedNumbersTitle}
            </h3>
            <span className="text-[11px] text-neutral-500">
              {blockedList.length} {t.blockedCount}
            </span>
          </div>
        </div>

        <button
          id="open-add-blocked-modal-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-2 rounded-2xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? (isBn ? 'বন্ধ করুন' : 'Cancel') : t.addBlockedNumber}</span>
        </button>
      </div>

      {/* 3. Manual Add Blocked Form (Collapsible Card) */}
      {showAddForm && (
        <form
          id="add-blocked-number-form"
          onSubmit={handleAddBlockedNumber}
          className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border-2 border-red-300 dark:border-red-900/60 shadow-lg space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-red-600" />
              <span>{isBn ? 'নতুন কলার ব্লকলিস্টে যুক্ত করুন' : 'Add New Number to Blocklist'}</span>
            </h4>
            <span className="text-[10px] text-red-600 dark:text-red-400 font-mono font-medium">
              Offline Room DB + Cloud
            </span>
          </div>

          {formError && (
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {isBn ? 'ফোন নম্বর *' : 'Phone Number *'}
              </label>
              <input
                id="block-phone-input"
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+8801..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:border-red-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {isBn ? 'নাম বা ট্যাগ (ঐচ্ছিক)' : 'Name or Label (Optional)'}
              </label>
              <input
                id="block-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={isBn ? 'যেমন: ভুয়া লটারি কল' : 'e.g. Fake Lottery Robocall'}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-red-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t.blockedReason}
              </label>
              <select
                id="block-category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-red-500 shadow-2xs"
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              id="confirm-block-number-btn"
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{t.saveToBlocklist}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* 4. Search Filter Bar */}
      <div className="relative">
        <input
          id="search-blocked-numbers-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isBn ? 'ব্লক করা নম্বর বা নাম খুঁজুন...' : 'Search blocked numbers or names...'}
          className="w-full pl-9 pr-8 py-2.5 text-xs rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-red-500 shadow-2xs"
        />
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 5. Blocked Contacts List */}
      <div className="space-y-2">
        {filteredList.length > 0 ? (
          filteredList.map((item) => (
            <div
              key={item.phone}
              id={`blocked-item-${item.phone.replace(/[^0-9]/g, '')}`}
              className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:shadow-sm transition flex items-center justify-between gap-3 group"
            >
              {/* Left Contact Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/50 shadow-2xs">
                  <PhoneOff className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.name}
                    </h4>
                    {item.score >= 80 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold">
                        {item.score}% {isBn ? 'স্প্যাম' : 'Spam'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                      {item.phone}
                    </p>
                    <button
                      onClick={() => handleCopy(item.phone)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                      title={isBn ? 'নম্বর কপি করুন' : 'Copy phone number'}
                    >
                      {copiedPhone === item.phone ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                      {item.category}
                    </span>
                    {item.notes && (
                      <span className="text-[10px] text-neutral-400 truncate max-w-[140px] italic hidden sm:inline">
                        • {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onInitiateCall(item.phone, item.name)}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 hover:text-emerald-600 transition"
                  title={isBn ? 'কল করুন' : 'Call this number'}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`unblock-btn-${item.phone.replace(/[^0-9]/g, '')}`}
                  onClick={() => handleUnblock(item.phone, item.name)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-emerald-100 dark:bg-neutral-800 dark:hover:bg-emerald-950/60 text-neutral-700 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-300 font-semibold text-[11px] transition shadow-2xs flex items-center gap-1 active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.unblock}</span>
                </button>

                <button
                  onClick={() => handleDeleteRecord(item.phone)}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-500 transition"
                  title={isBn ? 'তালিকা থেকে মুছুন' : 'Delete permanently'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-neutral-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-700/60 text-neutral-400 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {searchQuery ? (isBn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No matching numbers') : t.noBlockedNumbers}
            </h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              {searchQuery
                ? isBn
                  ? 'ভিন্ন কোনো নম্বর বা নাম লিখে সন্ধান করুন।'
                  : 'Try searching with a different number or label.'
                : t.noBlockedDesc}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addBlockedNumber}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
