import { roomDb, CallerIdDbEntity } from '../database';
import { CallerIdRecord } from '../../types';
import { normalizePhone } from '../../data/mockData';

export function toCallerIdDbEntity(record: CallerIdRecord): CallerIdDbEntity {
  const norm = normalizePhone(record.phone);
  const digits = record.phone.replace(/[^0-9]/g, '');
  return {
    ...record,
    normalizedPhone: norm,
    digitsOnly: digits,
    cachedAt: Date.now(),
  };
}

export function fromCallerIdDbEntity(entity: CallerIdDbEntity): CallerIdRecord {
  const { normalizedPhone, digitsOnly, cachedAt, ...rest } = entity;
  return rest;
}

/**
 * CallerIdDao simulating Android Room's cached caller ID directory
 * 
 * @Dao
 * interface CallerIdDao {
 *     @Query("SELECT * FROM caller_id_cache WHERE normalizedPhone = :phone")
 *     suspend fun findCallerInfo(phone: String): CallerIdEntity?
 * }
 */
export class CallerIdDao {
  async getAll(): Promise<CallerIdRecord[]> {
    const list = await roomDb.callerIdCache.toArray();
    return list.map(fromCallerIdDbEntity);
  }

  async getByPhone(rawPhone: string): Promise<CallerIdRecord | null> {
    const norm = normalizePhone(rawPhone);
    const digits = rawPhone.replace(/[^0-9]/g, '');

    // 1. Check exact key or normalized key
    const direct = await roomDb.callerIdCache.get(rawPhone);
    if (direct) return fromCallerIdDbEntity(direct);

    const normMatch = await roomDb.callerIdCache.where('normalizedPhone').equals(norm).first();
    if (normMatch) return fromCallerIdDbEntity(normMatch);

    // 2. Suffix matching (last 8 digits)
    if (digits.length >= 8) {
      const suffix = digits.slice(-8);
      const all = await roomDb.callerIdCache.toArray();
      const match = all.find(
        (c) => c.digitsOnly.endsWith(suffix) || suffix.endsWith(c.digitsOnly.slice(-8))
      );
      if (match) return fromCallerIdDbEntity(match);
    }

    return null;
  }

  async cache(record: CallerIdRecord): Promise<void> {
    const entity = toCallerIdDbEntity(record);
    await roomDb.callerIdCache.put(entity);
  }

  async bulkInsert(records: CallerIdRecord[]): Promise<void> {
    const entities = records.map(toCallerIdDbEntity);
    await roomDb.callerIdCache.bulkPut(entities);
  }

  async count(): Promise<number> {
    return roomDb.callerIdCache.count();
  }

  async clear(): Promise<void> {
    await roomDb.callerIdCache.clear();
  }
}

export const callerIdDao = new CallerIdDao();
