import { roomDb } from './database';
import { contactDao } from './daos/contactDao';
import { callLogDao, CallLogStats } from './daos/callLogDao';
import { spamDao } from './daos/spamDao';
import { callerIdDao } from './daos/callerIdDao';
import { smsDao } from './daos/smsDao';
import { Contact, CallLog, CallerIdRecord, SpamEntity, RoomDbMetrics, SmsMessage, BackupMetadata } from '../types';
import { INITIAL_CONTACTS, INITIAL_CALL_LOGS, INITIAL_SMS_MESSAGES, CALLER_ID_DATABASE, normalizePhone } from '../data/mockData';

export interface OfflineLookupResult {
  record: CallerIdRecord;
  source: 'contact' | 'spam_list' | 'caller_id_cache' | 'heuristic_rule' | 'unknown';
  latencyMs: number;
  isSpam: boolean;
  isBlocked: boolean;
  isContact: boolean;
}

/**
 * Android Room Database Service & Repository Layer
 * 
 * Simulates Android's:
 * - AppDatabase (Room database singleton)
 * - Repository Pattern (OfflineRoomRepository)
 * - Dispatchers.IO background coroutine execution
 * - Sub-2ms instant local SQLite table queries
 */
export class RoomDatabaseService {
  private isInitialized = false;
  private lastLookupTimeMs = 0;
  private listeners: Array<() => void> = [];

  // Expose DAOs directly for fine-grained access
  public readonly contacts = contactDao;
  public readonly callLogs = callLogDao;
  public readonly spam = spamDao;
  public readonly callerId = callerIdDao;
  public readonly messages = smsDao;
  public readonly sms = smsDao;

  /**
   * Subscribe to database state changes
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Room DB listener error:', err);
      }
    }
  }

  /**
   * Initializes the Room database with default datasets if empty
   */
  async initializeDatabase(forceReset = false): Promise<RoomDbMetrics> {
    const isSeeded = await roomDb.dbMetadata.get('is_seeded');

    if (!isSeeded || forceReset) {
      if (forceReset) {
        await roomDb.contacts.clear();
        await roomDb.callLogs.clear();
        await roomDb.spamList.clear();
        await roomDb.callerIdCache.clear();
        await roomDb.messages.clear();
        await roomDb.dbMetadata.clear();
      }

      // 1. Seed Contacts
      await contactDao.bulkInsert(INITIAL_CONTACTS);

      // 2. Seed Call Logs
      await callLogDao.bulkInsert(INITIAL_CALL_LOGS);

      // 3. Seed Caller ID Directory Cache
      const callerIdList: CallerIdRecord[] = Object.values(CALLER_ID_DATABASE);
      await callerIdDao.bulkInsert(callerIdList);

      // 4. Seed Known Spam Numbers in Room Database
      const initialSpamList: SpamEntity[] = [
        {
          phone: '+880 1300-998811',
          normalizedPhone: '+8801300998811',
          name: 'লটারি ও ফেক প্রাইজ (Scam)',
          category: 'আর্থিক প্রতারণা (Scam)',
          score: 98,
          reportsCount: 1420,
          isBlocked: true,
          notes: 'ভুয়া বিকাশ/নগদ লটারি প্রাইজ জেতার দাবি করে ওটিপি চায়।',
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        },
        {
          phone: '+880 1999-443322',
          normalizedPhone: '+8801999443322',
          name: 'দ্রুত ঋণ ও ক্রেডিট কার্ড সার্ভিস',
          category: 'টেলিমার্কেটিং ও স্প্যাম',
          score: 88,
          reportsCount: 512,
          isBlocked: true,
          notes: 'অপ্রয়োজনীয় পার্সোনাল লোন অফারের জন্য বারবার কল দেয়।',
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        },
        {
          phone: '+880 1888-776655',
          normalizedPhone: '+8801888776655',
          name: 'রিয়েল এস্টেট ফ্ল্যাট সেলস এজেন্ট',
          category: 'অযাচিত প্রচার (Cold Call)',
          score: 74,
          reportsCount: 340,
          isBlocked: false,
          notes: 'পূর্বাচলে প্লট কেনার জন্য বারবার মেসেজ ও কল।',
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        },
        {
          phone: '+880 1600-000111',
          normalizedPhone: '+8801600000111',
          name: 'অটোমেটেড রোবোকল সার্ভিস',
          category: 'রোবোকল (Robocall)',
          score: 96,
          reportsCount: 890,
          isBlocked: true,
          notes: 'রেকর্ডেড মেসেজ ও অবৈধ বিজ্ঞাপন প্রচার।',
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        },
      ];
      await spamDao.bulkInsert(initialSpamList);

      // 5. Seed Offline Room SMS Messages
      await smsDao.bulkPut(INITIAL_SMS_MESSAGES);

      // 6. Write metadata
      await roomDb.dbMetadata.put({
        key: 'is_seeded',
        value: 'true',
        updatedAt: Date.now(),
      });
      await roomDb.dbMetadata.put({
        key: 'schema_version',
        value: '2.0.0',
        updatedAt: Date.now(),
      });
    } else {
      // If already seeded previously, ensure SMS messages are populated
      const existingMsgCount = await smsDao.count();
      if (existingMsgCount === 0) {
        await smsDao.bulkPut(INITIAL_SMS_MESSAGES);
      }
    }

    this.isInitialized = true;
    const metrics = await this.getMetrics();
    this.notifyChange();
    return metrics;
  }

  /**
   * Ultra-fast sub-2ms multi-layer offline Caller ID & Spam Lookup
   * Simulates Android: OfflineCallerIdEngine.kt
   */
  async lookupIncomingCall(rawPhone: string): Promise<OfflineLookupResult> {
    const startTime = performance.now();
    const cleanPhone = normalizePhone(rawPhone);
    const digitsOnly = rawPhone.replace(/[^0-9]/g, '');

    // Layer 1: Check Local Room Contacts table (Highest Priority)
    const localContact = await contactDao.getByPhone(rawPhone);
    if (localContact) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      this.lastLookupTimeMs = latencyMs;
      return {
        record: {
          phone: localContact.phone,
          name: localContact.name,
          businessCategory: localContact.company || localContact.tag || 'ব্যক্তিগত কন্টাক্ট',
          spamScore: 0,
          spamReports: 0,
          city: 'সংরক্ষিত কন্টাক্ট',
          country: 'Bangladesh',
          verified: true,
          notes: localContact.note || 'ফোনের কন্টাক্ট লিস্টে সেভ করা আছে',
        },
        source: 'contact',
        latencyMs,
        isSpam: false,
        isBlocked: false,
        isContact: true,
      };
    }

    const spamProtectionActive = this.isSpamProtectionEnabled();

    // Layer 2: Check Room Spam Database (SpamDao)
    const spamRecord = await spamDao.getByPhone(rawPhone);
    if (spamRecord) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      this.lastLookupTimeMs = latencyMs;
      const isSpam = spamRecord.score >= 60;
      const isBlocked = spamRecord.isBlocked || (spamProtectionActive && isSpam);
      return {
        record: {
          phone: spamRecord.phone,
          name: spamRecord.name,
          businessCategory: spamRecord.category,
          spamScore: spamRecord.score,
          spamReports: spamRecord.reportsCount,
          city: 'লোকাল ব্লকলিস্ট',
          country: 'Bangladesh',
          verified: false,
          notes: spamRecord.notes || 'অফলাইন স্প্যাম ডাটাবেজে শনাক্ত',
        },
        source: 'spam_list',
        latencyMs,
        isSpam,
        isBlocked,
        isContact: false,
      };
    }

    // Layer 3: Check Room Caller ID Directory Cache (CallerIdDao)
    const cachedCaller = await callerIdDao.getByPhone(rawPhone);
    if (cachedCaller) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      this.lastLookupTimeMs = latencyMs;
      const isSpam = cachedCaller.spamScore >= 60;
      const isBlocked = spamProtectionActive && isSpam;
      return {
        record: cachedCaller,
        source: 'caller_id_cache',
        latencyMs,
        isSpam,
        isBlocked,
        isContact: false,
      };
    }

    // Layer 4: Offline Heuristic Pattern Rules (Prefix Matching)
    // E.g. Known scam prefixes or marketing series in Bangladesh
    if (digitsOnly.startsWith('8801300') || digitsOnly.startsWith('01300')) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      this.lastLookupTimeMs = latencyMs;
      return {
        record: {
          phone: rawPhone,
          name: 'সন্দেহজনক লটারি কল (Scam Pattern)',
          businessCategory: 'টেলিমার্কেটিং প্যাটার্ন',
          spamScore: 85,
          spamReports: 120,
          city: 'অফলাইন প্রিফিক্স রুল',
          country: 'Bangladesh',
          verified: false,
          notes: '01300 প্রিফিক্স স্প্যাম প্যাটার্ন ম্যাচ করেছে',
        },
        source: 'heuristic_rule',
        latencyMs,
        isSpam: true,
        isBlocked: spamProtectionActive,
        isContact: false,
      };
    }

    // Layer 5: Safe Unknown Caller
    const latencyMs = Number((performance.now() - startTime).toFixed(2));
    this.lastLookupTimeMs = latencyMs;
    return {
      record: {
        phone: rawPhone,
        name: 'অপরিচিত নম্বর',
        businessCategory: 'সাধারণ মোবাইল কলার',
        spamScore: 0,
        spamReports: 0,
        city: 'বাংলাদেশ',
        country: 'Bangladesh',
        verified: false,
        notes: 'লোকাল ডেটাবেজে কোনো রেকর্ড পাওয়া যায়নি',
      },
      source: 'unknown',
      latencyMs,
      isSpam: false,
      isBlocked: false,
      isContact: false,
    };
  }

  /**
   * Block a phone number and add/update it in the local Room spam table
   */
  async blockNumber(phone: string, name?: string, reason = 'ইউজার কর্তৃক ব্লককৃত'): Promise<void> {
    await spamDao.addOrUpdate({
      phone,
      name: name || phone,
      category: reason,
      score: 99,
      reportsCount: 1,
      isBlocked: true,
      notes: 'অফলাইন ব্লকলিস্টে সংরক্ষিত',
    });

    // Also update existing call logs for this number
    await callLogDao.markAsSpam(phone, reason);
    this.notifyChange();
  }

  /**
   * Unblock a number in the local Room spam table
   */
  async unblockNumber(phone: string): Promise<void> {
    const existing = await spamDao.getByPhone(phone);
    if (existing) {
      await roomDb.spamList.update(existing.phone, { isBlocked: false });
      this.notifyChange();
    }
  }

  /**
   * Report a number as spam
   */
  async reportSpam(phone: string, name?: string, category = 'ইউজার স্প্যাম রিপোর্ট'): Promise<void> {
    const existing = await spamDao.getByPhone(phone);
    if (existing) {
      await roomDb.spamList.update(existing.phone, {
        score: Math.min(100, existing.score + 5),
        reportsCount: existing.reportsCount + 1,
      });
    } else {
      await spamDao.addOrUpdate({
        phone,
        name: name || phone,
        category,
        score: 90,
        reportsCount: 1,
        isBlocked: false,
        notes: 'ইউজার রিপোর্ট থেকে অফলাইন রুমে যুক্ত',
      });
    }

    await callLogDao.markAsSpam(phone, category);
    this.notifyChange();
  }

  /**
   * Check if automated incoming spam protection is enabled
   */
  isSpamProtectionEnabled(): boolean {
    try {
      const saved = localStorage.getItem('smart_dialer_spam_protection_active');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  }

  /**
   * Save live Caller ID metadata into the local Room database (caller_id_cache table)
   * Future lookups for this number will now resolve instantly (<2ms) offline.
   * If alsoAddToSpam is true (or score >= 60), it also records to Room spam database.
   */
  async saveLiveCallerIdToLocalDb(
    record: CallerIdRecord,
    options?: { alsoAddToSpam?: boolean }
  ): Promise<void> {
    await callerIdDao.cache(record);

    if (options?.alsoAddToSpam || record.spamScore >= 60) {
      await spamDao.addOrUpdate({
        phone: record.phone,
        name: record.name,
        category: record.businessCategory || 'সম্ভাব্য স্প্যাম',
        score: record.spamScore,
        reportsCount: record.spamReports > 0 ? record.spamReports : 1,
        isBlocked: record.spamScore >= 80,
        notes: record.notes || 'Gemini AI লাইভ অ্যানালাইসিস দ্বারা চিহ্নিত',
      });
    }

    this.notifyChange();
  }

  /**
   * Check if a number is already cached in Room local Caller ID directory
   */
  async isCallerIdCached(phone: string): Promise<boolean> {
    const cached = await callerIdDao.getByPhone(phone);
    return cached !== null;
  }

  /**
   * Toggle automated incoming spam protection
   */
  setSpamProtectionEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('smart_dialer_spam_protection_active', String(enabled));
    } catch (e) {
      console.error('Failed to save spam protection state', e);
    }
    this.notifyChange();
  }

  /**
   * Get all blocked phone entities with full details
   */
  async getBlockedEntities(): Promise<SpamEntity[]> {
    const all = await spamDao.getAll();
    return all.filter((s) => s.isBlocked).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Permanently delete a record from the spam list
   */
  async deleteBlockedRecord(phone: string): Promise<void> {
    await spamDao.remove(phone);
    this.notifyChange();
  }

  /**
   * Get all blocked phone numbers
   */
  async getBlockedNumbers(): Promise<string[]> {
    const all = await spamDao.getAll();
    return all.filter((s) => s.isBlocked).map((s) => s.phone);
  }

  /**
   * Get overall Room database metrics and status
   */
  async getMetrics(): Promise<RoomDbMetrics> {
    const [contactsCount, callLogsCount, spamCount, callerIdCacheCount, messagesCount] = await Promise.all([
      contactDao.count(),
      callLogDao.count(),
      spamDao.count(),
      callerIdDao.count(),
      smsDao.count(),
    ]);

    return {
      contactsCount,
      callLogsCount,
      spamCount,
      callerIdCacheCount,
      messagesCount,
      isInitialized: this.isInitialized,
      lastLookupTimeMs: this.lastLookupTimeMs,
    };
  }

  /**
   * Reset database back to default seed data
   */
  async resetToDefaults(): Promise<RoomDbMetrics> {
    return this.initializeDatabase(true);
  }

  /**
   * Export all database tables as JSON (backup simulation)
   */
  async exportDatabaseJson(): Promise<string> {
    const [contacts, callLogs, spamList, callerIdCache, messages] = await Promise.all([
      contactDao.getAll(),
      callLogDao.getAll(500),
      spamDao.getAll(),
      callerIdDao.getAll(),
      smsDao.getAll(),
    ]);

    const dump = {
      databaseName: 'SmartDialerRoomDB',
      exportedAt: new Date().toISOString(),
      version: 2,
      data: {
        contacts,
        callLogs,
        spamList,
        callerIdCache,
        messages,
      },
    };

    return JSON.stringify(dump, null, 2);
  }

  /**
   * Update custom ringtone label and sound preference for a specific contact in Room DB
   */
  async updateContactRingtone(
    contactId: string,
    ringtoneLabel: string,
    ringtoneId?: string
  ): Promise<Contact | undefined> {
    const updated = await contactDao.updateRingtone(contactId, ringtoneLabel, ringtoneId);
    this.notifyChange();
    return updated;
  }

  /**
   * Remove custom ringtone preference for a specific contact in Room DB
   */
  async clearContactRingtone(contactId: string): Promise<Contact | undefined> {
    const updated = await contactDao.clearRingtone(contactId);
    this.notifyChange();
    return updated;
  }

  /**
   * Save or update quick note for a specific call log entry in Room DB
   */
  async updateCallLogNote(logId: string, note: string): Promise<void> {
    await callLogDao.updateCallNote(logId, note);
    this.notifyChange();
  }

  /**
   * Save or update contact note in Room DB
   */
  async updateContactNote(contactId: string, note: string): Promise<Contact | undefined> {
    const contact = await contactDao.getById(contactId);
    if (!contact) return undefined;
    const updated: Contact = { ...contact, note: note.trim() };
    await contactDao.update(updated);
    this.notifyChange();
    return updated;
  }

  /**
   * Get the recorded last successful backup information from Room DB metadata
   */
  async getLastBackupInfo(): Promise<BackupMetadata | null> {
    try {
      const record = await roomDb.dbMetadata.get('last_successful_backup');
      if (record && record.value) {
        return JSON.parse(record.value) as BackupMetadata;
      }
    } catch (err) {
      console.warn('Failed to read last backup info from Room DB metadata:', err);
    }
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('smart_dialer_last_backup');
        if (stored) {
          return JSON.parse(stored) as BackupMetadata;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  }

  /**
   * Persist the successful backup record into Room DB metadata & localStorage
   */
  async recordSuccessfulBackup(meta: BackupMetadata): Promise<void> {
    try {
      await roomDb.dbMetadata.put({
        key: 'last_successful_backup',
        value: JSON.stringify(meta),
        updatedAt: Date.now(),
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('smart_dialer_last_backup', JSON.stringify(meta));
      }
      this.notifyChange();
    } catch (err) {
      console.error('Error saving backup metadata to Room DB:', err);
    }
  }
}

// Export singleton service instance
export const roomDbService = new RoomDatabaseService();
