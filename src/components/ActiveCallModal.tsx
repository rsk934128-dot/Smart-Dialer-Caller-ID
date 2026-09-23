import React, { useState, useEffect, useRef } from 'react';
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
  Music,
  CircleDot,
  FileText,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ActiveCall, Contact } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { playDtmfTone } from '../utils/sound';
import { roomDbService } from '../db/roomDatabaseService';

interface ActiveCallModalProps {
  call: ActiveCall;
  lang: Language;
  matchedContact?: Contact;
  onAnswer: () => void;
  onDecline: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleHold: () => void;
  onToggleRecord: () => void;
  onUpdateNote?: (note: string) => void;
  soundEnabled: boolean;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  call,
  lang,
  matchedContact,
  onAnswer,
  onDecline,
  onToggleMute,
  onToggleSpeaker,
  onToggleHold,
  onToggleRecord,
  onUpdateNote,
  soundEnabled,
}) => {
  const t = TRANSLATIONS[lang];
  const isBn = lang === 'bn';
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [typedDigits, setTypedDigits] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Quick In-Call Notes State
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState(call.callNote || '');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync external note if updated
  useEffect(() => {
    if (call.callNote !== undefined && call.callNote !== noteText) {
      setNoteText(call.callNote);
    }
  }, [call.callNote]);

  // Handle Note Change & auto-sync to ActiveCall state
  const handleNoteChange = (text: string) => {
    setNoteText(text);
    if (onUpdateNote) {
      onUpdateNote(text);
    }
  };

  // Explicit Save to Room DB during active call
  const handleSaveNoteNow = async () => {
    if (onUpdateNote) {
      onUpdateNote(noteText);
    }

    // If contact is identified, update contact note in Room DB immediately as well
    if (matchedContact && noteText.trim()) {
      try {
        const contactNoteToSave = matchedContact.note
          ? `${matchedContact.note}\n[In-Call note: ${noteText.trim()}]`
          : noteText.trim();
        await roomDbService.updateContactNote(matchedContact.id, contactNoteToSave);
      } catch (err) {
        console.error('Error saving in-call note to contact:', err);
      }
    }

    setIsSavedFeedback(true);
    setTimeout(() => {
      setIsSavedFeedback(false);
    }, 2200);
  };

  // Independent recording timer: counts elapsed recording duration while recording is active
  useEffect(() => {
    let interval: number | undefined;
    if (call.isRecording && call.state === 'connected') {
      interval = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!call.isRecording) {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [call.isRecording, call.state]);

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
          call.isRecording
            ? 'bg-gradient-to-b from-neutral-950 via-red-950/40 to-black border-2 border-red-600/70 shadow-[0_0_40px_rgba(220,38,38,0.35)]'
            : isSpam
            ? 'bg-gradient-to-b from-red-950 via-neutral-900 to-black border border-red-800/60'
            : 'bg-gradient-to-b from-slate-900 via-neutral-900 to-black border border-slate-800'
        }`}
        style={{ minHeight: '580px' }}
      >
        {/* Top bar with Caller ID status badges & Recording banner */}
        <div className="flex flex-col items-center gap-2 pt-2 text-center w-full">
          {/* Prominent Recording Status Banner with Timer & Pulse Waveform */}
          {call.isRecording && call.state === 'connected' && (
            <div
              id="active-call-recording-banner"
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-950 via-rose-900/90 to-red-950 border border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] ring-1 ring-red-400/40 animate-fadeIn"
            >
              {/* Left: Prominent Pulsing Red Beacon */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border border-white ring-2 ring-red-400/80 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-white tracking-widest bg-red-600 px-1.5 py-0.2 rounded text-[10px]">
                    REC
                  </span>
                  <span className="text-[11px] font-semibold text-red-100 hidden sm:inline">
                    {t.recordingActive || 'কল রেকর্ড হচ্ছে'}
                  </span>
                </div>
              </div>

              {/* Center: Audio Frequency Waveform Bars */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/50 border border-red-500/30">
                <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
                <span className="w-1 h-5 bg-red-500 rounded-full animate-pulse delay-75" />
                <span className="w-1 h-2 bg-red-300 rounded-full animate-pulse delay-150" />
                <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse delay-100" />
              </div>

              {/* Right: Visual Recording Timer Badge */}
              <div
                id="recording-timer-pill"
                className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-black/70 border border-red-400/60 font-mono font-bold text-xs text-red-200 tracking-wider shadow-inner"
              >
                <CircleDot className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                <span>{formatDuration(recordingSeconds)}</span>
              </div>
            </div>
          )}

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
            {/* Multi-Layer Prominent Pulse Halo Indicator When Recording */}
            {call.isRecording && (
              <>
                <div className="absolute -inset-6 rounded-full border-2 border-red-500/40 animate-ping pointer-events-none opacity-60 duration-1000" />
                <div className="absolute -inset-3 rounded-full border-2 border-red-500 animate-pulse pointer-events-none shadow-[0_0_25px_rgba(239,68,68,0.7)] ring-4 ring-red-500/25" />
              </>
            )}

            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center p-1 border-2 transition-all duration-300 ${
                call.isRecording
                  ? 'border-red-500 bg-red-950/70 shadow-[0_0_35px_rgba(239,68,68,0.65)] ring-4 ring-red-500/40'
                  : isSpam
                  ? 'border-red-500 bg-red-950/40 shadow-red-900/40 shadow-lg'
                  : 'border-cyan-500/60 bg-cyan-950/20 shadow-cyan-900/30 shadow-lg'
              } ${call.state === 'incoming' || call.state === 'outgoing' ? 'animate-pulse' : ''}`}
            >
              <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
                <User className="w-12 h-12 text-neutral-400" />
              </div>
            </div>

            {/* Prominent Recording Badge attached to Avatar with Live Timer */}
            {call.isRecording && (
              <div
                id="avatar-recording-badge"
                className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 border-2 border-neutral-900 shadow-[0_0_15px_rgba(239,68,68,0.9)] z-10"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span className="font-mono text-[10px] font-black text-white tracking-widest">
                  REC {formatDuration(recordingSeconds)}
                </span>
              </div>
            )}
          </div>

          <h2 id="active-caller-name" className="text-2xl font-bold text-white tracking-tight">
            {call.name || call.phone}
          </h2>
          <p id="active-caller-phone" className="text-neutral-400 text-sm font-mono mt-1">
            {call.phone}
          </p>

          {call.customRingtoneLabel && call.state === 'incoming' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs mt-2 animate-pulse">
              <Music className="w-3.5 h-3.5 text-purple-300" />
              <span className="font-semibold">{call.customRingtoneLabel}</span>
            </div>
          )}

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

          {call.callerIdInfo?.notes && !isNotesOpen && (
            <p className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 mt-3 max-w-xs text-center">
              "{call.callerIdInfo.notes}"
            </p>
          )}

          {/* Quick Notes Input Section for In-Call Logging to Room DB */}
          {(call.state === 'connected' || call.state === 'outgoing') && (
            <div
              id="incall-notes-section"
              className="w-full mt-3 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 p-2.5 text-left transition-all shadow-md"
            >
              <div className="flex items-center justify-between">
                <button
                  id="toggle-incall-notes-btn"
                  type="button"
                  onClick={() => {
                    setIsNotesOpen(!isNotesOpen);
                    if (!isNotesOpen) {
                      setTimeout(() => noteInputRef.current?.focus(), 150);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200 hover:text-amber-400 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.callNotes || 'কল নোট (Room DB)'}</span>
                  {noteText.trim() && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-ping" />
                  )}
                  {isNotesOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {isSavedFeedback && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium animate-fadeIn">
                      <Check className="w-3 h-3" />
                      <span>{t.inCallNoteSavedToRoomDb || 'সংরক্ষিত'}</span>
                    </span>
                  )}
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    Room DB
                  </span>
                </div>
              </div>

              {/* Note Input Field (Expanded view or preview) */}
              {isNotesOpen ? (
                <div className="mt-2 space-y-2 animate-fadeIn">
                  <textarea
                    id="incall-note-input"
                    ref={noteInputRef}
                    rows={2}
                    value={noteText}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder={t.callNotePlaceholder || 'কল চলাকালীন দ্রুত নোট লিখুন (যেমন: ঠিকানা, জরুরি কাজের সময়)...'}
                    className="w-full text-xs p-2 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 text-[10px]">
                      {matchedContact
                        ? `${isBn ? 'কন্টাক্ট:' : 'Contact:'} ${matchedContact.name}`
                        : isBn
                        ? 'কল ইতিহাসে সংরক্ষিত হবে'
                        : 'Stored in call history log'}
                    </span>
                    <button
                      id="save-incall-note-btn"
                      type="button"
                      onClick={handleSaveNoteNow}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center gap-1 transition shadow cursor-pointer text-[10px]"
                    >
                      <Save className="w-3 h-3" />
                      <span>{t.saveNote || 'সংরক্ষণ'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                noteText.trim() && (
                  <p
                    onClick={() => setIsNotesOpen(true)}
                    className="mt-1 text-[11px] text-amber-200/90 truncate cursor-pointer hover:underline"
                    title={noteText}
                  >
                    "{noteText}"
                  </p>
                )
              )}
            </div>
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

                {/* Record Button with Prominent Pulse Animation and Recording Timer */}
                <button
                  id="toggle-record-btn"
                  onClick={onToggleRecord}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer ${
                    call.isRecording
                      ? 'bg-gradient-to-b from-red-600/35 via-red-900/50 to-red-950/70 text-red-100 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.55)] ring-2 ring-red-400/40 animate-pulse'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                  title={call.isRecording ? t.stopRecording || 'Stop Recording' : t.record}
                >
                  {/* Top-right pulsing red recording beacon */}
                  {call.isRecording && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border border-white ring-1 ring-red-400" />
                    </span>
                  )}

                  <div className="relative">
                    <Disc className={`w-5 h-5 ${call.isRecording ? 'animate-spin text-red-400' : ''}`} />
                    {call.isRecording && (
                      <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    )}
                  </div>

                  <span className={`text-[11px] mt-1 font-bold ${call.isRecording ? 'text-red-200' : 'text-neutral-200'}`}>
                    {call.isRecording ? t.recording : t.record}
                  </span>

                  {/* Prominent in-button Recording Timer */}
                  {call.isRecording && (
                    <span
                      id="btn-recording-timer"
                      className="text-[10px] font-mono text-red-200 font-black mt-0.5 tracking-tight px-1.5 py-0.2 rounded-md bg-black/60 border border-red-500/40"
                    >
                      {formatDuration(recordingSeconds)}
                    </span>
                  )}
                </button>

                {/* Quick Note Action Button */}
                <button
                  id="toggle-notes-btn"
                  onClick={() => {
                    setIsNotesOpen(!isNotesOpen);
                    if (!isNotesOpen) {
                      setTimeout(() => noteInputRef.current?.focus(), 150);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer ${
                    noteText.trim()
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200'
                  }`}
                  title={t.callNotes || 'Quick Note'}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-[11px] mt-1 font-medium">{t.callNotes?.split(' ')[0] || 'নোট'}</span>
                </button>
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
