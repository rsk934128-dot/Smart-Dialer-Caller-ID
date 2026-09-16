import { roomDb, ContactDbEntity } from '../database';
import { Contact } from '../../types';
import { normalizePhone } from '../../data/mockData';

export function toContactDbEntity(contact: Contact): ContactDbEntity {
  const norm = normalizePhone(contact.phone);
  const digits = contact.phone.replace(/[^0-9]/g, '');
  return {
    ...contact,
    normalizedPhone: norm,
    digitsOnly: digits,
  };
}

export function fromContactDbEntity(entity: ContactDbEntity): Contact {
  const { normalizedPhone, digitsOnly, ...rest } = entity;
  return rest;
}

/**
 * ContactDao simulating Android Room's @Dao interface:
 * 
 * @Dao
 * interface ContactDao {
 *     @Query("SELECT * FROM contacts ORDER BY name ASC")
 *     fun getAllContacts(): Flow<List<ContactEntity>>
 *     ...
 * }
 */
export class ContactDao {
  async getAll(): Promise<Contact[]> {
    const list = await roomDb.contacts.toArray();
    return list
      .map(fromContactDbEntity)
      .sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }

  async getById(id: string): Promise<Contact | undefined> {
    const entity = await roomDb.contacts.get(id);
    return entity ? fromContactDbEntity(entity) : undefined;
  }

  async getByPhone(rawPhone: string): Promise<Contact | undefined> {
    const norm = normalizePhone(rawPhone);
    const digits = rawPhone.replace(/[^0-9]/g, '');

    // First try exact normalized match
    let found = await roomDb.contacts.where('normalizedPhone').equals(norm).first();
    if (found) return fromContactDbEntity(found);

    // Try suffix match (e.g. last 8-10 digits)
    if (digits.length >= 8) {
      const suffix = digits.slice(-8);
      const all = await roomDb.contacts.toArray();
      const match = all.find((c) => c.digitsOnly.endsWith(suffix) || suffix.endsWith(c.digitsOnly.slice(-8)));
      if (match) return fromContactDbEntity(match);
    }

    return undefined;
  }

  async search(query: string): Promise<Contact[]> {
    if (!query.trim()) return this.getAll();
    const q = query.toLowerCase().trim();
    const qDigits = q.replace(/[^0-9]/g, '');

    const all = await roomDb.contacts.toArray();
    const filtered = all.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q) || (c.nameEn && c.nameEn.toLowerCase().includes(q));
      const matchPhone = qDigits && c.digitsOnly.includes(qDigits);
      const matchTag = c.tag && c.tag.toLowerCase().includes(q);
      const matchCompany = c.company && c.company.toLowerCase().includes(q);
      return matchName || matchPhone || matchTag || matchCompany;
    });

    return filtered.map(fromContactDbEntity);
  }

  async insert(contact: Contact): Promise<string> {
    const entity = toContactDbEntity(contact);
    await roomDb.contacts.put(entity);
    return entity.id;
  }

  async update(contact: Contact): Promise<void> {
    const entity = toContactDbEntity(contact);
    await roomDb.contacts.put(entity);
  }

  async delete(id: string): Promise<void> {
    await roomDb.contacts.delete(id);
  }

  async toggleFavorite(id: string): Promise<boolean> {
    const entity = await roomDb.contacts.get(id);
    if (!entity) return false;
    const nextVal = !entity.isFavorite;
    await roomDb.contacts.update(id, { isFavorite: nextVal });
    return nextVal;
  }

  async bulkInsert(contacts: Contact[]): Promise<void> {
    const entities = contacts.map(toContactDbEntity);
    await roomDb.contacts.bulkPut(entities);
  }

  async count(): Promise<number> {
    return roomDb.contacts.count();
  }

  async clear(): Promise<void> {
    await roomDb.contacts.clear();
  }
}

export const contactDao = new ContactDao();
