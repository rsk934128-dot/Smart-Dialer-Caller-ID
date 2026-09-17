import React from 'react';
import { ShieldCheck, ShieldAlert, Zap, ChevronRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { Language } from '../utils/i18n';
import { callPermissionService } from '../services/callPermissionService';

interface DefaultCallPermissionBannerProps {
  isDefault: boolean;
  onOpenModal: () => void;
  lang: Language;
}

export const DefaultCallPermissionBanner: React.FC<DefaultCallPermissionBannerProps> = ({
  isDefault,
  onOpenModal,
  lang,
}) => {
  const isBn = lang === 'bn';
  const isDefaultSms = callPermissionService.isDefaultSms();

  if (isDefault && isDefaultSms) {
    return (
      <div
        id="default-dialer-active-banner"
        onClick={onOpenModal}
        className="mx-3 my-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between cursor-pointer hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition shadow-xs text-xs"
        title={isBn ? 'ডিফল্ট কল ও মেসেজ পারমিশন সেটিংস দেখুন' : 'View Default Call & SMS Permissions'}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
            {isBn ? 'ডিফল্ট ফোন ও Google মেসেজ অ্যাপ সক্রিয়' : 'Default Phone & Google Messages Active'}
          </span>
          <span className="hidden sm:inline text-neutral-400 text-[10px]">•</span>
          <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400 text-[10px]">
            {isBn ? 'রিয়েল-টাইম অফলাইন এসএমএস ও কলার আইডি চালূ' : 'Offline SMS & Caller ID Shield on'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium text-[10px]">
          <span>{isBn ? 'সেটিংস' : 'Settings'}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    );
  }

  if (isDefault && !isDefaultSms) {
    return (
      <div
        id="default-sms-pending-banner"
        onClick={onOpenModal}
        className="mx-3 my-2 px-3 py-1.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 flex items-center justify-between cursor-pointer hover:bg-blue-100/80 transition shadow-xs text-xs"
        title={isBn ? 'Google মেসেজ পারমিশন অন করুন' : 'Enable Google Messages Permission'}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-blue-900 dark:text-blue-200 text-[11px] truncate block">
              {isBn ? 'Google মেসেজ পারমিশন যুক্ত করুন' : 'Enable Google Messages Permission'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-semibold text-[10px] shrink-0">
          <span>{isBn ? 'অন করুন' : 'Enable'}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div
      id="default-dialer-inactive-banner"
      className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300 dark:border-amber-700/60 shadow-sm flex items-center justify-between gap-2.5 animate-pulse"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {isBn ? 'ডিফল্ট ফোন ও মেসেজ অ্যাপ একটিভ করুন' : 'Activate Default Phone & SMS App'}
          </h4>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate">
            {isBn
              ? 'কলার আইডি ও অফলাইনে রিয়েল-টাইমে মেসেজ রিসিভের অনুমতি'
              : 'Real-time offline SMS & Caller ID permissions'}
          </p>
        </div>
      </div>

      <button
        id="banner-activate-default-btn"
        onClick={onOpenModal}
        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm shrink-0 flex items-center gap-1 transition active:scale-95"
      >
        <Zap className="w-3 h-3" />
        <span>{isBn ? 'এক্টিভ' : 'Activate'}</span>
      </button>
    </div>
  );
};
