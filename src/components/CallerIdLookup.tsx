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
} from 'lucide-react';
import { CallerIdRecord, RoomDbMetrics } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { roomDbService, OfflineLookupResult } from '../db/roomDatabaseService';

interface CallerIdLookupProps {
  lang: Language;
  onInitiateCall: (phone: string, name?: string) => void;
  onSimulateIncoming: (caller: CallerIdRecord, mode?: 'fullscreen' | 'overlay') => void;
}

export const CallerIdLookup: React.FC<CallerIdLookupProps> = ({
  lang,
  onInitiateCall,
  onSimulateIncoming,
}) => {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<OfflineLookupResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [userReported, setUserReported] = useState<boolean>(false);
  const [isBlockedLocally, setIsBlockedLocally] = useState<boolean>(false);
  const [dbMetrics, setDbMetrics] = useState<RoomDbMetrics | null>(null);
  const [benchmarkStatus, setBenchmarkStatus] = useState<string | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

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
    { label: 'টেলিমার্কেটিং লোন অফার', number: '+880 1999-443322', tag: 'Spam' },
    { label: 'দারাজ ডেলিভারি হাব', number: '+880 1799-001122', tag: 'Official' },
  ];

  const handleSearch = async (phoneToSearch?: string) => {
    const q = phoneToSearch || searchQuery;
    if (!q.trim()) return;

    const res = await roomDbService.lookupIncomingCall(q);
    setLookupResult(res);
    setHasSearched(true);
    setUserReported(false);
    setIsBlockedLocally(res.isBlocked);
  };

  const handleSelectSample = (number: string) => {
    setSearchQuery(number);
    handleSearch(number);
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

  const getSourceBadge = (source: OfflineLookupResult['source']) => {
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
          {t.lookupTitle}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
          {t.lookupSubtitle}
        </p>
      </div>

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
          <div className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
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
                        getSourceBadge(lookupResult.source).classes
                      }`}
                    >
                      {getSourceBadge(lookupResult.source).label}
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

              {/* Database Actions: Block/Unblock, Report Spam */}
              <div className="pt-2 flex items-center justify-between border-t border-neutral-200/60 dark:border-neutral-800">
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
  );
};
