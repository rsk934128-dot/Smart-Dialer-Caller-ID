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
  storageLocation?: 'device' | 'sim1' | 'sim2';
  simSlot?: 1 | 2;
  ringtone?: string;
  ringtoneLabel?: string;
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
  note?: string; // Call note stored in Room DB
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
  carrier?: string;
  trustLevel?: 'high' | 'medium' | 'low' | 'suspicious';
  isGeminiAnalyzed?: boolean;
}

export interface GeminiCallerIdMetadata {
  phone: string;
  name: string;
  businessCategory: string;
  carrier: string;
  spamScore: number;
  spamReports: number;
  city: string;
  country: string;
  verified: boolean;
  notes: string;
  trustLevel: 'high' | 'medium' | 'low' | 'suspicious';
  suggestedAction: 'safe_to_answer' | 'verify_identity' | 'block_and_report' | 'telemarketing';
  source?: string;
  analyzedAt?: number;
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
  customRingtoneLabel?: string;
  callNote?: string;
}

export interface DialerSettings {
  defaultDialerActive: boolean;
  dtmfSoundEnabled: boolean;
  autoSpamBlock: boolean;
  hapticFeedback: boolean;
  simSlot: 1 | 2;
}

export type AppTab = 'keypad' | 'recents' | 'contacts' | 'messages' | 'callerid' | 'stats' | 'android-guide';

export type SmsType = 'inbox' | 'sent' | 'draft' | 'failed';
export type SmsStatus = 'received' | 'read' | 'delivered' | 'sending' | 'failed';
export type SmsCategory = 'personal' | 'promotions' | 'otp' | 'spam';

export interface SmsMessage {
  id: string;
  senderPhone: string;
  senderName?: string;
  recipientPhone: string;
  recipientName?: string;
  body: string;
  timestamp: number;
  type: SmsType;
  status: SmsStatus;
  simSlot: 1 | 2;
  isOtp?: boolean;
  otpCode?: string;
  isSpam?: boolean;
  category?: SmsCategory;
  isOfflineStored?: boolean;
}

export interface SmsThread {
  threadId: string;
  contactPhone: string;
  contactName?: string;
  simSlot: 1 | 2;
  lastMessage: SmsMessage;
  category?: SmsCategory;
  unreadCount: number;
  totalMessages: number;
}

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
  messagesCount?: number;
  isInitialized: boolean;
  lastLookupTimeMs?: number;
}

export interface BackupMetadata {
  timestamp: string;
  contactsCount: number;
  callLogsCount: number;
  blockedCount: number;
  messagesCount: number;
  totalEntities: number;
  userId?: string;
  userEmail?: string;
  source: 'room_to_firestore';
  status: 'success' | 'failed' | 'in_progress';
}
