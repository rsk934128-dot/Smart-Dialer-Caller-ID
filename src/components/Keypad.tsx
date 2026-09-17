import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Phone,
  Delete,
  Volume2,
  VolumeX,
  UserPlus,
  Search,
  Sparkles,
  Star,
  ArrowRight,
  HelpCircle,
  Radio,
  Smartphone,
  Check,
} from 'lucide-react';
import { Contact } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { playDtmfTone } from '../utils/sound';
import {
  searchContactsT9,
  getHighlightedSegments,
  getT9MappingHint,
  T9SearchResult,
} from '../utils/t9';
import { callPermissionService, CallMode } from '../services/callPermissionService';

interface KeypadProps {
  lang: Language;
  contacts: Contact[];
  onInitiateCall: (phoneNumber: string, contactName?: string, callMode?: 'real' | 'simulated') => void;
  onOpenAddContact: (phoneNumber: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

interface KeyData {
  digit: string;
  sub: string;
}

const KEYS: KeyData[] = [
  { digit: '1', sub: ' ' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: ' ' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: ' ' },
];

export const Keypad: React.FC<KeypadProps> = ({
  lang,
  contacts,
  onInitiateCall,
  onOpenAddContact,
  soundEnabled,
  onToggleSound,
}) => {
  const t = TRANSLATIONS[lang];
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedSim, setSelectedSim] = useState<1 | 2>(1);
  const [callMode, setCallMode] = useState<CallMode>(() => callPermissionService.getCallMode());
  const backspaceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = callPermissionService.subscribe((_perms, _isDef, mode) => {
      setCallMode(mode);
    });
    return () => unsub();
  }, []);

  const handleModeChange = (mode: CallMode) => {
    setCallMode(mode);
    callPermissionService.setCallMode(mode);
  };

  const isBn = lang === 'bn';

  const handleKeyPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
    if (soundEnabled) {
      playDtmfTone(digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const startLongPressClear = () => {
    backspaceTimerRef.current = window.setTimeout(() => {
      setPhoneNumber('');
    }, 450);
  };

  const stopLongPressClear = () => {
    if (backspaceTimerRef.current) {
      clearTimeout(backspaceTimerRef.current);
      backspaceTimerRef.current = null;
    }
  };

  // Perform T9 predictive search immediately on any typed digit
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  const t9Results: T9SearchResult[] = useMemo(() => {
    if (!cleanNumber) return [];
    return searchContactsT9(contacts, cleanNumber);
  }, [contacts, cleanNumber]);

  // T9 mapping hint for current input (e.g. "2" -> "A, B, C")
  const t9MappingHint = useMemo(() => {
    return getT9MappingHint(cleanNumber);
  }, [cleanNumber]);

  // Top quick-dial favorites for empty keypad state
  const quickFavorites = useMemo(() => {
    return contacts.filter((c) => c.isFavorite).slice(0, 4);
  }, [contacts]);

  return (
    <div id="keypad-container" className="flex flex-col h-full max-w-sm mx-auto justify-between select-none">
      {/* Top Controls: Sound toggle & SIM selector */}
      <div className="flex items-center justify-between px-3 pt-1 pb-2 border-b border-neutral-200 dark:border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            id="sim-1-selector"
            onClick={() => setSelectedSim(1)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSim === 1
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {t.simSlot} 1 (GP)
          </button>
          <button
            id="sim-2-selector"
            onClick={() => setSelectedSim(2)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSim === 2
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {t.simSlot} 2 (Robi)
          </button>
        </div>

        <button
          id="sound-toggle-btn"
          onClick={onToggleSound}
          title={t.dtmfSound}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
            soundEnabled
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline text-[11px] font-medium">{t.dtmfSound}</span>
        </button>
      </div>

      {/* T9 Search Results / Contacts Suggestion Header Area */}
      <div className="px-3 pt-1.5 pb-1 min-h-[90px] max-h-[128px] overflow-y-auto shrink-0 flex flex-col justify-center">
        {cleanNumber ? (
          <div className="space-y-1.5">
            {/* T9 Predictive Search Indicator Bar */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.t9SearchTitle}:</span>
                <span className="font-mono bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded text-[10px] tracking-wide">
                  {cleanNumber} → {t9MappingHint}
                </span>
              </div>
              <span className="text-[10px] font-medium text-neutral-400">
                {t9Results.length} {t.t9Found}
              </span>
            </div>

            {/* Matching Contacts List */}
            {t9Results.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                {t9Results.map((result) => {
                  const contact = result.contact;
                  const nameSegments = getHighlightedSegments(
                    contact.name,
                    result.nameHighlights
                  );
                  const phoneSegments = getHighlightedSegments(
                    contact.phone,
                    result.phoneHighlights
                  );
                  const secSegments = result.secondaryName
                    ? getHighlightedSegments(result.secondaryName, result.nameHighlights)
                    : null;

                  return (
                    <div
                      key={contact.id}
                      id={`t9-match-${contact.id}`}
                      onClick={() => onInitiateCall(contact.phone, contact.name)}
                      className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 hover:bg-emerald-50 dark:bg-neutral-800/80 dark:hover:bg-emerald-950/40 border border-neutral-200 hover:border-emerald-300 dark:border-neutral-700/80 dark:hover:border-emerald-700/70 text-left transition shrink-0 max-w-[240px] cursor-pointer shadow-2xs"
                      title={`${t.tapToDial} ${contact.name}`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                            {contact.name.charAt(0)}
                          </div>
                        )}
                        {contact.isFavorite && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                            <Star className="w-2 h-2 fill-white text-white" />
                          </div>
                        )}
                      </div>

                      {/* Contact Info with T9 Highlights */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                          {nameSegments.map((seg, idx) =>
                            seg.isHighlighted ? (
                              <span
                                key={idx}
                                className="bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold px-0.5 rounded-xs"
                              >
                                {seg.text}
                              </span>
                            ) : (
                              <span key={idx}>{seg.text}</span>
                            )
                          )}
                        </p>

                        {/* Secondary transliterated/English name if primary is Bengali */}
                        {secSegments && (
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate leading-tight">
                            {secSegments.map((seg, idx) =>
                              seg.isHighlighted ? (
                                <span
                                  key={idx}
                                  className="bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-semibold px-0.5 rounded-xs"
                                >
                                  {seg.text}
                                </span>
                              ) : (
                                <span key={idx}>{seg.text}</span>
                              )
                            )}
                          </p>
                        )}

                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                          {phoneSegments.map((seg, idx) =>
                            seg.isHighlighted ? (
                              <span
                                key={idx}
                                className="bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold px-0.5 rounded-xs"
                              >
                                {seg.text}
                              </span>
                            ) : (
                              <span key={idx}>{seg.text}</span>
                            )
                          )}
                        </p>
                      </div>

                      {/* Call Action Button */}
                      <button
                        id={`btn-call-match-${contact.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInitiateCall(contact.phone, contact.name);
                        }}
                        className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition"
                        title={t.callBtn}
                      >
                        <Phone className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-dashed border-neutral-300 dark:border-neutral-700 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.t9NoMatches}
                </span>
                <button
                  id="add-current-number-btn"
                  onClick={() => onOpenAddContact(phoneNumber)}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.addToContacts}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty dialer state: Quick Dial Favorites */
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium px-1">
              <span>{t.quickDialFavorites}</span>
              <span className="text-neutral-400 text-[9px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                T9: Type 2 for A/B/C
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {quickFavorites.map((c) => (
                <button
                  key={c.id}
                  id={`quick-fav-${c.id}`}
                  onClick={() => onInitiateCall(c.phone, c.name)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-left transition shrink-0 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[80px]">
                    {c.nameEn || c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Display Area */}
      <div className="flex flex-col items-center justify-center px-4 py-2 min-h-[64px] shrink-0">
        <div className="relative w-full flex items-center justify-center">
          <input
            id="dialpad-number-input"
            type="text"
            readOnly
            value={phoneNumber}
            placeholder={t.enterNumber}
            className="w-full text-center text-3xl sm:text-4xl font-semibold tracking-wider font-mono text-neutral-900 dark:text-neutral-100 bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
          />

          {phoneNumber && (
            <button
              id="dialpad-backspace-btn"
              onClick={handleBackspace}
              onMouseDown={startLongPressClear}
              onMouseUp={stopLongPressClear}
              onTouchStart={startLongPressClear}
              onTouchEnd={stopLongPressClear}
              title="Backspace (Hold to clear)"
              className="absolute right-0 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 active:scale-90 transition"
            >
              <Delete className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* 3x4 Standard Smartphone Dialer Keypad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 px-3 py-1 flex-1 max-h-[300px]">
        {KEYS.map((k) => (
          <button
            key={k.digit}
            id={`keypad-digit-${k.digit === '*' ? 'star' : k.digit === '#' ? 'hash' : k.digit}`}
            onClick={() => handleKeyPress(k.digit)}
            className="flex flex-col items-center justify-center rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/70 dark:hover:bg-neutral-700/80 active:scale-95 active:bg-neutral-300 dark:active:bg-neutral-600 transition shadow-2xs border border-neutral-200/60 dark:border-neutral-700/50 py-1 sm:py-2"
          >
            <span className="text-2xl sm:text-3xl font-medium text-neutral-800 dark:text-neutral-100 leading-none">
              {k.digit}
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-neutral-500 dark:text-neutral-400 mt-0.5 uppercase min-h-[14px]">
              {k.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Call Mode Switcher & Sim Slot Indicator */}
      <div className="flex items-center justify-between px-6 py-1 shrink-0 text-xs">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
          <button
            type="button"
            onClick={() => handleModeChange('real')}
            className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition flex items-center gap-1 ${
              callMode === 'real'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>{isBn ? 'রিয়েল সিম কল' : 'Real SIM Call'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('simulated')}
            className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition flex items-center gap-1 ${
              callMode === 'simulated'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{isBn ? 'ইন-অ্যাপ স্ক্রিন' : 'In-App UI'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>SIM {selectedSim}</span>
          <button
            type="button"
            onClick={() => setSelectedSim((prev) => (prev === 1 ? 2 : 1))}
            className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-[10px] font-bold hover:bg-neutral-300 dark:hover:bg-neutral-600 transition"
          >
            {isBn ? 'সুইচ' : 'Switch'}
          </button>
        </div>
      </div>

      {/* Action Call Buttons Area */}
      <div className="py-2 px-6 shrink-0 space-y-2">
        {phoneNumber ? (
          <div className="flex gap-2">
            {/* Primary Call Button (based on selected mode) */}
            <button
              id="dialpad-call-btn"
              onClick={() => onInitiateCall(phoneNumber, undefined, callMode)}
              className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all shadow-md bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98 shadow-emerald-900/20"
            >
              <Phone className="w-5 h-5 fill-current" />
              <span>
                {callMode === 'real'
                  ? isBn
                    ? 'রিয়েল সিম কল করুন'
                    : 'Real SIM Call'
                  : isBn
                  ? 'ইন-অ্যাপ ডায়াল করুন'
                  : 'In-App Call Screen'}
              </span>
            </button>

            {/* Alternate Quick Action Button */}
            <button
              id="dialpad-alt-call-btn"
              onClick={() =>
                onInitiateCall(
                  phoneNumber,
                  undefined,
                  callMode === 'real' ? 'simulated' : 'real'
                )
              }
              title={
                callMode === 'real'
                  ? isBn
                    ? 'ইন-অ্যাপ স্ক্রিনে টেস্ট করুন'
                    : 'Test in In-App Screen'
                  : isBn
                  ? 'সরাসরি মোবাইলের সিম দিয়ে রিয়েল কল করুন'
                  : 'Make Real SIM Call'
              }
              className="px-3.5 py-3 rounded-2xl flex items-center justify-center border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold active:scale-95 transition"
            >
              {callMode === 'real' ? (
                <Radio className="w-4 h-4 text-cyan-600" />
              ) : (
                <Smartphone className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          </div>
        ) : (
          <button
            id="dialpad-call-btn-disabled"
            disabled
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
          >
            <Phone className="w-5 h-5 fill-current" />
            <span>{t.callBtn}</span>
          </button>
        )}
      </div>
    </div>
  );
};
