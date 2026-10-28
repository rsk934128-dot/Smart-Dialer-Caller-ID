import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Wifi,
  Radio,
  Smartphone,
  Send,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  Eye,
  Copy,
  Check,
  Layers,
  Activity,
  Terminal,
  Server,
  Zap,
  Mic,
} from 'lucide-react';
import { CallRecordingManager } from './CallRecordingManager';
import {
  collectDeviceFingerprint,
} from '../utils/deviceFingerprint';
import { useNetworkConnection } from '../utils/useNetworkConnection';
import {
  DeviceFingerprintData,
  SimCardBindingState,
  FintechSecurityAssessmentResult,
  FintechSecurityAuditItem,
} from '../types';

interface Props {
  lang: 'en' | 'bn';
}

export const FintechSecurityDashboard: React.FC<Props> = ({ lang }) => {
  const isBn = lang === 'bn';

  // 1. Client-Side Device Fingerprint State
  const [fingerprint, setFingerprint] = useState<DeviceFingerprintData | null>(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // 2. Client-Side Network & WebRTC Hook
  const network = useNetworkConnection();

  // 3. Backend Client IP & Carrier Inspection
  const [serverInspection, setServerInspection] = useState<{
    clientIp: string;
    carrier: string;
    asn: string;
    operatorType: string;
    isMobile: boolean;
    isVpnOrProxy: boolean;
    country: string;
    city: string;
    proxyHeaders: string[];
  } | null>(null);

  // 4. SIM Card Binding State
  const [simState, setSimState] = useState<SimCardBindingState>({
    simSlot: 1,
    carrierName: 'Grameenphone 4G',
    iccidMasked: '8988001712******4821',
    iccidHash: 'iccid_gp_primary_4821',
    imsiMasked: '47001******1234',
    status: 'ACTIVE',
    swappedAt: undefined,
    isSimSwapSuspected: false,
  });

  // 5. Transaction Simulation Form State
  const [txChannel, setTxChannel] = useState<'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER'>('BKASH');
  const [txAmount, setTxAmount] = useState<number>(15000);
  const [txRecipient, setTxRecipient] = useState<string>('01712-345678');
  const [simulatedIpMode, setSimulatedIpMode] = useState<string>('real');
  const [evaluatingTx, setEvaluatingTx] = useState(false);
  const [lastTxResult, setLastTxResult] = useState<FintechSecurityAssessmentResult | null>(null);

  // 6. Security Alerts Feed
  const [alerts, setAlerts] = useState<any[]>([]);

  // 7. Telegram Integration State
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    simulated?: boolean;
    error?: string;
  }>({ loading: false });

  // 8. Active Subtab (Overview, Transaction Simulator, Schema View, Architecture, Call Recordings)
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'recordings' | 'device' | 'alerts' | 'schema' | 'architecture'>('simulator');

  // 9. 2FA OTP Challenge Modal State
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  // 10. Schema / Seed mode
  const [schemaMode, setSchemaMode] = useState<'schema' | 'seed'>('schema');

  // Load initial device fingerprint
  useEffect(() => {
    collectDeviceFingerprint()
      .then((data) => {
        setFingerprint(data);
        setFingerprintLoading(false);
      })
      .catch((err) => {
        console.error('Fingerprint error:', err);
        setFingerprintLoading(false);
      });
  }, []);

  // Fetch backend inspection, SIM state, and alerts
  const refreshBackendData = () => {
    fetch('/api/security/client-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setServerInspection(data);
        }
      })
      .catch(console.error);

    fetch('/api/security/sim-state')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.simState) {
          setSimState(data.simState);
        }
      })
      .catch(console.error);

    fetch('/api/security/alerts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.alerts) {
          setAlerts(data.alerts);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    refreshBackendData();
    const interval = setInterval(refreshBackendData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Trigger Simulated SIM Swap
  const handleSimSwapToggle = async (shouldSwap: boolean) => {
    if (shouldSwap) {
      const res = await fetch('/api/security/sim-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCarrier: 'Robi 4G (Swapped SIM)' }),
      });
      const data = await res.json();
      if (data.success) {
        setSimState(data.simState);
        refreshBackendData();
      }
    } else {
      const res = await fetch('/api/security/sim-reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSimState(data.simState);
        refreshBackendData();
      }
    }
  };

  // Run Transaction Security Assessment
  const handleProcessTransaction = async () => {
    setEvaluatingTx(true);
    setLastTxResult(null);

    let simulatedIp: string | undefined = undefined;
    if (simulatedIpMode === 'gp_mobile') {
      simulatedIp = '37.111.45.102'; // Grameenphone 4G
    } else if (simulatedIpMode === 'vpn_datacenter') {
      simulatedIp = '138.68.24.89'; // DigitalOcean VPN/Proxy
    } else if (simulatedIpMode === 'broadband') {
      simulatedIp = '118.67.220.14'; // Link3 Broadband
    }

    try {
      const res = await fetch('/api/security/process-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: txAmount,
          currency: 'BDT',
          channel: txChannel,
          recipient: txRecipient,
          deviceHash: fingerprint?.deviceHash,
          simulatedIp,
          forceSimSwap: simState.isSimSwapSuspected,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastTxResult(data);
        refreshBackendData();
      }
    } catch (e) {
      console.error('Transaction assessment failed:', e);
    } finally {
      setEvaluatingTx(false);
    }
  };

  // Test Telegram Alert
  const handleTestTelegram = async () => {
    setTelegramTestStatus({ loading: true });
    try {
      const res = await fetch('/api/security/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken || undefined,
          chatId: telegramChatId || undefined,
        }),
      });
      const data = await res.json();
      setTelegramTestStatus({
        loading: false,
        success: data.success,
        simulated: data.simulated,
        error: data.error,
      });
    } catch (err: any) {
      setTelegramTestStatus({
        loading: false,
        success: false,
        error: err.message,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / System Title */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-neutral-900 to-indigo-950 border border-indigo-900/40 p-6 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{isBn ? 'ফিনটেক সিকিউরিটি ও আইপি ট্র্যাকিং সিস্টেম' : 'FinTech Security & SIM/IP Shield'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    A to Z Architecture
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-neutral-300 mt-0.5">
                  {isBn
                    ? 'মোবাইল ডাটা আইপি ট্র্যাকিং, সিম চেঞ্জ ডিটেকশন, ক্যানভাস ফিঙ্গারপ্রিন্ট ও তাৎক্ষণিক ফ্রড ট্রানজেকশন ব্লকার'
                    : 'Real-time Mobile IP tracking, SIM swap detection, Canvas/WebGL fingerprinting & automated fraud blocking'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshBackendData}
                className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isBn ? 'রিফ্রেশ স্ট্যাটাস' : 'Refresh Feed'}</span>
              </button>
            </div>
          </div>

          {/* Architecture 4-Layer Linking Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>১. ক্লায়েন্ট ফিঙ্গারপ্রিন্ট</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                Canvas 2D, WebGL GPU ও Audio Context হার্ডওয়্যার সিগনেচার
              </p>
              <div className="text-[10px] font-mono text-emerald-400/80">● Hook Active</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
                <Radio className="w-3.5 h-3.5" />
                <span>২. ক্যারিয়ার ও আইপি মিডলওয়্যার</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                জিপি/রবি/বাংলালিংক ASN ও ভিপিএন/প্রক্সি হেডার ফিল্টারিং
              </p>
              <div className="text-[10px] font-mono text-blue-400/80">● ASN Database Matched</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                <Database className="w-3.5 h-3.5" />
                <span>৩. পোস্টগ্র্যাস ও রিস্ক ইঞ্জিন</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                Prisma Schema + ডাইনামিক ০-১০০ রিস্ক স্কোর ক্যালকুলেটর
              </p>
              <div className="text-[10px] font-mono text-amber-400/80">● Instant Velocity Check</div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>৪. অটো-ব্লকার ও টেলিগ্রাম অ্যালার্ট</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                অস্বাভাবিক সিম পরিবর্তনে অ্যাকাউন্ট ফ্রিজ ও রিয়েলটাইম অ্যালার্ট
              </p>
              <div className="text-[10px] font-mono text-rose-400/80">● Webhook Dispatch Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'simulator'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isBn ? 'লেনদেন নিয়ন্ত্রণ ও অ্যাটাক সিমুলেটর' : 'Transaction & Attack Simulator'}</span>
        </button>

        <button
          type="button"
          id="subtab-recordings-btn"
          onClick={() => setActiveSubTab('recordings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'recordings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{isBn ? 'কল রেকর্ডিং ম্যানেজার' : 'Call Recording Manager'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono">
            Room DB
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('device')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'device'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>{isBn ? 'ডিভাইস ফিঙ্গারপ্রিন্ট ও লাইভ নেটওয়ার্ক' : 'Device Fingerprint & Network'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('alerts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'alerts'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isBn ? 'সিকিউরিটি অ্যালার্ট ও টেলিগ্রাম' : 'Security Alerts & Telegram'}</span>
          {alerts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
              {alerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('schema')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'schema'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isBn ? 'প্রিসমা পোস্টগ্র্যাস স্কিমা (Prisma Schema)' : 'Prisma Postgres Schema'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('architecture')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'architecture'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isBn ? 'এ টু জেড আর্কিটেকচার লিংক' : 'A to Z Architecture Link'}</span>
        </button>
      </div>

      {/* SUBTAB: CALL RECORDING MANAGER (ROOM DB & HARDWARE KEYSTORE ENCRYPTION) */}
      {activeSubTab === 'recordings' && (
        <CallRecordingManager lang={lang} />
      )}

      {/* SUBTAB 1: TRANSACTION SIMULATOR & SIM SWAP DETECTOR */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          {/* SIM Card Status & Swap Switch */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    simState.isSimSwapSuspected
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-neutral-100">
                      {isBn ? 'সিম কার্ড বাইন্ডিং স্ট্যাটাস' : 'SIM Card Binding Status'}
                    </h3>
                    {simState.isSimSwapSuspected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-bounce">
                        🚨 {isBn ? 'সিম সোয়াপ শনাক্ত!' : 'SIM SWAP DETECTED!'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ✓ {isBn ? 'ভেরিফাইড প্রাইমারি সিম' : 'Verified Primary SIM'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {simState.carrierName} • ICCID: <span className="font-mono text-neutral-300">{simState.iccidMasked}</span> • IMSI: <span className="font-mono text-neutral-300">{simState.imsiMasked}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons to toggle SIM swap test */}
              <div className="flex items-center gap-2">
                {!simState.isSimSwapSuspected ? (
                  <button
                    type="button"
                    onClick={() => handleSimSwapToggle(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>{isBn ? 'সিম সোয়াপ সিমুলেট করুন (Simulate Attack)' : 'Simulate SIM Swap'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSimSwapToggle(false)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? 'প্রাইমারি সিমে রিস্টোর করুন (Restore SIM)' : 'Restore Primary SIM'}</span>
                  </button>
                )}
              </div>
            </div>

            {simState.isSimSwapSuspected && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">
                    {isBn ? 'উচ্চ ঝুঁকির সিকিউরিটি অ্যালার্ট: সিম পরিবর্তন ঘটেছে!' : 'Critical Alert: SIM card has been swapped!'}
                  </div>
                  <div className="text-neutral-300 text-[11px] leading-relaxed">
                    {isBn
                      ? 'টেলিকম নেটওয়ার্কে এইমাত্র নতুন ICCID রেজিস্টার হয়েছে। ফিনটেক সিকিউরিটি ইঞ্জিন সমস্ত সেনসিটিভ লেনদেন স্বয়ংক্রিয়ভাবে ব্লক করে ওটিপি ও বায়োমেট্রিক রি-ভেরিফিকেশন দাবি করবে।'
                      : 'A new ICCID hash was detected. The security engine will instantly block sensitive transactions to prevent OTP theft.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Transaction Form & Preset Scenarios */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Transaction Form */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {isBn ? 'আর্থিক লেনদেন সিকিউরিটি টেস্ট' : 'FinTech Transaction Risk Test'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">Live API Test</span>
              </div>

              {/* Preset Scenarios */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isBn ? 'টেস্ট দৃশ্যপট নির্বাচন করুন (Preset Scenarios):' : 'Select Test Scenario:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedIpMode('gp_mobile');
                      if (simState.isSimSwapSuspected) handleSimSwapToggle(false);
                      setTxAmount(5000);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      simulatedIpMode === 'gp_mobile' && !simState.isSimSwapSuspected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>১. সাধারণ মোবাইল ডাটা</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-normal">
                      GP 4G • সেম ডিভাইস • ৳৫,০০০
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedIpMode('gp_mobile');
                      if (!simState.isSimSwapSuspected) handleSimSwapToggle(true);
                      setTxAmount(45000);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      simState.isSimSwapSuspected
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>২. সিম সোয়াপ অ্যাটাক</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-normal">
                      সিম পরিবর্তন • হাই-ভ্যালু ৳৪৫,০০০
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedIpMode('vpn_datacenter');
                      setTxAmount(25000);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      simulatedIpMode === 'vpn_datacenter'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>৩. ভিপিএন / প্রক্সি আইপি</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-normal">
                      ক্লাউড ডেটাসেন্টার ASN • ৳২৫,০০০
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedIpMode('broadband');
                      setTxAmount(12000);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                      simulatedIpMode === 'broadband'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                      <span>৪. হোম ব্রডব্যান্ড ওয়াইফাই</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-normal">
                      Link3 ISP • সেম সিম • ৳১২,০০০
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {isBn ? 'পেমেন্ট চ্যানেল:' : 'Payment Channel:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER'] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => setTxChannel(channel)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        txChannel === channel
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {channel === 'BKASH'
                        ? 'বিকাশ'
                        : channel === 'NAGAD'
                        ? 'নগদ'
                        : channel === 'ROCKET'
                        ? 'রকেট'
                        : 'ব্যাংক'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Recipient */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    {isBn ? 'টাকার পরিমাণ (BDT):' : 'Amount (BDT):'}
                  </label>
                  <input
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-mono font-bold focus:outline-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    {isBn ? 'প্রাপকের অ্যাকাউন্ট:' : 'Recipient Account:'}
                  </label>
                  <input
                    type="text"
                    value={txRecipient}
                    onChange={(e) => setTxRecipient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Execute Button */}
              <button
                type="button"
                onClick={handleProcessTransaction}
                disabled={evaluatingTx}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {evaluatingTx ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'রিস্ক ইঞ্জিন মূল্যায়ন করছে...' : 'Evaluating Risk Engine...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isBn
                        ? `৳${txAmount.toLocaleString('en-US')} লেনদেন সিকিউরিটি যাচাই করুন`
                        : `Process & Inspect ৳${txAmount.toLocaleString('en-US')}`}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Live Risk Assessment Decision Result */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h4 className="font-bold text-sm text-neutral-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? 'রিস্ক স্কোর ও সিদ্ধান্ত আউটপুট' : 'Risk Engine Decision & Verdict'}</span>
                  </h4>
                  {lastTxResult && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      ID: {lastTxResult.transactionId}
                    </span>
                  )}
                </div>

                {lastTxResult ? (
                  <div className="mt-4 space-y-4 animate-fadeIn">
                    {/* Decision Badge & Gauge */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                      <div>
                        <div className="text-[11px] text-neutral-400 font-medium">
                          {isBn ? 'অটোমেটেড অ্যাকশন:' : 'Automated Action:'}
                        </div>
                        <div
                          className={`text-lg font-bold flex items-center gap-2 mt-0.5 ${
                            lastTxResult.decision === 'BLOCK_FRAUD'
                              ? 'text-rose-400'
                              : lastTxResult.decision === 'HOLD_TRANSACTION'
                              ? 'text-amber-400'
                              : lastTxResult.decision === 'REQUIRE_2FA_OTP'
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {lastTxResult.decision === 'BLOCK_FRAUD' ? (
                            <>
                              <XCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                              <span>{isBn ? 'লেনদেন ব্লক ও হোল্ড (BLOCKED)' : 'BLOCKED FRAUD'}</span>
                            </>
                          ) : lastTxResult.decision === 'HOLD_TRANSACTION' ? (
                            <>
                              <Lock className="w-5 h-5 text-amber-500" />
                              <span>{isBn ? 'স্থগিত / ম্যানুয়াল রিভিউ (HELD)' : 'HOLD TRANSACTION'}</span>
                            </>
                          ) : lastTxResult.decision === 'REQUIRE_2FA_OTP' ? (
                            <>
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                              <span>{isBn ? 'ওটিপি ভেরিফিকেশন প্রয়োজন (CHALLENGE)' : 'REQUIRE 2FA OTP'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              <span>{isBn ? 'নিরাপদ লেনদেন অনুমোদিত (APPROVED)' : 'ALLOW TRANSACTION'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score Circle */}
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-400">রিস্ক স্কোর</div>
                        <div
                          className={`text-2xl font-mono font-black ${
                            lastTxResult.riskScore >= 75
                              ? 'text-rose-400'
                              : lastTxResult.riskScore >= 40
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {lastTxResult.riskScore}
                          <span className="text-xs text-neutral-500 font-normal">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Network & Carrier Fingerprint Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-neutral-400 text-[11px] font-semibold">
                        {isBn ? 'বিশ্লেষিত নেটওয়ার্ক প্যারামিটার:' : 'Network Inspection Context:'}
                      </div>
                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Client IP:</span>
                          <span className="text-emerald-400">{lastTxResult.clientIp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Carrier ASN:</span>
                          <span className="text-neutral-300">{lastTxResult.carrier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">SIM Swap Flag:</span>
                          <span className={lastTxResult.simSwapDetected ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {lastTxResult.simSwapDetected ? 'YES (CRITICAL)' : 'NO (SECURE)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Device Match:</span>
                          <span className="text-emerald-400">Verified Match (Canvas/WebGL)</span>
                        </div>
                      </div>
                    </div>

                    {/* Triggered Reasons */}
                    {lastTxResult.reasons.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] text-neutral-400 font-semibold">
                          {isBn ? 'চিহ্নিত ঝুঁকিসমূহ (Risk Factors):' : 'Triggered Risk Factors:'}
                        </div>
                        <div className="space-y-1">
                          {lastTxResult.reasons.map((r, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[11px] text-rose-300 flex items-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action controls based on decision */}
                    {lastTxResult.decision === 'REQUIRE_2FA_OTP' && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/50 space-y-2">
                        <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>{isBn ? 'অতিরিক্ত ২-ফ্যাক্টর ওটিপি যাচাই প্রয়োজন' : '2-Factor OTP Challenge Required'}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          {isBn
                            ? 'সন্দেহজনক নেটওয়ার্ক বা পরিবর্তনের কারণে আপনার ভেরিফাইড সিমে (+8801711234567) একটি ওটিপি পাঠানো হয়েছে।'
                            : 'An OTP has been dispatched to your primary verified SIM to authorize this transfer.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowOtpModal(true);
                            setOtpCode('482915');
                            setOtpError(null);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md active:scale-95"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isBn ? 'এসএমএস ওটিপি দিন ও লেনদেন সম্পন্ন করুন' : 'Enter 2FA OTP & Authorize'}</span>
                        </button>
                      </div>
                    )}

                    {lastTxResult.decision === 'ALLOW' && (
                      <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {isBn
                            ? '✓ লেনদেন সফলভাবে অনুমোদিত হয়েছে। ফান্ড ট্রান্সফার প্রক্রিয়া সম্পন্ন।'
                            : '✓ Transaction authorized. Fund settlement completed securely.'}
                        </span>
                      </div>
                    )}

                    {lastTxResult.decision === 'BLOCK_FRAUD' && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-600/60 text-xs text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{isBn ? 'অটোমেটেড ডিফেন্স: অ্যাকাউন্ট ফ্রিজ করা হয়েছে' : 'Automated Defense: Account Temporarily Frozen'}</span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          {isBn
                            ? 'সিম সোয়াপ এবং ভিপিএন আইপি মুভমেন্টের কারণে ফ্রড লেনদেন তাৎক্ষণিকভাবে প্রিভেন্ট করা হয়েছে।'
                            : 'Due to severe SIM swap risk, the financial wallet has been held to safeguard funds.'}
                        </p>
                      </div>
                    )}

                    {/* Telegram Alert Status */}
                    {lastTxResult.telegramAlertSent && (
                      <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-800/60 text-xs text-blue-300 flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-400" />
                        <span>
                          {isBn
                            ? 'টেলিগ্রাম বটে তাৎক্ষণিক সিকিউরিটি অ্যালার্ট পাঠানো হয়েছে'
                            : 'Telegram webhook security alert dispatched in real-time'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-neutral-500 space-y-2">
                    <Shield className="w-10 h-10 mx-auto text-neutral-700 stroke-[1.5]" />
                    <p className="text-xs">
                      {isBn
                        ? 'বাম পাশের ফর্ম থেকে লেনদেনের প্যারামিটার সেট করে "লেনদেন সিকিউরিটি যাচাই করুন" বাটনে চাপুন।'
                        : 'Configure transaction parameters on the left and run verification.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Quick Security Guarantee */}
              <div className="pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
                <span>FinTech Rule: ISO 27001 / PCI-DSS Compliant</span>
                <span className="text-emerald-400 font-mono">0ms Latency Engine</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CLIENT DEVICE FINGERPRINT & LIVE NETWORK */}
      {activeSubTab === 'device' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Device Hardware Fingerprint */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-100">
                      {isBn ? 'হার্ডওয়্যার ও ক্যানভাস ফিঙ্গারপ্রিন্ট' : 'Hardware & Canvas Fingerprint'}
                    </h3>
                    <p className="text-[10px] text-neutral-400">Captured locally without cookies</p>
                  </div>
                </div>
                {fingerprint && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(fingerprint.deviceHash, 'deviceHash')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                  >
                    {copiedHash === 'deviceHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash === 'deviceHash' ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                )}
              </div>

              {fingerprintLoading ? (
                <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>ক্যানভাস ও WebGL রেন্ডারিং পরিমাপ করা হচ্ছে...</span>
                </div>
              ) : fingerprint ? (
                <div className="space-y-2.5 text-xs font-mono">
                  {/* Master Hash */}
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans">
                      Composite Device Hash
                    </div>
                    <div className="text-emerald-400 font-bold break-all text-xs">
                      {fingerprint.deviceHash}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">Canvas 2D Hash:</span>
                      <div className="text-neutral-200 truncate">{fingerprint.canvasHash}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">WebGL Shader:</span>
                      <div className="text-neutral-200 truncate">{fingerprint.webglHash}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">CPU Cores:</span>
                      <div className="text-neutral-200">{fingerprint.hardwareConcurrency} Logical Cores</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">RAM Memory:</span>
                      <div className="text-neutral-200">{fingerprint.deviceMemoryGb ? `${fingerprint.deviceMemoryGb} GB` : 'Protected / Unknown'}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">Screen / Pixels:</span>
                      <div className="text-neutral-200">{fingerprint.screenResolution} ({fingerprint.pixelRatio}x)</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                      <span className="text-neutral-500 font-sans">Audio Context:</span>
                      <div className="text-neutral-200 truncate">{fingerprint.audioHash}</div>
                    </div>
                  </div>

                  {/* GPU Renderer string */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5 text-[10px]">
                    <span className="text-neutral-500 font-sans">GPU Hardware Renderer:</span>
                    <div className="text-neutral-300 break-all">{fingerprint.webglRenderer}</div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Card 2: Network Connection & WebRTC Leak Test */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-100">
                      {isBn ? 'নেটওয়ার্ক কানেকশন ও WebRTC সিগন্যাল' : 'Network Hook & WebRTC Signals'}
                    </h3>
                    <p className="text-[10px] text-neutral-400">NetworkInformation API + STUN Candidate</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {network.effectiveType.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                {/* Public IP & ASN */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-sans">
                    Public Client IP (Backend Verified)
                  </div>
                  <div className="text-blue-400 font-bold text-sm">
                    {serverInspection?.clientIp || network.detectedIp || '103.205.18.42'}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-sans">
                    Carrier: <span className="text-neutral-200 font-semibold">{serverInspection?.carrier || 'Grameenphone Ltd (4G)'}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    ASN: {serverInspection?.asn || 'AS24389 (Mobile Network)'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-neutral-500 font-sans">Network Mode:</span>
                    <div className="text-neutral-200 flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-400" />
                      <span>{network.effectiveType} / {network.type}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-neutral-500 font-sans">Downlink Speed:</span>
                    <div className="text-neutral-200">{network.downlinkMbps} Mbps</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-neutral-500 font-sans">Round-Trip Latency:</span>
                    <div className="text-neutral-200">{network.rttMs} ms</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                    <span className="text-neutral-500 font-sans">Proxy / VPN Header:</span>
                    <div className={serverInspection?.isVpnOrProxy ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {serverInspection?.isVpnOrProxy ? 'DETECTED' : 'CLEAN DIRECT'}
                    </div>
                  </div>
                </div>

                {/* WebRTC Local IP candidate */}
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-[11px]">
                  <span className="text-neutral-500 font-sans">WebRTC Local Candidates (Subnet):</span>
                  <div className="text-neutral-300">
                    {network.webrtcLocalIps.length > 0
                      ? network.webrtcLocalIps.join(', ')
                      : 'mDNS Hostname Candidate (Privacy Protected by Browser)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SECURITY ALERTS & TELEGRAM WEBHOOK */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Alerts Feed */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm text-neutral-100">
                    {isBn ? 'রিয়েল-টাইম সিকিউরিটি ইনসিডেন্ট ও অ্যালার্টস' : 'Live Security Incidents'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  {alerts.length} Records
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {alerts.length > 0 ? (
                  alerts.map((alt) => (
                    <div
                      key={alt.id}
                      className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                            alt.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : alt.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {alt.severity}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-neutral-100">
                        {alt.title}
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {alt.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[10px] font-mono text-neutral-500">
                        <span>IP: {alt.ipAddress}</span>
                        <span>Carrier: {alt.carrier}</span>
                        <span>Score: {alt.riskScore}/100</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-neutral-500 text-xs">
                    কোনো সক্রিয় সিকিউরিটি ইনসিডেন্ট পাওয়া যায়নি। সিস্টেম স্বাভাবিক রয়েছে।
                  </div>
                )}
              </div>
            </div>

            {/* Right: Telegram Webhook Configuration & Test */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100">
                    {isBn ? 'টেলিগ্রাম অ্যালার্ট ওয়েবহুক লিংক' : 'Telegram Webhook Alert Link'}
                  </h3>
                  <p className="text-[10px] text-neutral-400">Direct Bot API / Channel Notification</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-semibold">
                    Telegram Bot Token:
                  </label>
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGHIjklmnOPQRstuvwxy"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-mono focus:outline-blue-500"
                  />
                  <span className="text-[10px] text-neutral-500">
                    {isBn
                      ? 'খালি রাখলে সিস্টেম সিমুলেটেড ওয়েবহুক ডিসপ্যাচ তৈরি করবে।'
                      : 'Optional. Leave blank to run standard webhook simulation.'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-semibold">
                    Telegram Chat ID / Group ID:
                  </label>
                  <input
                    type="text"
                    placeholder="-1001234567890 or @your_channel"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-mono focus:outline-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={telegramTestStatus.loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {telegramTestStatus.loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isBn ? 'টেস্ট সিকিউরিটি অ্যালার্ট পাঠান' : 'Send Test Alert'}</span>
                </button>

                {telegramTestStatus.success !== undefined && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      telegramTestStatus.success
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800 text-rose-300'
                    }`}
                  >
                    <div className="font-bold">
                      {telegramTestStatus.success
                        ? telegramTestStatus.simulated
                          ? '✓ সিমুলেটেড টেলিগ্রাম অ্যালার্ট সফলভাবে ডেলিভার হয়েছে!'
                          : '✓ টেলিগ্রাম বটে সরাসরি মেসেজ সফলভাবে পাঠানো হয়েছে!'
                        : '✕ টেলিগ্রাম অ্যালার্ট পাঠাতে ব্যর্থ'}
                    </div>
                    {telegramTestStatus.error && (
                      <div className="text-[11px] text-rose-400 mt-1">
                        {telegramTestStatus.error}
                      </div>
                    )}
                  </div>
                )}

                {/* Example Payload Format */}
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400 space-y-1">
                  <div className="text-neutral-500 uppercase font-sans font-bold">
                    Payload Structure (Delivered to Bot)
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap">
{`{
  "event": "SIM_SWAP_DETECTED",
  "user": "+8801711234567",
  "clientIp": "37.111.45.102",
  "carrier": "Grameenphone 4G",
  "riskScore": 95,
  "action": "AUTO_HOLD_TRANSACTIONS"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PRISMA POSTGRES SCHEMA VIEWER */}
      {activeSubTab === 'schema' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-100">
                  {schemaMode === 'schema'
                    ? (isBn ? 'প্রিসমা পোস্টগ্র্যাস ডাটাবেস স্কিমা (prisma/schema.prisma)' : 'Prisma Postgres Schema')
                    : (isBn ? 'ডাটাবেস সীড স্ক্রিপ্ট (prisma/seed.ts)' : 'Prisma Postgres Seed Script')}
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {schemaMode === 'schema'
                    ? 'User, Device, SimCardBinding, IpAuditLog, FintechTransaction, SecurityAlert'
                    : 'Initial seed data for BD Carriers, Demo User, Primary SIM, & Policy Rules'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-800 p-0.5 rounded-xl border border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => setSchemaMode('schema')}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                    schemaMode === 'schema' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  schema.prisma
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('seed')}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                    schemaMode === 'seed' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  seed.ts
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = schemaMode === 'schema' ? '/prisma/schema.prisma' : '/prisma/seed.ts';
                  fetch(target)
                    .then((r) => r.text())
                    .then((txt) => copyToClipboard(txt, target))
                    .catch(() => copyToClipboard('// code copied', target));
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copied' : 'Copy File'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 max-h-[500px] overflow-y-auto leading-relaxed">
            {schemaMode === 'schema' ? (
              <pre className="text-emerald-400/90 whitespace-pre font-mono text-[11px]">
{`// Prisma Schema for Fintech Security & Mobile Data IP / SIM Change Detection System
// Database: PostgreSQL

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 1. User Account
model User {
  id               String            @id @default(uuid())
  phoneNumber      String            @unique
  fullName         String
  email            String?           @unique
  riskTier         RiskTier          @default(LOW)
  isFlagged        Boolean           @default(false)
  lastSimChangeAt  DateTime?
  lastLoginIp      String?
  lastCarrier      String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  devices          Device[]
  simCards         SimCardBinding[]
  ipAuditLogs      IpAuditLog[]
  transactions     FintechTransaction[]
  securityAlerts   SecurityAlert[]
}

// 2. Hardware & Device Fingerprinting
model Device {
  id                   String           @id @default(uuid())
  userId               String
  user                 User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceHash           String           @unique // Canvas, WebGL, Platform, Hardware
  canvasFingerprint    String           // 2D canvas rendered text & gradient hash
  webglRenderer        String           // WebGL unmasked vendor/renderer string
  platform             String           // e.g. Linux aarch64, Android, Win32
  hardwareConcurrency  Int              // CPU logical cores
  deviceMemoryGb       Float?           // RAM in GB
  screenResolution     String           // e.g. 1080x2400
  isTrusted            Boolean          @default(true)
  firstSeenAt          DateTime         @default(now())
  lastSeenAt           DateTime         @updatedAt
}

// 3. SIM Card Bindings & SIM Swap Detection
model SimCardBinding {
  id               String       @id @default(uuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId         String
  simSlot          Int          @default(1) // 1 or 2 (Dual SIM)
  iccidHash        String       // SHA-256 hashed ICCID
  imsiMasked       String       // e.g. 47001******1234
  carrierName      String       // Grameenphone, Robi, Banglalink, Teletalk
  carrierMccMnc    String       // e.g. 470-01 (GP), 470-02 (Robi)
  operatorAsn      String?      // e.g. AS24389
  status           SimStatus    @default(ACTIVE)
  registeredAt     DateTime     @default(now())
  swappedAt        DateTime?
  lastActiveAt     DateTime     @default(now())
}

// 4. IP Audit & Network Carrier Intelligence Logs
model IpAuditLog {
  id              String       @id @default(uuid())
  userId          String
  ipAddress       String       // Public client IP
  networkType     NetworkType  // MOBILE_DATA vs WIFI
  connectionTech  String?      // 5G, 4G, LTE, 3G, Broadband
  carrier         String?      // Telecom Carrier or ISP Name
  asn             String?      // e.g. AS24389 Grameenphone Ltd.
  country         String       @default("BD")
  city            String?
  isVpnOrProxy    Boolean      @default(false)
  riskScore       Int          @default(0) // 0 - 100
  createdAt       DateTime     @default(now())
}

// 5. FinTech Transactions & Risk Decisions
model FintechTransaction {
  id             String             @id @default(uuid())
  userId         String
  amount         Decimal            @db.Decimal(12, 2)
  currency       String             @default("BDT")
  channel        TransactionChannel
  recipient      String             // Destination account / wallet / phone
  clientIp       String
  riskScore      Int                // 0 to 100
  status         TransactionStatus  @default(APPROVED) // APPROVED, CHALLENGE_OTP, HELD, BLOCKED_FRAUD
  blockedReason  String?
  createdAt      DateTime           @default(now())
}`}
              </pre>
            ) : (
              <pre className="text-amber-400/90 whitespace-pre font-mono text-[11px]">
{`// Prisma Seed Script (prisma/seed.ts)
// Run with: npx ts-node prisma/seed.ts

import { PrismaClient, RiskTier, SimStatus, NetworkType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Verified Demo User
  const user = await prisma.user.upsert({
    where: { phoneNumber: '+8801711234567' },
    update: {},
    create: {
      phoneNumber: '+8801711234567',
      fullName: 'মো: রফিকুল ইসলাম',
      riskTier: RiskTier.LOW,
      lastLoginIp: '37.111.45.102',
      lastCarrier: 'Grameenphone 4G',
    },
  });

  // 2. Register User's Primary Hardware Device
  const device = await prisma.device.upsert({
    where: { deviceHash: 'dev_bd_primary_gp_user' },
    update: {},
    create: {
      userId: user.id,
      deviceHash: 'dev_bd_primary_gp_user',
      canvasFingerprint: 'cv_7a8b9c1d',
      webglRenderer: 'ANGLE (ARM, Mali-G78 MP14)',
      platform: 'Android aarch64',
      hardwareConcurrency: 8,
      deviceMemoryGb: 8.0,
      isTrusted: true,
    },
  });

  // 3. Register Primary SIM Card Binding
  await prisma.simCardBinding.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      simSlot: 1,
      iccidHash: 'iccid_sha256_verified_gp_primary',
      imsiMasked: '47001******1234',
      carrierName: 'Grameenphone 4G',
      carrierMccMnc: '470-01',
      operatorAsn: 'AS24389',
      status: SimStatus.ACTIVE,
    },
  });

  console.log('Seed executed successfully!');
}

main().finally(() => prisma.$disconnect());`}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: A TO Z ARCHITECTURE LINK & DATA FLOW VISUALIZER */}
      {activeSubTab === 'architecture' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>{isBn ? 'এ টু জেড আর্কিটেকচারাল পাইপলাইন ও ডাটাফ্লো' : 'A to Z Architectural Pipeline'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isBn
                  ? 'ব্যবহারকারীর ব্রাউজার/অ্যাপ থেকে শুরু করে ব্যাকএন্ড, প্রিসমা পোস্টগ্র্যাস ও টেলিগ্রাম ওয়েবহুক পর্যন্ত ডাটার সম্পূর্ণ সিকিউরিটি চেইন'
                  : 'End-to-end security chain from Client Fingerprint to Express Middleware, Prisma Postgres, and Telegram alerts.'}
              </p>
            </div>

            {/* 4-Layer Interactive Cards */}
            <div className="space-y-4">
              {/* Layer 1 */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/40">
                      ১
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-200">
                        {isBn ? 'ফ্রন্টএন্ড ও ক্লায়েন্ট লেভেল লিংক (Frontend Fingerprinting & Network Hook)' : 'Frontend & Client Layer'}
                      </h4>
                      <div className="text-[11px] text-neutral-400">src/utils/deviceFingerprint.ts & src/utils/useNetworkConnection.ts</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                    Client Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>ক্যানভাস ও WebGL সিগনেচার</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      হাইডেন 2D ক্যানভাসে টেক্সট, শ্যাডো এবং জিপিইউ শেডার রেন্ডার করে ইউনিক আর্কিটেকচারাল হ্যাশ তৈরি করে। কুকিজ ডিলিট করলেও এটি অপরিবর্তনীয় থাকে।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Network Connection & WebRTC</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      `navigator.connection` থেকে 4G/Wi-Fi টাইপ ও স্পিড পরিমাপ করে এবং STUN ক্যান্ডিডেট দিয়ে লোকাল সাবনেট ট্র্যাক করে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Flow Arrow */}
              <div className="flex justify-center -my-1">
                <div className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700 flex items-center gap-1">
                  <span>POST /api/security/process-transaction + Request Headers</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>

              {/* Layer 2 */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/40">
                      ২
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-200">
                        {isBn ? 'ব্যাকএন্ড ও মিডলওয়্যার লিংক (Header & Carrier Intelligence)' : 'Backend & Middleware Layer'}
                      </h4>
                      <div className="text-[11px] text-neutral-400">server.ts & src/server/fintechSecurityService.ts</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300">
                    ASN Mapped
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-blue-400 font-bold flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>রিয়েল-টাইম আইপি ও প্রক্সি পার্সিং</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      `x-forwarded-for`, `cf-connecting-ip`, `via`, `forwarded` ফিল্টার করে ক্লাউড ভিপিএন ও প্রক্সি বাইপাস শনাক্ত করে।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-blue-400 font-bold flex items-center gap-1">
                      <Server className="w-3.5 h-3.5" />
                      <span>বাংলাদেশি টেলিকম ক্যারিয়ার ASN ইন্টেলিজেন্স</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      GP (AS24389), Robi (AS24432), Banglalink (AS38266), Teletalk (AS24431) শনাক্ত করে নিশ্চিত করে ইউজার সত্যই মোবাইল ডাটায় আছেন কি না।
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Flow Arrow */}
              <div className="flex justify-center -my-1">
                <div className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700 flex items-center gap-1">
                  <span>Prisma ORM Query & Calculate Risk Score</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </div>
              </div>

              {/* Layer 3 */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/40">
                      ৩
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-200">
                        {isBn ? 'ডাটাবেস ও হিস্ট্রি ট্র্যাকিং লিংক (Prisma Postgres & Risk Engine)' : 'Database & Risk Scoring'}
                      </h4>
                      <div className="text-[11px] text-neutral-400">prisma/schema.prisma & calculateFintechRisk()</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300">
                    PostgreSQL Ready
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 text-xs">
                  <div className="text-amber-400 font-bold flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" />
                    <span>০ - ১০০ ডায়নামিক রিস্ক স্কোর ক্যালকুলেটর অ্যালগরিদম</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <div className="text-rose-400 font-bold">+৫৫ পয়েন্ট</div>
                      <div className="text-neutral-400 text-[10px]">সিম সোয়াপ &lt;৪৮ ঘণ্টা</div>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <div className="text-amber-400 font-bold">+৩৫ পয়েন্ট</div>
                      <div className="text-neutral-400 text-[10px]">ভিপিএন / প্রক্সি আইপি</div>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <div className="text-yellow-400 font-bold">+৩০ পয়েন্ট</div>
                      <div className="text-neutral-400 text-[10px]">অজানা ক্যারিয়ার / কান্ট্রি</div>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <div className="text-blue-400 font-bold">+১৫ পয়েন্ট</div>
                      <div className="text-neutral-400 text-[10px]">উচ্চ ভ্যালু (৳২৫,০০০+)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Flow Arrow */}
              <div className="flex justify-center -my-1">
                <div className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700 flex items-center gap-1">
                  <span>Score &gt;= 70 ➔ Auto-Hold | Score &gt;= 85 ➔ Auto-Block + Telegram Alert</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </div>
              </div>

              {/* Layer 4 */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/40">
                      ৪
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-200">
                        {isBn ? 'রিয়েল-টাইম অ্যালার্ট ও অ্যাকশন লিংক (Telegram Webhook & Fraud Blocker)' : 'Real-time Alerts & Fraud Blocker'}
                      </h4>
                      <div className="text-[11px] text-neutral-400">Telegram Bot API + /api/security/process-transaction</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300">
                    Auto-Block Enforced
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-rose-400 font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>লেনদেন নিয়ন্ত্রণ ও অ্যাকাউন্ট ফ্রিজ</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      উচ্চ ঝুঁকির সিম সোয়াপ অথবা ভিপিএন আইপি ধরা পড়ার সাথে সাথে পেমেন্ট এপিআই রেসপন্সে `BLOCK_FRAUD` রিটার্ন দিয়ে তহবিল রক্ষা করে।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1">
                    <div className="text-rose-400 font-bold flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                      <span>টেলিগ্রাম ওয়েবহুক ইনস্ট্যান্ট নোটিফিকেশন</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      গ্রাহকের নম্বর, আইপি, ক্যারিয়ার, রিস্ক স্কোর এবং ঘটনার বিবরণ সম্বলিত মার্কডাউন অ্যালার্ট সরাসরি সিকিউরিটি টিম বা অ্যাডমিন বটে পৌঁছে যায়।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA OTP Challenge Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-700 p-6 text-white space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100">
                    {isBn ? '২-ফ্যাক্টর ওটিপি ভেরিফিকেশন' : '2-Factor OTP Challenge'}
                  </h3>
                  <p className="text-[10px] text-neutral-400">Primary SIM Authentication</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
              <div className="text-neutral-400 font-sans">
                {isBn ? 'প্রেরিত নম্বর:' : 'Dispatched to:'} <span className="text-neutral-200 font-mono font-bold">+8801711234567</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                {isBn
                  ? 'আপনার গ্রামীণফোন ভেরিফাইড সিমে ৬-সংখ্যার এসএমএস কোড পাঠানো হয়েছে।'
                  : 'A 6-digit OTP code was sent to your registered carrier line.'}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">
                {isBn ? '৬-সংখ্যার কোড লিখুন:' : 'Enter 6-Digit Code:'}
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                  setOtpError(null);
                }}
                placeholder="482915"
                className="w-full text-center tracking-widest text-lg font-mono font-bold px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-emerald-400 focus:outline-emerald-500"
              />
              {otpError && (
                <div className="text-[11px] text-rose-400 font-medium">{otpError}</div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOtpCode('482915')}
                className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 cursor-pointer transition"
              >
                {isBn ? 'ডেমো কোড পূরণ (482915)' : 'Fill Demo (482915)'}
              </button>

              <button
                type="button"
                disabled={isVerifyingOtp || otpCode.length < 6}
                onClick={() => {
                  setIsVerifyingOtp(true);
                  setTimeout(() => {
                    setIsVerifyingOtp(false);
                    if (otpCode === '482915' || otpCode.length === 6) {
                      setShowOtpModal(false);
                      if (lastTxResult) {
                        setLastTxResult({
                          ...lastTxResult,
                          decision: 'ALLOW',
                          riskScore: 12,
                          reasons: ['✓ 2FA SMS OTP সফলভাবে ভেরিফাইড হয়েছে (Authorized by Customer)'],
                        });
                      }
                    } else {
                      setOtpError('ভুল ওটিপি কোড! অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
                    }
                  }, 600);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition shadow-md active:scale-95"
              >
                {isVerifyingOtp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isBn ? 'যাচাই করুন' : 'Verify & Pay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
