import React, { useState } from 'react';
import {
  Grid,
  Clock,
  Users,
  MessageSquare,
  ShieldCheck,
  Shield,
  BarChart3,
  BookOpen,
  X,
  Sparkles,
  Database,
  Lock,
  ChevronRight,
  Sun,
  Moon,
  Languages,
  User as UserIcon,
  PhoneCall,
  ShieldAlert,
  UserCheck,
  Smartphone,
  Check,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { AppTab, CallerIdRecord } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ThemeMode } from '../utils/theme';
import { CloudSyncStatus } from '../services/cloudSyncService';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isDefaultDialer: boolean;
  onOpenPermissionModal: (tab?: 'dialog' | 'permissions' | 'settings' | 'backup' | 'code') => void;
  onSimulateIncoming: (caller: CallerIdRecord) => void;
  syncStatus: CloudSyncStatus;
  onOpenAuth: () => void;
  onOpenBackup: () => void;
  contactsCount: number;
  callLogsCount: number;
  missedCallsCount: number;
  unreadSmsCount: number;
  blockedCount: number;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  isDefaultDialer,
  onOpenPermissionModal,
  onSimulateIncoming,
  syncStatus,
  onOpenAuth,
  onOpenBackup,
  contactsCount,
  callLogsCount,
  missedCallsCount,
  unreadSmsCount,
  blockedCount,
}) => {
  const t = TRANSLATIONS[lang];
  const isBn = lang === 'bn';
  const user = syncStatus.user;

  // Pre-configured test simulation callers
  const simulateScenarios: CallerIdRecord[] = [
    {
      phone: '+880 1300-998811',
      name: isBn ? '⚠️ লটারি ও আর্থিক প্রতারণা' : '⚠️ Prize Scam / Fraud Alert',
      businessCategory: isBn ? 'ভুয়া প্রাইজ স্ক্যাম' : 'Fake Lottery Scam',
      spamScore: 98,
      spamReports: 1420,
      city: isBn ? 'অজ্ঞাত এলাকা' : 'Unknown',
      verified: false,
      notes: isBn ? 'বিকাশ পিন বা ওটিপি হাতিয়ে নেওয়ার চেষ্টা।' : 'Attempts to steal bKash PIN or OTP.',
    },
    {
      phone: '+880 1855-123456',
      name: isBn ? 'ফুডপ্যান্ডা রাইডার #402' : 'FoodPanda Rider #402',
      businessCategory: isBn ? 'ডেলিভারি সার্ভিস' : 'Food Delivery Service',
      spamScore: 4,
      spamReports: 1,
      city: isBn ? 'গুলশান, ঢাকা' : 'Gulshan, Dhaka',
      verified: true,
      notes: isBn ? 'অফিসিয়াল রাইডার কলার লাইন।' : 'Official rider verified line.',
    },
    {
      phone: '+880 1711-234567',
      name: isBn ? 'তানভীর আহমেদ' : 'Tanvir Ahmed',
      businessCategory: isBn ? 'ব্যক্তিগত কন্টাক্ট' : 'Personal Contact',
      spamScore: 0,
      spamReports: 0,
      city: isBn ? 'ঢাকা' : 'Dhaka',
      verified: true,
      notes: isBn ? 'কন্টাক্ট লিস্টে সংরক্ষিত।' : 'Saved in contacts directory.',
    },
    {
      phone: '+880 1700-121121',
      name: isBn ? 'গ্রামীণফোন কাস্টমার কেয়ার' : 'Grameenphone Care (Official)',
      businessCategory: isBn ? 'টেলিকম সাপোর্ট' : 'Telecom Support',
      spamScore: 0,
      spamReports: 0,
      city: isBn ? 'বসুন্ধরা, ঢাকা' : 'Bashundhara, Dhaka',
      verified: true,
      notes: isBn ? 'ভেরিফায়েড অফিসিয়াল হেল্পলাইন।' : 'Verified official helpline.',
    },
  ];

  // All 8 core programs
  const programs = [
    {
      id: 'keypad' as AppTab,
      name: t.tabKeypad,
      desc: t.keypadDesc,
      icon: Grid,
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badge: null,
    },
    {
      id: 'recents' as AppTab,
      name: t.tabRecents,
      desc: t.recentsDesc,
      icon: Clock,
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badge: missedCallsCount > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
          {missedCallsCount} {isBn ? 'মিসড' : 'missed'}
        </span>
      ) : (
        <span className="text-[11px] text-neutral-400 font-medium">
          {callLogsCount} {isBn ? 'কল' : 'calls'}
        </span>
      ),
    },
    {
      id: 'contacts' as AppTab,
      name: t.tabContacts,
      desc: t.contactsDesc,
      icon: Users,
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badge: (
        <span className="text-[11px] text-neutral-400 font-medium">
          {contactsCount} {isBn ? 'সংরক্ষিত' : 'saved'}
        </span>
      ),
    },
    {
      id: 'messages' as AppTab,
      name: t.tabMessages,
      desc: t.messagesDesc,
      icon: MessageSquare,
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badge: unreadSmsCount > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
          {unreadSmsCount > 9 ? '9+' : unreadSmsCount} {isBn ? 'নতুন' : 'new'}
        </span>
      ) : (
        <span className="text-[11px] text-neutral-400 font-medium">
          SMS
        </span>
      ),
    },
    {
      id: 'fintech-security' as AppTab,
      name: t.tabFintechSecurity,
      desc: t.fintechDesc,
      icon: ShieldCheck,
      iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
      badge: (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
          SIM/IP
        </span>
      ),
    },
    {
      id: 'callerid' as AppTab,
      name: t.tabCallerId,
      desc: t.callerIdDesc,
      icon: Shield,
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
      badge: blockedCount > 0 ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium">
          {blockedCount} {isBn ? 'ব্লকড' : 'blocked'}
        </span>
      ) : (
        <span className="text-[10px] text-neutral-400">
          Spam Shield
        </span>
      ),
    },
    {
      id: 'stats' as AppTab,
      name: t.tabStats,
      desc: t.statsDesc,
      icon: BarChart3,
      iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
      badge: (
        <span className="text-[10px] text-neutral-400">
          Analytics
        </span>
      ),
    },
    {
      id: 'android-guide' as AppTab,
      name: t.tabAndroidGuide,
      desc: t.androidGuideDesc,
      icon: BookOpen,
      iconBg: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300',
      badge: (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
          Telecom
        </span>
      ),
    },
  ];

  const handleSelect = (tab: AppTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Dimmed backdrop overlay */}
      <div
        id="sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sliding Sidebar Drawer */}
      <aside
        id="sidebar-drawer"
        aria-label={t.sidebarTitle}
        className={`fixed top-0 left-0 z-50 h-full w-[88vw] max-w-sm bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-r border-[var(--color-border)] shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-surface-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/app-logo.png"
              alt="Smart Dialer"
              className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-emerald-500/30 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                {t.appTitle}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {t.sidebarSubtitle}
                </span>
              </div>
            </div>
          </div>

          <button
            id="sidebar-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            aria-label={t.closeMenu}
            title={t.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-5">
          {/* Default Phone App Role Status Banner */}
          <div
            id="sidebar-role-status-card"
            className={`p-3 rounded-2xl border transition-all ${
              isDefaultDialer
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isDefaultDialer ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">
                    {t.defaultAppBannerTitle}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {isDefaultDialer ? t.defaultRoleActive : t.inactiveStatus}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPermissionModal('dialog');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition shadow-2xs ${
                  isDefaultDialer
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                }`}
              >
                {isDefaultDialer ? (isBn ? 'ম্যানেজ' : 'Manage') : (isBn ? 'সেট করুন' : 'Set Role')}
              </button>
            </div>
          </div>

          {/* Section 1: All 8 Programs */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {t.allProgramsSection}
              </span>
              <span className="text-[10px] text-neutral-400">
                8 {isBn ? 'টি প্রোগ্রাম' : 'modules'}
              </span>
            </div>

            <div className="space-y-1.5" role="list">
              {programs.map((prog) => {
                const IconComponent = prog.icon;
                const isActive = activeTab === prog.id;

                return (
                  <button
                    key={prog.id}
                    id={`sidebar-program-${prog.id}`}
                    type="button"
                    onClick={() => handleSelect(prog.id)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-xs'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${prog.iconBg} ${
                          isActive ? 'ring-2 ring-emerald-500/30' : ''
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate">
                            {prog.name}
                          </p>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {prog.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {prog.badge}
                      <ChevronRight
                        className={`w-4 h-4 ${
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Quick Test Simulation Calls */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span>{t.simulationSection}</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                1-tap test
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {simulateScenarios.map((sc, i) => (
                <button
                  key={i}
                  id={`sidebar-simulate-${i}`}
                  type="button"
                  onClick={() => {
                    onSimulateIncoming(sc);
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-left hover:border-cyan-500/50 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-neutral-200/60 dark:bg-neutral-800">
                      {sc.spamScore >= 60 ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                        {sc.name}
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {sc.businessCategory} • <span className="font-mono">{sc.phone}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition">
                    {isBn ? 'টেস্ট' : 'Test'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: System & Database Tools */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {t.systemToolsSection}
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Google & Gmail Contacts Sync Quick Nav */}
              <button
                id="sidebar-google-contacts-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onSelectTab('contacts');
                }}
                className="w-full p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {isBn ? 'Google ও Gmail কন্টাক্টস সিঙ্ক' : 'Google & Gmail Contacts'}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      {isBn ? 'জিমেইল ও গুগলে সেভ করা সব নম্বর' : 'Sync People & Gmail Contacts'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>

              {/* Room DB to Firestore Backup */}
              <button
                id="sidebar-backup-tool-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="w-full p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {t.backupTabFull}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      {syncStatus.lastSyncedAt
                        ? (isBn ? 'সর্বশেষ সিঙ্ক সম্পন্ন' : 'Synced with Cloud')
                        : (isBn ? 'অফলাইন SQLite / Room DB' : 'Offline Room DB')}
                    </p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </button>

              {/* Android Permissions & RoleManager Code */}
              <button
                id="sidebar-permission-tool-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPermissionModal('permissions');
                }}
                className="w-full p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-left transition flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {isBn ? 'অ্যান্ড্রয়েড পারমিশন ও রোল' : 'Android Role & Permissions'}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      RoleManager.ROLE_DIALER & InCallService
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Section 4: Settings & Preferences */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {t.appPreferencesSection}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Theme Toggle */}
              <button
                id="sidebar-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-2.5 text-left"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {theme === 'dark' ? t.themeLight : t.themeDark}
                  </p>
                  <p className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </button>

              {/* Language Switch */}
              <button
                id="sidebar-lang-toggle-btn"
                type="button"
                onClick={onToggleLang}
                className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-2.5 text-left"
              >
                <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Languages className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {lang === 'bn' ? 'English' : 'বাংলা'}
                  </p>
                  <p className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate">
                    {lang === 'bn' ? 'ভাষা পরিবর্তন' : 'Switch to Bangla'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer / User Account Bar */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-surface-subtle)] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {user ? (
                user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {user ? (user.displayName || user.email?.split('@')[0]) : (isBn ? 'অতিথি ইউজার' : 'Guest User')}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {user ? (isBn ? 'ফায়ারবেস সিঙ্ক সক্রিয়' : 'Cloud Sync Active') : (isBn ? 'লোকাল অফলাইন মোড' : 'Offline Local Mode')}
                </p>
              </div>
            </div>

            <button
              id="sidebar-auth-action-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                user
                  ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {user ? (isBn ? 'প্রোফাইল' : 'Account') : (isBn ? 'লগইন' : 'Sign In')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
