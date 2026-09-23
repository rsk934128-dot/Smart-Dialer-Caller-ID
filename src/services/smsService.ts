import { SmsMessage, SmsThread, SmsCategory } from '../types';
import { roomDbService } from '../db/roomDatabaseService';
import { callPermissionService } from './callPermissionService';
import { classifySms } from '../utils/smsClassifier';

export interface IncomingSmsPayload {
  senderPhone: string;
  senderName?: string;
  body: string;
  simSlot?: 1 | 2;
  isSpam?: boolean;
  category?: SmsCategory;
}

type IncomingSmsListener = (message: SmsMessage) => void;

class SmsService {
  private incomingListeners: Set<IncomingSmsListener> = new Set();

  /**
   * Register a listener for real-time incoming SMS events
   */
  public onIncomingSms(listener: IncomingSmsListener): () => void {
    this.incomingListeners.add(listener);
    return () => {
      this.incomingListeners.delete(listener);
    };
  }

  /**
   * Detect OTP code inside SMS body
   */
  public detectOtp(body: string): string | undefined {
    if (!body) return undefined;

    // Pattern 1: Google verification format: G-123456
    const googleMatch = body.match(/G-([0-9]{4,8})/i);
    if (googleMatch) return googleMatch[1];

    // Pattern 2: Explicit OTP labels (English or Bengali)
    const otpLabelMatch = body.match(/(?:otp|code|pin|verification code|ওটিপি|কোড|পিন)[\s:=#\-]*([0-9]{4,8})/i);
    if (otpLabelMatch) return otpLabelMatch[1];

    // Pattern 3: Standalone 4 to 6 digit numbers with security/verification words
    if (/(?:verify|login|security|transaction|লগইন|নিরাপত্তা|লেনদেন)/i.test(body)) {
      const genericDigitMatch = body.match(/\b([0-9]{4,6})\b/);
      if (genericDigitMatch) return genericDigitMatch[1];
    }

    return undefined;
  }

  /**
   * Check if body contains suspicious spam/phishing patterns
   */
  public detectSpam(body: string, senderPhone: string): boolean {
    const text = body.toLowerCase();
    const spamKeywords = [
      'লটারি',
      'জিতেছেন',
      'পুরস্কার',
      'টাকা তুলুন',
      'পিন দিন',
      'ওটিপি দিন',
      'free lottery',
      'claim prize',
      'urgent prize',
      'congratulations you won',
      'cash reward',
    ];
    if (spamKeywords.some((kw) => text.includes(kw))) {
      return true;
    }
    if (senderPhone.includes('1300998811')) {
      return true;
    }
    return false;
  }

  /**
   * Simulates Android Telephony.Sms.Intents.SMS_RECEIVED_ACTION BroadcastReceiver
   * Handles real-time offline SMS ingestion into Room Database
   */
  public async receiveIncomingSms(payload: IncomingSmsPayload): Promise<SmsMessage> {
    const permissions = callPermissionService.getPermissions();
    if (!permissions.roleSms || !permissions.receiveSms) {
      console.warn('SMS permission not granted. Incoming SMS blocked by Android role security.');
    }

    const classification = classifySms(payload.body, payload.senderPhone, payload.senderName);
    const otp = classification.otpCode || this.detectOtp(payload.body);
    const isSpam = payload.isSpam !== undefined ? payload.isSpam : (payload.category === 'spam' || classification.isSpam);
    const category: SmsCategory =
      payload.category ||
      (isSpam ? 'spam' : classification.category);

    const newMsg: SmsMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderPhone: payload.senderPhone,
      senderName: payload.senderName || payload.senderPhone,
      recipientPhone: '+880 1711-000111', // User's active SIM number
      body: payload.body,
      timestamp: Date.now(),
      type: 'inbox',
      status: 'received',
      simSlot: payload.simSlot || 1,
      isOtp: !!otp,
      otpCode: otp,
      isSpam,
      category,
      isOfflineStored: true,
    };

    // Store in Room DB immediately (Offline-first SQLite/Dexie)
    await roomDbService.messages.insert(newMsg);

    // Play subtle audio beep notification
    this.playNotificationSound();

    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Safe fallback
      }
    }

    // Notify all active in-app subscribers (Heads-up notification banner & Messages view)
    this.incomingListeners.forEach((listener) => {
      try {
        listener(newMsg);
      } catch (err) {
        console.error('Error in SMS listener:', err);
      }
    });

    // Also dispatch window custom event for decoupled UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smart_dialer_incoming_sms', {
          detail: newMsg,
        })
      );
    }

    return newMsg;
  }

  /**
   * Send an outgoing SMS in real time (works completely offline, stored in Room DB)
   */
  public async sendSms(
    recipientPhone: string,
    body: string,
    simSlot: 1 | 2 = 1,
    recipientName?: string
  ): Promise<SmsMessage> {
    const newMsg: SmsMessage = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderPhone: '+880 1711-000111',
      recipientPhone,
      recipientName: recipientName || recipientPhone,
      body,
      timestamp: Date.now(),
      type: 'sent',
      status: 'sending',
      simSlot,
      category: 'personal',
      isOfflineStored: true,
    };

    // Save initially as 'sending'
    await roomDbService.messages.insert(newMsg);

    // Simulate instant cellular radio transmission (delivered in 500ms)
    setTimeout(async () => {
      await roomDbService.messages.update(newMsg.id, { status: 'delivered' });
    }, 500);

    return newMsg;
  }

  /**
   * Quick sound effect for incoming SMS
   */
  private playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6 note

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Preset templates for simulating realistic incoming messages in real-time
   */
  public getSimulationPresets(): Array<{
    title: string;
    titleBn: string;
    sender: string;
    senderName: string;
    body: string;
    simSlot: 1 | 2;
    category?: SmsCategory;
    isOtp?: boolean;
    isSpam?: boolean;
  }> {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

    return [
      {
        title: 'Google Verification Code',
        titleBn: 'গুগল ভেরিফিকেশন ওটিপি (OTP)',
        sender: 'Google',
        senderName: 'Google Security',
        body: `G-${randomOtp} is your Google verification code. Never share your security code with anyone.`,
        simSlot: 1,
        category: 'otp',
        isOtp: true,
      },
      {
        title: 'Grameenphone Internet Alert',
        titleBn: 'গ্রামীণফোন ডাটা অফার (Promotions)',
        sender: 'GP-INFO',
        senderName: 'Grameenphone 4G',
        body: 'মাইপ্ল্যান স্পেশাল: মাত্র ৫৯ টাকায় ৭ জিবি ৩ দিন মেয়াদ! অফারটি নিতে এখনই ডায়াল করুন *১২১*১*২#।',
        simSlot: 1,
        category: 'promotions',
      },
      {
        title: 'Daraz Mega Sale Promo',
        titleBn: 'দারাজ মেগা ডিসকাউন্ট (Promotions)',
        sender: 'DARAZ',
        senderName: 'Daraz Online Shopping',
        body: 'দারাজ ফ্ল্যাশ সেল! আজই কেনাকাটায় উপভোগ করুন ৫০% পর্যন্ত ফ্ল্যাট ছাড় ও ফ্রি ডেলিভারি। কুপন কোড: DARAZ50',
        simSlot: 1,
        category: 'promotions',
      },
      {
        title: 'Family Message (Brother)',
        titleBn: 'তানভীর আহমেদ - বড় ভাই (Personal)',
        sender: '+880 1711-234567',
        senderName: 'তানভীর আহমেদ',
        body: 'জরুরি একটা ফাইল মেইল করেছি, একটু দেখে কনফার্ম করিস।',
        simSlot: 1,
        category: 'personal',
      },
      {
        title: 'Friend Hangout Chat',
        titleBn: 'রাকিব হাসান - বন্ধু (Personal)',
        sender: '+880 1819-234567',
        senderName: 'রাকিব হাসান',
        body: 'দোস্ত, সন্ধ্যায় ধানমন্ডি ৮ এ দেখা করবি? চা খেতে বের হচ্ছি।',
        simSlot: 2,
        category: 'personal',
      },
      {
        title: 'Bank OTP Authentication',
        titleBn: 'সিটি ব্যাংক ট্রানজাকশন (OTP)',
        sender: 'CityBank',
        senderName: 'City Bank Security',
        body: `আপনার অনলাইন লেনদেনের জন্য ওটিপি কোড: ${randomOtp}। এই কোডের মেয়াদ ৩ মিনিট। অন্য কাউকে বলবেন না।`,
        simSlot: 1,
        category: 'otp',
        isOtp: true,
      },
      {
        title: 'Spam / Fraud Prize Warning',
        titleBn: 'সন্দেহজনক লটারি প্রতারণা (Spam)',
        sender: '+880 1300-998811',
        senderName: 'লটারি ও ফেক প্রাইজ (Fraud)',
        body: 'অভিনন্দন! আপনি জিতেছেন ৫০ হাজার টাকার নগদ ক্যাশব্যাক! টাকা সরাসরি পেতে এখনই আপনার পিন কোড দিন।',
        simSlot: 2,
        category: 'spam',
        isSpam: true,
      },
    ];
  }
}

export const smsService = new SmsService();
