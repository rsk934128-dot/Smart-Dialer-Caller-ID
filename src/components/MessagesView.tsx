import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  ArrowLeft,
  Phone,
  CardSim as SimCard,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Trash2,
  Lock,
  Clock,
  CheckCheck,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { SmsMessage, SmsThread, Contact } from '../types';
import { smsService } from '../services/smsService';
import { roomDbService } from '../db/roomDatabaseService';
import { callPermissionService } from '../services/callPermissionService';
import { Language } from '../utils/i18n';

interface MessagesViewProps {
  lang: Language;
  contacts: Contact[];
  onInitiateCall: (phone: string, name: string) => void;
  onOpenPermissionModal: () => void;
  initialThreadPhone?: string | null;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  lang,
  contacts,
  onInitiateCall,
  onOpenPermissionModal,
  initialThreadPhone,
}) => {
  const isBn = lang === 'bn';

  // State
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SmsThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<SmsMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'otp' | 'personal' | 'spam'>('all');
  const [replyText, setReplyText] = useState('');
  const [sendSimSlot, setSendSimSlot] = useState<1 | 2>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [customSimSender, setCustomSimSender] = useState('Google');
  const [customSimBody, setCustomSimBody] = useState('G-998812 is your verification code.');
  const [customSimSlot, setCustomSimSlot] = useState<1 | 2>(1);

  // Permissions state
  const [hasSmsRole, setHasSmsRole] = useState(callPermissionService.isDefaultSms());

  // Load threads
  const loadThreads = async () => {
    try {
      const data = await roomDbService.messages.getThreads();
      setThreads(data);

      if (selectedThread) {
        const msgs = await roomDbService.messages.getByThreadPhone(selectedThread.contactPhone);
        setThreadMessages(msgs);
      }
    } catch (err) {
      console.error('Failed to load SMS threads:', err);
    }
  };

  useEffect(() => {
    loadThreads();

    const unsubscribePerms = callPermissionService.subscribe(() => {
      setHasSmsRole(callPermissionService.isDefaultSms());
    });

    const unsubscribeSms = smsService.onIncomingSms(() => {
      loadThreads();
    });

    const unsubscribeRoom = roomDbService.subscribe(() => {
      loadThreads();
    });

    return () => {
      unsubscribePerms();
      unsubscribeSms();
      unsubscribeRoom();
    };
  }, [selectedThread?.contactPhone]);

  // Open initial thread if requested
  useEffect(() => {
    if (initialThreadPhone && threads.length > 0) {
      const match = threads.find((t) => t.contactPhone === initialThreadPhone);
      if (match) {
        handleOpenThread(match);
      } else {
        // Create an empty transient thread
        const tempThread: SmsThread = {
          threadId: initialThreadPhone,
          contactPhone: initialThreadPhone,
          contactName: contacts.find((c) => c.phone === initialThreadPhone)?.name,
          simSlot: 1,
          unreadCount: 0,
          totalMessages: 0,
          lastMessage: {
            id: 'temp',
            senderPhone: initialThreadPhone,
            recipientPhone: '+880 1711-000111',
            body: '',
            timestamp: Date.now(),
            type: 'inbox',
            status: 'read',
            simSlot: 1,
          },
        };
        handleOpenThread(tempThread);
      }
    }
  }, [initialThreadPhone, threads.length]);

  const handleOpenThread = async (thread: SmsThread) => {
    setSelectedThread(thread);
    const msgs = await roomDbService.messages.getByThreadPhone(thread.contactPhone);
    setThreadMessages(msgs);
    // Mark as read in Room DB
    await roomDbService.messages.markThreadRead(thread.contactPhone);
    loadThreads();
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    const text = replyText.trim();
    setReplyText('');

    await smsService.sendSms(
      selectedThread.contactPhone,
      text,
      sendSimSlot,
      selectedThread.contactName
    );

    // Refresh active messages
    const msgs = await roomDbService.messages.getByThreadPhone(selectedThread.contactPhone);
    setThreadMessages(msgs);
    loadThreads();
  };

  const handleSendNewMessage = async () => {
    if (!newRecipient.trim() || !newMessageText.trim()) return;
    const recipient = newRecipient.trim();
    const text = newMessageText.trim();

    // Check contact name
    const contact = contacts.find((c) => c.phone.includes(recipient) || recipient.includes(c.phone));
    const name = contact ? contact.name : undefined;

    await smsService.sendSms(recipient, text, sendSimSlot, name);
    setIsNewMessageOpen(false);
    setNewRecipient('');
    setNewMessageText('');

    // Open that thread
    const msgs = await roomDbService.messages.getByThreadPhone(recipient);
    const thread: SmsThread = {
      threadId: recipient,
      contactPhone: recipient,
      contactName: name,
      simSlot: sendSimSlot,
      unreadCount: 0,
      totalMessages: msgs.length,
      lastMessage: msgs[msgs.length - 1],
    };
    handleOpenThread(thread);
  };

  const handleDeleteThread = async (threadPhone: string) => {
    if (confirm(isBn ? 'আপনি কি এই মেসেজ থ্রেডটি মুছে ফেলতে চান?' : 'Delete this message thread?')) {
      await roomDbService.messages.deleteThread(threadPhone);
      setSelectedThread(null);
      setThreadMessages([]);
      loadThreads();
    }
  };

  const handleCopyOtp = (otp: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(otp);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleTriggerSimulation = async (preset: {
    sender: string;
    senderName: string;
    body: string;
    simSlot: 1 | 2;
    isSpam?: boolean;
  }) => {
    setIsSimulatorOpen(false);
    await smsService.receiveIncomingSms({
      senderPhone: preset.sender,
      senderName: preset.senderName,
      body: preset.body,
      simSlot: preset.simSlot,
      isSpam: preset.isSpam,
    });
    loadThreads();
  };

  // Filter threads
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // Search
      const matchesSearch =
        t.contactPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.contactName && t.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.lastMessage.body.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (categoryFilter === 'otp') {
        return t.lastMessage.isOtp;
      }
      if (categoryFilter === 'spam') {
        return t.lastMessage.isSpam;
      }
      if (categoryFilter === 'personal') {
        return !t.lastMessage.isOtp && !t.lastMessage.isSpam;
      }
      return true;
    });
  }, [threads, searchQuery, categoryFilter]);

  const simulationPresets = smsService.getSimulationPresets();

  // Helper date formatter
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div id="messages-component" className="flex flex-col h-full bg-white dark:bg-neutral-900 overflow-hidden">
      {/* ================= THREAD CHAT VIEW ================= */}
      {selectedThread ? (
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/90 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                id="back-to-threads-btn"
                onClick={() => {
                  setSelectedThread(null);
                  loadThreads();
                }}
                className="p-1.5 -ml-1 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {(selectedThread.contactName || selectedThread.contactPhone).charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {selectedThread.contactName || selectedThread.contactPhone}
                  </p>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      selectedThread.simSlot === 2
                        ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <SimCard className="w-2.5 h-2.5" />
                    {selectedThread.simSlot === 2 ? 'SIM 2' : 'SIM 1'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                  {selectedThread.contactPhone}
                </p>
              </div>
            </div>

            {/* Chat Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                id="call-thread-contact-btn"
                onClick={() =>
                  onInitiateCall(
                    selectedThread.contactPhone,
                    selectedThread.contactName || selectedThread.contactPhone
                  )
                }
                className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                title={isBn ? 'সরাসরি কল করুন' : 'Call'}
              >
                <Phone className="w-4 h-4 fill-current" />
              </button>

              <button
                id="delete-thread-btn"
                onClick={() => handleDeleteThread(selectedThread.contactPhone)}
                className="p-2 rounded-full text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title={isBn ? 'থ্রেড মুছুন' : 'Delete thread'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Offline RoomDB Indicator Strip */}
          <div className="px-4 py-1 bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isBn ? 'রিয়েল-টাইম অফলাইন এসএমএস • লোকাল রোম ডেটাবেজ' : 'Offline Room DB • Real-Time SMS'}</span>
            </div>
            <span className="font-mono text-[10px]">
              {threadMessages.length} {isBn ? 'মেসেজ' : 'msgs'}
            </span>
          </div>

          {/* Messages Bubble History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadMessages.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{isBn ? 'কোনো মেসেজ নেই। নিচে টাইপ করে পাঠান।' : 'No messages yet. Send a message below.'}</p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isSent = msg.type === 'sent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSent ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isSent
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : msg.isSpam
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-bl-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-xs'
                      }`}
                    >
                      {/* OTP Banner inside bubble if present */}
                      {msg.isOtp && msg.otpCode && (
                        <div className="mb-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{isBn ? 'ওটিপি:' : 'OTP:'}</span>
                            <span className="text-sm tracking-wider">{msg.otpCode}</span>
                          </div>
                          <button
                            onClick={() => handleCopyOtp(msg.otpCode!, msg.id)}
                            className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-500 transition"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>{isBn ? 'কপি!' : 'Copied'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{isBn ? 'কপি' : 'Copy'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Spam badge */}
                      {msg.isSpam && (
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{isBn ? 'সন্দেহজনক স্প্যাম মেসেজ' : 'Suspicious Spam Message'}</span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.body}</p>

                      {/* Metadata row */}
                      <div
                        className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
                          isSent ? 'text-emerald-100' : 'text-neutral-400'
                        }`}
                      >
                        <span className="font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isSent && (
                          <span>
                            {msg.status === 'sending' ? (
                              <Clock className="w-3 h-3 inline text-emerald-200" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 inline text-emerald-200" />
                            )}
                          </span>
                        )}
                        <span className="opacity-75">
                          {msg.simSlot === 2 ? 'SIM 2' : 'SIM 1'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Reply Chips */}
          <div className="px-3 py-1.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {[
              isBn ? 'ঠিক আছে' : 'OK',
              isBn ? 'আমি রাস্তায় আছি' : 'On my way',
              isBn ? 'একটু পরে কল দিচ্ছি' : 'Call you later',
              isBn ? 'ধন্যবাদ!' : 'Thank you!',
              isBn ? 'কোথায় আছো?' : 'Where are you?',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => setReplyText((prev) => (prev ? `${prev} ${chip}` : chip))}
                className="px-2.5 py-1 rounded-xl text-[11px] bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 whitespace-nowrap hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Bottom Send Box */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2">
            {/* SIM Slot Toggle */}
            <button
              id="chat-sim-toggle-btn"
              type="button"
              onClick={() => setSendSimSlot((prev) => (prev === 1 ? 2 : 1))}
              className={`px-2 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 ${
                sendSimSlot === 1
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
              }`}
              title={isBn ? 'সিম পরিবর্তন করুন' : 'Change SIM'}
            >
              <SimCard className="w-3.5 h-3.5" />
              <span>{sendSimSlot === 1 ? (isBn ? 'সিম ১ (GP)' : 'SIM 1') : isBn ? 'সিম ২ (BL)' : 'SIM 2'}</span>
            </button>

            {/* Input field */}
            <input
              id="chat-reply-input"
              type="text"
              placeholder={isBn ? 'টেক্সট মেসেজ লিখুন...' : 'Text message...'}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            {/* Send Button */}
            <button
              id="chat-send-btn"
              type="button"
              disabled={!replyText.trim()}
              onClick={handleSendReply}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center transition shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ================= THREADS LIST VIEW ================= */
        <div className="flex flex-col h-full">
          {/* Top Bar: Google Messages Default Role Status */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {isBn ? 'মেসেজ (Google Messages)' : 'Messages'}
                    </h2>
                    {hasSmsRole ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {isBn ? 'ডিফল্ট সক্রিয়' : 'Default SMS'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {isBn ? 'পারমিশন প্রয়োজন' : 'Permission needed'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {isBn
                      ? 'অফলাইনে রিয়েল-টাইমে মেসেজ রিসিভ ও সেন্ড'
                      : 'Real-time offline SMS reception & sending'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Simulator & New Message */}
              <div className="flex items-center gap-1.5">
                <button
                  id="open-sms-simulator-btn"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1 hover:bg-blue-100 transition shadow-2xs active:scale-95"
                  title={isBn ? 'টেস্ট মেসেজ রিসিভ করুন' : 'Simulate incoming SMS'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">{isBn ? 'টেস্ট মেসেজ' : 'Simulate'}</span>
                </button>

                <button
                  id="open-permission-modal-from-sms"
                  onClick={onOpenPermissionModal}
                  className="p-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition"
                  title={isBn ? 'মেসেজ পারমিশন' : 'SMS Permissions'}
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  id="new-sms-btn"
                  onClick={() => setIsNewMessageOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নতুন' : 'New'}</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="search-messages-input"
                type="text"
                placeholder={isBn ? 'মেসেজ বা নম্বর খুঁজুন...' : 'Search messages or contacts...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  categoryFilter === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {isBn ? 'সকল' : 'All'} ({threads.length})
              </button>

              <button
                onClick={() => setCategoryFilter('otp')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                  categoryFilter === 'otp'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>{isBn ? 'ওটিপি কোড' : 'OTPs'}</span>
              </button>

              <button
                onClick={() => setCategoryFilter('personal')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                  categoryFilter === 'personal'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>{isBn ? 'ব্যক্তিগত' : 'Personal'}</span>
              </button>

              <button
                onClick={() => setCategoryFilter('spam')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                  categoryFilter === 'spam'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>{isBn ? 'স্প্যাম' : 'Spam'}</span>
              </button>
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 text-sm space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
                <p>{isBn ? 'কোনো মেসেজ পাওয়া যায়নি' : 'No messages found'}</p>
                <button
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-xs font-semibold"
                >
                  {isBn ? 'একটি টেস্ট মেসেজ রিসিভ করুন' : 'Simulate incoming test SMS'}
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const hasUnread = thread.unreadCount > 0;
                return (
                  <div
                    key={thread.threadId}
                    id={`sms-thread-${thread.threadId}`}
                    onClick={() => handleOpenThread(thread)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition ${
                      hasUnread ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                        thread.lastMessage.isSpam
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : thread.lastMessage.isOtp
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      {thread.lastMessage.isSpam ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : thread.lastMessage.isOtp ? (
                        <Lock className="w-5 h-5" />
                      ) : (
                        (thread.contactName || thread.contactPhone).charAt(0)
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className={`text-xs truncate ${
                              hasUnread
                                ? 'font-bold text-neutral-900 dark:text-neutral-100'
                                : 'font-semibold text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {thread.contactName || thread.contactPhone}
                          </p>
                          <span
                            className={`inline-flex items-center gap-0.5 px-1 py-0.1 rounded text-[8px] font-bold ${
                              thread.simSlot === 2
                                ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            <SimCard className="w-2 h-2" />
                            {thread.simSlot === 2 ? 'SIM 2' : 'SIM 1'}
                          </span>
                        </div>

                        <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                          {formatTime(thread.lastMessage.timestamp)}
                        </span>
                      </div>

                      {/* Snippet */}
                      <p
                        className={`text-xs line-clamp-1 ${
                          hasUnread
                            ? 'font-medium text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {thread.lastMessage.body}
                      </p>

                      {/* Badges / Chips under message */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {thread.lastMessage.isOtp && thread.lastMessage.otpCode && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            OTP: {thread.lastMessage.otpCode}
                          </span>
                        )}
                        {thread.lastMessage.isSpam && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                            {isBn ? 'স্প্যাম' : 'Spam'}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white ml-auto">
                            {thread.unreadCount} {isBn ? 'নতুন' : 'new'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= REAL-TIME INCOMING SMS SIMULATOR MODAL ================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'রিয়েল-টাইম অফলাইন মেসেজ টেস্ট' : 'Simulate Real-Time Incoming SMS'}
                </h3>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isBn
                ? 'যেকোনো একটি প্রিসেট ট্যাপ করুন। এটি ইন্টারনেটের সাহায্য ছাড়াই সঙ্গে সঙ্গে রিয়েল-টাইমে মেসেজ হিসেবে রিসিভ হবে এবং স্ক্রিনের উপরে নোটিফিকেশন ব্যানার ভেসে উঠবে।'
                : 'Tap any preset below. It will be received in real time completely offline with top banner and sound alert.'}
            </p>

            {/* Presets Grid */}
            <div className="space-y-2">
              {simulationPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriggerSimulation(preset)}
                  className="w-full text-left p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600">
                      {preset.titleBn}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {preset.sender}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                    {preset.body}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom SMS Injection */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isBn ? 'কাস্টম মেসেজ ইনপুট:' : 'Custom SMS:'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="প্রেরক / Sender"
                  value={customSimSender}
                  onChange={(e) => setCustomSimSender(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                />
                <select
                  value={customSimSlot}
                  onChange={(e) => setCustomSimSlot(Number(e.target.value) as 1 | 2)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value={1}>{isBn ? 'সিম ১ (GP)' : 'SIM 1 (GP)'}</option>
                  <option value={2}>{isBn ? 'সিম ২ (BL)' : 'SIM 2 (BL)'}</option>
                </select>
              </div>

              <textarea
                rows={2}
                placeholder="মেসেজের বডি / Message body..."
                value={customSimBody}
                onChange={(e) => setCustomSimBody(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
              />

              <button
                onClick={() =>
                  handleTriggerSimulation({
                    sender: customSimSender || 'Google',
                    senderName: customSimSender,
                    body: customSimBody || 'Test SMS',
                    simSlot: customSimSlot,
                  })
                }
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                {isBn ? 'মেসেজটি এখন রিসিভ করুন (Receive Now)' : 'Receive SMS Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NEW MESSAGE MODAL ================= */}
      {isNewMessageOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'নতুন মেসেজ পাঠান' : 'New SMS Message'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewMessageOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {/* Recipient Picker */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                {isBn ? 'প্রাপক (নম্বর বা নাম)' : 'Recipient (Number or Contact)'}
              </label>
              <input
                id="new-sms-recipient-input"
                type="text"
                placeholder={isBn ? '+880 17... অথবা নাম' : '+880 17... or name'}
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
              />

              {/* Quick Contacts Suggestion Chips */}
              <div className="mt-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {contacts.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewRecipient(c.phone)}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-emerald-100 transition whitespace-nowrap"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SIM Selection */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                {isBn ? 'প্রেরণকারী সিম (Send Via)' : 'Send Via SIM'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSendSimSlot(1)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    sendSimSlot === 1
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <SimCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBn ? 'সিম ১ (Grameenphone)' : 'SIM 1 (GP)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSendSimSlot(2)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    sendSimSlot === 2
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <SimCard className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isBn ? 'সিম ২ (Banglalink)' : 'SIM 2 (BL)'}</span>
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                {isBn ? 'মেসেজ' : 'Message'}
              </label>
              <textarea
                rows={3}
                placeholder={isBn ? 'এখানে মেসেজ লিখুন...' : 'Write message here...'}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                <span>{isBn ? 'অফলাইন রোম ডেটাবেজে সংরক্ষিত হবে' : 'Saved to offline Room DB'}</span>
                <span>{newMessageText.length}/160</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewMessageOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!newRecipient.trim() || !newMessageText.trim()}
                onClick={handleSendNewMessage}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isBn ? 'সেন্ড করুন' : 'Send SMS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
