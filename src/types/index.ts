export interface Contact {
  id: string;
  name: string;
  nameEn?: string;
  phone: string;
  email?: string;
  avatar?: string;
  note?: string;
  isFavorite: boolean;
  company?: string;
  tag?: string;
}

export type CallType = 'incoming' | 'outgoing' | 'missed' | 'rejected';

export interface CallLog {
  id: string;
  contactId?: string;
  name: string;
  phone: string;
  type: CallType;
  timestamp: number;
  duration: number; // in seconds
  isSpam?: boolean;
  spamCategory?: string;
  spamScore?: number; // 0 to 100
  location?: string;
}

export interface CallerIdRecord {
  phone: string;
  name: string;
  businessCategory?: string;
  spamScore: number; // 0 (safe) to 100 (severe spam/fraud)
  spamReports: number;
  city?: string;
  country?: string;
  verified: boolean;
  notes?: string;
}

export type CallSessionState = 'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended';

export type IncomingCallUIMode = 'fullscreen' | 'overlay';

export interface ActiveCall {
  phone: string;
  name: string;
  isIncoming: boolean;
  state: CallSessionState;
  startTime?: number;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  isHold: boolean;
  isRecording: boolean;
  callerIdInfo?: CallerIdRecord;
  uiMode?: IncomingCallUIMode;
}

export interface DialerSettings {
  defaultDialerActive: boolean;
  dtmfSoundEnabled: boolean;
  autoSpamBlock: boolean;
  hapticFeedback: boolean;
  simSlot: 1 | 2;
}

export type AppTab = 'keypad' | 'recents' | 'contacts' | 'callerid' | 'stats' | 'android-guide';

export interface SpamEntity {
  phone: string;
  normalizedPhone: string;
  name: string;
  category: string;
  score: number; // 0-100
  reportsCount: number;
  isBlocked: boolean;
  notes?: string;
  createdAt: number;
}

export interface RoomDbMetrics {
  contactsCount: number;
  callLogsCount: number;
  spamCount: number;
  callerIdCacheCount: number;
  isInitialized: boolean;
  lastLookupTimeMs?: number;
}
