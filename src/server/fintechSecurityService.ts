import { Request } from 'express';

// Bangladesh Carrier & ASN Intelligence Database
export interface CarrierAsnRecord {
  asn: string;
  name: string;
  type: 'mobile_data' | 'broadband_isp' | 'datacenter_vpn';
  country: string;
  mccMnc?: string;
  subnets: string[];
  isMobile: boolean;
}

export const BD_CARRIERS: CarrierAsnRecord[] = [
  {
    asn: 'AS24389',
    name: 'Grameenphone 4G/5G (Telenor)',
    type: 'mobile_data',
    country: 'BD',
    mccMnc: '470-01',
    subnets: ['37.111.', '103.205.', '114.130.', '202.134.'],
    isMobile: true,
  },
  {
    asn: 'AS24432',
    name: 'Robi Axiata Ltd 4G (Airtel)',
    type: 'mobile_data',
    country: 'BD',
    mccMnc: '470-02',
    subnets: ['119.30.', '180.234.', '103.230.', '123.49.'],
    isMobile: true,
  },
  {
    asn: 'AS38266',
    name: 'Banglalink Digital Communications 4G',
    type: 'mobile_data',
    country: 'BD',
    mccMnc: '470-03',
    subnets: ['103.4.', '118.179.', '175.107.'],
    isMobile: true,
  },
  {
    asn: 'AS24431',
    name: 'Teletalk Bangladesh Ltd (Govt 4G/5G)',
    type: 'mobile_data',
    country: 'BD',
    mccMnc: '470-04',
    subnets: ['180.211.', '103.197.'],
    isMobile: true,
  },
  {
    asn: 'AS17494',
    name: 'Link3 Technologies Broadband',
    type: 'broadband_isp',
    country: 'BD',
    subnets: ['118.67.', '202.51.'],
    isMobile: false,
  },
  {
    asn: 'AS58682',
    name: 'Summit Communications Ltd (NTTN/ISP)',
    type: 'broadband_isp',
    country: 'BD',
    subnets: ['103.239.'],
    isMobile: false,
  },
  {
    asn: 'AS23924',
    name: 'BTCL (Bangladesh Telecommunications Co Ltd)',
    type: 'broadband_isp',
    country: 'BD',
    subnets: ['203.112.'],
    isMobile: false,
  },
  {
    asn: 'AS14061',
    name: 'DigitalOcean Cloud / VPN Proxy',
    type: 'datacenter_vpn',
    country: 'US',
    subnets: ['138.68.', '165.227.', '159.203.'],
    isMobile: false,
  },
  {
    asn: 'AS9009',
    name: 'M247 Ltd / Commercial VPN Exit Node',
    type: 'datacenter_vpn',
    country: 'NL',
    subnets: ['185.156.', '193.36.'],
    isMobile: false,
  },
];

export interface ClientNetworkInspection {
  ip: string;
  carrier: string;
  asn: string;
  operatorType: 'mobile_data' | 'broadband_isp' | 'datacenter_vpn' | 'unknown';
  isMobile: boolean;
  isVpnOrProxy: boolean;
  country: string;
  city: string;
  proxyHeadersFound: string[];
}

/**
 * Parses client IP and identifies proxy/VPN headers from express request
 */
export function inspectClientNetwork(req: Request, simulatedIp?: string): ClientNetworkInspection {
  // If simulation IP was passed (for testing attacks), honor it
  let rawIp = simulatedIp;

  if (!rawIp) {
    const cfIp = req.headers['cf-connecting-ip'] as string;
    const xForwardedFor = req.headers['x-forwarded-for'] as string;
    const xRealIp = req.headers['x-real-ip'] as string;
    const remoteAddr = req.socket?.remoteAddress;

    if (cfIp) {
      rawIp = cfIp.trim();
    } else if (xForwardedFor) {
      rawIp = xForwardedFor.split(',')[0].trim();
    } else if (xRealIp) {
      rawIp = xRealIp.trim();
    } else if (remoteAddr) {
      rawIp = remoteAddr.trim();
    } else {
      rawIp = '127.0.0.1';
    }
  }

  // Strip IPv6-mapped IPv4
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  }

  // Detect Proxy / VPN / Forwarding headers
  const proxyHeadersFound: string[] = [];
  const checkHeaders = [
    'via',
    'x-forwarded-proto',
    'x-forwarded-host',
    'forwarded',
    'proxy-connection',
    'x-proxy-id',
  ];

  for (const h of checkHeaders) {
    if (req.headers[h]) {
      proxyHeadersFound.push(h);
    }
  }

  // ASN / Carrier Matching
  let matchedCarrier: CarrierAsnRecord | undefined;
  for (const c of BD_CARRIERS) {
    for (const sub of c.subnets) {
      if (rawIp.startsWith(sub)) {
        matchedCarrier = c;
        break;
      }
    }
    if (matchedCarrier) break;
  }

  if (matchedCarrier) {
    return {
      ip: rawIp,
      carrier: matchedCarrier.name,
      asn: matchedCarrier.asn,
      operatorType: matchedCarrier.type,
      isMobile: matchedCarrier.isMobile,
      isVpnOrProxy: matchedCarrier.type === 'datacenter_vpn' || proxyHeadersFound.length > 2,
      country: matchedCarrier.country,
      city: matchedCarrier.country === 'BD' ? 'Dhaka' : 'Foreign Hub',
      proxyHeadersFound,
    };
  }

  // Local / Private / Unknown range defaults
  if (rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.') || rawIp.startsWith('10.')) {
    return {
      ip: rawIp,
      carrier: 'Local Development Network / Simulated GP 4G',
      asn: 'AS24389 (Simulated Mobile Data)',
      operatorType: 'mobile_data',
      isMobile: true,
      isVpnOrProxy: false,
      country: 'BD',
      city: 'Dhaka',
      proxyHeadersFound,
    };
  }

  return {
    ip: rawIp,
    carrier: 'Standard Internet Service Provider',
    asn: 'AS_DYNAMIC_PEER',
    operatorType: 'broadband_isp',
    isMobile: false,
    isVpnOrProxy: proxyHeadersFound.length > 0,
    country: 'BD',
    city: 'Bangladesh',
    proxyHeadersFound,
  };
}

// In-Memory Database store for demo & realtime synchronization
export interface UserSecurityProfile {
  id: string;
  name: string;
  phone: string;
  registeredDeviceHash: string;
  registeredSimIccid: string;
  registeredSimCarrier: string;
  registeredSimStatus: 'ACTIVE' | 'SWAPPED' | 'REVOKED';
  lastSimChangeTimestamp: number | null;
  trustedCarrierAsn: string;
  lastKnownIp: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SecurityAlertRecord {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userPhone: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertType: string;
  title: string;
  description: string;
  ipAddress: string;
  carrier: string;
  riskScore: number;
  telegramDispatched: boolean;
  telegramMessageId?: string;
  isResolved: boolean;
}

export interface TransactionAuditRecord {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  currency: string;
  channel: string;
  recipient: string;
  clientIp: string;
  carrier: string;
  asn: string;
  riskScore: number;
  decision: 'ALLOW' | 'REQUIRE_2FA_OTP' | 'HOLD_TRANSACTION' | 'BLOCK_FRAUD';
  reasons: string[];
  simSwapped: boolean;
  vpnDetected: boolean;
}

// Seed Database State
class SecurityDatabaseService {
  private users: Map<string, UserSecurityProfile> = new Map();
  private alerts: SecurityAlertRecord[] = [];
  private transactions: TransactionAuditRecord[] = [];
  private currentSimState = {
    simSlot: 1 as 1 | 2,
    carrierName: 'Grameenphone 4G',
    iccidMasked: '8988001712******4821',
    iccidHash: 'iccid_gp_primary_4821',
    imsiMasked: '47001******1234',
    status: 'ACTIVE' as 'ACTIVE' | 'SWAPPED' | 'REVOKED' | 'SUSPICIOUS',
    swappedAt: null as number | null,
    isSimSwapSuspected: false,
  };

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const defaultUser: UserSecurityProfile = {
      id: 'usr_fintech_01',
      name: 'মো: রফিকুল ইসলাম (Md. Rafiqul Islam)',
      phone: '+8801711234567',
      registeredDeviceHash: 'dev_bd_primary',
      registeredSimIccid: 'iccid_gp_primary_4821',
      registeredSimCarrier: 'Grameenphone 4G',
      registeredSimStatus: 'ACTIVE',
      lastSimChangeTimestamp: null,
      trustedCarrierAsn: 'AS24389',
      lastKnownIp: '37.111.45.102',
      riskTier: 'LOW',
    };
    this.users.set(defaultUser.id, defaultUser);
  }

  public getUser(id = 'usr_fintech_01'): UserSecurityProfile {
    return this.users.get(id) || this.users.values().next().value!;
  }

  public getSimState() {
    return this.currentSimState;
  }

  public triggerSimSwap(newCarrier = 'Robi 4G (Swapped SIM)') {
    const now = Date.now();
    this.currentSimState = {
      simSlot: 1,
      carrierName: newCarrier,
      iccidMasked: '8988001899******9901',
      iccidHash: `iccid_swap_${now.toString().slice(-4)}`,
      imsiMasked: '47002******9901',
      status: 'SWAPPED',
      swappedAt: now,
      isSimSwapSuspected: true,
    };

    const user = this.getUser();
    user.registeredSimStatus = 'SWAPPED';
    user.lastSimChangeTimestamp = now;
    user.riskTier = 'CRITICAL';

    // Add immediate security alert
    this.createAlert({
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      severity: 'CRITICAL',
      alertType: 'SIM_SWAP_DETECTED',
      title: '🚨 সিম কার্ড পরিবর্তন শনাক্ত হয়েছে (SIM Swap Detected)',
      description: `গ্রাহক ${user.phone}-এর সিম কার্ডে পরিবর্তন ধরা পড়েছে। নতুন ICCID Hash: ${this.currentSimState.iccidHash}। পরবর্তী আর্থিক লেনদেন তাৎক্ষণিক লক করা হয়েছে।`,
      ipAddress: user.lastKnownIp,
      carrier: newCarrier,
      riskScore: 95,
      telegramDispatched: false,
      isResolved: false,
    });

    return this.currentSimState;
  }

  public resetSimState() {
    this.currentSimState = {
      simSlot: 1,
      carrierName: 'Grameenphone 4G',
      iccidMasked: '8988001712******4821',
      iccidHash: 'iccid_gp_primary_4821',
      imsiMasked: '47001******1234',
      status: 'ACTIVE',
      swappedAt: null,
      isSimSwapSuspected: false,
    };

    const user = this.getUser();
    user.registeredSimStatus = 'ACTIVE';
    user.lastSimChangeTimestamp = null;
    user.riskTier = 'LOW';
    return this.currentSimState;
  }

  public createAlert(record: Omit<SecurityAlertRecord, 'id' | 'timestamp'>): SecurityAlertRecord {
    const alert: SecurityAlertRecord = {
      id: `alt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      ...record,
    };
    this.alerts.unshift(alert);
    // Keep max 50 in memory
    if (this.alerts.length > 50) {
      this.alerts.pop();
    }
    return alert;
  }

  public getAlerts(): SecurityAlertRecord[] {
    return this.alerts;
  }

  public addTransaction(record: Omit<TransactionAuditRecord, 'id' | 'timestamp'>): TransactionAuditRecord {
    const tx: TransactionAuditRecord = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      ...record,
    };
    this.transactions.unshift(tx);
    if (this.transactions.length > 50) {
      this.transactions.pop();
    }
    return tx;
  }

  public getTransactions(): TransactionAuditRecord[] {
    return this.transactions;
  }
}

export const securityDb = new SecurityDatabaseService();

/**
 * 3. Dynamic Risk Scoring Engine
 * Evaluates device fingerprint, IP subnet, telecom carrier, SIM card binding, and transaction parameters.
 */
export function calculateFintechRisk(params: {
  userId: string;
  amount: number;
  deviceHash?: string;
  clientIpInspection: ClientNetworkInspection;
  isSimSwapSuspected: boolean;
  simSwappedMinutesAgo?: number;
}): {
  riskScore: number;
  decision: 'ALLOW' | 'REQUIRE_2FA_OTP' | 'HOLD_TRANSACTION' | 'BLOCK_FRAUD';
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  const { amount, clientIpInspection, isSimSwapSuspected, simSwappedMinutesAgo } = params;

  // Factor 1: SIM Card Swap / Change Detection (Major Red Flag in FinTech)
  if (isSimSwapSuspected) {
    score += 55;
    reasons.push(
      `🚨 সাম্প্রতিক সিম কার্ড পরিবর্তন শনাক্ত (SIM Swapped within ${
        simSwappedMinutesAgo !== undefined ? Math.round(simSwappedMinutesAgo) : 10
      } mins)`
    );
  }

  // Factor 2: Datacenter IP, VPN or Proxy
  if (clientIpInspection.isVpnOrProxy) {
    score += 35;
    reasons.push(
      `🌐 অজ্ঞাত ক্লাউড/ভিপিএন প্রক্সি আইপি ব্যবহৃত হচ্ছে (${clientIpInspection.carrier})`
    );
  }

  // Factor 3: Carrier Mismatch (Expected BD Mobile Data, but got Foreign ASN or Unknown)
  if (!clientIpInspection.isMobile && clientIpInspection.country !== 'BD') {
    score += 30;
    reasons.push(`🌍 অস্বাভাবিক আন্তর্জাতিক ভৌগোলিক অবস্থান (${clientIpInspection.country})`);
  } else if (!clientIpInspection.isMobile && clientIpInspection.operatorType === 'broadband_isp') {
    // Shared Wi-Fi / Broadband is slightly higher risk than authenticated 4G mobile data
    score += 15;
    reasons.push(`📶 মোবাইল সিম ডাটার পরিবর্তে ব্রডব্যান্ড/ওয়াইফাই নেটওয়ার্ক সংযুক্ত`);
  }

  // Factor 4: High Value Transaction under Unverified Conditions
  if (amount >= 25000) {
    score += 15;
    reasons.push(`💰 উচ্চমাত্রার আর্থিক লেনদেন (৳${amount.toLocaleString('en-US')})`);
  } else if (amount >= 10000) {
    score += 8;
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(5, score));

  // Determine Automated Action
  let decision: 'ALLOW' | 'REQUIRE_2FA_OTP' | 'HOLD_TRANSACTION' | 'BLOCK_FRAUD';
  if (finalScore >= 80) {
    decision = 'BLOCK_FRAUD';
  } else if (finalScore >= 60) {
    decision = 'HOLD_TRANSACTION';
  } else if (finalScore >= 30) {
    decision = 'REQUIRE_2FA_OTP';
  } else {
    decision = 'ALLOW';
  }

  return {
    riskScore: finalScore,
    decision,
    reasons,
  };
}

/**
 * 4. Telegram Security Alert Dispatcher
 * Sends real security alerts to Telegram Bot API or simulates dispatch
 */
export async function dispatchTelegramSecurityAlert(params: {
  botToken?: string;
  chatId?: string;
  alert: SecurityAlertRecord;
}): Promise<{ success: boolean; simulated: boolean; error?: string; messageId?: string }> {
  const token = params.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chat = params.chatId || process.env.TELEGRAM_CHAT_ID;

  const formattedMessage = `🚨 [SMART DIALER FINTECH SHIELD ALERT] 🚨
-----------------------------------
⚠️ স্তর (Severity): ${params.alert.severity}
📌 ইভেন্ট (Event): ${params.alert.title}
👤 গ্রাহক: ${params.alert.userName} (${params.alert.userPhone})
🌐 ক্লায়েন্ট আইপি: ${params.alert.ipAddress}
📶 অপারেটর/ক্যারিয়ার: ${params.alert.carrier}
📊 রিস্ক স্কোর: ${params.alert.riskScore}/100
📝 বিবরণ: ${params.alert.description}
⏰ সময়: ${new Date(params.alert.timestamp).toLocaleString('bn-BD')}
-----------------------------------
🛡️ অ্যাকশন নেওয়া হয়েছে: লেনদেন সাময়িক স্থগিত / ব্লক করা হয়েছে।`;

  if (!token || !chat) {
    // Clean mock simulation if bot credentials are not supplied in env
    return {
      success: true,
      simulated: true,
      messageId: `msg_${Math.floor(Math.random() * 90000 + 10000)}`,
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: formattedMessage,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return {
        success: true,
        simulated: false,
        messageId: String(data.result?.message_id),
      };
    } else {
      return {
        success: false,
        simulated: false,
        error: data.description || 'Telegram API rejected message',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      simulated: false,
      error: err.message || 'Failed to connect to Telegram API',
    };
  }
}
