import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Contact, CallLog } from '../types';
import { Language } from '../utils/i18n';
import { callPermissionService } from '../services/callPermissionService';

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
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isBn = lang === 'bn';

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
