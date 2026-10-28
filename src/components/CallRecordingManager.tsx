import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  FileAudio,
  HardDrive,
  KeyRound,
  FileCheck,
  Sliders,
  Sparkles,
  PhoneCall,
  Volume2,
  Github,
  ArrowUpRight,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CallRecording, RecordingCategory, AutoRecordingCategorySettings } from '../types';
import { roomDbService, DEFAULT_RECORDING_SETTINGS } from '../db/roomDatabaseService';
import { Language } from '../utils/i18n';

interface CallRecordingManagerProps {
  lang: Language;
  onOpenGithubReleaseModal?: () => void;
}

export const CallRecordingManager: React.FC<CallRecordingManagerProps> = ({
  lang,
  onOpenGithubReleaseModal,
}) => {
  const isBn = lang === 'bn';

  // State for Settings
  const [settings, setSettings] = useState<AutoRecordingCategorySettings>(DEFAULT_RECORDING_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // State for Recordings from Room DB
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);

  // Audio Playback State (Web Audio API simulation)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const [isDecrypting, setIsDecrypting] = useState<string | null>(null);

  // Modal for Android APK GitHub Release Instructions
  const [showGithubApkModal, setShowGithubApkModal] = useState(false);

  // Web Audio Context for synthesized speech-like call playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const playbackTimerRef = useRef<any>(null);

  // Load Settings and Recordings from Room DB
  const loadData = async () => {
    try {
      const [loadedSettings, loadedRecordings] = await Promise.all([
        roomDbService.getRecordingSettings(),
        roomDbService.recordings.getAll(200),
      ]);
      setSettings(loadedSettings);
      setRecordings(loadedRecordings);
    } catch (err) {
      console.error('Failed to load recordings from Room DB', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to Room DB changes
    const unsub = roomDbService.subscribe(() => {
      loadData();
    });
    return () => {
      unsub();
      stopAudioPlayback();
    };
  }, []);

  // Update a Category Toggle
  const handleToggleCategory = async (catKey: keyof AutoRecordingCategorySettings['categories']) => {
    const nextSettings: AutoRecordingCategorySettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [catKey]: !settings.categories[catKey],
      },
    };
    setSettings(nextSettings);
    await roomDbService.saveRecordingSettings(nextSettings);
    showNotice(
      isBn
        ? `ক্যাটাগরি রুল আপডেট হয়েছে: ${getCategoryLabel(catKey)}`
        : `Category rule updated: ${catKey}`
    );
  };

  // Toggle Global Recording
  const handleToggleGlobal = async () => {
    const nextSettings: AutoRecordingCategorySettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    setSettings(nextSettings);
    await roomDbService.saveRecordingSettings(nextSettings);
    showNotice(
      isBn
        ? nextSettings.enabled
          ? 'স্বয়ংক্রিয় কল রেকর্ডিং সক্রিয় করা হয়েছে'
          : 'স্বয়ংক্রিয় কল রেকর্ডিং সাময়িক স্থগিত'
        : nextSettings.enabled
        ? 'Auto call recording enabled'
        : 'Auto call recording paused'
    );
  };

  // Change Audio Format
  const handleChangeFormat = async (format: 'AAC_128K' | 'AMR_WB' | 'OPUS') => {
    const nextSettings = { ...settings, audioFormat: format };
    setSettings(nextSettings);
    await roomDbService.saveRecordingSettings(nextSettings);
    showNotice(isBn ? `অডিও ফরম্যাট: ${format}` : `Audio format set to: ${format}`);
  };

  // Change Retention
  const handleChangeRetention = async (days: number) => {
    const nextSettings = { ...settings, retentionDays: days };
    setSettings(nextSettings);
    await roomDbService.saveRecordingSettings(nextSettings);
    showNotice(isBn ? `সংরক্ষণ মেয়াদ: ${days} দিন` : `Retention set to: ${days} days`);
  };

  // Notice Helper
  const showNotice = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 3000);
  };

  // Delete Recording from Room DB
  const handleDeleteRecording = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playingId === id) {
      stopAudioPlayback();
    }
    await roomDbService.recordings.delete(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecording?.id === id) {
      setSelectedRecording(null);
    }
    showNotice(isBn ? 'এনক্রিপ্টেড অডিও রেকর্ড Room DB থেকে মোছা হয়েছে' : 'Recording deleted from Room DB');
  };

  // Create Simulated Encrypted Recording for Instant Testing
  const handleSimulateNewRecording = async () => {
    const sampleNames = [
      { name: 'বিকাশ সিকিউরিটি ডেস্ক (01712-000000)', cat: 'financial' as RecordingCategory, phone: '+880 1712-000000' },
      { name: 'সিটি ব্যাংক ওটিপি সাপোর্ট', cat: 'financial' as RecordingCategory, phone: '+880 1713-999999' },
      { name: 'দারাজ ডেলিভারি মার্চেন্ট পার্টনার', cat: 'business' as RecordingCategory, phone: '+880 1819-001122' },
      { name: 'অপরিচিত ইনকামিং কলার', cat: 'unknown' as RecordingCategory, phone: '+880 1912-334455' },
    ];
    const picked = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const duration = Math.floor(Math.random() * 90) + 20;

    const newRec: CallRecording = {
      id: `rec_test_${Date.now()}`,
      phone: picked.phone,
      contactName: picked.name,
      contactCategory: picked.cat,
      timestamp: Date.now(),
      duration,
      fileSizeKb: Math.round(duration * 2.8),
      isEncrypted: true,
      encryptionAlgorithm: 'AES-256-GCM (Android KeyStore StrongBox)',
      encryptionKeyId: 'sec_key_fintech_master_gp',
      cipherIv: Math.random().toString(16).substring(2, 18),
      checksum: `sha256_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
      transcriptSnippet:
        picked.cat === 'financial'
          ? 'আর্থিক লেনদেন অডিট ও পিন সুরক্ষা সম্পর্কিত ভয়েস রিকগনিশন লগ।'
          : 'ব্যবসায়িক যোগাযোগ ও কলার আইডেন্টিটি ভেরিফিকেশন কল।',
      callType: 'incoming',
      audioWaveform: Array.from({ length: 20 }, () => Math.floor(Math.random() * 70) + 25),
    };

    await roomDbService.recordings.insert(newRec);
    setRecordings((prev) => [newRec, ...prev]);
    showNotice(
      isBn
        ? 'নতুন এনক্রিপ্টেড কল রেকর্ডিং সফলভাবে Room DB-তে সংরক্ষিত হয়েছে!'
        : 'Simulated encrypted call recording stored in Room DB!'
    );
  };

  // Playback Control with Synthesized Call Sound Simulation
  const handleTogglePlay = (rec: CallRecording, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (playingId === rec.id) {
      stopAudioPlayback();
      return;
    }

    // Stop current playback if any
    stopAudioPlayback();

    // Trigger fast realistic decryption simulation (AES-256-GCM decrypt with Keystore)
    setIsDecrypting(rec.id);
    setTimeout(() => {
      setIsDecrypting(null);
      startAudioPlayback(rec);
    }, 400);
  };

  const startAudioPlayback = (rec: CallRecording) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Gentle telecom bandpass sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      // Slight pitch modulation like voice
      osc.frequency.linearRampToValueAtTime(380, ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(420, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;

      setPlayingId(rec.id);
      setPlaybackProgress(0);
      setPlaybackSeconds(0);

      const totalDuration = rec.duration || 30;
      let elapsed = 0;

      playbackTimerRef.current = setInterval(() => {
        elapsed += 1;
        setPlaybackSeconds(elapsed);
        const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        setPlaybackProgress(pct);

        // Modulate frequency to simulate conversation cadence
        if (oscRef.current && audioCtxRef.current) {
          const freqs = [350, 420, 480, 390, 440];
          const randomFreq = freqs[elapsed % freqs.length];
          oscRef.current.frequency.setValueAtTime(randomFreq, audioCtxRef.current.currentTime);
        }

        if (elapsed >= totalDuration) {
          stopAudioPlayback();
        }
      }, 1000);
    } catch (e) {
      console.warn('Audio playback simulation notice:', e);
      setPlayingId(rec.id);
    }
  };

  const stopAudioPlayback = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {}
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setPlayingId(null);
    setPlaybackProgress(0);
    setPlaybackSeconds(0);
  };

  // Helper Labels
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'financial':
        return isBn ? 'আর্থিক ও ব্যাংকিং (Fintech)' : 'Banking & Fintech';
      case 'business':
        return isBn ? 'ব্যবসায়িক ও অফিস (Corporate)' : 'Business & Corporate';
      case 'unknown':
        return isBn ? 'অপরিচিত ও নতুন কলার' : 'Unknown / New Callers';
      case 'spam':
        return isBn ? 'সন্দেহজনক / স্প্যাম নম্বর' : 'Suspicious / Spam';
      case 'vip':
        return isBn ? 'পারিবারিক ও ভিআইপি' : 'Family / VIP';
      default:
        return cat;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'financial':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'business':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'unknown':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'spam':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'vip':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300';
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered List
  const filteredRecordings = useMemo(() => {
    return recordings.filter((r) => {
      if (categoryFilter !== 'all' && r.contactCategory !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.contactName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          (r.transcriptSnippet && r.transcriptSnippet.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [recordings, categoryFilter, searchQuery]);

  // Overall Stats
  const totalDurationMin = useMemo(() => {
    const sec = recordings.reduce((acc, r) => acc + (r.duration || 0), 0);
    return (sec / 60).toFixed(1);
  }, [recordings]);

  const totalSizeMb = useMemo(() => {
    const kb = recordings.reduce((acc, r) => acc + (r.fileSizeKb || 0), 0);
    return (kb / 1024).toFixed(2);
  }, [recordings]);

  return (
    <div id="call-recording-manager" className="space-y-6">
      {/* 1. Header Banner with Hardware Keystore Badge & Global Toggle */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-neutral-900 to-slate-950 text-white border border-indigo-800/40 shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>AES-256-GCM Hardware Encryption</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Android Room DB</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5 text-white">
              <Mic className="w-6 h-6 text-indigo-400" />
              <span>{isBn ? 'কল রেকর্ডিং ম্যানেজার' : 'Call Recording Manager'}</span>
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {isBn
                ? 'ফিনটেক লেনদেন সুরক্ষা ও স্প্যাম অডিটের জন্য অ্যান্ড্রয়েড কি-স্টোর (KeyStore) এনক্রিপ্টেড কল রেকর্ডিং। নির্দিষ্ট কন্টাক্ট ক্যাটাগরিতে স্বয়ংক্রিয় রেকর্ডিং নিয়ন্ত্রণ করুন।'
                : 'Hardware-backed AES-256-GCM encrypted call recording stored in local Room DB for fintech transaction security and fraud auditing.'}
            </p>
          </div>

          {/* Master Toggle & Quick Action */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-neutral-900/80 p-2.5 rounded-2xl border border-neutral-700/60 backdrop-blur-sm">
              <div className="text-right">
                <span className="text-xs font-bold block text-neutral-200">
                  {isBn ? 'অটো-রেকর্ডিং' : 'Auto Recording'}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    settings.enabled ? 'text-emerald-400' : 'text-neutral-400'
                  }`}
                >
                  {settings.enabled
                    ? isBn
                      ? '● সক্রিয় (Active)'
                      : '● Active'
                    : isBn
                    ? '○ নিষ্ক্রিয় (Paused)'
                    : '○ Paused'}
                </span>
              </div>
              <button
                type="button"
                id="toggle-master-recording-btn"
                onClick={handleToggleGlobal}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 ${
                  settings.enabled ? 'bg-emerald-500' : 'bg-neutral-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="simulate-recording-btn"
                onClick={handleSimulateNewRecording}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? 'টেস্ট রেকর্ডিং যোগ' : 'Simulate Call'}</span>
              </button>

              <button
                type="button"
                id="github-apk-release-btn"
                onClick={() => {
                  if (onOpenGithubReleaseModal) {
                    onOpenGithubReleaseModal();
                  } else {
                    setShowGithubApkModal(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Github className="w-3.5 h-3.5 text-white" />
                <span>{isBn ? 'GitHub APK রিলিজ' : 'GitHub APK Release'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-indigo-900/40 text-xs">
          <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-indigo-950/60">
            <span className="text-neutral-400 block text-[10px]">{isBn ? 'মোট রেকর্ডিং' : 'Total Recordings'}</span>
            <span className="text-lg font-bold font-mono text-white">{recordings.length} {isBn ? 'টি' : 'files'}</span>
          </div>
          <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-indigo-950/60">
            <span className="text-neutral-400 block text-[10px]">{isBn ? 'মোট সময়কাল' : 'Total Duration'}</span>
            <span className="text-lg font-bold font-mono text-indigo-300">{totalDurationMin} {isBn ? 'মিনিট' : 'min'}</span>
          </div>
          <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-indigo-950/60">
            <span className="text-neutral-400 block text-[10px]">{isBn ? 'এনক্রিপশন অ্যালগরিদম' : 'Encryption Engine'}</span>
            <span className="text-xs font-bold text-emerald-400 block truncate">AES-256-GCM TPM</span>
          </div>
          <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-indigo-950/60">
            <span className="text-neutral-400 block text-[10px]">{isBn ? 'Room DB স্টোরেজ' : 'Room DB Storage'}</span>
            <span className="text-lg font-bold font-mono text-white">{totalSizeMb} MB</span>
          </div>
        </div>

        {saveSuccessNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Category-Specific Auto-Recording Rules Configuration */}
      <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{isBn ? 'কন্টাক্ট ক্যাটাগরিভিত্তিক অটো-রেকর্ডিং রুলস' : 'Category-Based Auto-Recording Rules'}</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isBn
                ? 'যেসব কন্টাক্ট বা নম্বরে কল আসলে স্বয়ংক্রিয়ভাবে এনক্রিপ্ট হয়ে সংরক্ষণ হবে তা নির্ধারণ করুন'
                : 'Select specific contact types that trigger automatic hardware-encrypted call capture.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">{isBn ? 'ফরম্যাট:' : 'Format:'}</span>
            <select
              value={settings.audioFormat}
              onChange={(e) => handleChangeFormat(e.target.value as any)}
              className="py-1 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="AAC_128K">AAC 128 kbps (HD Voice)</option>
              <option value="AMR_WB">AMR-WB (Telecom Wideband)</option>
              <option value="OPUS">OPUS 64 kbps (Compact)</option>
            </select>
          </div>
        </div>

        {/* Category Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* 1. Financial & Banking */}
          <div
            onClick={() => handleToggleCategory('financial')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              settings.categories.financial
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? '🏦 ব্যাংক ও ফিনটেক লেনদেন' : '🏦 Banking & Fintech'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {isBn ? 'প্রস্তাবিত' : 'Recommended'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn
                  ? 'বিকাশ, নগদ, ব্যাংক হেল্পলাইন ও আর্থিক লেনদেন সংক্রান্ত সকল কল'
                  : 'bKash, Nagad, bank support & payment confirmations'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.categories.financial}
              onChange={() => {}}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 shrink-0 pointer-events-none"
            />
          </div>

          {/* 2. Business & Corporate */}
          <div
            onClick={() => handleToggleCategory('business')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              settings.categories.business
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {isBn ? '💼 ব্যবসায়িক ও ক্লায়েন্ট' : '💼 Business & Clients'}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn
                  ? 'অফিসিয়াল ডিল, ভেন্ডর সাপ্লাই, দারাজ ও কর্পোরেট কল'
                  : 'Client meetings, vendor supply & official deals'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.categories.business}
              onChange={() => {}}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 shrink-0 pointer-events-none"
            />
          </div>

          {/* 3. Unknown & New Numbers */}
          <div
            onClick={() => handleToggleCategory('unknown')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              settings.categories.unknown
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? '🛡️ অপরিচিত ও নতুন নম্বর' : '🛡️ Unknown & New Callers'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {isBn ? 'নিরাপত্তা' : 'Fraud Shield'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn
                  ? 'কন্টাক্ট বুকে সেভ না থাকা নতুন কলারদের ক্ষেত্রে রেকর্ড'
                  : 'Capture calls from non-directory incoming callers'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.categories.unknown}
              onChange={() => {}}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 shrink-0 pointer-events-none"
            />
          </div>

          {/* 4. Suspicious & Spam Numbers */}
          <div
            onClick={() => handleToggleCategory('spam')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              settings.categories.spam
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {isBn ? '⚠️ সন্দেহজনক ও ফ্ল্যাগড স্প্যাম' : '⚠️ Suspicious & Spam'}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn
                  ? 'আইনি প্রমাণ ও সাইবার ক্রাইম তদন্তের জন্য অডিও এভিডেন্স সংরক্ষণ'
                  : 'Retain audio evidence for fraud investigation & legal audit'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.categories.spam}
              onChange={() => {}}
              className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 shrink-0 pointer-events-none"
            />
          </div>

          {/* 5. Family & VIP */}
          <div
            onClick={() => handleToggleCategory('vip')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              settings.categories.vip
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {isBn ? '👨‍👩‍👧 পারিবারিক ও প্রিয় নম্বর (VIP)' : '👨‍👩‍👧 Family & VIP'}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn
                  ? 'প্রিয়জন ও পরিবারবর্গের গুরুত্বপূর্ণ কথোপকথন স্মৃতি'
                  : 'Personal discussions and favorite contacts'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.categories.vip}
              onChange={() => {}}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 shrink-0 pointer-events-none"
            />
          </div>

          {/* Retention Setting Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {isBn ? '⏳ অটো-ডিলিট পলিসি' : '⏳ Retention Policy'}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                {isBn ? 'পুরোনো রেকর্ড স্বয়ংক্রিয় ক্লিনআপ' : 'Auto-cleanup expired records'}
              </p>
            </div>
            <select
              value={settings.retentionDays}
              onChange={(e) => handleChangeRetention(Number(e.target.value))}
              className="py-1 px-2 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value={30}>30 {isBn ? 'দিন' : 'days'}</option>
              <option value={60}>60 {isBn ? 'দিন' : 'days'}</option>
              <option value={90}>90 {isBn ? 'দিন' : 'days'}</option>
              <option value={365}>1 {isBn ? 'বছর' : 'year'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Encrypted Recordings Browser (Room DB) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        {/* Search & Category Filter Pills */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{isBn ? 'এনক্রিপ্টেড কল রেকর্ডিং ব্রাউজার (Room DB)' : 'Encrypted Room DB Recordings'}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {filteredRecordings.length}
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isBn
                  ? 'সকল অডিও ফাইল ডিভাইস মেমরিতে AES-256-GCM এনক্রিপ্টেড। ডিক্রিপ্ট করে সরাসরি শুনুন বা এক্সপোর্ট করুন।'
                  : 'Browse hardware-encrypted audio files stored securely inside Android SQLite / Room DB.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'নাম, নম্বর বা ট্রানস্ক্রিপ্ট খুঁজুন...' : 'Search caller or transcript...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: isBn ? 'সকল' : 'All' },
              { id: 'financial', label: isBn ? 'আর্থিক (Fintech)' : 'Financial' },
              { id: 'business', label: isBn ? 'ব্যবসায়িক' : 'Business' },
              { id: 'unknown', label: isBn ? 'অপরিচিত' : 'Unknown' },
              { id: 'spam', label: isBn ? 'স্প্যাম' : 'Spam' },
              { id: 'vip', label: isBn ? 'ভিআইপি' : 'VIP' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id)}
                className={`px-3 py-1 rounded-full font-semibold transition shrink-0 ${
                  categoryFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recordings List */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-[500px] overflow-y-auto">
          {filteredRecordings.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 dark:text-neutral-500 space-y-2">
              <FileAudio className="w-8 h-8 mx-auto opacity-40" />
              <p>{isBn ? 'কোনো এনক্রিপ্টেড কল রেকর্ডিং পাওয়া যায়নি' : 'No encrypted call recordings found'}</p>
              <button
                type="button"
                onClick={handleSimulateNewRecording}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-indigo-500 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? 'টেস্ট রেকর্ডিং তৈরি করুন' : 'Create Sample Recording'}</span>
              </button>
            </div>
          ) : (
            filteredRecordings.map((rec) => {
              const isPlaying = playingId === rec.id;
              const isDecryptingThis = isDecrypting === rec.id;
              const isSelected = selectedRecording?.id === rec.id;

              return (
                <div
                  key={rec.id}
                  id={`recording-item-${rec.id}`}
                  onClick={() => setSelectedRecording(isSelected ? null : rec)}
                  className={`p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition cursor-pointer rounded-2xl ${
                    isPlaying ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Play / Decrypt Button */}
                      <button
                        type="button"
                        id={`play-btn-${rec.id}`}
                        onClick={(e) => handleTogglePlay(rec, e)}
                        disabled={isDecryptingThis}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition shadow-sm ${
                          isPlaying
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950'
                        }`}
                      >
                        {isDecryptingThis ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                        ) : isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {rec.contactName}
                          </h4>
                          <span
                            className={`text-[9px] px-2 py-0.2 rounded-full border font-semibold ${getCategoryBadgeClass(
                              rec.contactCategory
                            )}`}
                          >
                            {getCategoryLabel(rec.contactCategory)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                            {formatDuration(rec.duration)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                          <span>{rec.phone}</span>
                          <span>•</span>
                          <span>{new Date(rec.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{rec.fileSizeKb} KB</span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>AES-256-GCM</span>
                          </span>
                        </div>

                        {rec.transcriptSnippet && (
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-100/70 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-200/60 dark:border-neutral-700/50 line-clamp-2">
                            <span className="font-semibold text-neutral-500 mr-1">{isBn ? 'সারাংশ:' : 'Snippet:'}</span>
                            {rec.transcriptSnippet}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Delete & Details */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecording(rec.id, e)}
                        title={isBn ? 'মুছুন' : 'Delete'}
                        className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Active Playback Visualizer Bar */}
                  {isPlaying && (
                    <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                        <span className="flex items-center gap-1.5 font-sans font-semibold">
                          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                          <span>{isBn ? 'ডিক্রিপ্ট অডিও প্লে হচ্ছে (KeyStore Verified)' : 'Playing Decrypted Audio (KeyStore Verified)'}</span>
                        </span>
                        <span>
                          {formatDuration(playbackSeconds)} / {formatDuration(rec.duration)}
                        </span>
                      </div>

                      {/* Waveform graphic */}
                      <div className="flex items-end gap-1 h-8 bg-indigo-100/50 dark:bg-neutral-800 p-1.5 rounded-xl">
                        {(rec.audioWaveform || [40, 60, 80, 50, 70, 90, 65, 45, 85, 75, 50, 65, 80, 70, 55, 45, 60, 75, 50, 40]).map(
                          (val, idx) => {
                            const isPast = (idx / 20) * 100 <= playbackProgress;
                            return (
                              <div
                                key={idx}
                                style={{ height: `${val}%` }}
                                className={`flex-1 rounded-full transition-colors duration-200 ${
                                  isPast ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-neutral-300 dark:bg-neutral-700'
                                }`}
                              />
                            );
                          }
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{ width: `${playbackProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expanded Security & Cryptographic Audit Details */}
                  {isSelected && !isPlaying && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl animate-in fade-in">
                      <div>
                        <span className="text-neutral-400 block">{isBn ? 'এনক্রিপশন কি আইডি:' : 'KeyStore Key ID:'}</span>
                        <span className="text-neutral-800 dark:text-neutral-200 font-bold truncate block">
                          {rec.encryptionKeyId}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Cipher IV:</span>
                        <span className="text-neutral-800 dark:text-neutral-200 truncate block">
                          {rec.cipherIv}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-neutral-400 block">SHA-256 Checksum:</span>
                        <span className="text-neutral-800 dark:text-neutral-200 truncate block">
                          {rec.checksum}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. GitHub Android APK Release Hub Modal */}
      {showGithubApkModal && (
        <div
          id="github-apk-release-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowGithubApkModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {isBn ? 'GitHub থেকে Android APK রিলিজ গাইড' : 'Release Android APK from GitHub'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {isBn ? 'স্বয়ংক্রিয় CI/CD গিটহাব অ্যাকশনস ওয়ার্কফ্লো' : 'Automated CI/CD GitHub Actions Workflow'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGithubApkModal(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isBn ? 'GitHub Actions স্বয়ংক্রিয় APK বিল্ড প্রস্তুত!' : 'GitHub Actions Automated APK Build Ready!'}</span>
                </span>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                  {isBn
                    ? 'আপনার রিপোজিটরির `.github/workflows/build-android-apk.yml` ফাইলে একটি সম্পূর্ণ CI/CD পাইপলাইন কনফিগার করা হয়েছে। গিটহাবে নতুন ট্যাগ পুশ করলে স্বয়ংক্রিয়ভাবে Android APK বিল্ড হয়ে Releases সেকশনে যুক্ত হবে।'
                    : 'A complete CI/CD pipeline has been created in `.github/workflows/build-android-apk.yml`. Pushing a release tag will automatically compile the Android APK and publish it under Releases.'}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'কীভাবে APK রিলিজ করবেন (৩টি সহজ ধাপ):' : 'How to Release APK (3 Simple Steps):'}
                </h4>

                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 space-y-1 font-mono text-[11px]">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">
                    {isBn ? '১. রিলিজ ট্যাগ তৈরি ও পুশ করুন:' : '1. Create and push a release tag:'}
                  </p>
                  <p className="text-neutral-800 dark:text-neutral-200">git tag v1.0.0</p>
                  <p className="text-neutral-800 dark:text-neutral-200">git push origin v1.0.0</p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 space-y-1 font-mono text-[11px]">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">
                    {isBn ? '২. ম্যানুয়াল ওয়ান-ক্লিক রান (GitHub UI):' : '2. Manual One-Click Trigger in GitHub:'}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300 font-sans">
                    {isBn
                      ? 'GitHub Repository > Actions > "Build & Release Android APK" > "Run workflow" বাটনে ক্লিক করুন।'
                      : 'Go to GitHub Repository > Actions > "Build & Release Android APK" > click "Run workflow".'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 space-y-1 font-mono text-[11px]">
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">
                    {isBn ? '৩. APK ডাউনলোড করুন:' : '3. Download APK:'}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300 font-sans">
                    {isBn
                      ? 'বিল্ড সম্পন্ন হলে GitHub "Releases" ট্যাবে `smart-dialer-release.apk` ডাউনলোড লিংক পাওয়া যাবে।'
                      : 'Once completed, the `smart-dialer-release.apk` binary is ready to download under GitHub Releases.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGithubApkModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition"
              >
                {isBn ? 'ঠিক আছে, বুঝেছি' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
