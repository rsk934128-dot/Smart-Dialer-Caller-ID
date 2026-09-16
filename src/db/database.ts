import Dexie, { type EntityTable } from 'dexie';
import { Contact, CallLog, CallerIdRecord, SpamEntity } from '../types';

export interface ContactDbEntity extends Contact {
  normalizedPhone: string;
  digitsOnly: string;
}

export interface CallLogDbEntity extends CallLog {
  normalizedPhone: string;
  digitsOnly: string;
}

export interface CallerIdDbEntity extends CallerIdRecord {
  normalizedPhone: string;
  digitsOnly: string;
  cachedAt: number;
}

export interface MetadataDbEntity {
  key: string;
  value: string;
  updatedAt: number;
}

/**
 * Android Room Database Equivalent in TypeScript using Dexie.js
 * 
 * Simulates:
 * @Database(
 *   entities = [ContactEntity::class, CallLogEntity::class, SpamEntity::class, CallerIdCacheEntity::class],
 *   version = 1
 * )
 */
export class SmartDialerRoomDB extends Dexie {
  contacts!: EntityTable<ContactDbEntity, 'id'>;
  callLogs!: EntityTable<CallLogDbEntity, 'id'>;
  spamList!: EntityTable<SpamEntity, 'phone'>;
  callerIdCache!: EntityTable<CallerIdDbEntity, 'phone'>;
  dbMetadata!: EntityTable<MetadataDbEntity, 'key'>;

  constructor() {
    super('SmartDialerRoomDB');

    // Schema definition with indexed fields for sub-millisecond query execution
    this.version(1).stores({
      contacts: 'id, name, phone, normalizedPhone, digitsOnly, isFavorite, tag',
      callLogs: 'id, phone, normalizedPhone, digitsOnly, type, timestamp, isSpam',
      spamList: 'phone, normalizedPhone, score, category, isBlocked, reportsCount',
      callerIdCache: 'phone, normalizedPhone, digitsOnly, spamScore, verified',
      dbMetadata: 'key',
    });
  }
}

// Singleton database instance mimicking Room.databaseBuilder(context, AppDatabase::class.java, "smart_caller.db")
export const roomDb = new SmartDialerRoomDB();
