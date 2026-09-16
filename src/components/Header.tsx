import React, { useState } from 'react';
import {
  PhoneCall,
  ShieldCheck,
  Languages,
  Sliders,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  X,
  Cloud,
  User as UserIcon,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { CallerIdRecord } from '../types';
import { CloudSyncStatus } from '../services/cloudSyncService';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isDefaultDialer: boolean;
  onToggleDefaultDialer: () => void;
  onSimulateIncoming: (caller: CallerIdRecord) => void;
  syncStatus: CloudSyncStatus;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isDefaultDialer,
  onToggleDefaultDialer,
  onSimulateIncoming,
  syncStatus,
  onOpenAuth,
}) => {
  const t = TRANSLATIONS[lang];
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const user = syncStatus.user;

  const simulateScenarios: CallerIdRecord[] = [
    {
      phone: '+880 1300-998811',
      name: '⚠️ লটারি ও আর্থিক প্রতারণা (Spam)',
      businessCategory: 'ভুয়া প্রাইজ স্ক্যাম',
      spamScore: 98,
      spamReports: 1420,
      city: 'অজ্ঞাত এলাকা',
      verified: false,
      notes: 'বিকাশ পিন বা ওটিপি হাতিয়ে নেওয়ার চেষ্টা করে।',
    },
    {
      phone: '+880 1855-123456',
      name: 'ফুডপ্যান্ডা রাইডার #402',
      businessCategory: 'ডেলিভারি সার্ভিস',
      spamScore: 4,
      spamReports: 1,
      city: 'গুলশান, ঢাকা',
      verified: true,
      notes: 'অফিসিয়াল রাইডার কলার লাইন।',
    },
    {
      phone: '+880 1711-234567',
      name: 'তানভীর আহমেদ',
      businessCategory: 'ব্যক্তিগত কন্টাক্ট',
      spamScore: 0,
      spamReports: 0,
      city: 'ঢাকা',
      verified: true,
      notes: 'কন্টাক্ট লিস্টে সংরক্ষিত।',
    },
    {
      phone: '+880 1700-121121',
      name: 'গ্রামীণফোন কাস্টমার কেয়ার',
      businessCategory: 'টেলিকম সাপোর্ট (Official)',
      spamScore: 0,
      spamReports: 0,
      city: 'বসুন্ধরা, ঢাকা',
      verified: true,
      notes: 'ভেরিফায়েড অফিসিয়াল হেল্পলাইন।',
    },
  ];

  return (
    <header
      id="app-header"
      className="px-4 py-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shrink-0 select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand & Status */}
        <div className="flex items-center gap-2.5">
          <img
            src="/app-logo.png"
            alt="Smart Dialer Logo"
            className="w-8 h-8 rounded-xl object-cover shadow-sm border border-emerald-500/30 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              {t.appTitle}
            </h1>
            {/* Role Manager Badge */}
            <button
              id="role-manager-badge-btn"
              onClick={() => setShowRoleDialog(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isDefaultDialer ? t.activeStatus : t.inactiveStatus}</span>
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* PWA Install Button with Official App Logo */}
          <PWAInstallButton lang={lang} />

          {/* Simulate Incoming Call button */}
          <div className="relative">
            <button
              id="simulate-call-dropdown-btn"
              onClick={() => setShowSimulateMenu(!showSimulateMenu)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-semibold flex items-center gap-1 hover:bg-cyan-100 transition shadow-sm"
              title="ইনকামিং কল টেস্ট করুন"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.simulateIncomingCall}</span>
              <span className="sm:hidden">ইনকামিং</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Dropdown Menu */}
            {showSimulateMenu && (
              <div
                id="simulate-call-menu"
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-fadeIn"
              >
                <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  ইনকামিং কলার বেছে নিন:
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {simulateScenarios.map((sc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSimulateIncoming(sc);
                        setShowSimulateMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-start gap-2.5 transition"
                    >
                      {sc.spamScore >= 60 ? (
                        <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {sc.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                          {sc.phone}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <button
            id="lang-toggle-btn"
            onClick={onToggleLang}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition flex items-center gap-1"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'বাং' : 'EN'}</span>
          </button>

          {/* Firebase Auth & Cloud Sync Button */}
          <button
            id="firebase-auth-header-btn"
            onClick={onOpenAuth}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ${
              user
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-600 text-white'
            }`}
            title={
              user
                ? `লগইন আছেন: ${user.email} (ক্লাউড সিঙ্ক সক্রিয়)`
                : 'Firebase Auth লগইন / রেজিস্ট্রেশন করুন'
            }
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline max-w-[80px] truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইন' : 'Sign In'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Role Manager Permission Simulator Modal */}
      {showRoleDialog && (
        <div
          id="role-manager-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-xs bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono font-semibold text-neutral-500">
                  Android RoleManager
                </span>
              </div>
              <button
                onClick={() => setShowRoleDialog(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Set Smart Caller as default Phone app?
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                আপনার সিস্টেমের কল নিয়ন্ত্রণ, ইনকামিং কলার আইডি এবং কল লগ ব্যবস্থাপনার জন্য অ্যাপটিকে{' '}
                <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[10px]">
                  RoleManager.ROLE_DIALER
                </code>{' '}
                হিসেবে অনুমোদন দিন।
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRoleDialog(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition"
              >
                Cancel
              </button>
              <button
                id="confirm-role-default-btn"
                onClick={() => {
                  onToggleDefaultDialer();
                  setShowRoleDialog(false);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Set as Default
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
