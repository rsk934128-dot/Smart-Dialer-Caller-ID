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
        className="mx-3 my-2 px-3.5 py-2 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-between cursor-pointer hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition shadow-xs text-xs"
        title={isBn ? 'ডিফল্ট কল ও মেসেজ পারমিশন সেটিংস দেখুন' : 'View Default Call & SMS Permissions'}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                {isBn ? 'ডিফল্ট কলিং অ্যাপ অনুমোদিত ও সক্রিয়' : 'Default Calling App Authorized & Active'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 font-semibold font-mono">
                ROLE_DIALER
              </span>
            </div>
            <p className="text-[10.5px] text-neutral-600 dark:text-neutral-300 truncate">
              {isBn ? 'রিয়েল সিম কল, কলার আইডি ওভারলে ও স্প্যাম প্রোটেকশন চালু রয়েছে' : 'Real SIM calling, Caller ID overlay & Spam protection active'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] shrink-0">
          <span>{isBn ? 'সেটিংস' : 'Settings'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
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

  const handleQuickActivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    callPermissionService.activateAllPermissions();
  };

  return (
    <div
      id="default-dialer-inactive-banner"
      onClick={onOpenModal}
      className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300 dark:border-amber-700/60 shadow-sm flex items-center justify-between gap-2.5 cursor-pointer"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {isBn ? 'ডিফল্ট ফোন ও কলিং পারমিশন অনুমোদন করুন' : 'Authorize Default Phone & Calling App'}
          </h4>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate">
            {isBn
              ? 'ইনকামিং কল, কলার আইডি ও রিয়েল সিম কল চালু করার অনুমতি'
              : 'Permission for incoming calls, caller ID & real SIM calling'}
          </p>
        </div>
      </div>

      <button
        id="banner-activate-default-btn"
        onClick={handleQuickActivate}
        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm shrink-0 flex items-center gap-1 transition active:scale-95"
      >
        <Zap className="w-3 h-3" />
        <span>{isBn ? '১-ক্লিকে অনুমোদন দিন' : 'Authorize'}</span>
      </button>
    </div>
  );
};
