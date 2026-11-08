import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence verbose connection warnings from Firestore SDK (e.g., 10-second backend timeout warning)
// to ensure seamless offline-first operation with local Room DB
try {
  setLogLevel('error');
} catch {
  // ignore in unsupported runtimes
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling and multi-tab persistent cache
// Using experimentalForceLongPolling eliminates WebSocket issues in iframe sandboxes & mobile WebViews
let dbInstance;
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch {
  try {
    dbInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: memoryLocalCache(),
      },
      databaseId
    );
  } catch {
    dbInstance = getFirestore(app, databaseId);
  }
}

export const db = dbInstance;
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
// Request Google Contacts & Gmail Other Contacts scopes
googleProvider.addScope('https://www.googleapis.com/auth/contacts');
googleProvider.addScope('https://www.googleapis.com/auth/contacts.other.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/contacts.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/user.phonenumbers.read');
googleProvider.addScope('https://www.googleapis.com/auth/user.emails.read');

// Standard Firestore Error Handling conforming to Firebase Skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isUserAuthCancellation(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  const code = anyErr.code || '';
  const message = anyErr.message || (err instanceof Error ? err.message : String(err));
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/popup-blocked' ||
    message.includes('popup-closed-by-user') ||
    message.includes('cancelled-popup-request') ||
    message.includes('popup-blocked')
  );
}

// Handle potential redirect result when app boots or reloads on Android / Mobile WebViews
if (typeof window !== 'undefined') {
  getRedirectResult(auth)
    .then(async (result) => {
      if (result && result.user) {
        console.info('Redirect sign-in completed successfully for:', result.user.email);
        try {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken && (window as any).__setGoogleAccessToken) {
            (window as any).__setGoogleAccessToken(credential.accessToken);
          }
        } catch {
          // ignore
        }
        await syncUserProfile(result.user).catch((err) =>
          console.warn('Redirect user profile sync warning:', err)
        );
      }
    })
    .catch((err) => {
      if (!isUserAuthCancellation(err)) {
        console.warn('Redirect sign-in handler notice:', err);
      }
    });
}

// Authentication Helpers
export async function loginWithGoogle(forceRedirect = false): Promise<User | null> {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const isCapacitorNative =
    typeof window !== 'undefined' &&
    Boolean((window as any).Capacitor?.isNativePlatform?.());

  // If explicitly requested, initiate redirect directly
  if (forceRedirect) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Cache OAuth access token strictly in-memory for Google People API
    try {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken && typeof window !== 'undefined' && (window as any).__setGoogleAccessToken) {
        (window as any).__setGoogleAccessToken(credential.accessToken);
      }
    } catch {
      // ignore
    }
    // Sync user profile document
    if (result.user) {
      try {
        await syncUserProfile(result.user);
      } catch (profileErr) {
        console.warn('User profile sync skipped/failed:', profileErr);
      }
    }
    return result.user;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = typeof err === 'object' && err !== null && 'code' in err ? (err as any).code : '';

    // If popup was blocked or unsupported in Android WebView, gracefully fall back to signInWithRedirect
    if (
      isCapacitorNative ||
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      msg.includes('popup-blocked') ||
      msg.includes('operation-not-supported')
    ) {
      console.info('Switching to signInWithRedirect for Google account selection on Android...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    if (isUserAuthCancellation(err)) {
      console.info('Google Sign-In popup closed or cancelled by user.');
    } else {
      console.warn('Google Sign-In notice:', err);
    }
    throw err;
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(result.user, { displayName }).catch(() => {});
    }
    try {
      await syncUserProfile(result.user);
    } catch {
      // Non-fatal
    }
    return result.user;
  } catch (err: unknown) {
    console.warn('Email Registration notice:', err);
    throw err;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      try {
        await syncUserProfile(result.user);
      } catch {
        // Non-fatal
      }
    }
    return result.user;
  } catch (err: unknown) {
    console.warn('Email Login notice:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Dialer User',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}
