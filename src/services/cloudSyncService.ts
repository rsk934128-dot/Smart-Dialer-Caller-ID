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
import { Contact, CallLog, BackupMetadata } from '../types';
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
    // Load last backup timestamp from Room DB metadata
    this.loadInitialBackupStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
          this.handleUserSignIn(currentUser);
        }
      });
      window.addEventListener('offline', () => {
        this.updateStatus({
          isCloudConnected: false,
          error: 'ডিভাইস বর্তমানে অফলাইনে রয়েছে',
        });
      });
    }
  }

  private async loadInitialBackupStatus() {
    try {
      const backupInfo = await roomDbService.getLastBackupInfo();
      if (backupInfo && backupInfo.timestamp) {
        const parsedDate = new Date(backupInfo.timestamp);
        const validDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
        this.updateStatus({
          lastSyncedAt: validDate,
          syncedContactsCount: backupInfo.contactsCount || 0,
          syncedLogsCount: backupInfo.callLogsCount || 0,
          syncedBlockedCount: backupInfo.blockedCount || 0,
        });
      }
    } catch (e) {
      // ignore
    }
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

    // If offline, do not attempt to contact Firestore backend
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus({
        isSyncing: false,
        isCloudConnected: false,
        error: 'ইন্টারনেট সংযোগ নেই - লোকাল রুম ডাটাবেজ সক্রিয় রয়েছে',
      });
      return;
    }

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
          const errCode = (err as any)?.code || '';
          if (errCode === 'unavailable' || err.message?.includes('offline')) {
            console.warn('Firestore offline; local Room DB serving contacts.');
            return;
          }
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
          const errCode = (err as any)?.code || '';
          if (errCode === 'unavailable' || err.message?.includes('offline')) {
            console.warn('Firestore offline; local Room DB serving call logs.');
            return;
          }
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
      const errMsg = err instanceof Error ? err.message : String(err);
      const isOfflineErr =
        errMsg.toLowerCase().includes('unavailable') ||
        errMsg.toLowerCase().includes('offline') ||
        errMsg.toLowerCase().includes('failed to get document');

      if (isOfflineErr) {
        console.warn('Firestore backend unavailable. Local Room DB active.');
        this.updateStatus({
          isSyncing: false,
          isCloudConnected: false,
          error: null, // Don't show scary error to user, local Room DB operates seamlessly
        });
      } else {
        console.error('Error synchronizing with Firestore:', err);
        this.updateStatus({
          isSyncing: false,
          error: errMsg || 'সিঙ্ক করার সময় সমস্যা হয়েছে',
        });
      }
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
        note: log.note || '',
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
   * Push all local Room DB data to Firestore on demand, triggering full sync
   */
  public async syncAllLocalDataToCloud(
    onProgress?: (step: string, percent: number) => void
  ): Promise<BackupMetadata> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('কোনো অ্যাকাউন্ট লগইন করা নেই। অনুগ্রহ করে গুগল বা ইমেইল দিয়ে সাইন ইন করুন।');
    }

    this.updateStatus({ isSyncing: true, error: null });
    onProgress?.('রুম ডিবি ডাটাবেজ থেকে ডাটা লোড করা হচ্ছে...', 10);

    try {
      const [localContacts, localLogs, localBlocked, localMessages] = await Promise.all([
        roomDbService.contacts.getAll(),
        roomDbService.callLogs.getAll(),
        roomDbService.getBlockedNumbers(),
        roomDbService.messages.getAll(),
      ]);

      onProgress?.(`কন্টাক্টস সিঙ্ক হচ্ছে (${localContacts.length} টি)...`, 30);
      for (const c of localContacts) {
        await this.saveContactToCloud(c, uid);
      }

      onProgress?.(`কল হিস্টোরি সিঙ্ক হচ্ছে (${localLogs.length} টি)...`, 60);
      for (const l of localLogs) {
        await this.saveCallLogToCloud(l, uid);
      }

      onProgress?.(`ব্লক লিস্ট সিঙ্ক হচ্ছে (${localBlocked.length} টি)...`, 80);
      for (const b of localBlocked) {
        await this.saveBlockedNumberToCloud(b);
      }

      onProgress?.('ব্যাকআপ মেটাডাটা রুম ডিবি ও ফায়ারস্টোরে সংরক্ষণ করা হচ্ছে...', 92);

      const backupMeta: BackupMetadata = {
        timestamp: new Date().toISOString(),
        contactsCount: localContacts.length,
        callLogsCount: localLogs.length,
        blockedCount: localBlocked.length,
        messagesCount: localMessages.length,
        totalEntities: localContacts.length + localLogs.length + localBlocked.length,
        userId: uid,
        userEmail: auth.currentUser?.email || '',
        source: 'room_to_firestore',
        status: 'success',
      };

      // 1. Record in Room DB dbMetadata & localStorage
      await roomDbService.recordSuccessfulBackup(backupMeta);

      // 2. Record in user's profile doc in Firestore
      try {
        await setDoc(
          doc(db, 'users', uid),
          {
            lastBackupAt: backupMeta.timestamp,
            lastBackupStats: {
              contactsCount: backupMeta.contactsCount,
              callLogsCount: backupMeta.callLogsCount,
              blockedCount: backupMeta.blockedCount,
              messagesCount: backupMeta.messagesCount,
              totalEntities: backupMeta.totalEntities,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (profileErr) {
        console.warn('Could not update user doc with backup stats:', profileErr);
      }

      onProgress?.('ব্যাকআপ সফলভাবে সম্পন্ন হয়েছে!', 100);

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date(backupMeta.timestamp),
        syncedContactsCount: localContacts.length,
        syncedLogsCount: localLogs.length,
        syncedBlockedCount: localBlocked.length,
        error: null,
      });

      return backupMeta;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'সিঙ্ক ব্যর্থ হয়েছে';
      this.updateStatus({
        isSyncing: false,
        error: errMsg,
      });
      throw err;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
