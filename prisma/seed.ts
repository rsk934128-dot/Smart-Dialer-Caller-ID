import { PrismaClient, RiskTier, SimStatus, NetworkType, TransactionChannel, TransactionStatus, AlertSeverity, AlertType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FinTech Security & Mobile Data IP Tracking Database...');

  // 1. Create Verified Demo User
  const user = await prisma.user.upsert({
    where: { phoneNumber: '+8801711234567' },
    update: {},
    create: {
      phoneNumber: '+8801711234567',
      fullName: 'মো: রফিকুল ইসলাম (Md. Rafiqul Islam)',
      email: 'rafiqul.islam@example.com',
      riskTier: RiskTier.LOW,
      lastLoginIp: '37.111.45.102',
      lastCarrier: 'Grameenphone 4G',
    },
  });

  // 2. Register User's Primary Hardware Device
  const device = await prisma.device.upsert({
    where: { deviceHash: 'dev_bd_primary_gp_user' },
    update: {},
    create: {
      userId: user.id,
      deviceHash: 'dev_bd_primary_gp_user',
      canvasFingerprint: 'cv_7a8b9c1d',
      webglRenderer: 'ANGLE (ARM, Mali-G78 MP14, OpenGL ES 3.2)',
      platform: 'Android aarch64',
      hardwareConcurrency: 8,
      deviceMemoryGb: 8.0,
      screenResolution: '1080x2400',
      isTrusted: true,
    },
  });

  // 3. Register Primary SIM Card Binding
  const sim = await prisma.simCardBinding.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      simSlot: 1,
      iccidHash: 'iccid_sha256_verified_gp_primary',
      imsiMasked: '47001******1234',
      carrierName: 'Grameenphone 4G',
      carrierMccMnc: '470-01',
      operatorAsn: 'AS24389',
      status: SimStatus.ACTIVE,
    },
  });

  // 4. Create Historical IP Audit Log (Normal Mobile Data)
  await prisma.ipAuditLog.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      ipAddress: '37.111.45.102',
      networkType: NetworkType.MOBILE_DATA,
      connectionTech: '4G LTE',
      carrier: 'Grameenphone Ltd',
      asn: 'AS24389',
      country: 'BD',
      city: 'Dhaka',
      riskScore: 5,
      matchedSubnet: true,
    },
  });

  // 5. Seed Risk Policy Rules
  const policyRules = [
    { ruleKey: 'SIM_SWAP_48H', name: 'সিম সোয়াপ পেনাল্টি (SIM Swapped within 48h)', weight: 55 },
    { ruleKey: 'DATACENTER_VPN', name: 'ভিপিএন/প্রক্সি ক্লাউড আইপি (Datacenter / VPN IP)', weight: 35 },
    { ruleKey: 'CARRIER_ANOMALY', name: 'অস্বাভাবিক আন্তর্জাতিক ক্যারিয়ার (Carrier Anomaly)', weight: 30 },
    { ruleKey: 'HIGH_VALUE_TX', name: 'উচ্চ মূল্যের ট্রানজেকশন (High Value ৳25k+)', weight: 15 },
  ];

  for (const rule of policyRules) {
    await prisma.riskPolicyRule.upsert({
      where: { ruleKey: rule.ruleKey },
      update: { weight: rule.weight },
      create: {
        ruleKey: rule.ruleKey,
        name: rule.name,
        description: `Automated risk deduction for ${rule.name}`,
        weight: rule.weight,
        isEnabled: true,
      },
    });
  }

  console.log(`Database seeded successfully! User: ${user.fullName} (${user.phoneNumber}) with SIM ID ${sim.id}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
