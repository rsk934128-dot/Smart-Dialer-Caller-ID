import { roomDb } from '../database';
import { SpamEntity } from '../../types';
import { normalizePhone } from '../../data/mockData';

/**
 * SpamDao simulating Android Room's @Dao for offline spam detection:
 * 
 * @Dao
 * interface SpamDao {
 *     @Query("SELECT * FROM spam_numbers WHERE normalizedPhone = :phone LIMIT 1")
 *     suspend fun getSpamRecord(phone: String): SpamEntity?
 * }
 */
export class SpamDao {
  async getAll(): Promise<SpamEntity[]> {
    return roomDb.spamList.toArray();
  }

  async getByPhone(rawPhone: string): Promise<SpamEntity | undefined> {
    const norm = normalizePhone(rawPhone);
    const digits = rawPhone.replace(/[^0-9]/g, '');

    // 1. Direct normalized match
    const exact = await roomDb.spamList.where('phone').equals(rawPhone).or('normalizedPhone').equals(norm).first();
    if (exact) return exact;

    // 2. Suffix match on digits
    if (digits.length >= 8) {
      const suffix = digits.slice(-8);
      const all = await roomDb.spamList.toArray();
      const match = all.find((s) => {
        const sDigits = s.normalizedPhone.replace(/[^0-9]/g, '');
        return sDigits.endsWith(suffix) || suffix.endsWith(sDigits.slice(-8));
      });
      if (match) return match;
    }

    return undefined;
  }

  async isBlockedOrSpam(rawPhone: string): Promise<{
    isSpam: boolean;
    isBlocked: boolean;
    record?: SpamEntity;
  }> {
    const record = await this.getByPhone(rawPhone);
    if (!record) {
      return { isSpam: false, isBlocked: false };
    }
    return {
      isSpam: record.score >= 60,
      isBlocked: record.isBlocked,
      record,
    };
  }

  async addOrUpdate(spam: Omit<SpamEntity, 'normalizedPhone' | 'createdAt'> & Partial<Pick<SpamEntity, 'normalizedPhone' | 'createdAt'>>): Promise<void> {
    const norm = spam.normalizedPhone || normalizePhone(spam.phone);
    const entity: SpamEntity = {
      phone: spam.phone,
      normalizedPhone: norm,
      name: spam.name,
      category: spam.category,
      score: spam.score,
      reportsCount: spam.reportsCount,
      isBlocked: spam.isBlocked,
      notes: spam.notes,
      createdAt: spam.createdAt || Date.now(),
    };
    await roomDb.spamList.put(entity);
  }

  async remove(phone: string): Promise<void> {
    await roomDb.spamList.delete(phone);
  }

  async toggleBlock(phone: string): Promise<boolean> {
    const existing = await this.getByPhone(phone);
    if (existing) {
      const nextState = !existing.isBlocked;
      await roomDb.spamList.update(existing.phone, { isBlocked: nextState });
      return nextState;
    } else {
      // Create new blocked record
      await this.addOrUpdate({
        phone,
        name: 'ব্লককৃত নম্বর',
        category: 'ইউজার ব্লকলিস্ট',
        score: 95,
        reportsCount: 1,
        isBlocked: true,
        notes: 'ইউজার কর্তৃক ম্যানুয়ালি ব্লক করা হয়েছে',
      });
      return true;
    }
  }

  async bulkInsert(records: SpamEntity[]): Promise<void> {
    await roomDb.spamList.bulkPut(records);
  }

  async count(): Promise<number> {
    return roomDb.spamList.count();
  }

  async clear(): Promise<void> {
    await roomDb.spamList.clear();
  }
}

export const spamDao = new SpamDao();
