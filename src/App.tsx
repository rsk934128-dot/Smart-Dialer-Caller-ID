import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Clock,
  Users,
  Shield,
  BookOpen,
  Phone,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import {
  Contact,
  CallLog,
  CallerIdRecord,
  ActiveCall,
  AppTab,
  IncomingCallUIMode,
} from './types';
import {
  INITIAL_CONTACTS,
  INITIAL_CALL_LOGS,
  lookupCallerId,
} from './data/mockData';
import { Language, TRANSLATIONS } from './utils/i18n';
import {
  playRingbackTone,
  playIncomingRingtone,
  playCallEndedTone,
} from './utils/sound';
import { roomDbService } from './db/roomDatabaseService';

import { Header } from './components/Header';
import { Keypad } from './components/Keypad';
import { CallLogs } from './components/CallLogs';
import { ContactsView } from './components/ContactsView';
import { CallerIdLookup } from './components/CallerIdLookup';
import { CallStatsDashboard } from './components/CallStatsDashboard';
import { AndroidGuide } from './components/AndroidGuide';
import { ActiveCallModal } from './components/ActiveCallModal';
import { FloatingCallerIdOverlay } from './components/FloatingCallerIdOverlay';
import { AuthModal } from './components/AuthModal';
import { cloudSyncService, CloudSyncStatus } from './services/cloudSyncService';
import { DefaultCallPermissionModal } from './components/DefaultCallPermissionModal';
import { DefaultCallPermissionBanner } from './components/DefaultCallPermissionBanner';
import { MessagesView } from './components/MessagesView';
import { IncomingSmsBanner } from './components/IncomingSmsBanner';
import { callPermissionService } from './services/callPermissionService';
import { smsService } from './services/smsService';

export default function App() {
  // Localization
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('smart_dialer_lang') as Language) || 'bn';
  });

  const t = TRANSLATIONS[lang];

  // Cloud & Authentication State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => cloudSyncService.getStatus());

  // Default Call App Permissions State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [isDefaultDialer, setIsDefaultDialer] = useState<boolean>(() => callPermissionService.isDefault());
  const [realCallToast, setRealCallToast] = useState<{ show: boolean; phone: string; name?: string } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<AppTab>('keypad');

  // SMS State
  const [activeSmsThreadPhone, setActiveSmsThreadPhone] = useState<string | null>(null);
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(0);

  useEffect(() => {
    const updateUnread = async () => {
      try {
        const count = await roomDbService.messages.getUnreadCount();
        setUnreadSmsCount(count);
      } catch (e) {
        console.error('Failed to get unread SMS count', e);
      }
    };
    updateUnread();
    const unsub = smsService.onIncomingSms(() => {
      updateUnread();
    });
    return () => {
      unsub();
    };
  }, []);

  // Persistence State
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('smart_dialer_contacts');
      if (!saved) return INITIAL_CONTACTS;
      const parsed: Contact[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map((c) => c.id));
      const merged = parsed.map((c) => {
        const init = INITIAL_CONTACTS.find((ic) => ic.id === c.id);
        if (init && !c.nameEn) {
          return { ...c, nameEn: init.nameEn };
        }
        return c;
      });
      for (const init of INITIAL_CONTACTS) {
        if (!existingIds.has(init.id)) {
          merged.push(init);
        }
      }
      return merged;
    } catch {
      return INITIAL_CONTACTS;
    }
  });

  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    try {
      const saved = localStorage.getItem('smart_dialer_call_logs');
      return saved ? JSON.parse(saved) : INITIAL_CALL_LOGS;
    } catch {
      return INITIAL_CALL_LOGS;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('smart_dialer_sound');
    return saved !== null ? saved === 'true' : true;
  });

  // Active Calling State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isSilenced, setIsSilenced] = useState<boolean>(false);
  const [blockedPhones, setBlockedPhones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_dialer_blocked');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Audio stop ref
  const audioStopFnRef = useRef<(() => void) | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);

  // Initialize and synchronize Room Database
  useEffect(() => {
    let isMounted = true;

    async function bootstrapRoomDb() {
      try {
        await roomDbService.initializeDatabase();
        const [dbContacts, dbLogs, dbBlocked] = await Promise.all([
          roomDbService.contacts.getAll(),
          roomDbService.callLogs.getAll(),
          roomDbService.getBlockedNumbers(),
        ]);

        if (isMounted) {
          if (dbContacts && dbContacts.length > 0) {
            setContacts(dbContacts);
          }
          if (dbLogs && dbLogs.length > 0) {
            setCallLogs(dbLogs);
          }
          setBlockedPhones(dbBlocked);
        }
      } catch (err) {
        console.error('Failed to initialize Room Database:', err);
      }
    }

    bootstrapRoomDb();

    // Subscribe to Room DB changes
    const unsubscribe = roomDbService.subscribe(async () => {
      if (!isMounted) return;
      try {
        const [updatedContacts, updatedLogs, updatedBlocked] = await Promise.all([
          roomDbService.contacts.getAll(),
          roomDbService.callLogs.getAll(),
          roomDbService.getBlockedNumbers(),
        ]);
        setContacts(updatedContacts);
        setCallLogs(updatedLogs);
        setBlockedPhones(updatedBlocked);
      } catch (err) {
        console.error('Room DB sync error:', err);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Subscribe to Cloud Sync status changes
  useEffect(() => {
    const unsubCloud = cloudSyncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => {
      unsubCloud();
    };
  }, []);

  // Subscribe to Default Call Permissions
  useEffect(() => {
    const unsubPerms = callPermissionService.subscribe((_perms, isDefault) => {
      setIsDefaultDialer(isDefault);
    });
    return () => {
      unsubPerms();
    };
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('smart_dialer_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('smart_dialer_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('smart_dialer_call_logs', JSON.stringify(callLogs));
  }, [callLogs]);

  useEffect(() => {
    localStorage.setItem('smart_dialer_sound', String(soundEnabled));
  }, [soundEnabled]);

  // Duration Timer for connected call
  useEffect(() => {
    if (activeCall && activeCall.state === 'connected') {
      callTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => {
          if (!prev || prev.state !== 'connected') return prev;
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [activeCall?.state]);

  // Stop active sounds on unmount & listen for real call events
  useEffect(() => {
    const handleRealCallEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ phoneNumber: string; cleanNumber: string; timestamp: number }>;
      if (!customEvent.detail) return;
      const { phoneNumber } = customEvent.detail;
      const offlineLookup = await roomDbService.lookupIncomingCall(phoneNumber);
      const displayName =
        (offlineLookup.isContact ? offlineLookup.record.name : undefined) ||
        offlineLookup.record?.name ||
        phoneNumber;

      const newLog: CallLog = {
        id: `log-${Date.now()}`,
        name: displayName,
        phone: phoneNumber,
        type: 'outgoing',
        timestamp: Date.now(),
        duration: 0,
        isSpam: offlineLookup.record?.spamScore ? offlineLookup.record.spamScore >= 60 : false,
        spamCategory: offlineLookup.record?.businessCategory,
        spamScore: offlineLookup.record?.spamScore,
        location: offlineLookup.record?.city,
      };

      setCallLogs((prev) => [newLog, ...prev]);
      roomDbService.callLogs.insert(newLog).catch(console.error);
      cloudSyncService.saveCallLogToCloud(newLog).catch(console.error);

      setRealCallToast({ show: true, phone: phoneNumber, name: displayName });
      setTimeout(() => setRealCallToast(null), 3500);
    };

    window.addEventListener('smart_dialer_real_call', handleRealCallEvent);

    return () => {
      window.removeEventListener('smart_dialer_real_call', handleRealCallEvent);
      if (audioStopFnRef.current) {
        audioStopFnRef.current();
        audioStopFnRef.current = null;
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, [syncStatus.user]);

  // Initiate Outgoing Call (supports real cellular call or in-app simulated call)
  const handleInitiateCall = async (
    phoneNumber: string,
    contactName?: string,
    callModeOverride?: 'real' | 'simulated'
  ) => {
    if (!phoneNumber) return;

    // Stop any existing sounds
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }

    // Lookup contact or caller ID via Room Database
    const offlineLookup = await roomDbService.lookupIncomingCall(phoneNumber);
    const callerIdInfo = offlineLookup.record;
    const displayName =
      contactName ||
      (offlineLookup.isContact ? offlineLookup.record.name : undefined) ||
      callerIdInfo?.name ||
      phoneNumber;

    const mode = callModeOverride || callPermissionService.getCallMode();

    if (mode === 'real') {
      // Create and persist an outgoing call log entry for this real call
      const newLog: CallLog = {
        id: `log-${Date.now()}`,
        name: displayName,
        phone: phoneNumber,
        type: 'outgoing',
        timestamp: Date.now(),
        duration: 0,
        isSpam: callerIdInfo?.spamScore ? callerIdInfo.spamScore >= 60 : false,
        spamCategory: callerIdInfo?.businessCategory,
        spamScore: callerIdInfo?.spamScore,
        location: callerIdInfo?.city,
      };

      setCallLogs((prev) => [newLog, ...prev]);
      roomDbService.callLogs.insert(newLog).catch(console.error);
      cloudSyncService.saveCallLogToCloud(newLog).catch(console.error);

      // Show temporary notification toast
      setRealCallToast({ show: true, phone: phoneNumber, name: displayName });
      setTimeout(() => {
        setRealCallToast(null);
      }, 4000);

      // Trigger the OS native real call via tel:
      callPermissionService.makeRealCall(phoneNumber);
      return;
    }

    // Otherwise, launch the interactive in-app calling simulation
    const newCall: ActiveCall = {
      phone: phoneNumber,
      name: displayName,
      isIncoming: false,
      state: 'outgoing',
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      isHold: false,
      isRecording: false,
      callerIdInfo,
    };

    setActiveCall(newCall);

    if (soundEnabled) {
      audioStopFnRef.current = playRingbackTone();
    }

    // Auto-connect call after 2.8 seconds to simulate answer
    connectTimeoutRef.current = window.setTimeout(() => {
      if (audioStopFnRef.current) {
        audioStopFnRef.current();
        audioStopFnRef.current = null;
      }

      setActiveCall((prev) => {
        if (!prev || prev.state !== 'outgoing') return prev;
        return {
          ...prev,
          state: 'connected',
          startTime: Date.now(),
        };
      });
    }, 2800);
  };

  // Simulate Incoming Call
  const handleSimulateIncoming = (caller: CallerIdRecord, mode: IncomingCallUIMode = 'overlay') => {
    // Stop any existing sounds
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }

    const newCall: ActiveCall = {
      phone: caller.phone,
      name: caller.name,
      isIncoming: true,
      state: 'incoming',
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      isHold: false,
      isRecording: false,
      callerIdInfo: caller,
      uiMode: mode,
    };

    setActiveCall(newCall);
    setIsSilenced(false);

    if (soundEnabled) {
      audioStopFnRef.current = playIncomingRingtone();
    }
  };

  // Toggle Silence Ringtone
  const handleToggleSilence = () => {
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }
    setIsSilenced((prev) => !prev);
  };

  // Block phone number (Offline database update via Room DB + Cloud Firestore)
  const handleBlockNumber = async (phone: string, name?: string) => {
    setBlockedPhones((prev) => (prev.includes(phone) ? prev : [...prev, phone]));
    await roomDbService.blockNumber(phone, name);
    cloudSyncService.saveBlockedNumberToCloud(phone, name).catch(console.error);

    // Refresh call logs from Room DB
    const updatedLogs = await roomDbService.callLogs.getAll();
    setCallLogs(updatedLogs);
  };

  // Answer Incoming Call
  const handleAnswerCall = () => {
    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }

    setActiveCall((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        state: 'connected',
        startTime: Date.now(),
      };
    });
  };

  // Decline or End Call
  const handleDeclineOrEndCall = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    if (audioStopFnRef.current) {
      audioStopFnRef.current();
      audioStopFnRef.current = null;
    }

    if (soundEnabled) {
      playCallEndedTone();
    }

    if (activeCall) {
      const finalCall = { ...activeCall };

      // Determine call log type
      let logType: CallLog['type'] = 'outgoing';
      if (finalCall.isIncoming) {
        logType = finalCall.state === 'connected' ? 'incoming' : 'missed';
      } else {
        logType = 'outgoing';
      }

      // Add to call log history
      const newLog: CallLog = {
        id: `log-${Date.now()}`,
        name: finalCall.name,
        phone: finalCall.phone,
        type: logType,
        timestamp: Date.now(),
        duration: finalCall.duration,
        isSpam: finalCall.callerIdInfo && finalCall.callerIdInfo.spamScore >= 60,
        spamCategory: finalCall.callerIdInfo?.businessCategory,
        spamScore: finalCall.callerIdInfo?.spamScore,
        location: finalCall.callerIdInfo?.city,
      };

      setCallLogs((prev) => [newLog, ...prev]);
      roomDbService.callLogs.insert(newLog).catch(console.error);
      cloudSyncService.saveCallLogToCloud(newLog).catch(console.error);

      // Show ended state briefly
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended' } : null));

      setTimeout(() => {
        setActiveCall(null);
      }, 900);
    } else {
      setActiveCall(null);
    }
  };

  // In-call toggles
  const handleToggleMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const handleToggleSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null));
  };

  const handleToggleHold = () => {
    setActiveCall((prev) => (prev ? { ...prev, isHold: !prev.isHold } : null));
  };

  const handleToggleRecord = () => {
    setActiveCall((prev) => (prev ? { ...prev, isRecording: !prev.isRecording } : null));
  };

  // Contacts Handlers with Room DB Persistence & Cloud Firestore
  const handleSaveContact = async (contact: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === contact.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = contact;
        return next;
      }
      return [contact, ...prev];
    });
    await roomDbService.contacts.insert(contact);
    cloudSyncService.saveContactToCloud(contact).catch(console.error);
  };

  const handleImportContacts = async (importedList: Contact[]) => {
    setContacts((prev) => {
      const existingMap = new Map(prev.map((c) => [c.id, c]));
      importedList.forEach((c) => existingMap.set(c.id, c));
      return Array.from(existingMap.values());
    });
    for (const c of importedList) {
      await roomDbService.contacts.insert(c);
      cloudSyncService.saveContactToCloud(c).catch(console.error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    await roomDbService.contacts.delete(id);
    cloudSyncService.deleteContactFromCloud(id).catch(console.error);
  };

  const handleToggleFavorite = async (id: string) => {
    let updatedContact: Contact | undefined;
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updatedContact = { ...c, isFavorite: !c.isFavorite };
          return updatedContact;
        }
        return c;
      })
    );
    await roomDbService.contacts.toggleFavorite(id);
    if (updatedContact) {
      cloudSyncService.saveContactToCloud(updatedContact).catch(console.error);
    }
  };

  const handleOpenAddContactFromNumber = (phone: string, name?: string) => {
    setActiveTab('contacts');
    // Save minimal contact or trigger add modal
    handleSaveContact({
      id: `c-${Date.now()}`,
      name: name || phone,
      phone,
      isFavorite: false,
      tag: 'Friend',
    });
  };

  const handleReportSpam = async (phone: string) => {
    await roomDbService.reportSpam(phone);
    const updated = await roomDbService.callLogs.getAll();
    setCallLogs(updated);
  };

  const handleClearLogs = async () => {
    if (window.confirm(lang === 'bn' ? 'আপনি কি সব কল হিস্ট্রি মুছে ফেলতে চান?' : 'Clear all call logs?')) {
      setCallLogs([]);
      await roomDbService.callLogs.clearAll();
    }
  };

  return (
    <div
      id="main-app-shell"
      className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-between font-sans selection:bg-emerald-500 selection:text-white"
    >
      {/* Mobile container centered frame */}
      <div
        id="phone-frame-wrapper"
        className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl flex flex-col h-screen overflow-hidden border-x border-neutral-200 dark:border-neutral-800"
      >
        {/* Header */}
        <Header
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
          isDefaultDialer={isDefaultDialer}
          onToggleDefaultDialer={() => {
            const next = !isDefaultDialer;
            callPermissionService.setDefaultDialer(next);
          }}
          onSimulateIncoming={handleSimulateIncoming}
          syncStatus={syncStatus}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
        />

        {/* Default Phone App Permission Status Banner */}
        <DefaultCallPermissionBanner
          isDefault={isDefaultDialer}
          onOpenModal={() => setIsPermissionModalOpen(true)}
          lang={lang}
        />

        {/* Real-time Incoming SMS Notification Overlay Banner */}
        <IncomingSmsBanner
          lang={lang}
          onOpenConversation={(phone) => {
            setActiveSmsThreadPhone(phone);
            setActiveTab('messages');
          }}
          onInitiateCall={(phone, name) => {
            handleInitiateCall(phone, name);
          }}
        />

        {/* Real Call Notification Toast */}
        {realCallToast && (
          <div
            id="real-call-toast"
            className="mx-3 my-1.5 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex items-center justify-between gap-2.5 animate-fadeIn z-20"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5 fill-current animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate">
                  {lang === 'bn' ? 'রিয়েল সিম কল ডায়াল করা হচ্ছে...' : 'Dialing Real Cellular Call...'}
                </p>
                <p className="text-[10px] text-emerald-100 truncate">
                  {realCallToast.name ? `${realCallToast.name} • ` : ''}
                  {realCallToast.phone}
                </p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/25 font-bold uppercase shrink-0">
              {lang === 'bn' ? 'সংরক্ষিত' : 'Logged'}
            </span>
          </div>
        )}

        {/* Content Body based on Tab */}
        <main id="app-content-body" className="flex-1 overflow-hidden relative">
          {activeTab === 'keypad' && (
            <Keypad
              lang={lang}
              contacts={contacts}
              onInitiateCall={handleInitiateCall}
              onOpenAddContact={handleOpenAddContactFromNumber}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
            />
          )}

          {activeTab === 'recents' && (
            <CallLogs
              logs={callLogs}
              lang={lang}
              onInitiateCall={handleInitiateCall}
              onOpenAddContact={handleOpenAddContactFromNumber}
              onClearLogs={handleClearLogs}
              onReportSpam={handleReportSpam}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsView
              contacts={contacts}
              lang={lang}
              callLogs={callLogs}
              onInitiateCall={handleInitiateCall}
              onSaveContact={handleSaveContact}
              onImportContacts={handleImportContacts}
              onDeleteContact={handleDeleteContact}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesView
              lang={lang}
              contacts={contacts}
              onInitiateCall={handleInitiateCall}
              onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
              initialThreadPhone={activeSmsThreadPhone}
            />
          )}

          {activeTab === 'callerid' && (
            <CallerIdLookup
              lang={lang}
              onInitiateCall={handleInitiateCall}
              onSimulateIncoming={handleSimulateIncoming}
            />
          )}

          {activeTab === 'stats' && (
            <CallStatsDashboard logs={callLogs} lang={lang} />
          )}

          {activeTab === 'android-guide' && (
            <AndroidGuide
              lang={lang}
              onSimulateIncoming={handleSimulateIncoming}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav
          id="app-bottom-nav"
          className="h-16 px-1 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 select-none z-10"
        >
          {/* Keypad */}
          <button
            id="nav-tab-keypad"
            onClick={() => setActiveTab('keypad')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              activeTab === 'keypad'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <Grid className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabKeypad}</span>
          </button>

          {/* Recents / Call Logs */}
          <button
            id="nav-tab-recents"
            onClick={() => setActiveTab('recents')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition relative ${
              activeTab === 'recents'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <Clock className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabRecents}</span>
            {callLogs.some((l) => l.type === 'missed') && (
              <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>

          {/* Contacts */}
          <button
            id="nav-tab-contacts"
            onClick={() => setActiveTab('contacts')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              activeTab === 'contacts'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabContacts}</span>
          </button>

          {/* Messages (Google Messages & Offline SMS) */}
          <button
            id="nav-tab-messages"
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition relative ${
              activeTab === 'messages'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <MessageSquare className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabMessages}</span>
            {unreadSmsCount > 0 && (
              <span className="absolute top-1 right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadSmsCount > 9 ? '9+' : unreadSmsCount}
              </span>
            )}
          </button>

          {/* Smart Caller ID */}
          <button
            id="nav-tab-callerid"
            onClick={() => setActiveTab('callerid')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              activeTab === 'callerid'
                ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <Shield className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabCallerId}</span>
          </button>

          {/* Statistics Dashboard */}
          <button
            id="nav-tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              activeTab === 'stats'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabStats}</span>
          </button>

          {/* Android Architecture Guide */}
          <button
            id="nav-tab-android-guide"
            onClick={() => setActiveTab('android-guide')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              activeTab === 'android-guide'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-medium'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">{t.tabAndroidGuide}</span>
          </button>
        </nav>
      </div>

      {/* 1. Floating Caller ID Overlay (SYSTEM_ALERT_WINDOW simulation) */}
      {activeCall &&
        activeCall.isIncoming &&
        activeCall.state === 'incoming' &&
        activeCall.uiMode === 'overlay' && (
          <FloatingCallerIdOverlay
            call={activeCall}
            lang={lang}
            onAnswer={handleAnswerCall}
            onDecline={handleDeclineOrEndCall}
            onToggleSilence={handleToggleSilence}
            onExpandFullscreen={() =>
              setActiveCall((prev) => (prev ? { ...prev, uiMode: 'fullscreen' } : null))
            }
            onBlockNumber={handleBlockNumber}
            isSilenced={isSilenced}
          />
        )}

      {/* 2. Active Call Modal (Fullscreen InCallService / Connected Call) */}
      {activeCall &&
        (!activeCall.isIncoming ||
          activeCall.state !== 'incoming' ||
          activeCall.uiMode === 'fullscreen') && (
          <ActiveCallModal
            call={activeCall}
            lang={lang}
            onAnswer={handleAnswerCall}
            onDecline={handleDeclineOrEndCall}
            onToggleMute={handleToggleMute}
            onToggleSpeaker={handleToggleSpeaker}
            onToggleHold={handleToggleHold}
            onToggleRecord={handleToggleRecord}
            soundEnabled={soundEnabled}
          />
        )}

      {/* 3. Firebase Authentication & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        syncStatus={syncStatus}
      />

      {/* 4. Android Default Call App Permission Activation Modal */}
      <DefaultCallPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        lang={lang}
        onSimulateIncoming={handleSimulateIncoming}
      />
    </div>
  );
}
