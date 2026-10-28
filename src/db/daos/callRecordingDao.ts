import { roomDb, CallRecordingDbEntity } from '../database';
import { CallRecording, RecordingCategory } from '../../types';
import { normalizePhone } from '../../data/mockData';

export function toCallRecordingDbEntity(rec: CallRecording): CallRecordingDbEntity {
  const norm = normalizePhone(rec.phone);
  const digits = rec.phone.replace(/[^0-9]/g, '');
  return {
    ...rec,
    normalizedPhone: norm,
    digitsOnly: digits,
  };
}

export function fromCallRecordingDbEntity(entity: CallRecordingDbEntity): CallRecording {
  const { normalizedPhone, digitsOnly, ...rest } = entity;
  return rest;
}

export interface CallRecordingStats {
  totalCount: number;
  encryptedCount: number;
  totalDurationSeconds: number;
  totalSizeKb: number;
  byCategory: Record<RecordingCategory, number>;
}

/**
 * CallRecordingDao simulating Android Room's @Dao for hardware-encrypted call recordings
 * 
 * @Dao
 * interface CallRecordingDao {
 *     @Query("SELECT * FROM call_recordings ORDER BY timestamp DESC")
 *     fun getAllRecordings(): Flow<List<CallRecordingEntity>>
 * }
 */
export class CallRecordingDao {
  async getAll(limit = 100): Promise<CallRecording[]> {
    try {
      const list = await roomDb.recordings
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
      return list.map(fromCallRecordingDbEntity);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<CallRecording | undefined> {
    try {
      const entity = await roomDb.recordings.get(id);
      return entity ? fromCallRecordingDbEntity(entity) : undefined;
    } catch {
      return undefined;
    }
  }

  async getByCategory(category: RecordingCategory): Promise<CallRecording[]> {
    try {
      const list = await roomDb.recordings
        .where('contactCategory')
        .equals(category)
        .reverse()
        .sortBy('timestamp');
      return list.map(fromCallRecordingDbEntity);
    } catch {
      return [];
    }
  }

  async getByPhone(phone: string): Promise<CallRecording[]> {
    try {
      const norm = normalizePhone(phone);
      const digits = phone.replace(/[^0-9]/g, '');
      const list = await roomDb.recordings
        .filter((r) => r.normalizedPhone === norm || (digits.length > 5 && r.digitsOnly.includes(digits)))
        .reverse()
        .sortBy('timestamp');
      return list.map(fromCallRecordingDbEntity);
    } catch {
      return [];
    }
  }

  async insert(rec: CallRecording): Promise<string> {
    const entity = toCallRecordingDbEntity(rec);
    await roomDb.recordings.put(entity);
    return rec.id;
  }

  async bulkInsert(records: CallRecording[]): Promise<void> {
    const entities = records.map(toCallRecordingDbEntity);
    await roomDb.recordings.bulkPut(entities);
  }

  async delete(id: string): Promise<void> {
    await roomDb.recordings.delete(id);
  }

  async clear(): Promise<void> {
    await roomDb.recordings.clear();
  }

  async getStats(): Promise<CallRecordingStats> {
    try {
      const list = await roomDb.recordings.toArray();
      const byCategory: Record<RecordingCategory, number> = {
        financial: 0,
        business: 0,
        unknown: 0,
        spam: 0,
        vip: 0,
      };

      let totalDuration = 0;
      let totalSize = 0;
      let encryptedCount = 0;

      for (const item of list) {
        totalDuration += item.duration || 0;
        totalSize += item.fileSizeKb || 0;
        if (item.isEncrypted) encryptedCount++;
        if (item.contactCategory && byCategory[item.contactCategory] !== undefined) {
          byCategory[item.contactCategory]++;
        }
      }

      return {
        totalCount: list.length,
        encryptedCount,
        totalDurationSeconds: totalDuration,
        totalSizeKb: totalSize,
        byCategory,
      };
    } catch {
      return {
        totalCount: 0,
        encryptedCount: 0,
        totalDurationSeconds: 0,
        totalSizeKb: 0,
        byCategory: { financial: 0, business: 0, unknown: 0, spam: 0, vip: 0 },
      };
    }
  }
}

export const callRecordingDao = new CallRecordingDao();
