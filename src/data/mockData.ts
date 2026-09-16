import { Contact, CallLog, CallerIdRecord } from '../types';

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
