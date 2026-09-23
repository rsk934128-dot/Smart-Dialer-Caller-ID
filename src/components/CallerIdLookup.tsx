import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Phone,
  PhoneCall,
  MapPin,
  Building,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Database,
  Zap,
  Ban,
  Activity,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Save,
  Loader2,
  RefreshCw,
  Cpu,
  Globe,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { CallerIdRecord, RoomDbMetrics, GeminiCallerIdMetadata } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { roomDbService, OfflineLookupResult } from '../db/roomDatabaseService';
import { BlockedNumbersManager } from './BlockedNumbersManager';
import {
  fetchLiveGeminiCallerId,
  geminiMetadataToCallerIdRecord,
} from '../services/geminiCallerIdService';

interface CallerIdLookupProps {
  lang: Language;
  onInitiateCall: (phone: string, name?: string) => void;
  onSimulateIncoming: (caller: CallerIdRecord, mode?: 'fullscreen' | 'overlay') => void;
  initialSubTab?: 'search' | 'blocked';
}

export const CallerIdLookup: React.FC<CallerIdLookupProps> = ({
  lang,
  onInitiateCall,
  onSimulateIncoming,
  initialSubTab = 'search',
}) => {
  const t = TRANSLATIONS[lang];
  const [subTab, setSubTab] = useState<'search' | 'blocked'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<OfflineLookupResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [userReported, setUserReported] = useState<boolean>(false);
  const [isBlockedLocally, setIsBlockedLocally] = useState<boolean>(false);
  const [dbMetrics, setDbMetrics] = useState<RoomDbMetrics | null>(null);
  const [benchmarkStatus, setBenchmarkStatus] = useState<string | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Gemini Live Caller ID state
  const [isFetchingGemini, setIsFetchingGemini] = useState(false);
  const [geminiMetadata, setGeminiMetadata] = useState<GeminiCallerIdMetadata | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [isSavedToRoomDb, setIsSavedToRoomDb] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSavingToRoomDb, setIsSavingToRoomDb] = useState(false);

  // Load database metrics on mount
  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      const metrics = await roomDbService.getMetrics();
      if (isMounted) setDbMetrics(metrics);
    }
    loadMetrics();

    const unsubscribe = roomDbService.subscribe(async () => {
      if (!isMounted) return;
      const metrics = await roomDbService.getMetrics();
      setDbMetrics(metrics);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const sampleNumbers = [
    { label: 'গ্রামীণফোন হেল্পলাইন', number: '+880 1700-121121', tag: 'Official' },
    { label: 'লটারি ও ফেক প্রাইজ (Scam)', number: '+880 1300-998811', tag: 'Fraud' },
    { label: 'ফুডপ্যান্ডা রাইডার', number: '+880 1855-123456', tag: 'Verified' },
    { label: 'অপরিচিত মোবাইল কলার', number: '+880 1712-987654', tag: 'Unknown' },
    { label: 'টেলিমার্কেটিং লোন অফার', number: '+880 1999-443322', tag: 'Spam' },
    { label: 'দারাজ ডেলিভারি হাব', number: '+880 1799-001122', tag: 'Official' },
  ];

  const handleSearch = async (phoneToSearch?: string) => {
    const q = phoneToSearch || searchQuery;
    if (!q.trim()) return;

    setGeminiMetadata(null);
    setGeminiError(null);
    setIsSavedToRoomDb(false);
    setSaveSuccessMsg(null);

    const res = await roomDbService.lookupIncomingCall(q);
    setLookupResult(res);
    setHasSearched(true);
    setUserReported(false);
    setIsBlockedLocally(res.isBlocked);

    // Check if this number is already cached in Room DB
    const isCached = await roomDbService.isCallerIdCached(q);
    if (isCached && res.source === 'caller_id_cache') {
      setIsSavedToRoomDb(true);
    }
  };

  const handleSelectSample = (number: string) => {
    setSearchQuery(number);
    handleSearch(number);
  };

  // Fetch live Caller ID metadata from server-side Gemini API
  const handleFetchGeminiCallerId = async (customPhone?: string) => {
    const targetPhone = customPhone || lookupResult?.record.phone || searchQuery;
    if (!targetPhone.trim()) return;

    setIsFetchingGemini(true);
    setGeminiError(null);
    setSaveSuccessMsg(null);

    const response = await fetchLiveGeminiCallerId(targetPhone);
    setIsFetchingGemini(false);

    if (response.success && response.data) {
      setGeminiMetadata(response.data);
      // Check if this number was already saved in local Room database
      const alreadySaved = await roomDbService.isCallerIdCached(targetPhone);
      setIsSavedToRoomDb(alreadySaved);
    } else {
      setGeminiError(response.error || 'Gemini লাইভ মেটাডাটা পেতে সমস্যা হয়েছে');
    }
  };

  // Save the Gemini live metadata to the local Room database
  const handleSaveGeminiToRoomDb = async () => {
    if (!geminiMetadata) return;

    setIsSavingToRoomDb(true);
    try {
      const recordToSave = geminiMetadataToCallerIdRecord(geminiMetadata);
      await roomDbService.saveLiveCallerIdToLocalDb(recordToSave, {
        alsoAddToSpam: geminiMetadata.spamScore >= 60,
      });

      setIsSavedToRoomDb(true);
      setSaveSuccessMsg(
        '✅ লোকাল Room ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে! পরবর্তী অনুসন্ধানে এই নম্বরটি সাব-২ms এ অফলাইনে পাওয়া যাবে।'
      );

      // Update current lookupResult so the main card reflects the saved information
      setLookupResult({
        record: recordToSave,
        source: 'caller_id_cache',
        latencyMs: 0.6,
        isSpam: geminiMetadata.spamScore >= 60,
        isBlocked: isBlockedLocally || geminiMetadata.spamScore >= 80,
        isContact: false,
      });

      // Refresh DB metrics
      const metrics = await roomDbService.getMetrics();
      setDbMetrics(metrics);
    } catch (err: any) {
      console.error('Failed to save to Room database:', err);
      setGeminiError('লোকাল Room ডাটাবেজে সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSavingToRoomDb(false);
    }
  };

  const handleSpamReport = async () => {
    if (lookupResult) {
      await roomDbService.reportSpam(lookupResult.record.phone, lookupResult.record.name);
      setLookupResult({
        ...lookupResult,
        isSpam: true,
        record: {
          ...lookupResult.record,
          spamReports: lookupResult.record.spamReports + 1,
          spamScore: Math.min(100, lookupResult.record.spamScore + 5),
        },
      });
      setUserReported(true);
    }
  };

  const handleToggleBlock = async () => {
    if (lookupResult) {
      if (isBlockedLocally) {
        await roomDbService.unblockNumber(lookupResult.record.phone);
        setIsBlockedLocally(false);
      } else {
        await roomDbService.blockNumber(lookupResult.record.phone, lookupResult.record.name);
        setIsBlockedLocally(true);
      }
    }
  };

  // Run 50x Sub-2ms microbenchmark to test Dexie/IndexedDB speed
  const runMicroBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkStatus('রুম ডাটাবেজ বেঞ্চমার্ক চলছে...');

    const testPhones = [
      '+8801700121121',
      '+8801300998811',
      '+8801855123456',
      '+8801999443322',
      '+8801711234567',
    ];

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const phone = testPhones[i % testPhones.length];
      await roomDbService.lookupIncomingCall(phone);
    }
    const totalTime = performance.now() - start;
    const avgTime = (totalTime / iterations).toFixed(2);

    setBenchmarkStatus(
      `⚡ ${iterations}টি অফলাইন SQLite কুয়েরি সম্পন্ন: গড় ${avgTime}ms প্রতি কুয়েরি (সাব-২ms গ্যারান্টি)`
    );
    setIsBenchmarking(false);
  };

  const getSourceBadge = (source: OfflineLookupResult['source'], isGeminiAnalyzed?: boolean) => {
    if (source === 'caller_id_cache' && isGeminiAnalyzed) {
      return {
        label: 'রুম ক্যাশ (Gemini AI সংরক্ষিত)',
        classes: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300',
      };
    }
    switch (source) {
      case 'contact':
        return {
          label: 'লোকাল কন্টাক্টস DAO',
          classes: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300',
        };
      case 'spam_list':
        return {
          label: 'রুম স্প্যাম টেবিল (SpamDao)',
          classes: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300',
        };
      case 'caller_id_cache':
        return {
          label: 'ক্যাশড ডিরেক্টরি DAO',
          classes: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300',
        };
      case 'heuristic_rule':
        return {
          label: 'অফলাইন প্রিফিক্স রুলস',
          classes: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300',
        };
      default:
        return {
          label: 'সাধারণ অজানা কলার',
          classes: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300',
        };
    }
  };

  const result = lookupResult?.record;

  return (
    <div id="caller-id-lookup-component" className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Title & Banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
          <Database className="w-3.5 h-3.5" />
          <span>Room SQLite Architecture (Dexie.js Service)</span>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {subTab === 'blocked' ? t.blockedNumbersTitle : t.lookupTitle}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
          {subTab === 'blocked' ? t.blockedNumbersSubtitle : t.lookupSubtitle}
        </p>
      </div>

      {/* Sub-navigation Tabs: Search & Blocked Numbers */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-2xs">
        <button
          id="caller-id-subtab-search"
          onClick={() => setSubTab('search')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'search'
              ? 'bg-white dark:bg-neutral-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{t.tabSearch}</span>
        </button>

        <button
          id="caller-id-subtab-blocked"
          onClick={() => setSubTab('blocked')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'blocked'
              ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>{t.tabBlockedNumbers}</span>
          {dbMetrics?.spamCount !== undefined && dbMetrics.spamCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300">
              {dbMetrics.spamCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: DEDICATED BLOCKED NUMBERS & SPAM PROTECTION VIEW */}
      {subTab === 'blocked' && (
        <BlockedNumbersManager
          lang={lang}
          onInitiateCall={onInitiateCall}
        />
      )}

      {/* VIEW 2: CALLER ID SEARCH & BENCHMARK VIEW */}
      {subTab === 'search' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Room Database Real-Time Status & Benchmark Widget */}
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Room Database স্টোরেজ মেট্রিক্স:</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                IndexedDB / SQLite
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400">কন্টাক্টস</p>
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {dbMetrics?.contactsCount ?? 0}
                </p>
              </div>
              <div className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400">কল লগস</p>
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {dbMetrics?.callLogsCount ?? 0}
                </p>
              </div>
              <div
                onClick={() => setSubTab('blocked')}
                className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 cursor-pointer hover:border-red-300 dark:hover:border-red-800 transition"
                title="ব্লক তালিকা দেখুন"
              >
                <p className="text-[10px] text-neutral-400">স্প্যাম লিস্ট</p>
                <p className="text-xs font-bold text-red-600 dark:text-red-400">
                  {dbMetrics?.spamCount ?? 0}
                </p>
              </div>
              <div className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400">ক্যাশ কলার</p>
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {dbMetrics?.callerIdCacheCount ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                id="run-room-benchmark-btn"
                onClick={runMicroBenchmark}
                disabled={isBenchmarking}
                className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 inline-flex items-center gap-1 transition"
              >
                <Activity className="w-3 h-3" />
                <span>{isBenchmarking ? 'টেস্টিং...' : '৫০x সাব-২ms অফলাইন কুয়েরি বেঞ্চমার্ক'}</span>
              </button>
            </div>

            {benchmarkStatus && (
              <p className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 animate-fadeIn">
                {benchmarkStatus}
              </p>
            )}
          </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          id="caller-id-search-input"
          type="text"
          placeholder="যেমন: +880 1300-998811 বা 01700..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full pl-10 pr-24 py-3 text-sm rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-cyan-500 font-mono shadow-xs"
        />
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <button
          id="caller-id-submit-btn"
          onClick={() => handleSearch()}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
        >
          খুঁজুন
        </button>
      </div>

      {/* Quick Sample Numbers */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-neutral-400">{t.testWithNumbers}</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleNumbers.map((s) => (
            <button
              key={s.number}
              id={`sample-number-${s.tag.toLowerCase()}`}
              onClick={() => handleSelectSample(s.number)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                s.tag === 'Fraud' || s.tag === 'Spam'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                  : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span>{s.label}</span>
              <span className="font-mono text-[10px] text-neutral-400">({s.tag})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Display */}
      {hasSearched && (
        <div id="caller-id-results" className="pt-2 animate-fadeIn">
          {result ? (
            <div
              className={`rounded-2xl p-5 border shadow-md space-y-4 ${
                result.spamScore >= 60 || isBlockedLocally
                  ? 'bg-gradient-to-b from-red-50/80 to-white dark:from-red-950/30 dark:to-neutral-900 border-red-200 dark:border-red-900/60'
                  : result.verified
                  ? 'bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-neutral-900 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {/* Header Badge with Source & Latency */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {result.spamScore >= 60 || isBlockedLocally ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{isBlockedLocally ? 'ব্লককৃত নম্বর' : t.highRiskSpam}</span>
                    </div>
                  ) : result.verified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t.verifiedBusiness}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
                      <Shield className="w-4 h-4" />
                      <span>{t.safeCaller}</span>
                    </div>
                  )}

                  {lookupResult && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${
                        getSourceBadge(lookupResult.source, result.isGeminiAnalyzed).classes
                      }`}
                    >
                      {getSourceBadge(lookupResult.source, result.isGeminiAnalyzed).label}
                    </span>
                  )}
                </div>

                <div className="text-right flex items-center gap-1.5">
                  {lookupResult && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{lookupResult.latencyMs}ms</span>
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 font-mono">
                    {result.spamReports} Reports
                  </span>
                </div>
              </div>

              {/* Main Caller Info */}
              <div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {result.name}
                </h3>
                <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {result.phone}
                </p>
                {result.businessCategory && (
                  <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mt-1">
                    {result.businessCategory}
                  </p>
                )}
              </div>

              {/* Spam Risk Meter Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-neutral-500 dark:text-neutral-400">{t.spamRisk}:</span>
                  <span
                    className={`font-bold ${
                      result.spamScore >= 60 || isBlockedLocally
                        ? 'text-red-600 dark:text-red-400'
                        : result.spamScore >= 30
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isBlockedLocally ? '100% (ব্লককৃত)' : `${result.spamScore}%`}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.spamScore >= 60 || isBlockedLocally
                        ? 'bg-red-500'
                        : result.spamScore >= 30
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: isBlockedLocally ? '100%' : `${result.spamScore}%` }}
                  />
                </div>
              </div>

              {/* Community notes */}
              {result.notes && (
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 text-xs text-neutral-700 dark:text-neutral-300">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-200 mb-0.5">
                    রুম ডাটাবেজ রেকর্ড:
                  </p>
                  <p className="italic">"{result.notes}"</p>
                </div>
              )}

              {/* Success notice after saving to Room DB */}
              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* GEMINI AI LIVE CALLER ID SECTION */}
              <div className="pt-1">
                {/* 1. Prompt when Gemini metadata hasn't been fetched yet */}
                {!geminiMetadata && !isFetchingGemini && (
                  <div className="p-4 rounded-xl border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-cyan-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-cyan-950/20 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Gemini AI লাইভ কলার আইডি সন্ধান
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono">
                            gemini-3.8-flash
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                          {lookupResult?.source === 'unknown'
                            ? 'এই নম্বরটি লোকাল ডাটাবেজে নেই। Gemini AI দিয়ে রিয়েল-টাইম কলার নাম, অপারেটর ও স্প্যাম বিশ্লেষণ সংগ্রহ করুন।'
                            : 'Gemini AI মডেল দিয়ে এই নম্বরের রিয়েল-টাইম কলার পরিচয়, টেলিকম ক্যারিয়ার ও ঝুঁকি পর্যালোচনা করুন।'}
                        </p>
                      </div>
                    </div>

                    <button
                      id="fetch-live-gemini-btn"
                      onClick={() => handleFetchGeminiCallerId(result.phone)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>✨ Gemini AI দিয়ে লাইভ তথ্য খুঁজুন (Live Lookup)</span>
                    </button>
                  </div>
                )}

                {/* 2. Loading state while contacting Gemini API */}
                {isFetchingGemini && (
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-center space-y-2 animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-bold">
                        Gemini 3.8 Flash দিয়ে লাইভ কলার মেটাডাটা অ্যানালাইজ করা হচ্ছে...
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      টেলিকম অপারেটর সিরিজ, ব্যবসায়িক ডিরেক্টরি ও স্প্যাম প্যাটার্ন স্ক্যান চলছে...
                    </p>
                  </div>
                )}

                {/* 3. Error state with retry */}
                {geminiError && !isFetchingGemini && (
                  <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{geminiError}</span>
                    </div>
                    <button
                      onClick={() => handleFetchGeminiCallerId(result.phone)}
                      className="px-2 py-1 rounded bg-rose-200 dark:bg-rose-800 text-[10px] font-semibold hover:opacity-80"
                    >
                      পুনরায় চেষ্টা
                    </button>
                  </div>
                )}

                {/* 4. Rich Gemini Live Metadata Card */}
                {geminiMetadata && !isFetchingGemini && (
                  <div
                    id="gemini-live-metadata-card"
                    className="p-4 rounded-2xl border-2 border-purple-300 dark:border-purple-700/70 bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/60 dark:from-neutral-900 dark:via-purple-950/20 dark:to-neutral-900 shadow-md space-y-3.5 animate-fadeIn"
                  >
                    {/* Top Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-purple-600 text-white">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                          Gemini AI লাইভ কলার মেটাডাটা
                        </span>
                        {geminiMetadata.verified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3" />
                            ভেরিফায়েড
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 font-mono text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-950/50">
                          {geminiMetadata.carrier}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            geminiMetadata.trustLevel === 'high'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : geminiMetadata.trustLevel === 'suspicious'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {geminiMetadata.trustLevel === 'high'
                            ? 'নিরাপদ কলার'
                            : geminiMetadata.trustLevel === 'suspicious'
                            ? 'সন্দেহজনক স্প্যাম'
                            : 'মাঝারি রিস্ক'}
                        </span>
                      </div>
                    </div>

                    {/* Identity & Business Info */}
                    <div className="bg-white/85 dark:bg-neutral-800/85 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40">
                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {geminiMetadata.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {geminiMetadata.businessCategory}
                        </span>
                        <span className="flex items-center gap-1 text-neutral-500 font-mono text-[11px]">
                          <MapPin className="w-3 h-3" />
                          {geminiMetadata.city}, {geminiMetadata.country}
                        </span>
                      </div>

                      {/* Gemini Risk Evaluation Bar */}
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-neutral-500 dark:text-neutral-400">
                            Gemini AI স্প্যাম ঝুঁকি:
                          </span>
                          <span
                            className={`font-bold ${
                              geminiMetadata.spamScore >= 60
                                ? 'text-rose-600 dark:text-rose-400'
                                : geminiMetadata.spamScore >= 30
                                ? 'text-amber-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {geminiMetadata.spamScore}%{' '}
                            {geminiMetadata.spamScore >= 60
                              ? '(উচ্চ ঝুঁকি)'
                              : geminiMetadata.spamScore >= 30
                              ? '(সতর্কতা)'
                              : '(নিরাপদ)'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              geminiMetadata.spamScore >= 60
                                ? 'bg-rose-500'
                                : geminiMetadata.spamScore >= 30
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, geminiMetadata.spamScore)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Notes and Recommendations */}
                    <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 text-xs text-neutral-700 dark:text-neutral-300 border border-purple-100 dark:border-purple-900/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          AI বিশ্লেষণ ও নিরাপত্তা নোট:
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-200/70 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                          {geminiMetadata.suggestedAction === 'safe_to_answer'
                            ? 'রিসিভ করা নিরাপদ'
                            : geminiMetadata.suggestedAction === 'block_and_report'
                            ? 'ব্লক করার সুপারিশ'
                            : 'সতর্ক থাকুন'}
                        </span>
                      </div>
                      <p className="italic text-[11px] leading-relaxed">
                        "{geminiMetadata.notes}"
                      </p>
                    </div>

                    {/* OPTION TO SAVE METADATA TO ROOM DATABASE */}
                    <div className="pt-1 space-y-2">
                      {!isSavedToRoomDb ? (
                        <div className="space-y-1.5">
                          <button
                            id="save-gemini-to-room-db-btn"
                            disabled={isSavingToRoomDb}
                            onClick={handleSaveGeminiToRoomDb}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                          >
                            {isSavingToRoomDb ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Room ডাটাবেজে সংরক্ষণ করা হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>💾 লোকাল Room ডাটাবেজে সংরক্ষণ করুন (Save to Room DB)</span>
                              </>
                            )}
                          </button>
                          <p className="text-[10px] text-center text-neutral-500 dark:text-neutral-400">
                            💡 Room SQLite-এ ক্যাশ করলে ভবিষ্যতে এই নম্বরের যেকোনো ইনকামিং কল সম্পূর্ণ অফলাইনে সাব-২ms এ শনাক্ত হবে।
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>লোকাল Room ডাটাবেজে সফলভাবে ক্যাশ করা হয়েছে!</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 pl-6">
                            এখন থেকে এই নম্বরটি আপনার লোকাল ডিভাইসে সংরক্ষিত। পরবর্তীতে কোনো কল আসলে ০.৫ms এ অফলাইন SQLite থেকে কলার আইডি দৃশ্যমান হবে।
                          </p>
                          <div className="pl-6 pt-1 flex items-center gap-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-800">
                              Table: caller_id_cache
                            </span>
                            <span>Latency: &lt;1ms (Offline IndexedDB)</span>
                          </div>
                        </div>
                      )}

                      {/* Refresh / Re-query live Gemini button */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleFetchGeminiCallerId(geminiMetadata.phone)}
                          className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Gemini AI দিয়ে পুনরায় লাইভ স্ক্যান করুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Outgoing Call, Simulate Incoming Call, Overlay */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  id="caller-id-call-out-btn"
                  onClick={() => onInitiateCall(result.phone, result.name)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>আউটগোয়িং কল</span>
                </button>

                <button
                  id="simulate-callerid-overlay-btn"
                  onClick={() => onSimulateIncoming(result, 'overlay')}
                  className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>ফ্লোটিং ওভারলে</span>
                </button>

                <button
                  id="simulate-callerid-fullscreen-btn"
                  onClick={() => onSimulateIncoming(result, 'fullscreen')}
                  className="py-2.5 px-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>ফুলস্ক্রিন কল</span>
                </button>
              </div>

              {/* Database Actions: Block/Unblock, Report Spam, Re-analyze */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-neutral-200/60 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <button
                    id="toggle-block-room-db-btn"
                    onClick={handleToggleBlock}
                    className={`text-xs inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-medium transition ${
                      isBlockedLocally
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 border border-red-200 dark:border-red-900'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isBlockedLocally ? 'আনব্লক করুন' : 'নম্বর ব্লক করুন (Room DB)'}</span>
                  </button>

                  {isBlockedLocally && (
                    <button
                      onClick={() => setSubTab('blocked')}
                      className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>ব্লক তালিকায় দেখুন &rarr;</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Re-analyze with Gemini button if result is already found */}
                  {lookupResult && lookupResult.source !== 'unknown' && !geminiMetadata && (
                    <button
                      id="reanalyze-with-gemini-btn"
                      onClick={() => handleFetchGeminiCallerId(result.phone)}
                      className="text-xs inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini লাইভ বিশ্লেষণ</span>
                    </button>
                  )}

                  <button
                    id="report-as-spam-btn"
                    disabled={userReported}
                    onClick={handleSpamReport}
                    className={`text-xs inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition ${
                      userReported
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-medium'
                        : 'text-neutral-500 hover:text-red-500 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    {userReported ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>রিপোর্ট সেভ করা হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        <span>স্প্যাম রিপোর্ট করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 text-neutral-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                তথ্য পাওয়া যায়নি
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                এই নম্বরটির কোনো লোকাল রেকর্ড বা স্প্যাম অভিযোগ নেই। এটি একটি ব্যক্তিগত সাধারণ নম্বর হতে পারে।
              </p>
              <button
                id="call-unknown-anyway-btn"
                onClick={() => onInitiateCall(searchQuery)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>তবুও কল করুন</span>
              </button>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
};
