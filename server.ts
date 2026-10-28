import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  inspectClientNetwork,
  securityDb,
  calculateFintechRisk,
  dispatchTelegramSecurityAlert,
  SecurityAlertRecord,
} from './src/server/fintechSecurityService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI client with standard User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Intelligent rule-based fallback metadata when Gemini API key is unavailable
 * or encountering network issues.
 */
function getRuleBasedFallbackMetadata(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  let carrier = 'মোবাইল নেটওয়ার্ক';
  let category = 'ব্যক্তিগত মোবাইল কলার';
  let name = 'অপরিচিত মোবাইল ব্যবহারকারী';
  let spamScore = 12;
  let verified = false;
  let city = 'বাংলাদেশ';
  let trustLevel: 'high' | 'medium' | 'low' | 'suspicious' = 'medium';
  let suggestedAction: 'safe_to_answer' | 'verify_identity' | 'block_and_report' | 'telemarketing' =
    'verify_identity';
  let notes =
    'অফলাইন প্রিফিক্স ও টেলিকম রুলস দ্বারা বিশ্লেষিত। নম্বরটি সাধারণ অ্যাক্টিভ গ্রাহক সিরিজভুক্ত।';

  if (digits.startsWith('88017') || digits.startsWith('017') || digits.startsWith('88013') || digits.startsWith('013')) {
    carrier = 'Grameenphone (017/013)';
    name = 'গ্রামীণফোন মোবাইল কলার';
    city = 'ঢাকা / বাংলাদেশ';
  } else if (digits.startsWith('88019') || digits.startsWith('019') || digits.startsWith('88014') || digits.startsWith('014')) {
    carrier = 'Banglalink (019/014)';
    name = 'বাংলালিংক মোবাইল কলার';
    city = 'ঢাকা / বাংলাদেশ';
  } else if (digits.startsWith('88018') || digits.startsWith('018')) {
    carrier = 'Robi Axiata (018)';
    name = 'রবি মোবাইল কলার';
    city = 'চট্টগ্রাম / ঢাকা';
  } else if (digits.startsWith('88016') || digits.startsWith('016')) {
    carrier = 'Airtel Bangladesh (016)';
    name = 'এয়ারটেল মোবাইল কলার';
    city = 'বাংলাদেশ';
  } else if (digits.startsWith('88015') || digits.startsWith('015')) {
    carrier = 'Teletalk (015)';
    name = 'টেলিটক সরকারি সিম কলার';
    city = 'বাংলাদেশ';
  } else if (digits.includes('096') || digits.startsWith('096')) {
    carrier = 'IPTSP / Enterprise VoIP';
    name = 'কর্পোরেট কল সেন্টার / পিএবিএক্স';
    category = 'কর্পোরেট হেল্পলাইন';
    trustLevel = 'high';
    verified = true;
    suggestedAction = 'safe_to_answer';
    notes = 'অনুমোদিত আইপিটিএসপি (IPTSP) লাইসেন্সধারী করপোরেট ভার্চুয়াল নম্বর।';
  }

  // Known high risk patterns
  if (digits.startsWith('8801300') || digits.startsWith('01300')) {
    name = 'সন্দেহজনক ভুয়া লটারি কল (Scam Pattern)';
    category = 'আর্থিক প্রতারণা (Scam)';
    spamScore = 94;
    trustLevel = 'suspicious';
    suggestedAction = 'block_and_report';
    notes =
      'উচ্চ ঝুঁকির অফলাইন স্প্যাম প্যাটার্ন ম্যাচ করেছে। ভুয়া বিকাশ/নগদ লটারি প্রাইজ দাবি করতে পারে।';
  }

  return {
    phone,
    name,
    businessCategory: category,
    carrier,
    spamScore,
    spamReports: spamScore > 50 ? 180 : 0,
    city,
    country: 'Bangladesh',
    verified,
    notes,
    trustLevel,
    suggestedAction,
    source: 'gemini_fallback_heuristic',
    analyzedAt: Date.now(),
  };
}

/**
 * POST /api/caller-id/gemini-lookup
 * Real-time Live Caller ID metadata intelligence via Gemini 3.8 Flash
 */
app.post('/api/caller-id/gemini-lookup', async (req: Request, res: Response) => {
  const { phone, context } = req.body;

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ success: false, error: 'Phone number is required' });
    return;
  }

  const cleanPhone = phone.trim();

  // If Gemini API Key is missing, respond with intelligent rule-based metadata
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not defined. Using intelligent rule-based telecom fallback.');
    const fallbackData = getRuleBasedFallbackMetadata(cleanPhone);
    res.json({
      success: true,
      data: fallbackData,
      isSimulated: true,
      notice: 'Intelligent telecom heuristic engine applied (Gemini API key not configured)',
    });
    return;
  }

  try {
    const prompt = `Analyze this unknown phone number and generate live Caller ID metadata:
Phone Number: ${cleanPhone}
Context: ${context || 'Unknown incoming caller or manual directory search'}
Primary Region: Bangladesh (+880) and international phone networks.

Provide:
1. Likely Caller Name (in Bengali e.g. "দারাজ ডেলিভারি হাব", "বিকাশ হেল্পলাইন সাপোর্ট", "ফুডপ্যান্ডা রাইডার", "ব্যক্তিগত কলার (গ্রামীণফোন)", or specific service).
2. Business Category (e.g. "ই-কমার্স ও ডেলিভারি", "টেলিকম সাপোর্ট", "ব্যাংকিং ও ফাইন্যান্স", "ব্যক্তিগত কলার", "টেলিমার্কেটিং", "আর্থিক প্রতারণা (Scam)").
3. Mobile Carrier & Prefix (e.g. "Grameenphone (017)", "Banglalink (019)", "Robi (018)", "Teletalk (015)", "IPTSP VoIP (096)").
4. Spam Score: 0 (completely safe/verified) to 100 (fraud/scam).
5. Estimated spam reports count.
6. Likely City or Division in Bangladesh (or Country).
7. Verified badge (true if known official service/enterprise, false if personal/unknown).
8. Helpful explanatory note in Bengali assessing risk, carrier details, and identity.
9. trustLevel ('high', 'medium', 'low', 'suspicious').
10. suggestedAction ('safe_to_answer', 'verify_identity', 'block_and_report', 'telemarketing').`;

    let responseText: string | undefined;
    const config = {
      systemInstruction: `You are an expert telecom telecommunications intelligence and Caller ID analysis AI engine.
You provide precise, realistic, and protective Caller ID metadata for phone numbers in Bangladesh (+880) and global networks.
For normal mobile subscribers without known commercial affiliation, describe them respectfully as personal callers with low spam risk (0-15).
For known delivery, courier, banking, customer care or public utility series, accurately identify the organization and set verified=true.
For aggressive telemarketing, unsolicited robocalls, or financial fraud patterns (fake lottery, OTP harvesting), assign high spam scores (70-100), trustLevel='suspicious', and suggestedAction='block_and_report'.
All names and notes must be in natural, polite Bengali with English subtitles or terms where appropriate.
Return ONLY valid JSON according to the schema.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          phone: { type: Type.STRING },
          name: { type: Type.STRING },
          businessCategory: { type: Type.STRING },
          carrier: { type: Type.STRING },
          spamScore: { type: Type.INTEGER },
          spamReports: { type: Type.INTEGER },
          city: { type: Type.STRING },
          country: { type: Type.STRING },
          verified: { type: Type.BOOLEAN },
          notes: { type: Type.STRING },
          trustLevel: { type: Type.STRING },
          suggestedAction: { type: Type.STRING },
        },
        required: [
          'name',
          'businessCategory',
          'carrier',
          'spamScore',
          'spamReports',
          'city',
          'country',
          'verified',
          'notes',
          'trustLevel',
          'suggestedAction',
        ],
      },
    };

    // Attempt with primary model gemini-3.8-flash, falling back to gemini-2.5-flash if needed
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });
      responseText = response.text;
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash busy or failed, attempting gemini-2.5-flash:', primaryErr?.message);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config,
      });
      responseText = response.text;
    }
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedData = JSON.parse(responseText);
    const enrichedData = {
      phone: cleanPhone,
      name: parsedData.name || 'অপরিচিত কলার',
      businessCategory: parsedData.businessCategory || 'সাধারণ মোবাইল কলার',
      carrier: parsedData.carrier || 'মোবাইল নেটওয়ার্ক',
      spamScore: typeof parsedData.spamScore === 'number' ? parsedData.spamScore : 10,
      spamReports: typeof parsedData.spamReports === 'number' ? parsedData.spamReports : 0,
      city: parsedData.city || 'বাংলাদেশ',
      country: parsedData.country || 'Bangladesh',
      verified: Boolean(parsedData.verified),
      notes: parsedData.notes || 'Gemini AI লাইভ কলার আইডি ইন্টেলিজেন্স দ্বারা বিশ্লেষিত।',
      trustLevel: parsedData.trustLevel || 'medium',
      suggestedAction: parsedData.suggestedAction || 'verify_identity',
      source: 'gemini_api_live',
      analyzedAt: Date.now(),
    };

    res.json({
      success: true,
      data: enrichedData,
      isSimulated: false,
    });
  } catch (error: any) {
    console.error('Error invoking Gemini 3.8 Flash model:', error);
    // Provide graceful telecom fallback
    const fallbackData = getRuleBasedFallbackMetadata(cleanPhone);
    res.json({
      success: true,
      data: fallbackData,
      isSimulated: true,
      warning: error.message || 'Gemini API call encountered an error. Applied smart fallback.',
    });
  }
});

/**
 * Heuristic telecom pattern analyzer for call context fallback
 */
function generatePatternContextFallback(log: any, callerHistory: any[] = [], contact: any = null) {
  const callType = log?.type || 'incoming';
  const duration = Number(log?.duration) || 0;
  const isSpam = Boolean(log?.isSpam);
  const logTime = new Date(log?.timestamp || Date.now());
  const hours = logTime.getHours();
  const isLateHours = hours < 7 || hours >= 22;
  const nameLower = (log?.name || '').toLowerCase();
  const companyLower = (contact?.company || '').toLowerCase();

  // Pattern detection from history
  const phoneDigits = (log?.phone || '').replace(/[^0-9]/g, '');
  const sameCallerLogs = callerHistory.filter((h: any) => {
    const hDigits = (h?.phone || '').replace(/[^0-9]/g, '');
    return hDigits && (hDigits === phoneDigits || (h?.id !== log?.id && h?.name === log?.name));
  });

  const recentMissedCount =
    sameCallerLogs.filter((h: any) => h?.type === 'missed' || h?.type === 'rejected').length +
    (callType === 'missed' || callType === 'rejected' ? 1 : 0);
  const totalCalls = sameCallerLogs.length + 1;

  // Intent classification
  const isDelivery =
    nameLower.includes('daraz') ||
    nameLower.includes('food') ||
    nameLower.includes('pathao') ||
    nameLower.includes('courier') ||
    nameLower.includes('delivery') ||
    companyLower.includes('courier') ||
    companyLower.includes('delivery');

  const isBank =
    nameLower.includes('bank') ||
    nameLower.includes('bkash') ||
    nameLower.includes('nagad') ||
    nameLower.includes('finance') ||
    companyLower.includes('bank') ||
    companyLower.includes('fintech');

  const isCorporate = phoneDigits.startsWith('88096') || phoneDigits.startsWith('096') || Boolean(contact?.company);
  const isPersonal = Boolean(contact && !isCorporate && !isDelivery && !isBank);

  let urgency: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
  let urgencyReason = '';
  let businessIntent = '';
  let summary = '';
  let callerPatternInsight = '';
  let recommendedAction = '';
  let keyPoints: string[] = [];

  if (isSpam) {
    urgency = 'low';
    businessIntent = 'অবাঞ্ছিত প্রমোশনাল বা ফিশিং স্প্যাম (Spam Telemarketing)';
    urgencyReason = 'উচ্চ ঝুঁকির স্প্যাম রিপোর্ট ও সন্দেহজনক টেলিমার্কেটিং প্যাটার্ন শনাক্ত হয়েছে।';
    summary = `এই কলটি একটি সম্ভাব্য স্প্যাম বা অযাচিত কল (${log.spamCategory || 'Telemarketing'})। এটিতে কলব্যাক না করাই নিরাপদ।`;
    callerPatternInsight = `নম্বরটির বিরুদ্ধে স্প্যাম রিপোর্ট রয়েছে (${log.spamScore || 85}% স্প্যাম স্কোর)।`;
    recommendedAction = 'কলটি এড়িয়ে চলুন এবং নম্বরটি স্প্যাম তালিকায় যুক্ত বা ব্লক করুন।';
    keyPoints = [
      'সন্দেহজনক বাণিজ্যিক বা ভুয়া অফার প্যাটার্ন',
      'কোনো ব্যক্তিগত তথ্য বা ওটিপি (OTP) শেয়ার করবেন না',
      'প্রয়োজনে অটো-ব্লক সক্রিয় রাখুন',
    ];
  } else if (isDelivery) {
    urgency = recentMissedCount >= 1 ? 'urgent' : 'high';
    businessIntent = 'পার্সেল ডেলিভারি ও হ্যান্ডওভার (E-commerce Delivery)';
    urgencyReason =
      callType === 'missed'
        ? 'ডেলিভারি রাইডার অবস্থান যাচাই ও পার্সেল হস্তান্তরের জন্য যোগাযোগের চেষ্টা করেছেন।'
        : 'ডেলিভারি সংক্রান্ত সফল যোগাযোগ।';
    summary = `${log.name || 'ডেলিভারি রাইডার'} আপনার ঠিকানায় পার্সেল হস্তান্তরের উদ্দেশ্যে যোগাযোগ করেছেন। দ্রুত সাড়া না দিলে ডেলিভারি বিলম্বিত হতে পারে।`;
    callerPatternInsight = `ডেলিভারি রাইডাররা সাধারণত স্বল্প সময়ের ব্যবধানে একাধিকবার চেষ্টা করেন। (ইতিহাসে ${totalCalls}টি রেকর্ড)`;
    recommendedAction =
      callType === 'missed'
        ? 'অবিলম্বে রাইডারকে কলব্যাক করুন বা এসএমএসে কনফার্ম করুন।'
        : 'পার্সেল রিসিভ নিশ্চিত করে ট্র্যাকিং স্ট্যাটাস চেক করুন।';
    keyPoints = [
      'ডেলিভারি পয়েন্টে রাইডার অপেক্ষমাণ থাকতে পারে',
      'দেরি হলে পার্সেল হাব বা রিটার্নে ফেরত যেতে পারে',
      'দ্রুত কলব্যাক বা এসএমএস পাঠানো শ্রেয়',
    ];
  } else if (isBank) {
    urgency = 'high';
    businessIntent = 'ব্যাংকিং বা ফিনটেক একাউন্ট ভেরিফিকেশন (Financial Update)';
    urgencyReason = 'ব্যাংক বা মোবাইল ফাইন্যান্সিয়াল সার্ভিস সংক্রান্ত তথ্য হালনাগাদ বা লেনদেন যাচাই।';
    summary = `ব্যাংকিং বা ফিনটেক সার্ভিস সংক্রান্ত প্রাতিষ্ঠানিক যোগাযোগ। লেনদেন নিরাপত্তা বা অফিসিয়াল নোটিশ সংক্রান্ত হতে পারে।`;
    callerPatternInsight = 'প্রাতিষ্ঠানিক হেল্পলাইন বা সাপোর্ট ডেস্ক থেকে আগত কল।';
    recommendedAction = 'প্রয়োজনে ব্যাংকের অফিসিয়াল হেল্পলাইনে যোগাযোগ করুন (ব্যক্তিগত পিন বা ওটিপি কাউকে দেবেন না)।';
    keyPoints = [
      'অফিশিয়াল সার্ভিস চ্যানেল থেকে যোগাযোগ',
      'পিন বা ওটিপি কখনোই ফোনে শেয়ারযোগ্য নয়',
      'হেল্পলাইনে কনফার্মেশন নিন',
    ];
  } else if (callType === 'missed' || callType === 'rejected') {
    if (recentMissedCount >= 2 || isLateHours) {
      urgency = 'urgent';
      urgencyReason = isLateHours
        ? 'অস্বাভাবিক সময়ে (দেরী রাতে/ভোরে) কল এসেছে, জরুরি পারিবারিক বা অফিসিয়াল বিষয় হতে পারে।'
        : `সংক্ষিপ্ত সময়ের মধ্যে ${recentMissedCount}টি মিসড কল এসেছে — কলার জরুরি কোনো বিষয়ে সংযোগ চাইছেন।`;
    } else {
      urgency = 'high';
      urgencyReason = 'কলটি রিসিভ করা হয়নি, কলার আপনার সরাসরি উত্তরের অপেক্ষায় আছেন।';
    }
    businessIntent = isPersonal
      ? 'জরুরি ব্যক্তিগত বা পারিবারিক ফলোআপ (Personal Follow-up)'
      : 'অফিসিয়াল বা সাধারণ গুরুত্বপূর্ণ ফলোআপ (Direct Inquiry)';
    summary = `কলার (${log.name || 'অপরিচিত কলার'}) আপনার সাথে যোগাযোগের চেষ্টা করেছেন কিন্তু কলটি মিসড হয়েছে।${
      recentMissedCount > 1 ? ` ইতিপূর্বে আরও ${recentMissedCount - 1} বার চেষ্টা রেকর্ড হয়েছে।` : ''
    }`;
    callerPatternInsight = `কলার মোট ${totalCalls} বার যোগাযোগ করেছেন। রিসিভ না করায় বিষয়টি জরুরি হতে পারে।`;
    recommendedAction = 'যত দ্রুত সম্ভব নম্বরটিতে কলব্যাক করুন অথবা পরিস্থিতি জানিয়ে একটি সংক্ষিপ্ত এসএমএস পাঠান।';
    keyPoints = [
      `কলটি মিসড হয়েছে (${logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      recentMissedCount > 1 ? `পুনরাবৃত্তিমূলক কল (${recentMissedCount}টি মিসড)` : 'একক মিসড কল প্রচেষ্টা',
      'দেরি না করে কলব্যাক বা এসএমএস দিয়ে উত্তর দেওয়ার পরামর্শ',
    ];
  } else {
    // Connected incoming or outgoing
    if (duration > 180) {
      urgency = 'medium';
      businessIntent = isPersonal
        ? 'বিস্তারিত ব্যক্তিগত বা পারিবারিক আলোচনা (In-depth Conversation)'
        : 'ব্যবসায়িক বা অফিশিয়াল আলোচনা (Business Discussion)';
      summary = `কলার (${log.name || 'কলার'})-এর সাথে প্রায় ${Math.round(
        duration / 60
      )} মিনিট বিস্তারিত কথা হয়েছে। কোনো পেন্ডিং অ্যাকশন আইটেম থাকলে নোট করে রাখুন।`;
      callerPatternInsight = `দীর্ঘ আলোচনা (${Math.round(
        duration / 60
      )} মিনিট) নির্দেশ করে উভয়পক্ষের মধ্যে বিস্তারিত আলোচনা সম্পন্ন হয়েছে।`;
      recommendedAction = 'আলোচনার মূল সিদ্ধান্তসমূহ কল নোটে লিখে রাখুন এবং প্রয়োজনীয় ফলোআপ শিডিউল করুন।';
      keyPoints = [
        `সফল কল সম্পন্ন (সময়: ${Math.round(duration / 60)} মিনিট)`,
        'বিস্তারিত তথ্য আদান-প্রদান হয়েছে',
        'ফলোআপ রিমাইন্ডার সংরক্ষণ করুন',
      ];
    } else if (duration > 0 && duration <= 25) {
      urgency = 'medium';
      businessIntent = 'সংক্ষিপ্ত আপডেট বা সংযোগ ড্রপ (Quick Update / Dropped Call)';
      summary = `কলটি মাত্র ${duration} সেকেন্ড স্থায়ী ছিল। কথা শেষ হওয়ার আগেই কল ড্রপ হয়েছে অথবা একটি অতি সংক্ষিপ্ত বার্তা আদান-প্রদান হয়েছে।`;
      callerPatternInsight = 'খুব স্বল্প সময়ের কল — নেটওয়ার্ক সমস্যার কারণে কেটে গিয়ে থাকতে পারে।';
      recommendedAction = 'প্রয়োজনে কলব্যাক করে কথা সম্পন্ন হয়েছে কি না নিশ্চিত হয়ে নিন।';
      keyPoints = [
        `সংক্ষিপ্ত কল সময়কাল (${duration} সেকেন্ড)`,
        'সম্ভাব্য নেটওয়ার্ক বিচ্ছিন্নতা',
        'পুনরায় যোগাযোগ করা যেতে পারে',
      ];
    } else {
      urgency = 'low';
      businessIntent = isPersonal
        ? 'নিয়মিত ব্যক্তিগত যোগাযোগ (Casual Personal)'
        : 'স্বাভাবিক ব্যবসায়িক অনুসন্ধান (General Inquiry)';
      summary = `${log.name || 'কলার'}-এর সাথে স্বাভাবিক কল সম্পন্ন হয়েছে (${duration} সেকেন্ড)। কোনো জরুরি সংকট পরিলক্ষিত হয়নি।`;
      callerPatternInsight = `নম্বরটির সাথে স্বাভাবিক যোগাযোগের ইতিহাস বিদ্যমান।`;
      recommendedAction = 'বর্তমান পরিস্থিতিতে কোনো তাৎক্ষণিক পদক্ষেপের প্রয়োজন নেই।';
      keyPoints = [
        'স্বাভাবিক কল হিস্টোরি',
        'কোনো অস্বাভাবিক স্প্যাম ঝুঁকি নেই',
        'রুটিন যোগাযোগ হিসেবে চিহ্নিত',
      ];
    }
  }

  return {
    summary,
    urgency,
    urgencyReason,
    businessIntent,
    callerPatternInsight,
    recommendedAction,
    keyPoints,
    confidenceScore: 88,
    source: 'pattern_heuristic',
    analyzedAt: Date.now(),
  };
}

/**
 * POST /api/call-logs/gemini-context-summary
 * AI-driven Call Context & Urgency/Business Intent Analysis using Gemini 3.8 Flash
 */
app.post('/api/call-logs/gemini-context-summary', async (req: Request, res: Response) => {
  const { log, callerHistory = [], contact = null } = req.body;

  if (!log || !log.phone) {
    res.status(400).json({ success: false, error: 'Call log with phone number is required' });
    return;
  }

  // Graceful fallback if GEMINI_API_KEY is not defined
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not defined for call context summary. Using pattern heuristic.');
    const fallback = generatePatternContextFallback(log, callerHistory, contact);
    res.json({
      success: true,
      data: fallback,
      isSimulated: true,
      notice: 'Telecom behavioral heuristic engine applied (Gemini API key not configured)',
    });
    return;
  }

  try {
    const prompt = `Analyze this call log record and determine AI-driven context, urgency, and business intent based on the caller's known patterns:

TARGET CALL LOG:
- Phone: ${log.phone}
- Caller Name / Tag: ${log.name || 'Unknown'}
- Call Type: ${log.type} (incoming, outgoing, missed, rejected)
- Duration: ${log.duration || 0} seconds
- Timestamp: ${new Date(log.timestamp || Date.now()).toISOString()}
- Location / Carrier: ${log.location || 'Unknown'}
- Is Marked Spam: ${log.isSpam ? `Yes (${log.spamCategory || 'General'}, Score: ${log.spamScore || 0})` : 'No'}
- Saved Call Note: ${log.note || 'None'}

KNOWN CONTACT INFO:
${
  contact
    ? `- Contact Name: ${contact.name}
- Company/Org: ${contact.company || 'None'}
- Category/Tag: ${contact.tag || 'Personal'}
- Contact Note: ${contact.note || 'None'}`
    : 'Not in saved directory contacts.'
}

HISTORICAL CALL PATTERNS:
- Prior calls from this caller in logs: ${callerHistory.length}
- Historical call types breakdown: ${callerHistory.map((h: any) => `${h.type} (${h.duration}s)`).join(', ') || 'No prior logs'}

INSTRUCTIONS:
1. Identify likely Business Intent (e.g., E-commerce delivery handover, Banking verification, Urgent personal family call, Routine business discussion, Marketing cold call, Unsolicited spam).
2. Determine Urgency level ('urgent', 'high', 'medium', or 'low') with specific reasons explaining why (e.g., multiple missed calls in short succession, delivery rider waiting, late night attempt, or relaxed conversation).
3. Derive Caller Pattern Insight (frequency of attempts, pattern of unanswered calls, average call length).
4. Provide a clear, natural Summary in polite Bengali (with English subtitles/terms where helpful).
5. Provide a Recommended Action for the user (e.g., immediate callback, send quick SMS, mark as spam, archive).
6. Provide 2-3 key takeaway bullet points.
Return JSON strictly according to the schema.`;

    const config = {
      systemInstruction: `You are an elite telecom intelligence and call priority AI assistant.
You provide precise, actionable, and realistic analysis of phone call records in Bangladesh (+880) and global networks.
For missed calls from courier/delivery services (e.g. Daraz, Pathao, Redx, Foodpanda), mark as urgent/high with advice to callback immediately.
For spam or fraudulent patterns, mark urgency='low', businessIntent='Spam Telemarketing', and advise blocking.
For multiple missed calls or late-night calls, assess high or urgent priority.
All summaries, urgency reasons, and actions should be in polite, natural Bengali with English terms in parentheses where appropriate.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          urgency: { type: Type.STRING },
          urgencyReason: { type: Type.STRING },
          businessIntent: { type: Type.STRING },
          callerPatternInsight: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          confidenceScore: { type: Type.INTEGER },
        },
        required: [
          'summary',
          'urgency',
          'urgencyReason',
          'businessIntent',
          'callerPatternInsight',
          'recommendedAction',
          'keyPoints',
        ],
      },
    };

    let responseText: string | undefined;

    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ]);

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config,
        }),
        12000,
        'gemini-3.8-flash'
      );
      responseText = response.text;
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash unavailable or timed out, trying gemini-2.5-flash:', primaryErr?.message);
      try {
        const fallbackResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config,
          }),
          10000,
          'gemini-2.5-flash'
        );
        responseText = fallbackResponse.text;
      } catch (secErr: any) {
        console.warn('gemini-2.5-flash also unavailable or timed out:', secErr?.message);
      }
    }

    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(responseText);
    const validUrgency: 'urgent' | 'high' | 'medium' | 'low' = ['urgent', 'high', 'medium', 'low'].includes(
      parsed.urgency
    )
      ? parsed.urgency
      : 'medium';

    const enriched = {
      summary: parsed.summary || 'কলটির কনটেক্সট সফলভাবে বিশ্লেষণ করা হয়েছে।',
      urgency: validUrgency,
      urgencyReason: parsed.urgencyReason || '',
      businessIntent: parsed.businessIntent || 'সাধারণ যোগাযোগ',
      callerPatternInsight: parsed.callerPatternInsight || 'কল প্যাটার্ন বিশ্লেষণ সম্পন্ন।',
      recommendedAction: parsed.recommendedAction || 'প্রয়োজন অনুযায়ী যোগাযোগ করুন।',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 92,
      source: 'gemini_api_live',
      analyzedAt: Date.now(),
    };

    res.json({
      success: true,
      data: enriched,
      isSimulated: false,
    });
  } catch (err: any) {
    console.error('Error in Gemini call context summary:', err?.message || err);
    const fallback = generatePatternContextFallback(log, callerHistory, contact);
    res.json({
      success: true,
      data: fallback,
      isSimulated: true,
      warning: err.message || 'Gemini API unavailable. Applied smart behavioral fallback.',
    });
  }
});

// ==========================================
// FINTECH SECURITY & SIM/IP DETECTION APIS
// ==========================================

/**
 * GET /api/security/client-info
 * Returns real-time IP, carrier ASN intelligence, and proxy header analysis
 */
app.get('/api/security/client-info', (req: Request, res: Response) => {
  const simulatedIp = req.query.simulatedIp as string | undefined;
  const inspection = inspectClientNetwork(req, simulatedIp);
  res.json({
    success: true,
    clientIp: inspection.ip,
    carrier: inspection.carrier,
    asn: inspection.asn,
    operatorType: inspection.operatorType,
    isMobile: inspection.isMobile,
    isVpnOrProxy: inspection.isVpnOrProxy,
    country: inspection.country,
    city: inspection.city,
    proxyHeaders: inspection.proxyHeadersFound,
  });
});

/**
 * GET /api/security/sim-state
 * Returns current SIM card binding state and swap detection flag
 */
app.get('/api/security/sim-state', (_req: Request, res: Response) => {
  const simState = securityDb.getSimState();
  const user = securityDb.getUser();
  res.json({
    success: true,
    simState,
    user: {
      name: user.name,
      phone: user.phone,
      riskTier: user.riskTier,
      lastSimChangeTimestamp: user.lastSimChangeTimestamp,
    },
  });
});

/**
 * POST /api/security/sim-swap
 * Triggers simulated SIM swap detection
 */
app.post('/api/security/sim-swap', (req: Request, res: Response) => {
  const { newCarrier } = req.body || {};
  const updatedSim = securityDb.triggerSimSwap(newCarrier || 'Robi 4G (Swapped SIM)');
  res.json({
    success: true,
    message: 'SIM card swap event triggered and flagged in security engine',
    simState: updatedSim,
  });
});

/**
 * POST /api/security/sim-reset
 * Resets SIM card state to active/safe
 */
app.post('/api/security/sim-reset', (_req: Request, res: Response) => {
  const restoredSim = securityDb.resetSimState();
  res.json({
    success: true,
    message: 'SIM status restored to verified primary card',
    simState: restoredSim,
  });
});

/**
 * GET /api/security/alerts
 * Returns security incidents and alerts
 */
app.get('/api/security/alerts', (_req: Request, res: Response) => {
  const alerts = securityDb.getAlerts();
  res.json({
    success: true,
    alerts,
  });
});

/**
 * GET /api/security/transactions
 * Returns transaction audit history
 */
app.get('/api/security/transactions', (_req: Request, res: Response) => {
  const transactions = securityDb.getTransactions();
  res.json({
    success: true,
    transactions,
  });
});

/**
 * POST /api/security/process-transaction
 * Evaluates real-time risk score and takes action: ALLOW, REQUIRE_2FA_OTP, HOLD, BLOCK
 */
app.post('/api/security/process-transaction', async (req: Request, res: Response) => {
  const {
    amount = 5000,
    currency = 'BDT',
    channel = 'BKASH',
    recipient = '01712000000',
    deviceHash,
    simulatedIp,
    forceSimSwap,
  } = req.body || {};

  const user = securityDb.getUser();
  const simState = securityDb.getSimState();
  const inspection = inspectClientNetwork(req, simulatedIp);

  const isSwapped = Boolean(forceSimSwap || simState.isSimSwapSuspected);
  let minutesAgo = undefined;
  if (simState.swappedAt) {
    minutesAgo = (Date.now() - simState.swappedAt) / (1000 * 60);
  }

  const assessment = calculateFintechRisk({
    userId: user.id,
    amount: Number(amount),
    deviceHash,
    clientIpInspection: inspection,
    isSimSwapSuspected: isSwapped,
    simSwappedMinutesAgo: minutesAgo,
  });

  // Record transaction in audit log
  const txRecord = securityDb.addTransaction({
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    amount: Number(amount),
    currency: String(currency),
    channel: String(channel),
    recipient: String(recipient),
    clientIp: inspection.ip,
    carrier: inspection.carrier,
    asn: inspection.asn,
    riskScore: assessment.riskScore,
    decision: assessment.decision,
    reasons: assessment.reasons,
    simSwapped: isSwapped,
    vpnDetected: inspection.isVpnOrProxy,
  });

  // If high risk or blocked, trigger security alert & Telegram dispatch
  let telegramResult = undefined;
  if (assessment.riskScore >= 60 || assessment.decision === 'BLOCK_FRAUD') {
    const alert = securityDb.createAlert({
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      severity: assessment.riskScore >= 80 ? 'CRITICAL' : 'HIGH',
      alertType: isSwapped ? 'SIM_SWAP_DETECTED' : 'UNUSUAL_IP_CARRIER',
      title:
        assessment.decision === 'BLOCK_FRAUD'
          ? '🚫 সন্দেহজনক লেনদেন স্বয়ংক্রিয় ব্লক (Auto-Blocked Fraud)'
          : '⚠️ সন্দেহজনক লেনদেন রিভিউতে পাঠানো হয়েছে (Transaction on Hold)',
      description: `গ্রাহক ${user.phone} কর্তৃক ৳${amount} লেনদেনের চেষ্টায় রিস্ক স্কোর ${
        assessment.riskScore
      }/100 ধরা পড়েছে। কারণ: ${assessment.reasons.join(', ')}।`,
      ipAddress: inspection.ip,
      carrier: inspection.carrier,
      riskScore: assessment.riskScore,
      telegramDispatched: false,
      isResolved: false,
    });

    telegramResult = await dispatchTelegramSecurityAlert({
      alert,
    });

    if (telegramResult.success) {
      alert.telegramDispatched = true;
      alert.telegramMessageId = telegramResult.messageId;
    }
  }

  res.json({
    success: true,
    transactionId: txRecord.id,
    riskScore: assessment.riskScore,
    decision: assessment.decision,
    reasons: assessment.reasons,
    timestamp: Date.now(),
    clientIp: inspection.ip,
    carrier: inspection.carrier,
    asn: inspection.asn,
    isMobileCarrier: inspection.isMobile,
    isVpnOrProxy: inspection.isVpnOrProxy,
    deviceMatch: true,
    simSwapDetected: isSwapped,
    telegramAlertSent: telegramResult?.success,
    telegramSimulated: telegramResult?.simulated,
  });
});

/**
 * POST /api/security/telegram/test
 * Test sending or simulating a Telegram security alert
 */
app.post('/api/security/telegram/test', async (req: Request, res: Response) => {
  const { botToken, chatId } = req.body || {};
  const user = securityDb.getUser();
  const simState = securityDb.getSimState();

  const testAlert: SecurityAlertRecord = {
    id: `alt_test_${Date.now()}`,
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    severity: 'CRITICAL',
    alertType: 'SIM_SWAP_DETECTED',
    title: '🔔 টেস্ট ফিনটেক সিকিউরিটি অ্যালার্ট (Test Telegram Webhook)',
    description: 'এটি একটি টেস্ট অ্যালার্ট। মোবাইল ডাটা আইপি ট্র্যাকিং ও সিম চেঞ্জ সিস্টেম সফলভাবে লিংক হয়েছে।',
    ipAddress: '103.205.18.42',
    carrier: simState.carrierName,
    riskScore: 92,
    telegramDispatched: true,
    isResolved: false,
  };

  const result = await dispatchTelegramSecurityAlert({
    botToken,
    chatId,
    alert: testAlert,
  });

  res.json({
    success: result.success,
    simulated: result.simulated,
    messageId: result.messageId,
    error: result.error,
  });
});

// Setup Vite in development or static file serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
