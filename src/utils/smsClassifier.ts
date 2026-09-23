import { SmsCategory } from '../types';

export interface SmsClassificationResult {
  category: SmsCategory;
  confidence: number; // 0 - 1.0
  isOtp: boolean;
  otpCode?: string;
  isSpam: boolean;
  reason: string;
}

/**
 * Local rule-based and heuristic classification engine for SMS messages.
 * Runs 100% offline with zero latency, zero cloud dependency.
 * Categorizes messages into: 'promotions' | 'otp' | 'personal' | 'spam'
 */
export function classifySms(
  body: string,
  senderPhone: string,
  senderName?: string
): SmsClassificationResult {
  const text = (body || '').trim();
  const textLower = text.toLowerCase();
  const senderLower = (senderPhone || '').toLowerCase();
  const nameLower = (senderName || '').toLowerCase();

  // -------------------------------------------------------------
  // 1. SPAM / FRAUD / PHISHING DETECTION (Highest Safety Priority)
  // -------------------------------------------------------------
  const spamKeywords = [
    'লটারি',
    'লটারী',
    'জিতেছেন',
    'পুরস্কার',
    'টাকা তুলুন',
    'পিন দিন',
    'ওটিপি দিন',
    'বিকাশ পিন',
    'নগদ পিন',
    'ফেক প্রাইজ',
    'ফ্রি লটারি',
    'বিজয়ীকে অভিনন্দন',
    'নগদ ক্যাশব্যাক পেতে পিন',
    'কোড শেয়ার করুন উপহার',
    'free lottery',
    'claim prize',
    'urgent prize',
    'congratulations you won',
    'cash reward',
    'urgent lottery',
    'send your pin',
    'share your otp',
    'send password to claim',
    'lottery winner',
    'won $',
    'won £',
    'won tk',
  ];

  const hasSpamKeyword = spamKeywords.some((kw) => textLower.includes(kw));
  const isKnownSpamSender =
    senderLower.includes('1300998811') ||
    nameLower.includes('fraud') ||
    nameLower.includes('লটারি') ||
    nameLower.includes('scam');

  if (isKnownSpamSender || (hasSpamKeyword && (textLower.includes('পিন') || textLower.includes('pin') || textLower.includes('otp')))) {
    return {
      category: 'spam',
      confidence: 0.98,
      isOtp: false,
      isSpam: true,
      reason: 'Suspicious scam or phishing content detected',
    };
  }

  // -------------------------------------------------------------
  // 2. OTP / VERIFICATION CODE DETECTION
  // -------------------------------------------------------------
  let detectedOtp: string | undefined;

  // Pattern A: Google format (e.g., G-123456)
  const googleMatch = text.match(/G-([0-9]{4,8})/i);
  if (googleMatch) {
    detectedOtp = googleMatch[1];
  }

  // Pattern B: Explicit OTP/Code/Pin indicators
  if (!detectedOtp) {
    const explicitOtpMatch = text.match(
      /(?:otp|code|pin|verification code|passcode|secret code|ওটিপি|কোড|পিন|ভেরিফিকেশন|পাসকোড)[\s:=#\-]*([0-9]{4,8})\b/i
    );
    if (explicitOtpMatch) {
      detectedOtp = explicitOtpMatch[1];
    }
  }

  // Pattern C: Contextual auth/transaction words with standalone 4-8 digit number
  if (!detectedOtp) {
    const isSecurityContext = /(?:verify|verification|login|security|transaction|authenticate|auth|password reset|নিরাপত্তা|লেনদেন|লগইন|যাচাইকরণ)/i.test(
      textLower
    );
    if (isSecurityContext) {
      const genericDigitMatch = text.match(/\b([0-9]{4,8})\b/);
      if (genericDigitMatch) {
        detectedOtp = genericDigitMatch[1];
      }
    }
  }

  const isOtpContext =
    /(?:do not share|never share|valid for|মেয়াদ|কাউকে বলবেন না|expire|verification code|one-time password|ওটিপি)/i.test(
      textLower
    );

  if (detectedOtp || isOtpContext) {
    return {
      category: 'otp',
      confidence: 0.95,
      isOtp: true,
      otpCode: detectedOtp,
      isSpam: false,
      reason: 'Authentication or security verification OTP code',
    };
  }

  // -------------------------------------------------------------
  // 3. PROMOTIONS / MARKETING / OFFERS DETECTION
  // -------------------------------------------------------------
  const promoKeywordsBn = [
    'অফার',
    'স্পেশাল অফার',
    'ধামাকা',
    'ডিসকাউন্ট',
    'ছাড়',
    'ক্যাশব্যাক',
    'বোনাস',
    'মেয়াদ',
    'প্যাক',
    'ডাটা প্যাক',
    'ইন্টারনেট',
    'ডাটা অফার',
    'জিবি',
    'এমবি',
    'টাকায়',
    'ডায়াল করুন',
    'রিচার্জ',
    'কিনুন',
    'প্যাকেজ',
    'শপিং',
    'সেল',
    'কুপন',
    'ভাউচার',
    'প্রচার',
    'ক্যাম্পেইন',
    'আজই উপভোগ করুন',
    'সীমিত সময়ের জন্য',
    'মেগা সেল',
    'ফ্রি ডেলিভারি',
    'কেনাকাটায়',
    'বিজ্ঞাপন',
    'মাইপ্ল্যান',
  ];

  const promoKeywordsEn = [
    'offer',
    'promo',
    'promotion',
    'discount',
    'deal',
    'sale',
    'cashback',
    'bonus',
    'coupon',
    'voucher',
    'validity',
    'pack',
    'package',
    'internet',
    'data pack',
    'dial *',
    'dialing',
    'recharge',
    'subscribe',
    'shopping',
    'limited time',
    'save big',
    'exclusive offer',
    'flat % off',
    'upto % off',
    'special price',
    'free delivery',
    'flash sale',
    'mega sale',
    'get 50%',
    'get 20%',
    'get 10%',
    'gb for',
    'mb for',
    'tk for',
  ];

  const promoSenderHeaders = [
    'gp-info',
    'bl-offer',
    'robi',
    'airtel',
    'teletalk',
    'banglalink',
    'daraz',
    'chaldal',
    'foodpanda',
    'dominos',
    'aarong',
    'pathao',
    'uber',
    'promo',
    'offer',
    'sale',
    'deal',
    'info',
    'alert',
    'shop',
    'mart',
    'market',
  ];

  const hasBnPromo = promoKeywordsBn.some((kw) => textLower.includes(kw));
  const hasEnPromo = promoKeywordsEn.some((kw) => textLower.includes(kw));
  const isPromotionalSender = promoSenderHeaders.some(
    (h) => senderLower.includes(h) || nameLower.includes(h)
  );

  // If body has dial codes like *121*... or *123#
  const hasUssdDialCode = /\*[0-9]+(?:\*[0-9]+)*#/.test(text);

  if (hasBnPromo || hasEnPromo || (isPromotionalSender && (hasUssdDialCode || text.length > 20))) {
    return {
      category: 'promotions',
      confidence: 0.92,
      isOtp: false,
      isSpam: false,
      reason: 'Marketing promotion, discount offer, or telecom package',
    };
  }

  // -------------------------------------------------------------
  // 4. PERSONAL MESSAGES (Default for conversational / contact SMS)
  // -------------------------------------------------------------
  return {
    category: 'personal',
    confidence: 0.9,
    isOtp: false,
    isSpam: false,
    reason: 'Personal direct message or conversational SMS',
  };
}
