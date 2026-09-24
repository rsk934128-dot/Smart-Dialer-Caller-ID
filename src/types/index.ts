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
  storageLocation?: 'device' | 'sim1' | 'sim2' | 'google';
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

export type AppTab =
  | 'keypad'
  | 'recents'
  | 'contacts'
  | 'messages'
  | 'callerid'
  | 'stats'
  | 'android-guide'
  | 'fintech-security';

export interface DeviceFingerprintData {
  deviceHash: string;
  canvasHash: string;
  webglHash: string;
  webglVendor: string;
  webglRenderer: string;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  platform: string;
  touchSupport: boolean;
  audioHash: string;
  userAgent: string;
}

export interface NetworkConnectionData {
  type: string;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  webrtcLocalIps: string[];
  webrtcPublicIp?: string;
  detectedIp?: string;
  isOnline: boolean;
}

export interface CarrierIntelligenceData {
  ip: string;
  carrierName: string;
  operatorType: 'mobile_data' | 'broadband_isp' | 'datacenter_vpn' | 'unknown';
  asn: string;
  mccMnc?: string;
  country: string;
  city?: string;
  isMobileCarrier: boolean;
  isVpnOrProxy: boolean;
  riskWeight: number;
}

export interface SimCardBindingState {
  simSlot: 1 | 2;
  carrierName: string;
  iccidMasked: string;
  iccidHash: string;
  imsiMasked: string;
  status: 'ACTIVE' | 'SWAPPED' | 'REVOKED' | 'SUSPICIOUS';
  swappedAt?: number;
  isSimSwapSuspected: boolean;
}

export interface FintechSecurityAuditItem {
  id: string;
  timestamp: number;
  userId: string;
  clientIp: string;
  carrier: string;
  networkType: string;
  riskScore: number;
  decision: 'ALLOW' | 'REQUIRE_2FA_OTP' | 'HOLD_TRANSACTION' | 'BLOCK_FRAUD';
  factors: string[];
  simSwapped: boolean;
  vpnDetected: boolean;
}

export interface FintechTransactionPayload {
  amount: number;
  currency: string;
  channel: 'BKASH' | 'NAGAD' | 'ROCKET' | 'UPAY' | 'BANK_TRANSFER' | 'CARD_PAYMENT';
  recipient: string;
  recipientName?: string;
  note?: string;
}

export interface FintechSecurityAssessmentResult {
  transactionId: string;
  riskScore: number; // 0 to 100
  decision: 'ALLOW' | 'REQUIRE_2FA_OTP' | 'HOLD_TRANSACTION' | 'BLOCK_FRAUD';
  reasons: string[];
  timestamp: number;
  clientIp: string;
  carrier: string;
  asn: string;
  deviceMatch: boolean;
  simSwapDetected: boolean;
  telegramAlertSent?: boolean;
  telegramError?: string;
}

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
  version?: number;
  approximateSizeKb?: number;
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
