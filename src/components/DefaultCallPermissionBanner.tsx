import React from 'react';
import { ShieldCheck, ShieldAlert, Zap, ChevronRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { Language } from '../utils/i18n';
import { callPermissionService, RoleManager } from '../services/callPermissionService';

interface DefaultCallPermissionBannerProps {
  isDefault?: boolean;
  isDefaultSms?: boolean;
  onOpenModal: () => void;
  onOpenGuide?: (role: 'dialer' | 'sms') => void;
  lang: Language;
}

export const DefaultCallPermissionBanner: React.FC<DefaultCallPermissionBannerProps> = ({
  isDefault: propIsDefault,
  isDefaultSms: propIsDefaultSms,
  onOpenModal,
  onOpenGuide,
  lang,
}) => {
  const isBn = lang === 'bn';
  const [isDefault, setIsDefault] = React.useState<boolean>(
    propIsDefault !== undefined ? propIsDefault : callPermissionService.isDefault()
  );
  const [isDefaultSms, setIsDefaultSms] = React.useState<boolean>(
    propIsDefaultSms !== undefined ? propIsDefaultSms : callPermissionService.isDefaultSms()
  );

  React.useEffect(() => {
    if (propIsDefault !== undefined) setIsDefault(propIsDefault);
    if (propIsDefaultSms !== undefined) setIsDefaultSms(propIsDefaultSms);
  }, [propIsDefault, propIsDefaultSms]);

  React.useEffect(() => {
    const unsub = callPermissionService.subscribe((_perms, defDialer, _mode, defSms) => {
      setIsDefault(defDialer);
      setIsDefaultSms(defSms);
    });
    return () => unsub();
  }, []);

  const handleQuickActivateAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    callPermissionService.activateAllPermissions();
  };

  const handleQuickActivateSms = (e: React.MouseEvent) => {
    e.stopPropagation();
    callPermissionService.requestRole(RoleManager.ROLE_SMS);
  };

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
                {isBn ? 'ডিফল্ট কল ও মেসেজ অ্যাপ সক্রিয়' : 'Default Call & SMS Roles Active'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 font-semibold font-mono">
                ROLE_DIALER • ROLE_SMS
              </span>
            </div>
            <p className="text-[10.5px] text-neutral-600 dark:text-neutral-300 truncate">
              {isBn
                ? 'রিয়েল সিম কল, কলার আইডি ওভারলে ও অফলাইন মেসেজিং সক্রিয়'
                : 'Real SIM calling, caller ID & offline messaging authorized'}
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
        className="mx-3 my-2 p-2.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-blue-100/80 transition shadow-xs text-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-blue-900 dark:text-blue-200 text-xs truncate block">
              {isBn ? 'Google মেসেজ পারমিশন যুক্ত করুন' : 'Enable Google Messages Permission'}
            </span>
            <p className="text-[10px] text-blue-700 dark:text-blue-300 truncate">
              {isBn ? 'অফলাইনে রিয়েল-টাইমে এসএমএস ও ওটিপি রিসিভের অনুমতি দিন' : 'Authorize offline real-time SMS & OTP reception'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenGuide && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGuide('sms');
              }}
              className="px-2 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-900 dark:text-blue-200 font-bold text-[10px] shrink-0 transition"
            >
              {isBn ? 'কেন দরকার?' : 'Why?'}
            </button>
          )}
          <button
            id="banner-activate-sms-btn"
            onClick={handleQuickActivateSms}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm shrink-0 flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            <span>{isBn ? 'অন করুন' : 'Enable'}</span>
          </button>
        </div>
      </div>
    );
  }

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
            {isBn ? 'ডিফল্ট কল ও মেসেজ পারমিশন সক্রিয় করুন' : 'Authorize Default Phone & SMS Roles'}
          </h4>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate">
            {isBn
              ? 'ইনকামিং কল, কলার আইডি ওভারলে ও রিয়েল এসএমএস পারমিশন'
              : 'Permission for incoming calls, caller ID & SMS features'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenGuide && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenGuide('dialer');
            }}
            className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-[10px] border border-slate-700/60 shrink-0 transition cursor-pointer"
          >
            {isBn ? 'গাইড' : 'Guide'}
          </button>
        )}
        <button
          id="banner-activate-default-btn"
          onClick={handleQuickActivateAll}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm shrink-0 flex items-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <Zap className="w-3 h-3" />
          <span>{isBn ? '১-ক্লিকে সক্রিয়' : 'Activate All'}</span>
        </button>
      </div>
    </div>
  );
};
