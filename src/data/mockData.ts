import { Contact, CallLog, CallerIdRecord, SmsMessage } from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    name: 'তানভীর আহমেদ',
    nameEn: 'Tanvir Ahmed',
    phone: '+880 1711-234567',
    email: 'tanvir.ahmed@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    tag: 'Family',
    isFavorite: true,
    company: 'Dhaka University',
    note: 'বড় ভাই',
    storageLocation: 'sim1',
    simSlot: 1,
    ringtone: 'flute',
    ringtoneLabel: 'বাউলি বাঁশি (Family Folk)',
  },
  {
    id: 'c-2',
    name: 'ডাঃ রফিকুল ইসলাম',
    nameEn: 'Dr. Rafiqul Islam',
    phone: '+880 1819-876543',
    email: 'dr.rafiqul@hospital.bd',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    tag: 'Doctor',
    isFavorite: true,
    company: 'Square Hospital',
    note: 'ফ্যামিলি ফিজিশিয়ান',
    storageLocation: 'sim2',
    simSlot: 2,
    ringtone: 'urgent',
    ringtoneLabel: 'মেডিকেল অ্যালার্ট (Emergency)',
  },
  {
    id: 'c-3',
    name: 'আফরিন জাহান',
    nameEn: 'Afrin Jahan',
    phone: '+880 1912-345678',
    email: 'afrin.jahan@fintech.io',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    tag: 'Work',
    isFavorite: false,
    company: 'Tech Solutions Ltd.',
    note: 'প্রজেক্ট ম্যানেজার',
    storageLocation: 'device',
    ringtone: 'vintage',
    ringtoneLabel: 'অফিস প্রজেক্ট বেল (Work Ring)',
  },
  {
    id: 'c-4',
    name: 'সাকিব আল হাসান',
    nameEn: 'Sakib Al Hasan',
    phone: '+880 1610-998877',
    email: 'sakib.work@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    tag: 'Friend',
    isFavorite: true,
    company: 'Freelance Architect',
    note: 'কলেজ বন্ধু',
    storageLocation: 'sim1',
    simSlot: 1,
  },
  {
    id: 'c-5',
    name: 'নুসরাত চৌধুরী',
    nameEn: 'Nusrat Chowdhury',
    phone: '+880 1552-112233',
    email: 'nusrat.c@studio.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    tag: 'Work',
    isFavorite: false,
    company: 'Creative Studio',
    storageLocation: 'sim2',
    simSlot: 2,
  },
  {
    id: 'c-6',
    name: 'মাহমুদ করিম',
    nameEn: 'Mahmud Karim',
    phone: '+880 1722-445566',
    email: 'mahmud.karim@corp.bd',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    tag: 'VIP',
    isFavorite: false,
    company: 'Telecom BD',
  },
  {
    id: 'c-7',
    name: 'Alice Smith',
    nameEn: 'Alice Smith',
    phone: '+880 1733-112244',
    email: 'alice.smith@cloud.io',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    tag: 'Friend',
    isFavorite: true,
    company: 'Fintech Lab',
  },
  {
    id: 'c-8',
    name: 'Bob Wilson',
    nameEn: 'Bob Wilson',
    phone: '+880 1844-556677',
    email: 'bob.wilson@network.com',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    tag: 'Work',
    isFavorite: false,
    company: 'Network Systems',
  },
  {
    id: 'c-9',
    name: 'Charlie Brown',
    nameEn: 'Charlie Brown',
    phone: '+880 1955-889900',
    email: 'charlie.b@design.org',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    tag: 'Friend',
    isFavorite: false,
    company: 'Creative Media',
  },
  {
    id: 'c-10',
    name: 'David Miller',
    nameEn: 'David Miller',
    phone: '+880 1688-223344',
    email: 'david.m@cyber.net',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    tag: 'VIP',
    isFavorite: true,
    company: 'Cyber Security Inc',
  },
];

const NOW = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const INITIAL_CALL_LOGS: CallLog[] = [
  {
    id: 'l-1',
    contactId: 'c-1',
    name: 'তানভীর আহমেদ',
    phone: '+880 1711-234567',
    type: 'incoming',
    timestamp: NOW - 12 * 60 * 1000,
    duration: 184,
    location: 'ঢাকা, বাংলাদেশ',
  },
  {
    id: 'l-2',
    name: '⚠️ লটারি প্রতারণা চক্র (Spam Alert)',
    phone: '+880 1300-998811',
    type: 'missed',
    timestamp: NOW - 45 * 60 * 1000,
    duration: 0,
    isSpam: true,
    spamCategory: 'লোভনীয় অফার ও আর্থিক প্রতারণা',
    spamScore: 96,
    location: 'অজানা অঞ্চল',
  },
  {
    id: 'l-3',
    contactId: 'c-2',
    name: 'ডাঃ রফিকুল ইসলাম',
    phone: '+880 1819-876543',
    type: 'outgoing',
    timestamp: NOW - 3 * HOUR,
    duration: 92,
    location: 'পান্থপথ, ঢাকা',
  },
  {
    id: 'l-4',
    name: 'ফুডপ্যান্ডা ডেলিভারি রাইডার',
    phone: '+880 1855-123456',
    type: 'incoming',
    timestamp: NOW - 6 * HOUR,
    duration: 45,
    location: 'গুলশান, ঢাকা',
  },
  {
    id: 'l-5',
    contactId: 'c-4',
    name: 'সাকিব আল হাসান',
    phone: '+880 1610-998877',
    type: 'missed',
    timestamp: NOW - 1 * DAY,
    duration: 0,
    location: 'ধানমন্ডি, ঢাকা',
  },
  {
    id: 'l-6',
    name: 'টেলিমার্কেটিং লোন অফার',
    phone: '+880 1999-443322',
    type: 'rejected',
    timestamp: NOW - 1.5 * DAY,
    duration: 0,
    isSpam: true,
    spamCategory: 'বিরক্তিকর টেলিমার্কেটিং',
    spamScore: 84,
    location: 'মতিঝিল, ঢাকা',
  },
  {
    id: 'l-7',
    contactId: 'c-3',
    name: 'আফরিন জাহান',
    phone: '+880 1912-345678',
    type: 'outgoing',
    timestamp: NOW - 2 * DAY,
    duration: 310,
    location: 'বনানী, ঢাকা',
  },
];

// Crowdsourced Caller ID Directory for unknown numbers
export const CALLER_ID_DATABASE: Record<string, CallerIdRecord> = {
  '+8801300998811': {
    phone: '+880 1300-998811',
    name: 'লটারি ও ফেক প্রাইজ কল (Fraud)',
    businessCategory: 'আর্থিক প্রতারণা (Scam)',
    spamScore: 98,
    spamReports: 1420,
    city: 'অজ্ঞাত স্থান',
    country: 'Bangladesh',
    verified: false,
    notes: 'ভুয়া বিকাশ/নগদ লটারি প্রাইজ জেতার দাবি করে ওটিপি চায়।',
  },
  '+8801999443322': {
    phone: '+880 1999-443322',
    name: 'দ্রুত ঋণ ও ক্রেডিট কার্ড সার্ভিস',
    businessCategory: 'টেলিমার্কেটিং ও স্প্যাম',
    spamScore: 88,
    spamReports: 512,
    city: 'ঢাকা',
    country: 'Bangladesh',
    verified: false,
    notes: 'অপ্রয়োজনীয় পার্সোনাল লোন অফারের জন্য বারবার কল দেয়।',
  },
  '+8801855123456': {
    phone: '+880 1855-123456',
    name: 'ফুডপ্যান্ডা ডেলিভারি রাইডার #402',
    businessCategory: 'ফুড ডেলিভারি সার্ভিস',
    spamScore: 4,
    spamReports: 1,
    city: 'ঢাকা উত্তর',
    country: 'Bangladesh',
    verified: true,
    notes: 'অফিসিয়াল ফুডপ্যান্ডা কাস্টমার ডেলিভারি লাইন।',
  },
  '+8801700121121': {
    phone: '+880 1700-121121',
    name: 'গ্রামীণফোন কাস্টমার সাপোর্ট কেয়ার',
    businessCategory: 'টেলিকম সাপোর্ট (Official)',
    spamScore: 0,
    spamReports: 0,
    city: 'বসুন্ধরা, ঢাকা',
    country: 'Bangladesh',
    verified: true,
    notes: 'ভেরিফায়েড অফিসিয়াল টেলিকম হেল্পলাইন।',
  },
  '+8801799001122': {
    phone: '+880 1799-001122',
    name: 'দারাজ অনলাইন শপিং হাব (Daraz Hub)',
    businessCategory: 'ই-কমার্স লজিস্টিকস',
    spamScore: 3,
    spamReports: 2,
    city: 'তেজগাঁও, ঢাকা',
    country: 'Bangladesh',
    verified: true,
    notes: 'দারাজ পার্সেল ডেলিভারি কনফার্মেশন কল।',
  },
  '+8801888776655': {
    phone: '+880 1888-776655',
    name: 'রিয়েল এস্টেট ফ্ল্যাট সেলস এজেন্ট',
    businessCategory: 'অযাচিত প্রচার (Cold Call)',
    spamScore: 74,
    spamReports: 340,
    city: 'উত্তরা, ঢাকা',
    country: 'Bangladesh',
    verified: false,
    notes: 'পূর্বাচলে প্লট কেনার জন্য বারবার মেসেজ ও কল।',
  },
};

// Normalize phone string for reliable search
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export function lookupCallerId(rawPhone: string): CallerIdRecord | null {
  const clean = normalizePhone(rawPhone);
  if (!clean) return null;

  // Direct lookup
  if (CALLER_ID_DATABASE[clean]) {
    return CALLER_ID_DATABASE[clean];
  }

  // Suffix matching (last 8-10 digits)
  const digitsOnly = clean.replace(/\+/g, '');
  for (const [key, record] of Object.entries(CALLER_ID_DATABASE)) {
    const recordDigits = key.replace(/[^0-9]/g, '');
    if (recordDigits.endsWith(digitsOnly) || digitsOnly.endsWith(recordDigits)) {
      return record;
    }
  }

  return null;
}

export interface SimCardInfo {
  slot: 1 | 2;
  carrier: string;
  carrierBn: string;
  phoneNumber?: string;
  simState: 'ready' | 'absent' | 'locked';
  totalCapacity: number;
  usedCapacity: number;
}

export const MOCK_SIM_CARDS: SimCardInfo[] = [
  {
    slot: 1,
    carrier: 'Grameenphone 4G',
    carrierBn: 'গ্রামীণফোন ৪জি (সিম ১)',
    phoneNumber: '+880 1711-000111',
    simState: 'ready',
    totalCapacity: 250,
    usedCapacity: 14,
  },
  {
    slot: 2,
    carrier: 'Banglalink 4G',
    carrierBn: 'বাংলালিংক ৪জি (সিম ২)',
    phoneNumber: '+880 1912-999222',
    simState: 'ready',
    totalCapacity: 250,
    usedCapacity: 9,
  },
];

export interface RawSimContact {
  id: string;
  name: string;
  phone: string;
  simSlot: 1 | 2;
  carrier: string;
  isImported?: boolean;
}

export const MOCK_RAW_SIM_CONTACTS: RawSimContact[] = [
  {
    id: 'sim1-1',
    name: 'জিপি হেল্পলাইন (Customer Care)',
    phone: '121',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim1-2',
    name: 'জাতীয় জরুরি সেবা (Emergency)',
    phone: '999',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim1-3',
    name: 'তানভীর আহমেদ (বড় ভাই)',
    phone: '+880 1711-234567',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim1-4',
    name: 'আম্মা (SIM 1 Contact)',
    phone: '+880 1715-998877',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim1-5',
    name: 'পল্লী বিদ্যুৎ অভিযোগ কেন্দ্র',
    phone: '16200',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim1-6',
    name: 'সাকিব আল হাসান',
    phone: '+880 1610-998877',
    simSlot: 1,
    carrier: 'Grameenphone',
  },
  {
    id: 'sim2-1',
    name: 'বাংলালিংক হেল্পলাইন (Customer Care)',
    phone: '121',
    simSlot: 2,
    carrier: 'Banglalink',
  },
  {
    id: 'sim2-2',
    name: 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স',
    phone: '199',
    simSlot: 2,
    carrier: 'Banglalink',
  },
  {
    id: 'sim2-3',
    name: 'ডাঃ রফিকুল ইসলাম',
    phone: '+880 1819-876543',
    simSlot: 2,
    carrier: 'Banglalink',
  },
  {
    id: 'sim2-4',
    name: 'নুসরাত চৌধুরী',
    phone: '+880 1552-112233',
    simSlot: 2,
    carrier: 'Banglalink',
  },
  {
    id: 'sim2-5',
    name: 'অ্যাম্বুলেন্স জরুরি সার্ভিস',
    phone: '999',
    simSlot: 2,
    carrier: 'Banglalink',
  },
  {
    id: 'sim2-6',
    name: 'ড্রাইভার কাশেম ভাই',
    phone: '+880 1913-776655',
    simSlot: 2,
    carrier: 'Banglalink',
  },
];

const NOW_MS = Date.now();
const MINUTE = 60 * 1000;

export const INITIAL_SMS_MESSAGES: SmsMessage[] = [
  // Google Messages / Security Verification OTP
  {
    id: 'sms-1',
    senderPhone: 'Google',
    senderName: 'Google Verification',
    recipientPhone: '+880 1711-000111',
    body: 'G-847291 is your Google verification code. Do not share this code with anyone.',
    timestamp: NOW_MS - 15 * MINUTE,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isOtp: true,
    otpCode: '847291',
    isSpam: false,
    category: 'otp',
    isOfflineStored: true,
  },
  // Tanvir Ahmed Conversation Thread
  {
    id: 'sms-2',
    senderPhone: '+880 1711-234567',
    senderName: 'তানভীর আহমেদ',
    recipientPhone: '+880 1711-000111',
    body: 'কখন পৌঁছাবি? আম্মা জিজ্ঞেস করছে।',
    timestamp: NOW_MS - 2 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isSpam: false,
    category: 'personal',
    isOfflineStored: true,
  },
  {
    id: 'sms-3',
    senderPhone: '+880 1711-000111',
    recipientPhone: '+880 1711-234567',
    recipientName: 'তানভীর আহমেদ',
    body: 'আমি রাস্তায় আছি ভাইয়া, আর ১৫-২০ মিনিটের মধ্যে পৌঁছে যাব।',
    timestamp: NOW_MS - 110 * MINUTE,
    type: 'sent',
    status: 'delivered',
    simSlot: 1,
    isSpam: false,
    category: 'personal',
    isOfflineStored: true,
  },
  {
    id: 'sms-4',
    senderPhone: '+880 1711-234567',
    senderName: 'তানভীর আহমেদ',
    recipientPhone: '+880 1711-000111',
    body: 'ঠিক আছে, আসার সময় ফার্মেসি থেকে প্যারাসিটামল নিয়ে আসিস।',
    timestamp: NOW_MS - 45 * MINUTE,
    type: 'inbox',
    status: 'received',
    simSlot: 1,
    isSpam: false,
    category: 'personal',
    isOfflineStored: true,
  },
  // bKash Transaction notification
  {
    id: 'sms-5',
    senderPhone: 'bKash',
    senderName: 'bKash Notification',
    recipientPhone: '+880 1711-000111',
    body: 'You have received Tk 4,500.00 from 01711234567. Fee Tk 0.00. Balance Tk 9,450.50. TrxID 9K28XA89L2 at 17/09/2026 16:30.',
    timestamp: NOW_MS - 3 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isOtp: false,
    isSpam: false,
    category: 'personal',
    isOfflineStored: true,
  },
  // Dr. Rafiqul Islam Appointment Confirmation
  {
    id: 'sms-6',
    senderPhone: '+880 1819-876543',
    senderName: 'ডাঃ রফিকুল ইসলাম',
    recipientPhone: '+880 1711-000111',
    body: 'আপনার সিরিয়াল নং ১২ কনফার্ম করা হয়েছে। আগামীকাল বিকেল ৫টায় স্কয়ার হাসপাতালে চেম্বারে উপস্থিত থাকুন।',
    timestamp: NOW_MS - 5 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 2,
    isSpam: false,
    category: 'personal',
    isOfflineStored: true,
  },
  // Telecom Promotion (Grameenphone)
  {
    id: 'sms-7',
    senderPhone: 'GP-INFO',
    senderName: 'Grameenphone 4G',
    recipientPhone: '+880 1711-000111',
    body: 'অবিশ্বাস্য অফার! মাত্র ৪৯ টাকায় ৫ জিবি ইন্টারনেট মেয়াদ ৩ দিন। ডায়াল করুন *১২১*৫০১# এখনই।',
    timestamp: NOW_MS - 8 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isSpam: false,
    category: 'promotions',
    isOfflineStored: true,
  },
  // E-Commerce Promotion (Daraz Flash Sale)
  {
    id: 'sms-9',
    senderPhone: 'DARAZ',
    senderName: 'Daraz Online Mall',
    recipientPhone: '+880 1711-000111',
    body: 'দারাজ মেগা ক্যাম্পেইন! ফ্যাশন ও গ্যাজেটে আজই উপভোগ করুন ৬০% পর্যন্ত ফ্ল্যাট ছাড় এবং ফ্রি ডেলিভারি কুপন: MEGA60।',
    timestamp: NOW_MS - 12 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isSpam: false,
    category: 'promotions',
    isOfflineStored: true,
  },
  // Suspected Spam / Fraud SMS
  {
    id: 'sms-8',
    senderPhone: '+880 1300-998811',
    senderName: 'লটারি ও ফেক প্রাইজ (Fraud)',
    recipientPhone: '+880 1711-000111',
    body: 'অভিনন্দন! আপনি জিতেছেন ১ লক্ষ টাকার লটারি পুরস্কার! টাকা তুলতে অবিলম্বে আপনার বিকাশ পিন ও ওটিপি দিন।',
    timestamp: NOW_MS - 20 * HOUR,
    type: 'inbox',
    status: 'read',
    simSlot: 1,
    isSpam: true,
    category: 'spam',
    isOfflineStored: true,
  },
];
