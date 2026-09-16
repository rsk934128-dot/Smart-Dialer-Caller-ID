import { roomDb, CallLogDbEntity } from '../database';
import { CallLog, CallType } from '../../types';
import { normalizePhone } from '../../data/mockData';

export function toCallLogDbEntity(log: CallLog): CallLogDbEntity {
  const norm = normalizePhone(log.phone);
  const digits = log.phone.replace(/[^0-9]/g, '');
  return {
    ...log,
    normalizedPhone: norm,
    digitsOnly: digits,
  };
}

export function fromCallLogDbEntity(entity: CallLogDbEntity): CallLog {
  const { normalizedPhone, digitsOnly, ...rest } = entity;
  return rest;
}

export interface CallLogStats {
  totalCalls: number;
  totalDurationSeconds: number;
  incomingCount: number;
  outgoingCount: number;
  missedCount: number;
  rejectedCount: number;
  spamCount: number;
}

/**
 * CallLogDao simulating Android Room's @Dao for call history
 * 
 * @Dao
 * interface CallLogDao {
 *     @Query("SELECT * FROM call_logs ORDER BY timestamp DESC")
 *     fun getAllCallLogs(): Flow<List<CallLogEntity>>
 * }
 */
export class CallLogDao {
  async getAll(limit = 100): Promise<CallLog[]> {
    const list = await roomDb.callLogs
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
    return list.map(fromCallLogDbEntity);
  }

  async getByType(type: CallType): Promise<CallLog[]> {
    const list = await roomDb.callLogs
      .where('type')
      .equals(type)
      .reverse()
      .sortBy('timestamp');
    return list.map(fromCallLogDbEntity);
  }

  async getByPhone(phone: string): Promise<CallLog[]> {
    const norm = normalizePhone(phone);
    const list = await roomDb.callLogs
      .where('normalizedPhone')
      .equals(norm)
      .reverse()
      .sortBy('timestamp');
    return list.map(fromCallLogDbEntity);
  }

  async insert(log: CallLog): Promise<string> {
    const entity = toCallLogDbEntity(log);
    await roomDb.callLogs.put(entity);
    return entity.id;
  }

  async delete(id: string): Promise<void> {
    await roomDb.callLogs.delete(id);
  }

  async clearAll(): Promise<void> {
    await roomDb.callLogs.clear();
  }

  async markAsSpam(phone: string, reason = 'ইউজার কর্তৃক স্প্যাম চিহ্নিত'): Promise<void> {
    const norm = normalizePhone(phone);
    const logs = await roomDb.callLogs.where('normalizedPhone').equals(norm).toArray();
    for (const log of logs) {
      await roomDb.callLogs.update(log.id, {
        isSpam: true,
        spamScore: 92,
        spamCategory: reason,
      });
    }
  }

  async bulkInsert(logs: CallLog[]): Promise<void> {
    const entities = logs.map(toCallLogDbEntity);
    await roomDb.callLogs.bulkPut(entities);
  }

  async getStats(): Promise<CallLogStats> {
    const all = await roomDb.callLogs.toArray();
    const stats: CallLogStats = {
      totalCalls: all.length,
      totalDurationSeconds: 0,
      incomingCount: 0,
      outgoingCount: 0,
      missedCount: 0,
      rejectedCount: 0,
      spamCount: 0,
    };

    for (const item of all) {
      stats.totalDurationSeconds += item.duration || 0;
      if (item.type === 'incoming') stats.incomingCount++;
      else if (item.type === 'outgoing') stats.outgoingCount++;
      else if (item.type === 'missed') stats.missedCount++;
      else if (item.type === 'rejected') stats.rejectedCount++;

      if (item.isSpam) {
        stats.spamCount++;
      }
    }

    return stats;
  }

  async count(): Promise<number> {
    return roomDb.callLogs.count();
  }
}

export const callLogDao = new CallLogDao();
