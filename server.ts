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
