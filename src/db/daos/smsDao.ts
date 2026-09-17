import { roomDb, SmsMessageDbEntity } from '../database';
import { SmsMessage, SmsThread } from '../../types';
import { normalizePhone } from '../../data/mockData';

export function toSmsDbEntity(msg: SmsMessage): SmsMessageDbEntity {
  const norm = normalizePhone(msg.type === 'inbox' ? msg.senderPhone : msg.recipientPhone);
  const digits = (msg.type === 'inbox' ? msg.senderPhone : msg.recipientPhone).replace(/[^0-9]/g, '');
  return {
    ...msg,
    normalizedPhone: norm,
    digitsOnly: digits,
    isOfflineStored: true,
  };
}

export function fromSmsDbEntity(entity: SmsMessageDbEntity): SmsMessage {
  const { normalizedPhone, digitsOnly, ...rest } = entity;
  return rest;
}

/**
 * SmsDao simulating Android Room's Telephony / Sms Provider DAO:
 * 
 * @Dao
 * interface SmsDao {
 *     @Query("SELECT * FROM messages ORDER BY timestamp DESC")
 *     fun getAllMessages(): Flow<List<SmsMessageEntity>>
 *     ...
 * }
 */
export class SmsDao {
  async getAll(): Promise<SmsMessage[]> {
    const list = await roomDb.messages.toArray();
    return list
      .map(fromSmsDbEntity)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getById(id: string): Promise<SmsMessage | undefined> {
    const entity = await roomDb.messages.get(id);
    return entity ? fromSmsDbEntity(entity) : undefined;
  }

  async getByThreadPhone(rawPhone: string): Promise<SmsMessage[]> {
    const norm = normalizePhone(rawPhone);
    const digits = rawPhone.replace(/[^0-9]/g, '');
    const all = await roomDb.messages.toArray();
    return all
      .filter((m) => {
        const partner = m.type === 'inbox' ? m.senderPhone : m.recipientPhone;
        const pNorm = normalizePhone(partner);
        const pDigits = partner.replace(/[^0-9]/g, '');
        return (
          partner.toLowerCase() === rawPhone.toLowerCase() ||
          (norm && pNorm === norm) ||
          (digits.length >= 7 && pDigits.endsWith(digits.slice(-7)))
        );
      })
      .map(fromSmsDbEntity)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getThreads(): Promise<SmsThread[]> {
    const allMessages = await this.getAll();
    const threadMap = new Map<string, SmsMessage[]>();

    for (const msg of allMessages) {
      const threadKey = (msg.type === 'inbox' ? msg.senderPhone : msg.recipientPhone).trim().toLowerCase();
      const existing = threadMap.get(threadKey) || [];
      existing.push(msg);
      threadMap.set(threadKey, existing);
    }

    const threads: SmsThread[] = [];
    threadMap.forEach((msgs, key) => {
      // msgs are already sorted desc by timestamp in getAll()
      const lastMsg = msgs[0];
      const unreadCount = msgs.filter((m) => m.type === 'inbox' && m.status === 'received').length;
      const contactPhone = lastMsg.type === 'inbox' ? lastMsg.senderPhone : lastMsg.recipientPhone;
      const contactName = lastMsg.type === 'inbox' ? lastMsg.senderName : lastMsg.recipientName;

      threads.push({
        threadId: key,
        contactPhone,
        contactName,
        simSlot: lastMsg.simSlot || 1,
        lastMessage: lastMsg,
        unreadCount,
        totalMessages: msgs.length,
      });
    });

    return threads.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  }

  async insert(message: SmsMessage): Promise<void> {
    const entity = toSmsDbEntity(message);
    await roomDb.messages.put(entity);
  }

  async update(id: string, updates: Partial<SmsMessage>): Promise<void> {
    const entity = await roomDb.messages.get(id);
    if (entity) {
      await roomDb.messages.update(id, updates);
    }
  }

  async markThreadRead(rawPhone: string): Promise<void> {
    const msgs = await this.getByThreadPhone(rawPhone);
    for (const msg of msgs) {
      if (msg.type === 'inbox' && msg.status === 'received') {
        await roomDb.messages.update(msg.id, { status: 'read' });
      }
    }
  }

  async delete(id: string): Promise<void> {
    await roomDb.messages.delete(id);
  }

  async deleteThread(rawPhone: string): Promise<void> {
    const msgs = await this.getByThreadPhone(rawPhone);
    for (const msg of msgs) {
      await roomDb.messages.delete(msg.id);
    }
  }

  async bulkPut(messages: SmsMessage[]): Promise<void> {
    const entities = messages.map(toSmsDbEntity);
    await roomDb.messages.bulkPut(entities);
  }

  async count(): Promise<number> {
    return roomDb.messages.count();
  }

  async getUnreadCount(): Promise<number> {
    return roomDb.messages
      .filter((m) => m.type === 'inbox' && m.status === 'received')
      .count();
  }

  async clearAll(): Promise<void> {
    await roomDb.messages.clear();
  }
}

export const smsDao = new SmsDao();
