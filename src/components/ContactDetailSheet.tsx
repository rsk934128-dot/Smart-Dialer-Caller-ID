import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Star,
  Phone,
  Smartphone,
  MessageSquare,
  Mail,
  Building2,
  Edit3,
  Trash2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneMissed,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Radio,
  FileText,
  Tag,
  CardSim as SimCard,
  Music,
  Play,
  Square,
  Volume2,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  BellRing,
} from 'lucide-react';
import { Contact, CallLog } from '../types';
import { Language } from '../utils/i18n';
import { callPermissionService } from '../services/callPermissionService';
import { roomDbService } from '../db/roomDatabaseService';
import { RINGTONE_PRESETS, playIncomingRingtone } from '../utils/sound';

interface ContactDetailSheetProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  callLogs: CallLog[];
  onInitiateCall: (phone: string, name?: string, callMode?: 'real' | 'simulated') => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateContact?: (contact: Contact) => void;
}

export const ContactDetailSheet: React.FC<ContactDetailSheetProps> = ({
  contact,
  isOpen,
  onClose,
  lang,
  callLogs,
  onInitiateCall,
  onEditContact,
  onDeleteContact,
  onToggleFavorite,
  onUpdateContact,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Custom Ringtone & Room DB Preference State
  const [isEditingRingtone, setIsEditingRingtone] = useState(false);
  const [selectedRingtoneId, setSelectedRingtoneId] = useState<string>(contact?.ringtone || 'chime');
  const [customRingtoneLabel, setCustomRingtoneLabel] = useState<string>(contact?.ringtoneLabel || '');
  const [playingRingtoneId, setPlayingRingtoneId] = useState<string | null>(null);
  const [isSavingRingtone, setIsSavingRingtone] = useState(false);
  const [ringtoneSuccessMsg, setRingtoneSuccessMsg] = useState<string | null>(null);
  const audioStopFnRef = useRef<(() => void) | null>(null);

  const isBn = lang === 'bn';

  // Stop audio helper
  const stopAudio = () => {
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }
    setPlayingRingtoneId(null);
  };

  // Synchronize ringtone fields when contact changes
  useEffect(() => {
    stopAudio();
    setIsEditingRingtone(false);
    setSelectedRingtoneId(contact?.ringtone || 'chime');
    setCustomRingtoneLabel(contact?.ringtoneLabel || '');
    setRingtoneSuccessMsg(null);
  }, [contact?.id]);

  // Clean up any playing audio when unmounting or sheet closes
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Handle preview playback
  const handleTogglePlayPreview = (ringtoneId: string) => {
    if (playingRingtoneId === ringtoneId) {
      stopAudio();
    } else {
      stopAudio();
      setPlayingRingtoneId(ringtoneId);
      audioStopFnRef.current = playIncomingRingtone(ringtoneId);
    }
  };

  // Save custom ringtone label & sound preference to Room DB
  const handleSaveRingtone = async () => {
    if (!contact) return;
    setIsSavingRingtone(true);
    stopAudio();

    try {
      const trimmedLabel = customRingtoneLabel.trim();
      const updated = await roomDbService.updateContactRingtone(
        contact.id,
        trimmedLabel,
        selectedRingtoneId
      );

      if (updated && onUpdateContact) {
        onUpdateContact(updated);
      }

      setRingtoneSuccessMsg(
        isBn
          ? `কাস্টম রিংটোন "${trimmedLabel || 'ডিফল্ট'}" Room ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!`
          : `Custom ringtone "${trimmedLabel || 'Default'}" saved to Room DB!`
      );
      setIsEditingRingtone(false);

      setTimeout(() => {
        setRingtoneSuccessMsg(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to save ringtone preference to Room DB:', err);
    } finally {
      setIsSavingRingtone(false);
    }
  };

  // Reset custom ringtone to default in Room DB
  const handleResetRingtone = async () => {
    if (!contact) return;
    setIsSavingRingtone(true);
    stopAudio();

    try {
      const updated = await roomDbService.clearContactRingtone(contact.id);
      if (updated && onUpdateContact) {
        onUpdateContact(updated);
      }
      setSelectedRingtoneId('chime');
      setCustomRingtoneLabel('');
      setIsEditingRingtone(false);
      setRingtoneSuccessMsg(
        isBn
          ? 'ডিফল্ট সিস্টেম রিংটোনে সফলভাবে রিসেট করা হয়েছে (Room DB আপডেটেড)'
          : 'Reset to default system ringtone (Room DB updated)'
      );
      setTimeout(() => {
        setRingtoneSuccessMsg(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to reset ringtone preference in Room DB:', err);
    } finally {
      setIsSavingRingtone(false);
    }
  };

  // Quick suggestions for ringtone labels
  const quickSuggestions = useMemo(() => {
    return isBn
      ? [
          { label: 'আম্মু ও পরিবার (Family)', ringtoneId: 'flute', icon: '👨‍👩‍👧' },
          { label: 'জরুরি অফিস কল (Work)', ringtoneId: 'vintage', icon: '💼' },
          { label: 'ভিআইপি কলার (VIP)', ringtoneId: 'urgent', icon: '⭐' },
          { label: 'ডাক্তার / চিকিৎসা', ringtoneId: 'urgent', icon: '🩺' },
          { label: 'প্রিয় বন্ধু ও আড্ডা', ringtoneId: 'marimba', icon: '🎵' },
          { label: 'শান্ত সুর / রিল্যাক্স', ringtoneId: 'calm', icon: '🌿' },
        ]
      : [
          { label: 'Family & Loved Ones', ringtoneId: 'flute', icon: '👨‍👩‍👧' },
          { label: 'Work / Office Ring', ringtoneId: 'vintage', icon: '💼' },
          { label: 'VIP Priority Call', ringtoneId: 'urgent', icon: '⭐' },
          { label: 'Doctor / Medical Alert', ringtoneId: 'urgent', icon: '🩺' },
          { label: 'Close Friends', ringtoneId: 'marimba', icon: '🎵' },
          { label: 'Calm & Relax Melody', ringtoneId: 'calm', icon: '🌿' },
        ];
  }, [isBn]);

  const currentPreset = useMemo(() => {
    const activeId = isEditingRingtone ? selectedRingtoneId : contact?.ringtone || 'chime';
    return RINGTONE_PRESETS.find((p) => p.id === activeId) || RINGTONE_PRESETS[0];
  }, [contact?.ringtone, selectedRingtoneId, isEditingRingtone]);

  // Normalize phone digits for resilient history lookup
  const normalizeDigits = (num: string) => num.replace(/[^\d]/g, '');

  const contactHistory = useMemo(() => {
    if (!contact) return [];
    const contactDigits = normalizeDigits(contact.phone);
    return callLogs.filter((log) => {
      const logDigits = normalizeDigits(log.phone);
      return (
        log.phone === contact.phone ||
        logDigits.endsWith(contactDigits.slice(-9)) ||
        contactDigits.endsWith(logDigits.slice(-9))
      );
    });
  }, [contact, callLogs]);

  // Statistics calculation for this specific contact
  const stats = useMemo(() => {
    const totalCalls = contactHistory.length;
    const totalSeconds = contactHistory.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const incomingCount = contactHistory.filter((c) => c.type === 'incoming').length;
    const outgoingCount = contactHistory.filter((c) => c.type === 'outgoing').length;
    const missedCount = contactHistory.filter((c) => c.type === 'missed').length;

    return {
      totalCalls,
      totalSeconds,
      incomingCount,
      outgoingCount,
      missedCount,
    };
  }, [contactHistory]);

  if (!isOpen || !contact) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return isBn ? '০ সেকেন্ড' : '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return isBn ? `${m} মি. ${s} সে.` : `${m}m ${s}s`;
    }
    return isBn ? `${s} সে.` : `${s}s`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return isBn ? `আজ ${timeStr}` : `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return isBn ? `গতকাল ${timeStr}` : `Yesterday, ${timeStr}`;
    }

    const monthNamesBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthStr = isBn ? monthNamesBn[date.getMonth()] : monthNamesEn[date.getMonth()];
    return `${date.getDate()} ${monthStr}, ${timeStr}`;
  };

  return (
    <div
      id="contact-detail-sheet-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="contact-detail-sheet-container"
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl border-t border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[88vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
        </div>

        {/* Top Header Controls */}
        <div className="px-5 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              id="detail-toggle-favorite-btn"
              onClick={() => onToggleFavorite(contact.id)}
              className={`p-2 rounded-xl transition ${
                contact.isFavorite
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800'
              }`}
              title={isBn ? 'প্রিয় তালিকায় যোগ/বাদ' : 'Toggle Favorite'}
            >
              <Star className={`w-4 h-4 ${contact.isFavorite ? 'fill-current' : ''}`} />
            </button>
            {contact.tag && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {contact.tag}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              id="detail-edit-contact-btn"
              onClick={() => {
                onEditContact(contact);
                onClose();
              }}
              className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title={isBn ? 'সম্পাদনা করুন' : 'Edit Contact'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              id="detail-delete-contact-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title={isBn ? 'মুছে ফেলুন' : 'Delete Contact'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              id="detail-close-sheet-btn"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-5 pb-6 overflow-y-auto space-y-4 flex-1">
          {/* Delete Confirmation Alert if active */}
          {showDeleteConfirm && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {isBn ? 'কন্টাক্টটি মুছে ফেলতে চান?' : 'Delete this contact?'}
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    {isBn
                      ? `"${contact.name}" আপনার কন্টাক্ট তালিকা এবং ডিভাইস থেকে চিরতরে মুছে যাবে।`
                      : `"${contact.name}" will be removed from your contacts list permanently.`}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    onDeleteContact(contact.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition"
                >
                  {isBn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Contact Identity Banner */}
          <div className="flex flex-col items-center text-center pt-1 pb-2">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-900/20 border-2 border-white dark:border-neutral-800 mb-3">
              {contact.name.charAt(0)}
            </div>

            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {contact.name}
            </h2>

            {contact.nameEn && contact.nameEn !== contact.name && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {contact.nameEn}
              </p>
            )}

            {contact.company && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>{contact.company}</span>
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl">
                {contact.phone}
              </span>
              <button
                onClick={handleCopyPhone}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title={isBn ? 'নম্বর কপি করুন' : 'Copy phone number'}
              >
                {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Primary Actions Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {/* Real SIM Call Button */}
            <button
              id="detail-real-call-btn"
              onClick={() => {
                onInitiateCall(contact.phone, contact.name, 'real');
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100/80 transition group active:scale-95 shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm mb-1 group-hover:scale-105 transition">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold">{isBn ? 'রিয়েল কল' : 'Real Call'}</span>
            </button>

            {/* In-App Calling Screen Button */}
            <button
              id="detail-inapp-call-btn"
              onClick={() => {
                onInitiateCall(contact.phone, contact.name, 'simulated');
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800/60 hover:bg-cyan-100/80 transition group active:scale-95 shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm mb-1 group-hover:scale-105 transition">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold">{isBn ? 'ইন-অ্যাপ' : 'In-App'}</span>
            </button>

            {/* SMS Message Button */}
            <a
              id="detail-sms-btn"
              href={`sms:${contact.phone}`}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 hover:bg-blue-100/80 transition group active:scale-95 shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm mb-1 group-hover:scale-105 transition">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold">{isBn ? 'মেসেজ' : 'Message'}</span>
            </a>

            {/* Email Button (or Edit if no email) */}
            {contact.email ? (
              <a
                id="detail-email-btn"
                href={`mailto:${contact.email}`}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 hover:bg-indigo-100/80 transition group active:scale-95 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm mb-1 group-hover:scale-105 transition">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">{isBn ? 'ইমেইল' : 'Email'}</span>
              </a>
            ) : (
              <button
                id="detail-edit-alt-btn"
                onClick={() => {
                  onEditContact(contact);
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 transition group active:scale-95 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-sm mb-1 group-hover:scale-105 transition">
                  <Edit3 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">{isBn ? 'এডিট' : 'Edit'}</span>
              </button>
            )}
          </div>

          {/* Contact Details Card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-3.5 space-y-2 text-xs">
            <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {isBn ? 'যোগাযোগ ও স্টোরেজ তথ্য' : 'Contact & Storage Information'}
            </h3>

            {/* Storage Location (SIM or Device) */}
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/50">
              <div className="flex items-center gap-2 text-neutral-500">
                {contact.storageLocation === 'sim1' || contact.storageLocation === 'sim2' ? (
                  <SimCard className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className="text-[11px]">{isBn ? 'সংরক্ষিত আছে' : 'Storage Location'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {contact.storageLocation === 'sim1' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <SimCard className="w-2.5 h-2.5" />
                    {isBn ? 'সিম ১ (গ্রামীণফোন)' : 'SIM 1 (GP)'}
                  </span>
                )}
                {contact.storageLocation === 'sim2' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                    <SimCard className="w-2.5 h-2.5" />
                    {isBn ? 'সিম ২ (বাংলালিংক)' : 'SIM 2 (BL)'}
                  </span>
                )}
                {(!contact.storageLocation || contact.storageLocation === 'device') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                    <Smartphone className="w-2.5 h-2.5" />
                    {isBn ? 'ফোন মেমোরি' : 'Device Storage'}
                  </span>
                )}
              </div>
            </div>

            {/* Email Field */}
            {contact.email && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/50">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{isBn ? 'ইমেইল' : 'Email'}</span>
                </div>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium text-[11px]"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {/* Company Field */}
            {contact.company && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/50">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{isBn ? 'প্রতিষ্ঠান' : 'Company'}</span>
                </div>
                <span className="text-neutral-800 dark:text-neutral-200 font-medium text-[11px]">
                  {contact.company}
                </span>
              </div>
            )}

            {/* Tag / Relation */}
            {contact.tag && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/50">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{isBn ? 'শ্রেণী' : 'Category'}</span>
                </div>
                <span className="text-neutral-800 dark:text-neutral-200 font-medium text-[11px]">
                  {contact.tag}
                </span>
              </div>
            )}

            {/* Note Field */}
            {contact.note && (
              <div className="pt-1">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">{isBn ? 'নোট / মন্তব্য' : 'Note'}</span>
                </div>
                <p className="text-[11px] text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {contact.note}
                </p>
              </div>
            )}
          </div>

          {/* CUSTOM RINGTONE & AUDIO LABEL SECTION (Room DB Stored) */}
          <div
            id="custom-ringtone-section"
            className="rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/70 via-indigo-50/20 to-white dark:from-purple-950/25 dark:via-neutral-900 dark:to-neutral-900 p-3.5 space-y-3 shadow-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-600 text-white shadow-xs">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>{isBn ? 'কাস্টম রিংটোন ও লেবেল' : 'Custom Ringtone & Label'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                      Room DB
                    </span>
                  </h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {isBn
                      ? 'এই নির্দিষ্ট কন্টাক্টের ইনকামিং কলের জন্য কাস্টম অডিও লেবেল'
                      : 'Dedicated ringtone label stored in local Room database'}
                  </p>
                </div>
              </div>

              {!isEditingRingtone && (
                <button
                  id="edit-ringtone-toggle-btn"
                  onClick={() => setIsEditingRingtone(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>
                    {contact.ringtoneLabel || contact.ringtone
                      ? isBn
                        ? 'পরিবর্তন'
                        : 'Edit'
                      : isBn
                      ? 'বরাদ্দ করুন'
                      : 'Assign'}
                  </span>
                </button>
              )}
            </div>

            {/* Room DB Success Notice */}
            {ringtoneSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-[11px] leading-tight">{ringtoneSuccessMsg}</span>
              </div>
            )}

            {/* View Mode (when not editing) */}
            {!isEditingRingtone ? (
              <div className="space-y-2">
                {contact.ringtoneLabel || contact.ringtone ? (
                  <div className="p-3 rounded-xl bg-white/95 dark:bg-neutral-800/95 border border-purple-100 dark:border-purple-900/40 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            🎵 {contact.ringtoneLabel || (isBn ? 'কাস্টম রিংটোন' : 'Custom Tune')}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-semibold">
                            {isBn ? 'সক্রিয়' : 'Active'}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          <span>{currentPreset?.icon || '🔔'}</span>
                          <span>{isBn ? currentPreset?.nameBn : currentPreset?.nameEn}</span>
                          <span className="text-neutral-300 dark:text-neutral-600">•</span>
                          <span className="font-mono text-[9px] text-purple-600 dark:text-purple-400">
                            Room SQLite: contacts.ringtoneLabel
                          </span>
                        </p>
                      </div>

                      {/* Preview Sound Button */}
                      <button
                        id="play-active-ringtone-preview-btn"
                        type="button"
                        onClick={() => handleTogglePlayPreview(contact.ringtone || 'chime')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          playingRingtoneId === (contact.ringtone || 'chime')
                            ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {playingRingtoneId === (contact.ringtone || 'chime') ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>{isBn ? 'সুর থামান' : 'Stop'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isBn ? 'সুর শুনুন' : 'Preview'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Equalizer Waveform Indicator When Playing */}
                    {playingRingtoneId === (contact.ringtone || 'chime') && (
                      <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[10px] text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                        <Volume2 className="w-3.5 h-3.5 animate-bounce shrink-0 text-purple-600" />
                        <span className="font-medium">
                          {isBn ? 'রিংটোন সিন্থেসাইজার প্রিভিউ বাজছে...' : 'Audio synthesizer preview playing...'}
                        </span>
                        <div className="flex items-center gap-0.5 ml-auto">
                          <span className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" />
                          <span className="w-1 h-4 bg-purple-600 rounded-full animate-pulse delay-75" />
                          <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse delay-150" />
                          <span className="w-1 h-5 bg-purple-600 rounded-full animate-pulse" />
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[10px] border-t border-neutral-100 dark:border-neutral-700/50">
                      <span className="text-neutral-400">
                        {isBn ? 'ইনকামিং কল আসলে এই কাস্টম সুর ও লেবেল বাজবে' : 'Plays whenever this contact calls'}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetRingtone}
                        disabled={isSavingRingtone}
                        className="text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 transition flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isBn ? 'ডিফল্ট সুরে ফেরত' : 'Reset to Default'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        <BellRing className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{isBn ? 'ডিফল্ট সিস্টেম রিংটোন সক্রিয়' : 'Default System Ringtone Active'}</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {isBn
                          ? 'এই নম্বরের জন্য এখনো কোনো কাস্টম রিংটোন লেবেল বরাদ্দ করা হয়নি।'
                          : 'No custom ringtone label assigned yet.'}
                      </p>
                    </div>
                    <button
                      id="assign-ringtone-empty-btn"
                      type="button"
                      onClick={() => setIsEditingRingtone(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isBn ? 'লেবেল দিন' : 'Assign Label'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Edit Mode: Assignment & Customization Form */
              <div className="space-y-3 p-3 rounded-xl bg-white dark:bg-neutral-800/95 border border-purple-200 dark:border-purple-800 animate-fadeIn">
                {/* 1. Custom Ringtone Label Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>{isBn ? 'রিংটোন লেবেল (Custom Ringtone Label):' : 'Ringtone Label Name:'}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                      {isBn ? 'Room DB-তে স্টোর হবে' : 'Stored in Room DB'}
                    </span>
                  </label>
                  <input
                    id="custom-ringtone-label-input"
                    type="text"
                    value={customRingtoneLabel}
                    onChange={(e) => setCustomRingtoneLabel(e.target.value)}
                    placeholder={
                      isBn
                        ? 'যেমন: "আম্মুর জন্য বিশেষ টিউন", "জরুরি অফিস", "VIP Caller"...'
                        : 'e.g. "Mom Special Ringtone", "Urgent Office Call", "VIP Contact"...'
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {isBn ? 'দ্রুত লেবেল নির্বাচন (Quick Suggestion Chips):' : 'Quick Label Suggestions:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickSuggestions.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setCustomRingtoneLabel(item.label);
                          if (item.ringtoneId) setSelectedRingtoneId(item.ringtoneId);
                        }}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                          customRingtoneLabel === item.label
                            ? 'bg-purple-600 text-white border-purple-600 font-bold'
                            : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Ringtone Sound Selector with Play/Stop Preview */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
                    {isBn ? 'রিংটোন সুর ও প্রিভিউ (Select Melody & Audio Preview):' : 'Ringtone Sound & Preview:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {RINGTONE_PRESETS.map((preset) => {
                      const isSelected = selectedRingtoneId === preset.id;
                      const isPlaying = playingRingtoneId === preset.id;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => setSelectedRingtoneId(preset.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-1 ring-purple-400'
                              : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{preset.icon}</span>
                            <div className="truncate">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {isBn ? preset.nameBn : preset.nameEn}
                              </p>
                              <p className="text-[9px] text-neutral-400 truncate">
                                {isBn ? preset.defaultLabelBn : preset.defaultLabelEn}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlayPreview(preset.id);
                            }}
                            className={`p-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                              isPlaying
                                ? 'bg-rose-500 text-white animate-pulse'
                                : isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300'
                            }`}
                            title={isPlaying ? 'Stop' : 'Play preview'}
                          >
                            {isPlaying ? (
                              <Square className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      stopAudio();
                      setIsEditingRingtone(false);
                      setSelectedRingtoneId(contact.ringtone || 'chime');
                      setCustomRingtoneLabel(contact.ringtoneLabel || '');
                    }}
                    className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    id="save-ringtone-pref-btn"
                    type="button"
                    disabled={isSavingRingtone}
                    onClick={handleSaveRingtone}
                    className="flex-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {isSavingRingtone
                        ? isBn
                          ? 'সংরক্ষণ হচ্ছে...'
                          : 'Saving...'
                        : isBn
                        ? '💾 Room ডাটাবেজে সংরক্ষণ'
                        : 'Save to Room DB'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Call History With This Contact */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'কল ইতিহাস (Call History)' : 'Call History'}
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-600 dark:text-neutral-300">
                {stats.totalCalls} {isBn ? 'টি কল' : 'calls'}
              </span>
            </div>

            {/* Call History Mini Summary Bar */}
            {stats.totalCalls > 0 && (
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-center">
                <div>
                  <p className="text-[10px] text-neutral-500">{isBn ? 'আউটগোয়িং' : 'Outgoing'}</p>
                  <p className="text-xs font-bold text-emerald-600">{stats.outgoingCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500">{isBn ? 'ইনকামিং' : 'Incoming'}</p>
                  <p className="text-xs font-bold text-blue-600">{stats.incomingCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500">{isBn ? 'মিসড কল' : 'Missed'}</p>
                  <p className="text-xs font-bold text-rose-500">{stats.missedCount}</p>
                </div>
              </div>
            )}

            {/* Call Logs List */}
            {contactHistory.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {contactHistory.map((log) => {
                  const isOutgoing = log.type === 'outgoing';
                  const isIncoming = log.type === 'incoming';
                  const isMissed = log.type === 'missed';

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/40 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isOutgoing
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : isIncoming
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {isOutgoing && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {isIncoming && <ArrowDownLeft className="w-3.5 h-3.5" />}
                          {isMissed && <PhoneMissed className="w-3.5 h-3.5" />}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {isOutgoing
                              ? isBn ? 'আউটগোয়িং কল' : 'Outgoing Call'
                              : isIncoming
                              ? isBn ? 'ইনকামিং কল' : 'Incoming Call'
                              : isBn ? 'মিসড কল' : 'Missed Call'}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {formatRelativeTime(log.timestamp)}
                          </p>
                          {log.note && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded mt-0.5 truncate max-w-[170px] border border-amber-200/50 dark:border-amber-900/30">
                              📝 {log.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                          {isMissed ? (
                            <span className="text-rose-500 font-sans text-[10px]">
                              {isBn ? 'উত্তর মেলেনি' : 'No Answer'}
                            </span>
                          ) : (
                            formatDuration(log.duration)
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-1.5 bg-neutral-50/40 dark:bg-neutral-800/20">
                <Clock className="w-6 h-6 text-neutral-400 mx-auto" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isBn ? 'কোনো পূর্ববর্তী কল ইতিহাস নেই' : 'No call history with this contact'}
                </p>
                <p className="text-[10px] text-neutral-500 max-w-xs mx-auto">
                  {isBn
                    ? 'উপরের কল বাটনে ট্যাপ করে এই ব্যক্তির সাথে প্রথম কল শুরু করুন।'
                    : 'Tap the call button above to initiate your first call.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
