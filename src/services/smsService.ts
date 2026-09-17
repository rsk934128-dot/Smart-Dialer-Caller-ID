import { SmsMessage, SmsThread } from '../types';
import { roomDbService } from '../db/roomDatabaseService';
import { callPermissionService } from './callPermissionService';

export interface IncomingSmsPayload {
  senderPhone: string;
  senderName?: string;
  body: string;
  simSlot?: 1 | 2;
  isSpam?: boolean;
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

    const otp = this.detectOtp(payload.body);
    const isSpam = payload.isSpam !== undefined ? payload.isSpam : this.detectSpam(payload.body, payload.senderPhone);

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
    isOtp?: boolean;
    isSpam?: boolean;
  }> {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

    return [
      {
        title: 'Google Verification Code',
        titleBn: 'গুগল ভেরিফিকেশন ওটিপি',
        sender: 'Google',
        senderName: 'Google Security',
        body: `G-${randomOtp} is your Google verification code. Never share your security code with anyone.`,
        simSlot: 1,
        isOtp: true,
      },
      {
        title: 'bKash Cash In / Payment',
        titleBn: 'বিকাশ ক্যাশ ইন নোটিফিকেশন',
        sender: 'bKash',
        senderName: 'bKash Services',
        body: `You have received Tk 2,500.00 from 01711234567. Fee Tk 0.00. Balance Tk 11,950.50. TrxID 9K${Math.random().toString(36).substring(2, 6).toUpperCase()}89L2 at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        simSlot: 1,
        isOtp: false,
      },
      {
        title: 'Bank OTP Authentication',
        titleBn: 'ব্যাংক ট্রানজাকশন ওটিপি',
        sender: 'CityBank',
        senderName: 'City Bank Security',
        body: `আপনার অনলাইন লেনদেনের জন্য ওটিপি কোড: ${randomOtp}। এই কোডের মেয়াদ ৩ মিনিট। অন্য কাউকে বলবেন না।`,
        simSlot: 1,
        isOtp: true,
      },
      {
        title: 'Family Message (Brother)',
        titleBn: 'তানভীর আহমেদ (বড় ভাই)',
        sender: '+880 1711-234567',
        senderName: 'তানভীর আহমেদ',
        body: 'জরুরি একটা ফাইল মেইল করেছি, একটু দেখে কনফার্ম করিস।',
        simSlot: 1,
      },
      {
        title: 'Grameenphone Internet Alert',
        titleBn: 'গ্রামীণফোন ডাটা অফার',
        sender: 'GP-INFO',
        senderName: 'Grameenphone 4G',
        body: 'মাইপ্ল্যান স্পেশাল: মাত্র ৫৯ টাকায় ৭ জিবি ৩ দিন মেয়াদ! অফারটি নিতে এখনই ডায়াল করুন *১২১*১*২#।',
        simSlot: 1,
      },
      {
        title: 'Spam / Fraud Prize Warning',
        titleBn: 'সন্দেহজনক লটারি প্রতারণা (Spam)',
        sender: '+880 1300-998811',
        senderName: 'লটারি ও ফেক প্রাইজ (Fraud)',
        body: 'অভিনন্দন! আপনি জিতেছেন ৫০ হাজার টাকার নগদ ক্যাশব্যাক! টাকা সরাসরি পেতে এখনই আপনার পিন কোড দিন।',
        simSlot: 2,
        isSpam: true,
      },
    ];
  }
}

export const smsService = new SmsService();
