import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  PhoneCall,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  Zap,
  Sparkles,
  Smartphone,
  Mic,
  Users,
  Clock,
  Layers,
  Check,
  Volume2,
  ChevronRight,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Cpu,
  Copy,
  Radio,
  ExternalLink,
  Settings as SettingsIcon,
  Code2,
  Flame,
  Save,
  MessageSquare,
  CardSim as SimCard,
} from 'lucide-react';
import { Language } from '../utils/i18n';
import {
  callPermissionService,
  CallPermissions,
  CallMode,
} from '../services/callPermissionService';
import { CallerIdRecord } from '../types';

interface DefaultCallPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSimulateIncoming?: (caller: CallerIdRecord, mode?: 'fullscreen' | 'overlay') => void;
}

export const DefaultCallPermissionModal: React.FC<DefaultCallPermissionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSimulateIncoming,
}) => {
  const [permissions, setPermissions] = useState<CallPermissions>(() =>
    callPermissionService.getPermissions()
  );
  const [isDefault, setIsDefault] = useState<boolean>(() =>
    callPermissionService.isDefault()
  );
  const [isDefaultSms, setIsDefaultSms] = useState<boolean>(() =>
    callPermissionService.isDefaultSms()
  );
  const [selectedSmsApp, setSelectedSmsApp] = useState<'smart_dialer' | 'google_messages'>('smart_dialer');
  const [callMode, setCallMode] = useState<CallMode>(() =>
    callPermissionService.getCallMode()
  );
  const [selectedSimDialer, setSelectedSimDialer] = useState<'smart_dialer' | 'system_phone'>('smart_dialer');
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'dialog' | 'permissions' | 'settings' | 'code'>('dialog');
  const [micTesting, setMicTesting] = useState(false);
  const [micSuccess, setMicSuccess] = useState<boolean | null>(null);

  // Real call tester state
  const [testPhoneNumber, setTestPhoneNumber] = useState('+8801712345678');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isBn = lang === 'bn';

  useEffect(() => {
    if (isOpen) {
      setPermissions(callPermissionService.getPermissions());
      setIsDefault(callPermissionService.isDefault());
      setIsDefaultSms(callPermissionService.isDefaultSms());
      setCallMode(callPermissionService.getCallMode());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof CallPermissions) => {
    const nextVal = !permissions[key];
    callPermissionService.setPermission(key, nextVal);
    setPermissions(callPermissionService.getPermissions());
    setIsDefault(callPermissionService.isDefault());
    setIsDefaultSms(callPermissionService.isDefaultSms());
    showSavedFeedback();
  };

  const handleSetCallMode = (mode: CallMode) => {
    setCallMode(mode);
    callPermissionService.setCallMode(mode);
    showSavedFeedback();
  };

  const handleSetAsDefaultRole = () => {
    if (selectedSimDialer === 'smart_dialer') {
      callPermissionService.setDefaultDialer(true);
      setIsDefault(true);
      setPermissions(callPermissionService.getPermissions());
    } else {
      callPermissionService.setDefaultDialer(false);
      setIsDefault(false);
      setPermissions(callPermissionService.getPermissions());
    }
    showSavedFeedback();
  };

  const handleSetAsDefaultSmsRole = () => {
    if (selectedSmsApp === 'smart_dialer') {
      callPermissionService.setDefaultSms(true);
      setIsDefaultSms(true);
      setPermissions(callPermissionService.getPermissions());
    } else {
      callPermissionService.setDefaultSms(false);
      setIsDefaultSms(false);
      setPermissions(callPermissionService.getPermissions());
    }
    showSavedFeedback();
  };

  const handleActivateAll = async () => {
    setIsActivatingAll(true);
    await callPermissionService.activateAllPermissions();
    setPermissions(callPermissionService.getPermissions());
    setIsDefault(true);
    setIsDefaultSms(true);
    setCallMode('real');
    setSelectedSimDialer('smart_dialer');
    setSelectedSmsApp('smart_dialer');
    setTimeout(() => {
      setIsActivatingAll(false);
      showSavedFeedback();
    }, 400);
  };

  const showSavedFeedback = () => {
    setSaveSuccessMsg(isBn ? 'সেটিংস সফলভাবে সেভ হয়েছে!' : 'Settings saved successfully!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 2500);
  };

  const handleTestMic = async () => {
    setMicTesting(true);
    setMicSuccess(null);
    const success = await callPermissionService.requestMicrophonePermission();
    setMicSuccess(success);
    setPermissions(callPermissionService.getPermissions());
    setMicTesting(false);
  };

  const handleTriggerRealCall = () => {
    if (!testPhoneNumber) return;
    callPermissionService.makeRealCall(testPhoneNumber);
    showSavedFeedback();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      id="default-call-permission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <img
              src="/app-logo.png"
              alt="Smart Dialer"
              className="w-10 h-10 rounded-2xl shadow-md border border-emerald-500/40 object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'ডিফল্ট ফোন অ্যাপ ও পারমিশন কন্ট্রোল' : 'Default Phone App & Permissions'}
                </h2>
                {isDefault ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    <Check className="w-2.5 h-2.5" />
                    {isBn ? 'সক্রিয়' : 'Active'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {isBn ? 'সেট করা প্রয়োজন' : 'Setup Required'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                {isBn
                  ? 'অ্যান্ড্রয়েড ডিফল্ট সেটিং ও রিয়েল কল ম্যানেজমেন্ট'
                  : 'Android OS Telecom, Default Settings & Real Calling'}
              </p>
            </div>
          </div>
          <button
            id="close-permission-modal-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (4 Comprehensive Tabs) */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-3 sm:px-5 pt-2 bg-neutral-50/50 dark:bg-neutral-900/40 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dialog')}
            className={`pb-2 text-xs font-semibold px-2.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'dialog'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isBn ? 'রোল ও রিয়েল কল' : 'Role & Real Call'}</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-2 text-xs font-semibold px-2.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'permissions'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? 'পারমিশন সমূহ' : 'All Permissions'}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 text-xs font-semibold px-2.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডিফল্ট সেটিংস গাইড' : 'Keep Active Guide'}</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`pb-2 text-xs font-semibold px-2.5 border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'টেলিকম কোড' : 'Telecom Code'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Feedback message if saved */}
          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: Android Role Dialog & Real Call Settings */}
          {activeTab === 'dialog' && (
            <div className="space-y-4">
              {/* Call Mode Switcher Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-3.5 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'কল করার মোড নির্ধারণ (Call Engine Mode)' : 'Call Engine Mode'}
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                    {callMode === 'real' ? (isBn ? 'রিয়েল মোড' : 'Real SIM') : (isBn ? 'ইন-অ্যাপ মোড' : 'In-App')}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {isBn
                    ? 'আপনি কি সরাসরি আপনার ফোনের সিম কার্ড দিয়ে রিয়েল কল করতে চান, নাকি অ্যাপের স্ক্রিনে কল টেস্ট করতে চান?'
                    : 'Choose whether clicking Call initiates a real cellular phone call through your SIM or opens the in-app Telecom UI.'}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleSetCallMode('real')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      callMode === 'real'
                        ? 'border-emerald-500 bg-white dark:bg-neutral-800 shadow-sm ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        {isBn ? 'রিয়েল সিম কল' : 'Real SIM Call'}
                      </span>
                      {callMode === 'real' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      {isBn ? 'সরাসরি মোবাইলের সিম কার্ড ডায়াল করবে' : 'Dials cellular SIM via tel: protocol'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSetCallMode('simulated')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      callMode === 'simulated'
                        ? 'border-emerald-500 bg-white dark:bg-neutral-800 shadow-sm ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-cyan-600" />
                        {isBn ? 'ইন-অ্যাপ স্ক্রিন' : 'In-App UI'}
                      </span>
                      {callMode === 'simulated' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      {isBn ? 'অ্যাপের ভেতর রিং ও ডায়ালপ্যাড কন্ট্রোল' : 'Interactive InCallService screen'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Real Call Instant Tester */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'রিয়েল কল টেস্ট করুন (Instant Real Call Test)' : 'Instant Real Call Test'}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+8801..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleTriggerRealCall}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>{isBn ? 'রিয়েল কল দিন' : 'Call Now'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  {isBn
                    ? 'এটি সরাসরি আপনার ফোনের ডায়ালার বা সিম নেটওয়ার্কে কল পাঠাবে এবং কল হিস্ট্রিতে সেভ করবে।'
                    : 'Triggers phone cellular dialer and persists outgoing call log automatically.'}
                </p>
              </div>

              {/* Android Native Dialog Card */}
              <div className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/70 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Set Smart Dialer as default Phone app?
                    </h3>
                    <p className="text-[10px] text-neutral-500">Android 14 RoleManager.ROLE_DIALER</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {isBn
                    ? 'স্মার্ট ডায়ালারকে আপনার প্রধান ফোন অ্যাপ হিসেবে সেট করলে এটি ইনকামিং ও আউটগোয়িং কল, কলার আইডি এবং স্প্যাম ব্লকিং পরিচালনা করবে।'
                    : 'Smart Dialer will manage all incoming and outgoing calls, caller ID popup, and real-time spam call blocking.'}
                </p>

                {/* Simulated Radio Options */}
                <div className="space-y-2 pt-1">
                  {/* Option 1: Native Phone */}
                  <label
                    onClick={() => setSelectedSimDialer('system_phone')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedSimDialer === 'system_phone'
                        ? 'border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          Phone
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {isBn ? 'সিস্টেমের সাধারণ ডায়ালার' : 'System default'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="dialer_role"
                      checked={selectedSimDialer === 'system_phone'}
                      onChange={() => setSelectedSimDialer('system_phone')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>

                  {/* Option 2: Smart Dialer & Caller ID (Highlighted) */}
                  <label
                    onClick={() => setSelectedSimDialer('smart_dialer')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedSimDialer === 'smart_dialer'
                        ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-700/60 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="/app-logo.png"
                        alt="Smart Dialer"
                        className="w-8 h-8 rounded-xl object-cover border border-emerald-500/50 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Smart Dialer & Caller ID
                          </p>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-bold">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {isBn ? 'ফুল কলার আইডি ও স্প্যাম প্রোটেকশন' : 'Full Caller ID & Spam Shield'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="dialer_role"
                      checked={selectedSimDialer === 'smart_dialer'}
                      onChange={() => setSelectedSimDialer('smart_dialer')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                {/* Set as Default Action button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedSimDialer('smart_dialer');
                      handleSetAsDefaultRole();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ডিফল্ট ফোন অ্যাপ সংরক্ষণ করুন' : 'Save as Default Phone App'}</span>
                  </button>
                </div>
              </div>

              {/* ================= GOOGLE MESSAGES & DEFAULT SMS ROLE CARD ================= */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-700/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <span>{isBn ? 'ডিফল্ট মেসেজ পারমিশন (Google Messages)' : 'Default SMS Role (Google Messages)'}</span>
                        {isDefaultSms ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {isBn ? 'ডিফল্ট সক্রিয়' : 'ACTIVE'}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            {isBn ? 'প্রয়োজন' : 'REQUIRED'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {isBn
                          ? 'অফলাইনে রিয়েল-টাইমে মেসেজ ও ওটিপি রিসিভ করার অনুমতি'
                          : 'Receive real-time offline SMS & OTP recognition'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SMS App Choice */}
                <div className="space-y-1.5">
                  {/* Option 1: Native System SMS */}
                  <label
                    onClick={() => setSelectedSmsApp('google_messages')}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      selectedSmsApp === 'google_messages'
                        ? 'border-blue-500 bg-white dark:bg-neutral-800 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {isBn ? 'সিস্টেম মেসেঞ্জার (System SMS)' : 'System SMS App'}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {isBn ? 'সাধারণ বেসিক এসএমএস' : 'Standard native SMS app'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="sms_role"
                      checked={selectedSmsApp === 'google_messages'}
                      onChange={() => setSelectedSmsApp('google_messages')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {/* Option 2: Smart Dialer Google Messages */}
                  <label
                    onClick={() => setSelectedSmsApp('smart_dialer')}
                    className={`p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                      selectedSmsApp === 'smart_dialer'
                        ? 'border-blue-600 bg-blue-100/50 dark:bg-blue-950/70 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Smart Dialer &amp; Messages
                          </p>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-600 text-white font-bold">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium">
                          {isBn ? 'রিয়েল-টাইম অফলাইন রিসিভ + ওটিপি অটো-কপি + স্প্যাম ফিল্টার' : 'Real-time offline receive + OTP copy + Spam shield'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="sms_role"
                      checked={selectedSmsApp === 'smart_dialer'}
                      onChange={() => setSelectedSmsApp('smart_dialer')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <button
                  id="save-default-sms-role-btn"
                  onClick={() => {
                    setSelectedSmsApp('smart_dialer');
                    handleSetAsDefaultSmsRole();
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isBn ? 'Google মেসেজকে ডিফল্ট অ্যাপ করুন' : 'Set as Default SMS App'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: All Permissions & Background Controls */}
          {activeTab === 'permissions' && (
            <div className="space-y-2.5">
              {/* Permission: CALL_PHONE (Real Direct Calling) */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'সরাসরি রিয়েল কল (CALL_PHONE)' : 'Direct Real Calling (CALL_PHONE)'}
                      </h4>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">
                        VITAL
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'কনফার্মেশন ছাড়াই সরাসরি সিম দিয়ে কল' : 'Make real cellular calls via SIM'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('callPhone')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.callPhone ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: Ignore Battery Optimizations (Keep App Active) */}
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'ব্যাকগ্রাউন্ডে সক্রিয় থাকা (ব্যাটারি অপটিমাইজেশন অফ)' : 'Ignore Battery Optimization'}
                      </h4>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold">
                        KEEP ALIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'কল আসলে অ্যান্ড্রয়েড যেন অ্যাপ স্লিপ না করে' : 'Prevents Android OS from killing caller ID'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('ignoreBatteryOptimization')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.ignoreBatteryOptimization ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: Autostart on Boot */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'মোবাইল অন হলেই অটো-চালু (RECEIVE_BOOT_COMPLETED)' : 'Autostart on Boot'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'ফোন রিস্টার্ট হলেও কলার আইডি চালু থাকবে' : 'Keeps spam protection active after reboot'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('autostart')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.autostart ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: ROLE_DIALER */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'ডিফল্ট ফোন অ্যাপ (ROLE_DIALER)' : 'Default Phone App Role'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'সিস্টেমের প্রধান ডায়ালার ও কল রিসিভার' : 'Replaces native system dialer'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('roleDialer')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.roleDialer ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: ROLE_SMS (Google Messages / Default SMS Role) */}
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'ডিফল্ট মেসেজ অ্যাপ (ROLE_SMS / Google Messages)' : 'Default SMS App Role (ROLE_SMS)'}
                      </h4>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                        SMS
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'ডিফল্ট মেসেঞ্জার হিসেবে সমস্ত টেক্সট মেসেজ ও ওটিপি গ্রহণ' : 'Default SMS handler for messages and OTPs'}
                    </p>
                  </div>
                </div>
                <button
                  id="toggle-sms-role-btn"
                  onClick={() => {
                    const nextVal = !permissions.roleSms;
                    callPermissionService.setDefaultSms(nextVal);
                    setPermissions(callPermissionService.getPermissions());
                    setIsDefaultSms(nextVal);
                    showSavedFeedback();
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.roleSms ? 'bg-blue-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: RECEIVE_SMS & READ_SMS */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'মেসেজ গ্রহণ ও রিড পারমিশন (RECEIVE_SMS & READ_SMS)' : 'Receive & Read SMS'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'রিয়েল-টাইমে অফলাইনে মেসেজ আসলে অ্যাপে ইনজেস্ট করা' : 'Real-time offline incoming SMS broadcast listener'}
                    </p>
                  </div>
                </div>
                <button
                  id="toggle-receive-sms-btn"
                  onClick={() => {
                    const nextVal = !permissions.receiveSms;
                    callPermissionService.setPermission('receiveSms', nextVal);
                    callPermissionService.setPermission('readSms', nextVal);
                    setPermissions(callPermissionService.getPermissions());
                    showSavedFeedback();
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.receiveSms ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: SEND_SMS */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'মেসেজ পাঠানোর অনুমতি (SEND_SMS)' : 'Send SMS Permission'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'সিম ১ বা সিম ২ থেকে সরাসরি এসএমএস পাঠানো' : 'Send SMS directly from SIM 1 or SIM 2'}
                    </p>
                  </div>
                </div>
                <button
                  id="toggle-send-sms-btn"
                  onClick={() => handleToggle('sendSms')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.sendSms ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: SYSTEM_ALERT_WINDOW */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'ফ্লোটিং কলার আইডি (SYSTEM_ALERT_WINDOW)' : 'Display Over Other Apps'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'অন্যান্য অ্যাপ চালু থাকাকালে স্ক্রিনে পপআপ' : 'Floating overlay during phone ring'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('systemAlertWindow')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.systemAlertWindow ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: Contacts Access */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'কন্টাক্টস এক্সেস (READ & WRITE_CONTACTS)' : 'Contacts Permission'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'ফোনের কন্টাক্ট নম্বর ও নাম সিঙ্ক করা' : 'Read & save phonebook contacts'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('readContacts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.readContacts ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: SIM Card Numbers & Contacts (User Request) */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <SimCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isBn
                          ? 'সিম কার্ড নম্বর ও সেভ করার পারমিশন (SIM Numbers & ADN)'
                          : 'SIM Contacts & Phone Numbers Permission'}
                      </h4>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">
                        SIM 1 / SIM 2
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn
                        ? 'সিমের নম্বর দেখা ও সরাসরি সিমে সেভ করার পারমিশন (content://icc/adn)'
                        : 'Read numbers from SIM & write contacts to SIM memory'}
                    </p>
                  </div>
                </div>
                <button
                  id="toggle-sim-card-permission-btn"
                  onClick={() => {
                    const nextVal = !permissions.simCardContacts;
                    callPermissionService.setPermission('simCardContacts', nextVal);
                    callPermissionService.setPermission('readPhoneNumbers', nextVal);
                    if (nextVal) {
                      callPermissionService.setPermission('readContacts', true);
                      callPermissionService.setPermission('writeContacts', true);
                    }
                    setPermissions(callPermissionService.getPermissions());
                    showSavedFeedback();
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.simCardContacts ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: Call Logs Access */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'কল হিস্ট্রি এক্সেস (READ & WRITE_CALL_LOG)' : 'Call Logs Permission'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'মিসড, রিসিভড ও ডায়ালড হিস্ট্রি রাখা' : 'Access & sync system call logs'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('readCallLog')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    permissions.readCallLog ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Permission: Microphone Audio */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'মাইক্রোফোন ও কল অডিও (RECORD_AUDIO)' : 'Microphone Call Audio'}
                      </h4>
                      {micSuccess === true && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold">
                          GRANTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {isBn ? 'কল চলাকালীন কণ্ঠস্বর আদান-প্রদান' : 'In-call voice streaming & media'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestMic}
                    disabled={micTesting}
                    className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold hover:bg-rose-100 transition"
                  >
                    {micTesting ? '...' : isBn ? 'টেস্ট' : 'Test'}
                  </button>
                  <button
                    onClick={() => handleToggle('audioRecord')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                      permissions.audioRecord ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Android Default Settings Guide (Keep Active on Devices) */}
          {activeTab === 'settings' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 space-y-2">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>{isBn ? 'অ্যান্ড্রয়েড ডিফল্ট সেটিংসে অ্যাপ সক্রিয় রাখার ৩টি ধাপ:' : '3 Vital Steps to Keep Dialer Active:'}</span>
                </h4>
                <div className="space-y-2 text-[11px] text-neutral-700 dark:text-neutral-300">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <div>
                      <strong className="text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'ডিফল্ট ফোন অ্যাপ নির্বাচন:' : 'Set as Default Phone App:'}
                      </strong>
                      <p className="text-neutral-500">Settings &gt; Apps &gt; Default apps &gt; Phone app &gt; Select "Smart Dialer".</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <div>
                      <strong className="text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'ব্যাটারি অপটিমাইজেশন "Unrestricted" করুন:' : 'Set Battery Optimization to Unrestricted:'}
                      </strong>
                      <p className="text-neutral-500">Settings &gt; Apps &gt; Smart Dialer &gt; Battery &gt; Unrestricted / Don't optimize.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <div>
                      <strong className="text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'অন্যান্য অ্যাপের উপর পারমিশন (Overlay):' : 'Display Over Other Apps:'}
                      </strong>
                      <p className="text-neutral-500">Settings &gt; Apps &gt; Special app access &gt; Display over other apps &gt; Allow.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                    <div>
                      <strong className="text-neutral-900 dark:text-neutral-100">
                        {isBn ? 'ডিফল্ট মেসেজ অ্যাপ নির্বাচন (Google Messages):' : 'Set as Default SMS App (Google Messages):'}
                      </strong>
                      <p className="text-neutral-500">Settings &gt; Apps &gt; Default apps &gt; SMS app &gt; Select "Smart Dialer &amp; Messages".</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Specific OEM Autostart Guide */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3.5 space-y-2.5 bg-neutral-50 dark:bg-neutral-800/40">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-600" />
                  <span>{isBn ? 'ব্র্যান্ডভিত্তিক অটো-স্টার্ট নির্দেশিকা (OEM Autostart):' : 'OEM Autostart Guidelines:'}</span>
                </h4>

                <div className="space-y-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <p className="font-bold text-orange-600 dark:text-orange-400">Xiaomi / Redmi / POCO (MIUI & HyperOS):</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Security app &gt; Manage Apps &gt; Smart Dialer &gt; Enable "Autostart" &gt; Other Permissions &gt; Allow "Display pop-up windows while running in background".
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <p className="font-bold text-blue-600 dark:text-blue-400">Samsung (One UI):</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Settings &gt; Battery and device care &gt; Battery &gt; Background usage limits &gt; Never sleeping apps &gt; Add "Smart Dialer".
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">Realme / Oppo / OnePlus (ColorOS / OxygenOS):</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Settings &gt; Apps &gt; App management &gt; Smart Dialer &gt; Battery usage &gt; Enable "Allow background activity" & "Allow auto-launch".
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">Vivo (Funtouch OS):</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Settings &gt; Battery &gt; High background power consumption &gt; Turn ON for "Smart Dialer".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Telecom Framework & AndroidManifest Code */}
          {activeTab === 'code' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-900 text-neutral-100 space-y-2 font-mono text-[10px]">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                  <span className="text-emerald-400 font-sans font-bold">1. AndroidManifest.xml (Real Call & Dialer)</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
`<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

<service
    android:name=".InCallServiceImpl"
    android:permission="android.permission.BIND_INCALL_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.telecom.InCallService" />
    </intent-filter>
</service>`,
                        'manifest'
                      )
                    }
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 text-[10px] font-sans"
                  >
                    {copiedKey === 'manifest' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'manifest' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-neutral-300 whitespace-pre">
{`<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

<service
    android:name=".InCallServiceImpl"
    android:permission="android.permission.BIND_INCALL_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.telecom.InCallService" />
    </intent-filter>
</service>`}
                </pre>
              </div>

              {/* Kotlin Request Code */}
              <div className="p-3 rounded-2xl bg-neutral-900 text-neutral-100 space-y-2 font-mono text-[10px]">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                  <span className="text-cyan-400 font-sans font-bold">2. Kotlin Intent (Set Default Dialer & Real Call)</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
`// 1. Request Default Phone App (Android 10+)
val roleManager = getSystemService(RoleManager::class.java)
val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
startActivityForResult(intent, REQUEST_CODE_DIALER)

// 2. Make Direct Real Call
val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
startActivity(callIntent)`,
                        'kotlin'
                      )
                    }
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 text-[10px] font-sans"
                  >
                    {copiedKey === 'kotlin' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'kotlin' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-neutral-300 whitespace-pre">
{`// 1. Request Default Phone App (Android 10+)
val roleManager = getSystemService(RoleManager::class.java)
val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
startActivityForResult(intent, REQUEST_CODE_DIALER)

// 2. Make Direct Real Call
val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
startActivity(callIntent)`}
                </pre>
              </div>

              {/* ADB Command */}
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">ADB Terminal Command:</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'adb shell telecom set-default-dialer com.smartdialer.callerid',
                        'adb'
                      )
                    }
                    className="text-[10px] text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'adb' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'adb' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="text-[10px] font-mono block bg-neutral-200 dark:bg-neutral-900 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                  adb shell telecom set-default-dialer com.smartdialer.callerid
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex flex-col gap-2">
          {/* 1-Click Save & Activate All Button */}
          <button
            id="activate-all-permissions-btn"
            onClick={handleActivateAll}
            disabled={isActivatingAll}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition transform active:scale-98"
          >
            <Zap className={`w-4 h-4 ${isActivatingAll ? 'animate-spin' : ''}`} />
            <span>
              {isActivatingAll
                ? isBn
                  ? 'সব পারমিশন সক্রিয় ও সেভ করা হচ্ছে...'
                  : 'Saving & Activating All Permissions...'
                : isBn
                ? '১-ক্লিকে সকল পারমিশন সক্রিয় ও সেভ করুন'
                : '1-Click Save & Activate All Permissions'}
            </span>
          </button>

          {/* Test Call Trigger */}
          {onSimulateIncoming && (
            <button
              onClick={() => {
                onSimulateIncoming({
                  phone: '+880 1845-678901',
                  name: 'Standard Chartered Bank',
                  businessCategory: 'Bank Verification',
                  spamScore: 4,
                  spamReports: 0,
                  city: 'Dhaka',
                  verified: true,
                });
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>{isBn ? 'ইনকামিং কল সিমুলেশন টেস্ট' : 'Test Incoming Call Simulation'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
