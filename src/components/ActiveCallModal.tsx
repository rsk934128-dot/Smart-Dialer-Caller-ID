import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Grid,
  Disc,
  ShieldAlert,
  ShieldCheck,
  User,
  MapPin,
  X,
} from 'lucide-react';
import { ActiveCall } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { playDtmfTone } from '../utils/sound';

interface ActiveCallModalProps {
  call: ActiveCall;
  lang: Language;
  onAnswer: () => void;
  onDecline: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleHold: () => void;
  onToggleRecord: () => void;
  soundEnabled: boolean;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  call,
  lang,
  onAnswer,
  onDecline,
  onToggleMute,
  onToggleSpeaker,
  onToggleHold,
  onToggleRecord,
  soundEnabled,
}) => {
  const t = TRANSLATIONS[lang];
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [typedDigits, setTypedDigits] = useState('');

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isSpam = Boolean(call.callerIdInfo && call.callerIdInfo.spamScore >= 60);
  const isVerified = Boolean(call.callerIdInfo && call.callerIdInfo.verified);

  const handleInCallKeyClick = (digit: string) => {
    setTypedDigits((prev) => prev + digit);
    if (soundEnabled) {
      playDtmfTone(digit);
    }
  };

  return (
    <div
      id="active-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all duration-300"
    >
      <div
        id="phone-call-container"
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-6 transition-all duration-300 ${
          isSpam
            ? 'bg-gradient-to-b from-red-950 via-neutral-900 to-black border border-red-800/60'
            : 'bg-gradient-to-b from-slate-900 via-neutral-900 to-black border border-slate-800'
        }`}
        style={{ minHeight: '580px' }}
      >
        {/* Top bar with Caller ID status badges */}
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          {isSpam ? (
            <div
              id="spam-alert-pill"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>{t.highRiskSpam} ({call.callerIdInfo?.spamScore}% Risk)</span>
            </div>
          ) : isVerified ? (
            <div
              id="verified-pill"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.verifiedBusiness}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-800/60 text-neutral-300 text-xs">
              <span>{call.callerIdInfo ? t.safeCaller : 'Voice Call'}</span>
            </div>
          )}

          {/* Status line */}
          <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium mt-1">
            {call.state === 'incoming' && t.incomingCalling}
            {call.state === 'outgoing' && t.ringing}
            {call.state === 'connected' && (call.isHold ? t.hold : `${t.callConnected} • ${formatDuration(call.duration)}`)}
            {call.state === 'ended' && t.callEnded}
          </p>
        </div>

        {/* Middle: Avatar and Caller Info */}
        <div className="flex flex-col items-center my-auto text-center">
          <div className="relative mb-4">
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center p-1 border-2 transition-all ${
                isSpam
                  ? 'border-red-500 bg-red-950/40 shadow-red-900/40 shadow-lg'
                  : 'border-cyan-500/60 bg-cyan-950/20 shadow-cyan-900/30 shadow-lg'
              } ${call.state === 'incoming' || call.state === 'outgoing' ? 'animate-pulse' : ''}`}
            >
              <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
                <User className="w-12 h-12 text-neutral-400" />
              </div>
            </div>

            {call.isRecording && (
              <span className="absolute bottom-0 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            )}
          </div>

          <h2 id="active-caller-name" className="text-2xl font-bold text-white tracking-tight">
            {call.name || call.phone}
          </h2>
          <p id="active-caller-phone" className="text-neutral-400 text-sm font-mono mt-1">
            {call.phone}
          </p>

          {call.callerIdInfo?.businessCategory && (
            <p className="text-xs text-neutral-300 font-medium bg-neutral-800/70 px-2.5 py-1 rounded-md mt-2">
              {call.callerIdInfo.businessCategory}
            </p>
          )}

          {call.callerIdInfo?.city && (
            <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3 text-neutral-500" />
              <span>{call.callerIdInfo.city}, {call.callerIdInfo.country || 'Bangladesh'}</span>
            </p>
          )}

          {call.callerIdInfo?.notes && (
            <p className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 mt-3 max-w-xs text-center">
              "{call.callerIdInfo.notes}"
            </p>
          )}
        </div>

        {/* If In-Call Keypad is Opened */}
        {showInCallKeypad && call.state === 'connected' && (
          <div className="absolute inset-0 bg-neutral-950/95 p-6 flex flex-col justify-between z-20 rounded-3xl animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <div className="text-left">
                <p className="text-xs text-neutral-400">IVR Keypad Input:</p>
                <p className="text-xl font-mono text-cyan-400 min-h-[28px]">{typedDigits || '...'}</p>
              </div>
              <button
                id="close-incall-keypad-btn"
                onClick={() => setShowInCallKeypad(false)}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 my-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  id={`incall-key-${k}`}
                  onClick={() => handleInCallKeyClick(k)}
                  className="h-14 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white text-xl font-medium active:scale-95 transition flex items-center justify-center shadow"
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowInCallKeypad(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-700 transition"
            >
              Hide Keypad
            </button>
          </div>
        )}

        {/* Bottom Action Area */}
        <div className="pt-4">
          {/* Incoming Call Screen Controls */}
          {call.state === 'incoming' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-neutral-400 text-center animate-pulse">
                {t.swipeToAnswer}
              </p>
              <div className="flex items-center justify-around px-4">
                {/* Decline Button */}
                <button
                  id="decline-call-btn"
                  onClick={onDecline}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex flex-col items-center justify-center text-white shadow-lg shadow-red-900/50 transition-all group"
                  title={t.declineCall}
                >
                  <PhoneOff className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                </button>

                {/* Answer Button */}
                <button
                  id="answer-call-btn"
                  onClick={onAnswer}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-900/50 transition-all animate-bounce"
                  title={t.acceptCall}
                >
                  <Phone className="w-7 h-7" />
                </button>
              </div>
            </div>
          )}

          {/* Connected or Outgoing Call Controls */}
          {(call.state === 'connected' || call.state === 'outgoing') && (
            <div className="flex flex-col gap-5">
              {/* In-Call feature grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Mute */}
                <button
                  id="toggle-mute-btn"
                  onClick={onToggleMute}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    call.isMuted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[11px] mt-1 font-medium">{call.isMuted ? t.unmute : t.mute}</span>
                </button>

                {/* Keypad */}
                <button
                  id="toggle-keypad-btn"
                  onClick={() => setShowInCallKeypad(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200 transition-all"
                >
                  <Grid className="w-5 h-5" />
                  <span className="text-[11px] mt-1 font-medium">{t.keypad}</span>
                </button>

                {/* Speaker */}
                <button
                  id="toggle-speaker-btn"
                  onClick={onToggleSpeaker}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    call.isSpeaker
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {call.isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span className="text-[11px] mt-1 font-medium">{t.speaker}</span>
                </button>

                {/* Hold */}
                <button
                  id="toggle-hold-btn"
                  onClick={onToggleHold}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    call.isHold
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {call.isHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  <span className="text-[11px] mt-1 font-medium">{call.isHold ? t.unhold : t.hold}</span>
                </button>

                {/* Record */}
                <button
                  id="toggle-record-btn"
                  onClick={onToggleRecord}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    call.isRecording
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  <Disc className={`w-5 h-5 ${call.isRecording ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] mt-1 font-medium">{call.isRecording ? t.recording : t.record}</span>
                </button>

                {/* SIM Info */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-800/40 text-neutral-400">
                  <span className="text-xs font-mono font-semibold text-neutral-300">HD VoLTE</span>
                  <span className="text-[11px] mt-1">SIM 1</span>
                </div>
              </div>

              {/* End Call Button */}
              <div className="flex justify-center">
                <button
                  id="end-call-btn"
                  onClick={onDecline}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-rose-900/60 transition-all group"
                  title={t.endCall}
                >
                  <PhoneOff className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Ended state */}
          {call.state === 'ended' && (
            <div className="flex justify-center">
              <p className="text-neutral-400 text-sm font-medium">{t.callEnded}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
