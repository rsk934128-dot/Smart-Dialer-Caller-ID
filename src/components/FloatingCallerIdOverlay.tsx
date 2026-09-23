import React, { useState } from 'react';
import {
  Phone,
  PhoneOff,
  VolumeX,
  Maximize2,
  X,
  ShieldAlert,
  ShieldCheck,
  User,
  Database,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Move,
  Music,
} from 'lucide-react';
import { ActiveCall } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface FloatingCallerIdOverlayProps {
  call: ActiveCall;
  lang: Language;
  onAnswer: () => void;
  onDecline: () => void;
  onToggleSilence: () => void;
  onExpandFullscreen: () => void;
  onBlockNumber: (phone: string) => void;
  isSilenced: boolean;
}

export const FloatingCallerIdOverlay: React.FC<FloatingCallerIdOverlayProps> = ({
  call,
  lang,
  onAnswer,
  onDecline,
  onToggleSilence,
  onExpandFullscreen,
  onBlockNumber,
  isSilenced,
}) => {
  const t = TRANSLATIONS[lang];
  const [blocked, setBlocked] = useState(false);

  const info = call.callerIdInfo;
  const isSpam = Boolean(info && info.spamScore >= 60);
  const isVerified = Boolean(info && info.verified);

  const handleBlock = () => {
    setBlocked(true);
    onBlockNumber(call.phone);
    setTimeout(() => {
      onDecline();
    }, 1200);
  };

  return (
    <div
      id="floating-caller-id-overlay-container"
      className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div
        id="floating-caller-id-card"
        className={`pointer-events-auto w-full max-w-md rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl border transition-all duration-300 ${
          isSpam
            ? 'bg-neutral-900/95 border-rose-600/70 text-white shadow-rose-950/50'
            : isVerified
            ? 'bg-neutral-900/95 border-sky-500/70 text-white shadow-sky-950/40'
            : 'bg-neutral-900/95 border-neutral-700/80 text-white shadow-black/60'
        }`}
      >
        {/* Top Floating Service Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-neutral-300 flex items-center gap-1 font-semibold">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Offline Room DB (0.8ms)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 font-mono hidden sm:inline">
              SYSTEM_ALERT_WINDOW
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="btn-overlay-expand-fullscreen"
              onClick={onExpandFullscreen}
              title="ফুলস্ক্রিন ডায়ালার মোডে যান"
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-overlay-dismiss"
              onClick={onDecline}
              title="ওভারলে বন্ধ করুন"
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Caller Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3.5">
            {/* Avatar / Shield Indicator */}
            <div
              className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isSpam
                  ? 'bg-rose-600/20 text-rose-500 border border-rose-500/40 ring-4 ring-rose-500/10 animate-pulse'
                  : isVerified
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 ring-4 ring-sky-500/10'
                  : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 ring-4 ring-emerald-500/10'
              }`}
            >
              {isSpam ? (
                <ShieldAlert className="w-7 h-7" />
              ) : isVerified ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>

            {/* Information Column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">
                  {call.name || call.phone}
                </h3>
                {isVerified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                )}
                {isSpam && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>স্প্যাম {info?.spamScore}%</span>
                  </span>
                )}
                {isSilenced && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <VolumeX className="w-2.5 h-2.5" />
                    <span>সাইলেন্ট মোড</span>
                  </span>
                )}
                {call.customRingtoneLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/25 text-purple-300 border border-purple-500/40">
                    <Music className="w-2.5 h-2.5" />
                    <span>{call.customRingtoneLabel}</span>
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-neutral-300 mt-0.5 tracking-wide">
                {call.phone}
              </p>

              {/* Sub-label or category */}
              {info && (
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                  {info.businessCategory || info.notes || info.city || 'অজানা নম্বর'}
                  {info.spamReports > 0 && ` • ${info.spamReports} জন রিপোর্ট করেছেন`}
                </p>
              )}
            </div>
          </div>

          {/* Offline Engine Detection Banner */}
          <div
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
              isSpam
                ? 'bg-rose-950/40 border-rose-800/40 text-rose-200'
                : 'bg-neutral-800/60 border-neutral-700/50 text-neutral-300'
            }`}
          >
            <Database className="w-4 h-4 shrink-0 text-emerald-400" />
            <p className="text-[11px] leading-snug">
              {isSpam ? (
                <span>
                  <strong>অফলাইন স্প্যাম ডিটেকশন:</strong> লোকাল রুমে এই নম্বরের বিরুদ্ধে উচ্চ ঝুঁকির রেকর্ড রয়েছে।
                </span>
              ) : (
                <span>
                  <strong>লোকাল ক্যাশ ভেরিফাইড:</strong> কোনো মোবাইল ইন্টারনেট ছাড়াই অফলাইনে শনাক্ত করা হয়েছে।
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-1">
            {/* Answer Call */}
            <button
              id="btn-overlay-answer"
              onClick={onAnswer}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition"
            >
              <Phone className="w-4 h-4 fill-white" />
              <span>রিসিভ করুন</span>
            </button>

            {/* Decline Call */}
            <button
              id="btn-overlay-decline"
              onClick={onDecline}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-rose-950/40 transition"
            >
              <PhoneOff className="w-4 h-4 fill-white" />
              <span>কেটে দিন</span>
            </button>

            {/* Silence Ringtone */}
            <button
              id="btn-overlay-silence"
              onClick={onToggleSilence}
              title={isSilenced ? 'শব্দ আনমিউট করুন' : 'রিংটোন সাইলেন্ট করুন'}
              className={`p-2.5 rounded-xl border transition ${
                isSilenced
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
              }`}
            >
              <VolumeX className="w-4 h-4" />
            </button>

            {/* Block Button (if spam or unknown) */}
            <button
              id="btn-overlay-block"
              onClick={handleBlock}
              disabled={blocked}
              title="এই নম্বর ব্লক করুন ও কেটে দিন"
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800/60 border border-neutral-700 text-neutral-300 transition"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>

          {blocked && (
            <div className="p-2 rounded-xl bg-rose-900/80 border border-rose-700 text-center text-xs font-semibold text-white animate-in fade-in">
              নম্বরটি অফলাইন স্প্যাম ব্লকলিস্টে যুক্ত হয়েছে!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
