import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  PhoneCall,
  MessageSquare,
  Settings,
  ExternalLink,
  ChevronRight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Smartphone,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  Radio,
  PlayCircle,
  Terminal,
  Cpu
} from 'lucide-react';
import { Language } from '../utils/i18n';
import { callPermissionService, RoleManager, AndroidRole } from '../services/callPermissionService';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  initialRole?: 'dialer' | 'sms' | 'screening' | 'overlay';
}

type TabType = 'why' | 'steps' | 'test';
type OEMType = 'samsung' | 'xiaomi' | 'realme_oppo' | 'pixel_stock';

interface IntentTestResult {
  triggered: boolean;
  timestamp?: number;
  uri?: string;
  isHeld?: boolean;
  message?: string;
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  lang = 'bn',
  initialRole = 'dialer',
}) => {
  const isBn = lang === 'bn';

  const [activeTab, setActiveTab] = useState<TabType>('why');
  const [selectedRole, setSelectedRole] = useState<'dialer' | 'sms' | 'screening' | 'overlay'>(initialRole);
  const [selectedOem, setSelectedOem] = useState<OEMType>('samsung');

  const [isDialerHeld, setIsDialerHeld] = useState<boolean>(false);
  const [isSmsHeld, setIsSmsHeld] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Dummy Dialer Intent Test State
  const [dummyTestNumber, setDummyTestNumber] = useState<string>('123');
  const [isTestingIntent, setIsTestingIntent] = useState<boolean>(false);
  const [intentTestResult, setIntentTestResult] = useState<IntentTestResult | null>(null);

  // Sync role status
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const dialer = await RoleManager.isRoleHeld(RoleManager.ROLE_DIALER);
      const sms = await RoleManager.isRoleHeld(RoleManager.ROLE_SMS);
      setIsDialerHeld(dialer);
      setIsSmsHeld(sms);
    } catch (err) {
      console.warn('Error checking role status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      checkStatus();
      setIntentTestResult(null);
    }
  }, [isOpen, initialRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleRequestRole = async (role: AndroidRole) => {
    const granted = await RoleManager.requestRole(role);
    await checkStatus();
    if (granted) {
      showToast(isBn ? 'রোল সফলভাবে অনুমোদিত হয়েছে!' : 'Role granted successfully!');
    } else {
      showToast(isBn ? 'সিস্টেম ডায়ালগ সম্পন্ন হয়েছে। সেটিংস যাচাই করুন।' : 'System prompt finished. Verify in settings.');
    }
  };

  // Trigger Dummy Dialer Intent
  const handleTestDummyDialer = async () => {
    setIsTestingIntent(true);
    setIntentTestResult(null);

    try {
      const res = await callPermissionService.testDummyDialerIntent(dummyTestNumber);
      await checkStatus();

      setIntentTestResult({
        triggered: true,
        timestamp: res.timestamp,
        uri: res.uri,
        isHeld: res.isDefaultHeld,
        message: res.isDefaultHeld
          ? (isBn
              ? 'Intent.ACTION_DIAL সফলভাবে পাঠানো হয়েছে। Smart Dialer ওএস-এ ডিফল্ট হিসেবে ভেরিফায়েড!'
              : 'Intent.ACTION_DIAL dispatched. Smart Dialer is verified as the system default dialer!')
          : (isBn
              ? 'Intent.ACTION_DIAL ওএস-এ পাঠানো হয়েছে। ওএস অ্যাপ ডায়ালগ আসলে Smart Dialer নির্বাচন করে "Always" দিন।'
              : 'Intent.ACTION_DIAL dispatched. When system app chooser appears, select Smart Dialer and tap "Always".'),
      });
    } catch (err) {
      console.error('Failed to trigger dummy dialer intent:', err);
      setIntentTestResult({
        triggered: true,
        isHeld: false,
        message: isBn ? 'ডায়ালার ইনটেন্ট ট্রিগার করতে সমস্যা হয়েছে।' : 'Error triggering dialer intent.',
      });
    } finally {
      setIsTestingIntent(false);
    }
  };

  // Calculate missing role status
  const missingRoleState: 'none' | 'dialer' | 'sms' | 'both' =
    !isDialerHeld && !isSmsHeld
      ? 'both'
      : !isDialerHeld && isSmsHeld
      ? 'dialer'
      : isDialerHeld && !isSmsHeld
      ? 'sms'
      : 'none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {isBn ? 'অ্যান্ড্রয়েড ডিফল্ট অ্যাপ ও পারমিশন গাইড' : 'Android Default App & Permission Guide'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBn
                  ? 'RoleManager API (Android 10+) ও সিস্টেম ডায়ালার ইনটেন্ট ভেরিফিকেশন'
                  : 'RoleManager API (Android 10+) & Intent Verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Missing Role Alert & Tailored Action Banner */}
        <div className="px-5 pt-3 shrink-0">
          {missingRoleState === 'both' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300">
                    {isBn
                      ? 'কল ও মেসেজ উভয় ডিফল্ট রোল অনুপস্থিত (DIALER & SMS Missing)'
                      : 'Default Phone & SMS Roles Missing'}
                  </div>
                  <div className="text-[11px] text-amber-200/80">
                    {isBn
                      ? 'ইনকামিং কল কলার আইডি এবং অফলাইন এসএমএস সেভ করতে রোল দুটি অনুমোদিত হতে হবে।'
                      : 'Required to intercept incoming calls and save offline SMS records into local DB.'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => RoleManager.openDefaultAppsSettings()}
                className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
                title="Intent.ACTION_MANAGE_DEFAULT_APPS_SETTINGS"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isBn ? 'সরাসরি ডিফল্ট অ্যাপ সেটিংস খুলুন' : 'Open Default Apps Settings'}</span>
              </button>
            </div>
          )}

          {missingRoleState === 'dialer' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <PhoneCall className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-300">
                    {isBn
                      ? 'ডিফল্ট ফোন অ্যাপ রোল অনুপস্থিত (ROLE_DIALER Missing)'
                      : 'Default Phone Role Missing (ROLE_DIALER)'}
                  </div>
                  <div className="text-[11px] text-rose-200/80">
                    {isBn
                      ? 'কল আসলে কলার আইডি ও রাডার স্ক্রিন প্রদর্শন করতে Smart Dialer-কে ডিফল্ট ফোন অ্যাপ করুন।'
                      : 'Set Smart Dialer as default phone app for heads-up caller ID & radar display.'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => RoleManager.openDefaultAppsSettings()}
                className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
                title="Intent.ACTION_MANAGE_DEFAULT_APPS_SETTINGS"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isBn ? 'ডিফল্ট ফোন অ্যাপ সেটিংস খুলুন' : 'Open Phone App Settings'}</span>
              </button>
            </div>
          )}

          {missingRoleState === 'sms' && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-300">
                    {isBn
                      ? 'ডিফল্ট মেসেজ অ্যাপ রোল অনুপস্থিত (ROLE_SMS Missing)'
                      : 'Default SMS Role Missing (ROLE_SMS)'}
                  </div>
                  <div className="text-[11px] text-blue-200/80">
                    {isBn
                      ? 'অফলাইনে রিয়েল-টাইম এসএমএস ও ওটিপি লোকাল ডাটাবেসে সেভ করার জন্য এই রোল প্রয়োজন।'
                      : 'Required to receive and save real-time offline SMS & OTP messages locally.'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => RoleManager.openDefaultAppsSettings()}
                className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm"
                title="Intent.ACTION_MANAGE_DEFAULT_APPS_SETTINGS"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isBn ? 'ডিফল্ট মেসেজ অ্যাপ সেটিংস খুলুন' : 'Open SMS App Settings'}</span>
              </button>
            </div>
          )}

          {missingRoleState === 'none' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2.5 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold">
                    {isBn ? 'সব ডিফল্ট রোল সক্রিয় রয়েছে!' : 'All Default Roles Active!'}
                  </span>{' '}
                  <span className="text-[11px] text-emerald-400/80">
                    {isBn
                      ? '(ROLE_DIALER ও ROLE_SMS উভয়ই ওএস-এ সফলভাবে রেজিস্টার্ড)'
                      : '(ROLE_DIALER & ROLE_SMS both verified in Android OS)'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                100% Verified
              </span>
            </div>
          )}
        </div>

        {/* Action Toast Feedback */}
        {actionMessage && (
          <div className="mx-5 mt-2 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs (Segmented Controls) */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/90 shrink-0">
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('why')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'why'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{isBn ? 'কেন প্রয়োজন?' : 'Why Roles are Needed'}</span>
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isBn ? 'সেটিংস গাইড' : 'Settings Walkthrough'}</span>
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'test'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{isBn ? 'ডায়ালার টেস্ট ও অ্যাকশন' : 'Dialer Test & Actions'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* TAB 1: WHY SPECIFIC ROLES ARE NEEDED */}
          {activeTab === 'why' && (
            <div className="space-y-4">
              {/* Role Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedRole('dialer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRole === 'dialer'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>ROLE_DIALER (ডিফল্ট ফোন)</span>
                </button>
                <button
                  onClick={() => setSelectedRole('sms')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRole === 'sms'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>ROLE_SMS (ডিফল্ট মেসেজ)</span>
                </button>
                <button
                  onClick={() => setSelectedRole('screening')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRole === 'screening'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ROLE_CALL_SCREENING</span>
                </button>
                <button
                  onClick={() => setSelectedRole('overlay')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedRole === 'overlay'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>DISPLAY OVER OTHER APPS</span>
                </button>
              </div>

              {/* ROLE_DIALER Detail */}
              {selectedRole === 'dialer' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
                        1
                      </div>
                      <h3 className="font-semibold text-white">
                        {isBn ? 'ROLE_DIALER (ডিফল্ট ডায়ালার ও কল ম্যানেজার)' : 'ROLE_DIALER (Default Phone Application)'}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">android.app.role.DIALER</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                    <p>
                      {isBn
                        ? 'অ্যান্ড্রয়েড ১০ (API 29) এবং তদূর্ধ্ব ভার্সনে গুগল একটি কঠোর সিকিউরিটি ফ্রেমওয়ার্ক চালু করেছে। শুধুমাত্র যে অ্যাপটি "ROLE_DIALER" হিসেবে অনুমোদিত, কেবল সেটিই ফোনের মূল টেলিকম সার্ভিসের নিয়ন্ত্রণ গ্রহণ করতে পারে।'
                        : 'On Android 10+ (API 29+), Google enforces strict telephony isolation. Only the app holding ROLE_DIALER can manage active telecom call states.'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isBn ? 'এই রোল অন থাকলে যা যা সম্ভব:' : 'What this role unlocks:'}</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>{isBn ? 'ইনকামিং কল ইন্টারসেপ্ট:' : 'Incoming Call Interception:'}</strong>{' '}
                        {isBn
                          ? 'কল আসার সাথে সাথে কলারের পরিচিতি ও লাইভ রাডার তথ্য স্ক্রিনে ভেসে ওঠে।'
                          : 'Displays caller ID, spam score, and location radar HUD instantly when a call arrives.'}
                      </li>
                      <li>
                        <strong>{isBn ? 'সিম ১ / সিম ২ নির্বাচন:' : 'SIM 1 / SIM 2 Dual Selection:'}</strong>{' '}
                        {isBn
                          ? 'ডুয়াল সিম ফোনে সরাসরি আপনার পছন্দের সিম দিয়ে সরাসরি কল পরিচালনা।'
                          : 'Direct slot dispatch for Dual SIM devices without system ambiguity.'}
                      </li>
                      <li>
                        <strong>{isBn ? 'আনলিমিটেড কল লগস অ্যাক্সেস:' : 'Full Call History Management:'}</strong>{' '}
                        {isBn
                          ? 'মিসড কল, রিসিভড কল ও ডায়াল করা কল ডাটাবেসে নির্ভুলভাবে সংরক্ষিত হয়।'
                          : 'Direct read/write access to Android system call log provider.'}
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-900/40 text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>{isBn ? 'অন না থাকলে কী হবে?' : 'Consequence if disabled:'}</strong>{' '}
                      {isBn
                        ? 'সিস্টেম কলগুলো পুরানো স্টক ডায়ালারে পাঠিয়ে দেবে এবং স্মার্ট কলার আইডি ও রাডার স্ক্রিন বন্ধ থাকবে।'
                        : 'Calls route to default factory phone app; floating caller radar HUD cannot auto-pop.'}
                    </div>
                  </div>
                </div>
              )}

              {/* ROLE_SMS Detail */}
              {selectedRole === 'sms' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-xs font-bold">
                        2
                      </div>
                      <h3 className="font-semibold text-white">
                        {isBn ? 'ROLE_SMS (ডিফল্ট এসএমএস ও ইনবক্স হ্যান্ডলার)' : 'ROLE_SMS (Default Messaging Application)'}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">android.app.role.SMS</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                    <p>
                      {isBn
                        ? 'অ্যান্ড্রয়েডের নীতি অনুযায়ী, একই সাথে ফোনে কেবল একটি মাত্র অ্যাপ "ডিফল্ট এসএমএস অ্যাপ" হতে পারে। এটি ছাড়া কোনো থার্ড-পার্টি অ্যাপ সরাসরি মেসেজ সেভ করতে বা এসএমএস পাঠাতে পারে না।'
                        : 'Android architecture enforces that only the designated Default SMS App has write access to content://sms and receives SMS_DELIVER broadcasts.'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isBn ? 'এই রোল অন থাকলে যা যা সম্ভব:' : 'What this role unlocks:'}</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>{isBn ? 'রিয়েল-টাইম অফলাইন এসএমএস স্টোরেজ:' : 'Real-time Offline SMS Storage:'}</strong>{' '}
                        {isBn
                          ? 'নেটওয়ার্ক অফ থাকলেও আগত এসএমএস ডিভাইস লোকাল Room DB-তে সাথে সাথে সংরক্ষিত হয়।'
                          : 'Incoming SMS broadcasts trigger instant local SQLite / Room DB persistence.'}
                      </li>
                      <li>
                        <strong>{isBn ? 'ব্যাংকিং ও ওটিপি স্মার্ট ক্যাটাগরি:' : 'Fintech & OTP Smart Categorization:'}</strong>{' '}
                        {isBn
                          ? 'বিকাশ, নগদ, ব্যাংক ও ওটিপি মেসেজ আলাদা নিরাপদ ফোল্ডারে ফিল্টার হয়।'
                          : 'Automated privacy-first AI regex parsing for transactions and security codes.'}
                      </li>
                      <li>
                        <strong>{isBn ? '১-ট্যাপে সরাসরি মেসেজ প্রেরণ:' : 'Direct Silent Message Dispatch:'}</strong>{' '}
                        {isBn
                          ? 'অন্য কোনো স্টক মেসেজিং অ্যাপ খোলা ছাড়াই সরাসরি চ্যাট উইন্ডো থেকে সেন্ড হবে।'
                          : 'Sends SMS directly via Telephony framework without third-party dialog interruption.'}
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-900/40 text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>{isBn ? 'অন না থাকলে কী হবে?' : 'Consequence if disabled:'}</strong>{' '}
                      {isBn
                        ? 'মেসেজ ভিউতে নতুন এসএমএস প্রদর্শিত হবে না এবং মেসেজ পাঠাতে গেলে ফোনের ডিফল্ট অ্যাপ খুলে যাবে।'
                        : 'App cannot write messages to local DB; sending SMS will force an external app launch.'}
                    </div>
                  </div>
                </div>
              )}

              {/* ROLE_CALL_SCREENING Detail */}
              {selectedRole === 'screening' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-xs font-bold">
                        3
                      </div>
                      <h3 className="font-semibold text-white">
                        {isBn ? 'ROLE_CALL_SCREENING (স্প্যাম ও স্ক্যাম প্রটেকশন)' : 'ROLE_CALL_SCREENING (Spam & Fraud Defense)'}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">android.app.role.CALL_SCREENING</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isBn
                      ? 'ফোনটি রিং হওয়ার পূর্বেই স্প্যাম ডাটাবেসের সাথে যাচাই করে স্ক্যাম বা প্রমোশনাল কল স্বয়ংক্রিয়ভাবে সাইলেন্ট বা ড্রপ করার অনুমোদন দেয়।'
                      : 'Allows screening calls before the phone rings, checking numbers against community spam radars and fraud engines.'}
                  </p>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-purple-400">{isBn ? 'মূল সুবিধা:' : 'Core Advantages:'}</div>
                    <p>{isBn ? '• রোবোকল ও স্প্যাম কল থেকে স্থায়ী মুক্তি।' : '• Automatic silence on known robocalls.'}</p>
                    <p>{isBn ? '• ক্ষতিকর ফিশিং কলগুলোর বিরুদ্ধে রিয়েল-টাইম ওয়ার্নিং।' : '• Real-time fraud warnings before pickup.'}</p>
                  </div>
                </div>
              )}

              {/* OVERLAY HUD Detail */}
              {selectedRole === 'overlay' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs font-bold">
                        4
                      </div>
                      <h3 className="font-semibold text-white">
                        {isBn ? 'Display Over Other Apps (ফ্লোটিং কলার আইডি HUD)' : 'Display Over Other Apps (Floating Caller HUD)'}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">SYSTEM_ALERT_WINDOW</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isBn
                      ? 'আপনি যখন ফেসবুক, ইউটিউব বা কোনো গেম খেলছেন, তখন কল আসলে সেই অ্যাপের ওপরে একটি মসৃণ কলার আইডি পপআপ ভেসে ওঠার জন্য এই পারমিশন দরকার।'
                      : 'Required to display the floating Truecaller-style HUD over other running applications or lockscreen.'}
                  </p>
                </div>
              )}

              {/* Privacy Guarantee Note */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-200">
                  <strong>{isBn ? '১০০% লোকাল ও গোপনীয়তা বান্ধব:' : '100% Local & Privacy Guaranteed:'}</strong>{' '}
                  {isBn
                    ? 'আপনার কল হিস্ট্রি ও এসএমএস সম্পূর্ণ আপনার ডিভাইসের ভেতরেই সংরক্ষিত থাকে; কোনো সার্ভারে বিক্রি বা আপলোড করা হয় না।'
                    : 'All records stay strictly on-device in local Room DB. Zero unauthorized telemetry or external data leak.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP OEM SETTINGS WALKTHROUGH */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                {isBn
                  ? 'আপনার ফোনের ব্র্যান্ড অনুযায়ী সিস্টেম সেটিংস থেকে ম্যানুয়ালি ডিফল্ট অ্যাপ সিলেক্ট করুন:'
                  : 'Select your smartphone brand for tailored step-by-step visual instructions:'}
              </div>

              {/* Brand Selector Segment */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'samsung', label: 'Samsung (One UI)' },
                  { id: 'xiaomi', label: 'Xiaomi / POCO' },
                  { id: 'realme_oppo', label: 'Realme / Oppo / 1+' },
                  { id: 'pixel_stock', label: 'Pixel / Stock / Moto' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedOem(item.id as OEMType)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition border cursor-pointer ${
                      selectedOem === item.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Step Cards with Visual Breadcrumbs */}
              <div className="space-y-3">
                {selectedOem === 'samsung' && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Samsung Galaxy (One UI 5 / 6) সেটিংস পদ্ধতি:</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                        <div>ফোনের <strong>Settings (সেটিংস)</strong> অ্যাপে প্রবেশ করুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
                        <div>নিচে স্ক্রল করে <strong>Apps (অ্যাপ্লিকেশন)</strong> অপশনে ট্যাপ করুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
                        <div>উপরে থাকা <strong>"Choose default apps"</strong> অপশনে চাপুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">4</div>
                        <div>
                          <strong>"Phone app"</strong>-এ ক্লিক করে <strong>"Smart Dialer"</strong> সিলেক্ট করুন।<br />
                          একইভাবে <strong>"SMS app"</strong>-এ ক্লিক করে <strong>"Smart Dialer"</strong> সিলেক্ট করুন।
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOem === 'xiaomi' && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Xiaomi / Redmi / POCO (MIUI / HyperOS) পদ্ধতি:</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                        <div><strong>Settings</strong> ➔ <strong>Apps</strong> ➔ <strong>Manage Apps</strong>-এ যান।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
                        <div>উপরের ডানদিকের <strong>থ্রি-ডট (⋮)</strong> মেন্যুতে ক্লিক করে <strong>"Default apps"</strong> চাপুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
                        <div><strong>Dial</strong> এবং <strong>Messaging</strong> উভয়েই <strong>Smart Dialer</strong> নির্বাচন করুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">4</div>
                        <div><strong>অটো-স্টার্ট:</strong> Smart Dialer অ্যাপের App Info-তে গিয়ে "Autostart" অন করে দিন।</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOem === 'realme_oppo' && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Realme / Oppo / OnePlus (ColorOS / OxygenOS):</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                        <div><strong>Settings</strong> ➔ <strong>Apps / App Management</strong>-এ যান।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
                        <div><strong>"Default apps"</strong> অপশনে চাপুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
                        <div><strong>Phone app</strong> এবং <strong>SMS app</strong> উভয়টিতে <strong>Smart Dialer</strong> টিক দিন।</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOem === 'pixel_stock' && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Google Pixel / Motorola / Stock Android (Android 10 - 15):</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                        <div><strong>Settings</strong> ➔ <strong>Apps</strong>-এ ট্যাপ করুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
                        <div><strong>Default apps</strong> এ ট্যাপ করুন।</div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
                        <div><strong>Phone app</strong> ও <strong>SMS app</strong> এর ভেতরে গিয়ে <strong>Smart Dialer</strong> নির্বাচন করুন।</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct 1-Click Launch Settings Button */}
              <div className="pt-2">
                <button
                  onClick={() => RoleManager.openDefaultAppsSettings()}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? 'সরাসরি ফোনের "Default Apps" সেটিংস পেজ খুলুন (ACTION_MANAGE_DEFAULT_APPS)' : 'Open System "Default Apps" Settings Page'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DUMMY DIALER INTENT TEST & LIVE ACTIONS */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              {/* Dummy Dialer Intent Test Card */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-white">
                        {isBn ? 'ডায়ালার সিস্টেম ইনটেন্ট ভেরিফিকেশন টেস্ট' : 'Test Default Dialer System Intent'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {isBn
                          ? 'Intent.ACTION_DIAL পাঠিয়ে ওএস রেজিস্ট্রেশন তাৎক্ষণিক নিশ্চিত করুন'
                          : 'Trigger Intent.ACTION_DIAL to verify default app routing'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                    ACTION_DIAL
                  </span>
                </div>

                {/* Input & Preset Chips */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={dummyTestNumber}
                      onChange={(e) => setDummyTestNumber(e.target.value)}
                      placeholder="Enter test phone number..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleTestDummyDialer}
                      disabled={isTestingIntent || !dummyTestNumber}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                    >
                      <PlayCircle className={`w-3.5 h-3.5 ${isTestingIntent ? 'animate-spin' : ''}`} />
                      <span>{isTestingIntent ? (isBn ? 'টেস্টিং...' : 'Testing...') : (isBn ? 'ইনটেন্ট ট্রিগার করুন' : 'Trigger Intent')}</span>
                    </button>
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="shrink-0">{isBn ? 'টেস্ট নম্বর:' : 'Presets:'}</span>
                    {['123', '*#06#', '100', '01700000000'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setDummyTestNumber(preset)}
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] transition cursor-pointer ${
                          dummyTestNumber === preset
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Result Display */}
                {intentTestResult && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        {intentTestResult.isHeld ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{intentTestResult.isHeld ? 'System Default Verified' : 'Intent Sent (Confirmation Needed)'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {intentTestResult.uri}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {intentTestResult.message}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-slate-400 border-t border-slate-800">
                      <div>Action: DIAL</div>
                      <div>Protocol: tel:</div>
                      <div>Role: {isDialerHeld ? 'HELD' : 'UNHELD'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-slate-400">
                  {isBn ? 'আপনার ফোনের বর্তমান RoleManager লাইভ অবস্থা:' : 'Current RoleManager Live State:'}
                </div>
                <button
                  onClick={checkStatus}
                  disabled={isChecking}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
                </button>
              </div>

              {/* Status Cards */}
              <div className="space-y-2.5">
                {/* Dialer Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isDialerHeld ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        {isBn ? 'ডিফল্ট ফোন অ্যাপ (ROLE_DIALER)' : 'Default Phone App (ROLE_DIALER)'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isDialerHeld
                          ? isBn ? 'সক্রিয়ভাবে ডিফল্ট রয়েছে' : 'Currently Active as Default'
                          : isBn ? 'সক্রিয় করা প্রয়োজন' : 'Action Required'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRequestRole(RoleManager.ROLE_DIALER)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      isDialerHeld
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    {isDialerHeld ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBn ? 'সক্রিয়' : 'Active'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isBn ? '১-ক্লিকে অন' : 'Request Role'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SMS Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSmsHeld ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        {isBn ? 'ডিফল্ট মেসেজ অ্যাপ (ROLE_SMS)' : 'Default SMS App (ROLE_SMS)'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isSmsHeld
                          ? isBn ? 'সক্রিয়ভাবে ডিফল্ট রয়েছে' : 'Currently Active as Default'
                          : isBn ? 'সক্রিয় করা প্রয়োজন' : 'Action Required'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRequestRole(RoleManager.ROLE_SMS)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      isSmsHeld
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                    }`}
                  >
                    {isSmsHeld ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBn ? 'সক্রিয়' : 'Active'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isBn ? '১-ক্লিকে অন' : 'Request Role'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Master Settings Navigation Controls */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => RoleManager.openDefaultAppsSettings()}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? 'Default Apps সেটিংস (ACTION_MANAGE_DEFAULT_APPS)' : 'Default Apps Settings'}</span>
                </button>
                <button
                  onClick={() => RoleManager.openAppSettings()}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition"
                >
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  <span>{isBn ? 'App Info ও সব পারমিশন' : 'App Details & All Permissions'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            {isBn ? 'Smart Dialer • Intent.ACTION_MANAGE_DEFAULT_APPS' : 'Smart Dialer • ACTION_MANAGE_DEFAULT_APPS'}
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            {isBn ? 'ঠিক আছে' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
