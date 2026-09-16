import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Contact, CallLog } from '../types';
import { roomDbService } from '../db/roomDatabaseService';

export interface CloudSyncStatus {
  user: User | null;
  isSyncing: boolean;
  isCloudConnected: boolean;
  lastSyncedAt: Date | null;
  syncedContactsCount: number;
  syncedLogsCount: number;
  syncedBlockedCount: number;
  error: string | null;
}

type SyncStatusListener = (status: CloudSyncStatus) => void;

class CloudSyncService {
  private statusListeners: SyncStatusListener[] = [];
  private activeUnsubscribes: Unsubscribe[] = [];
  private currentStatus: CloudSyncStatus = {
    user: null,
    isSyncing: false,
    isCloudConnected: false,
    lastSyncedAt: null,
    syncedContactsCount: 0,
    syncedLogsCount: 0,
    syncedBlockedCount: 0,
    error: null,
  };

  constructor() {
    this.initAuthListener();
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.statusListeners.push(listener);
    listener({ ...this.currentStatus });
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(partial: Partial<CloudSyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...partial };
    for (const listener of this.statusListeners) {
      try {
        listener({ ...this.currentStatus });
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    }
  }

  public getStatus(): CloudSyncStatus {
    return { ...this.currentStatus };
  }

  private initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.updateStatus({
          user,
          isCloudConnected: true,
          error: null,
        });
        await this.handleUserSignIn(user);
      } else {
        this.cleanupListeners();
        this.updateStatus({
          user: null,
          isCloudConnected: false,
          isSyncing: false,
        });
      }
    });
  }

  private cleanupListeners() {
    for (const unsub of this.activeUnsubscribes) {
      try {
        unsub();
      } catch (e) {
        console.error('Error unsubscribing firestore listener:', e);
      }
    }
    this.activeUnsubscribes = [];
  }

  /**
   * Called whenever a user signs in.
   * Pulls existing cloud data or seeds cloud with local Room DB data if cloud is empty.
   */
  private async handleUserSignIn(user: User) {
    this.updateStatus({ isSyncing: true, error: null });
    this.cleanupListeners();

    try {
      const contactsRef = collection(db, 'users', user.uid, 'contacts');
      const callLogsRef = collection(db, 'users', user.uid, 'call_logs');
      const blockedRef = collection(db, 'users', user.uid, 'blocked_numbers');

      // 1. Check existing cloud contacts
      const [cloudContactsSnap, cloudLogsSnap, cloudBlockedSnap] = await Promise.all([
        getDocs(contactsRef),
        getDocs(callLogsRef),
        getDocs(blockedRef),
      ]);

      const cloudContacts: Contact[] = [];
      cloudContactsSnap.forEach((d) => {
        cloudContacts.push(d.data() as Contact);
      });

      const cloudLogs: CallLog[] = [];
      cloudLogsSnap.forEach((d) => {
        cloudLogs.push(d.data() as CallLog);
      });

      const cloudBlocked: string[] = [];
      cloudBlockedSnap.forEach((d) => {
        const data = d.data();
        if (data.phone) cloudBlocked.push(data.phone);
      });

      // If cloud is empty (brand new registered user), upload local Room DB data to cloud
      if (cloudContacts.length === 0) {
        const localContacts = await roomDbService.contacts.getAll();
        for (const c of localContacts) {
          await this.saveContactToCloud(c, user.uid);
        }
      } else {
        // Sync cloud contacts down to local Room DB
        for (const c of cloudContacts) {
          await roomDbService.contacts.insert(c);
        }
      }

      // If cloud logs are empty, push local logs to cloud
      if (cloudLogs.length === 0) {
        const localLogs = await roomDbService.callLogs.getAll();
        for (const l of localLogs.slice(0, 30)) {
          await this.saveCallLogToCloud(l, user.uid);
        }
      } else {
        // Sync cloud logs down to local Room DB
        for (const l of cloudLogs) {
          await roomDbService.callLogs.insert(l);
        }
      }

      // Setup real-time listener for contacts
      const unsubContacts = onSnapshot(
        contactsRef,
        (snapshot) => {
          this.updateStatus({
            syncedContactsCount: snapshot.size,
            lastSyncedAt: new Date(),
          });
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}/contacts`);
        }
      );
      this.activeUnsubscribes.push(unsubContacts);

      // Setup real-time listener for call logs
      const unsubLogs = onSnapshot(
        callLogsRef,
        (snapshot) => {
          this.updateStatus({
            syncedLogsCount: snapshot.size,
            lastSyncedAt: new Date(),
          });
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}/call_logs`);
        }
      );
      this.activeUnsubscribes.push(unsubLogs);

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date(),
        syncedContactsCount: Math.max(cloudContacts.length, 1),
        syncedLogsCount: Math.max(cloudLogs.length, 1),
        syncedBlockedCount: cloudBlocked.length,
      });
    } catch (err: unknown) {
      console.error('Error synchronizing with Firestore:', err);
      this.updateStatus({
        isSyncing: false,
        error: err instanceof Error ? err.message : 'সিঙ্ক করার সময় সমস্যা হয়েছে',
      });
    }
  }

  /**
   * Save or update a contact in Firebase Firestore
   */
  public async saveContactToCloud(contact: Contact, targetUserId?: string): Promise<void> {
    const uid = targetUserId || auth.currentUser?.uid;
    if (!uid) return; // User not logged in, local Room DB only

    const path = `users/${uid}/contacts/${contact.id}`;
    try {
      await setDoc(doc(db, 'users', uid, 'contacts', contact.id), {
        id: contact.id,
        userId: uid,
        name: contact.name,
        nameEn: contact.nameEn || '',
        phone: contact.phone,
        email: contact.email || '',
        category: contact.tag || 'general',
        isFavorite: !!contact.isFavorite,
        notes: contact.note || '',
        spamReports: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a contact from Firebase Firestore
   */
  public async deleteContactFromCloud(contactId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const path = `users/${uid}/contacts/${contactId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'contacts', contactId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Save a call log entry to Firebase Firestore
   */
  public async saveCallLogToCloud(log: CallLog, targetUserId?: string): Promise<void> {
    const uid = targetUserId || auth.currentUser?.uid;
    if (!uid) return;

    const path = `users/${uid}/call_logs/${log.id}`;
    try {
      await setDoc(doc(db, 'users', uid, 'call_logs', log.id), {
        id: log.id,
        userId: uid,
        name: log.name || '',
        phone: log.phone,
        type: log.type,
        timestamp: new Date(log.timestamp).toISOString(),
        duration: log.duration || 0,
        isSpam: !!log.isSpam,
        spamScore: log.spamScore || 0,
        spamCategory: log.spamCategory || '',
        simSlot: 1,
        isRecorded: false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Save a blocked number in Firebase Firestore
   */
  public async saveBlockedNumberToCloud(phone: string, name?: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const safeId = phone.replace(/[^0-9a-zA-Z]/g, '_');
    const path = `users/${uid}/blocked_numbers/${safeId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'blocked_numbers', safeId), {
        id: safeId,
        userId: uid,
        phone,
        name: name || 'অজানা স্প্যামার',
        blockedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Remove a blocked number from Firebase Firestore
   */
  public async removeBlockedNumberFromCloud(phone: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const safeId = phone.replace(/[^0-9a-zA-Z]/g, '_');
    const path = `users/${uid}/blocked_numbers/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'blocked_numbers', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Push all local Room DB data to Firestore on demand
   */
  public async syncAllLocalDataToCloud(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('ইউজার লগইন করা নেই');

    this.updateStatus({ isSyncing: true });
    try {
      const [localContacts, localLogs, localBlocked] = await Promise.all([
        roomDbService.contacts.getAll(),
        roomDbService.callLogs.getAll(),
        roomDbService.getBlockedNumbers(),
      ]);

      for (const c of localContacts) {
        await this.saveContactToCloud(c, uid);
      }

      for (const l of localLogs) {
        await this.saveCallLogToCloud(l, uid);
      }

      for (const b of localBlocked) {
        await this.saveBlockedNumberToCloud(b);
      }

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date(),
        syncedContactsCount: localContacts.length,
        syncedLogsCount: localLogs.length,
        syncedBlockedCount: localBlocked.length,
      });
    } catch (err: unknown) {
      this.updateStatus({
        isSyncing: false,
        error: err instanceof Error ? err.message : 'সিঙ্ক ব্যর্থ হয়েছে',
      });
      throw err;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
