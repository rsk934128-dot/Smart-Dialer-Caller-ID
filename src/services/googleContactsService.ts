import { User, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Contact } from '../types';

export const WORKSPACE_CONTACT_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
];

// Configure scopes on the provider
WORKSPACE_CONTACT_SCOPES.forEach((scope) => {
  try {
    googleProvider.addScope(scope);
  } catch {
    // Ignore if already added
  }
});

// Cache the access token strictly in-memory per Google Workspace Integration guidelines
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Clear in-memory token on auth state change / sign-out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

if (typeof window !== 'undefined') {
  (window as any).__setGoogleAccessToken = (token: string | null) => {
    cachedAccessToken = token;
  };
}

export class GoogleContactsService {
  /**
   * Get cached token from memory
   */
  public static getAccessToken(): string | null {
    return cachedAccessToken;
  }

  public static setAccessToken(token: string | null) {
    cachedAccessToken = token;
  }

  public static hasAccessToken(): boolean {
    return !!cachedAccessToken;
  }

  /**
   * Sign in with Google with Contacts scopes
   */
  public static async signInWithGoogleContacts(): Promise<{ user: User; accessToken: string }> {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google OAuth Access Token পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (err: any) {
      const isClosed =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('popup-blocked');
      if (isClosed) {
        console.info('Google Contacts sign-in popup closed by user.');
      } else {
        console.warn('Google Contacts sign-in notice:', err?.message || err);
      }
      throw err;
    } finally {
      isSigningIn = false;
    }
  }

  /**
   * Fetch contacts from both Google People API (saved contacts) AND Other Contacts (Gmail interactions)
   */
  public static async fetchGoogleContacts(): Promise<Contact[]> {
    let token = this.getAccessToken();
    if (!token) {
      const signInRes = await this.signInWithGoogleContacts();
      token = signInRes.accessToken;
    }

    const contacts: Contact[] = [];
    const seenPhoneOrKey = new Set<string>();

    // 1. Fetch Google Main Contacts (people/me/connections)
    try {
      const personFields = 'names,phoneNumbers,emailAddresses,organizations,userDefined,photos';
      const pageSize = 1000;
      const connectionsUrl = `https://people.googleapis.com/v1/people/me/connections?personFields=${personFields}&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`;

      const response = await fetch(connectionsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.status === 401) {
        this.setAccessToken(null);
        throw new Error('Google সেশন শেষ হয়েছে। অনুগ্রহ করে পুনরায় সাইন-ইন করুন।');
      }

      if (response.ok) {
        const data = await response.json();
        const connections = data.connections || [];

        for (const person of connections) {
          const resourceName = person.resourceName || `people/c-${Date.now()}-${Math.random()}`;
          const name =
            person.names?.[0]?.displayName ||
            person.names?.[0]?.givenName ||
            'নামহীন গুগল কন্টাক্ট';
          const email = person.emailAddresses?.[0]?.value || undefined;
          const company = person.organizations?.[0]?.name || undefined;
          const avatar = person.photos?.[0]?.url || undefined;
          const phoneNumbers = person.phoneNumbers || [];

          if (phoneNumbers.length > 0) {
            // Add primary or distinct phone numbers
            for (let i = 0; i < phoneNumbers.length; i++) {
              const rawPhone = phoneNumbers[i]?.value || '';
              if (!rawPhone) continue;
              const cleanDigits = rawPhone.replace(/\D/g, '');
              const dedupKey = cleanDigits || rawPhone;
              if (seenPhoneOrKey.has(dedupKey)) continue;
              seenPhoneOrKey.add(dedupKey);

              const contactId = `google-${resourceName.replace('/', '-')}${i > 0 ? `-${i}` : ''}`;
              contacts.push({
                id: contactId,
                name: phoneNumbers.length > 1 && i > 0 ? `${name} (${phoneNumbers[i].type || '২'})` : name,
                phone: rawPhone,
                email,
                company,
                avatar,
                tag: 'Google',
                storageLocation: 'google',
                isFavorite: false,
                note: 'Google Contacts থেকে সিঙ্ক করা',
              });
            }
          } else if (email) {
            // Contact has name & email from Google
            const dedupKey = email.toLowerCase();
            if (!seenPhoneOrKey.has(dedupKey)) {
              seenPhoneOrKey.add(dedupKey);
              contacts.push({
                id: `google-${resourceName.replace('/', '-')}`,
                name,
                phone: 'নম্বর নেই',
                email,
                company,
                avatar,
                tag: 'Google',
                storageLocation: 'google',
                isFavorite: false,
                note: 'Google Contacts (Gmail) থেকে সিঙ্ক করা',
              });
            }
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Google connections fetch notice:', errorData);
      }
    } catch (e: any) {
      if (e.message?.includes('Google সেশন শেষ হয়েছে')) {
        throw e;
      }
      console.warn('Google People connections notice:', e);
    }

    // 2. Fetch Gmail Other Contacts (people interacted with via Gmail)
    try {
      const otherUrl = `https://people.googleapis.com/v1/otherContacts?readMask=names,phoneNumbers,emailAddresses,photos&pageSize=1000`;
      const otherRes = await fetch(otherUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (otherRes.ok) {
        const otherData = await otherRes.json();
        const otherList = otherData.otherContacts || [];

        for (const person of otherList) {
          const resourceName = person.resourceName || `otherContacts/c-${Date.now()}-${Math.random()}`;
          const name =
            person.names?.[0]?.displayName ||
            person.names?.[0]?.givenName ||
            person.emailAddresses?.[0]?.value?.split('@')[0] ||
            'Gmail পরিচিতি';
          const email = person.emailAddresses?.[0]?.value || undefined;
          const avatar = person.photos?.[0]?.url || undefined;
          const phoneNumbers = person.phoneNumbers || [];

          if (phoneNumbers.length > 0) {
            for (let i = 0; i < phoneNumbers.length; i++) {
              const rawPhone = phoneNumbers[i]?.value || '';
              if (!rawPhone) continue;
              const cleanDigits = rawPhone.replace(/\D/g, '');
              const dedupKey = cleanDigits || rawPhone;
              if (seenPhoneOrKey.has(dedupKey)) continue;
              seenPhoneOrKey.add(dedupKey);

              contacts.push({
                id: `gmail-${resourceName.replace('/', '-')}${i > 0 ? `-${i}` : ''}`,
                name: phoneNumbers.length > 1 && i > 0 ? `${name} (${phoneNumbers[i].type || '২'})` : name,
                phone: rawPhone,
                email,
                avatar,
                tag: 'Google',
                storageLocation: 'google',
                isFavorite: false,
                note: 'Gmail (Other Contacts) থেকে সিঙ্ক করা',
              });
            }
          } else if (email) {
            const dedupKey = email.toLowerCase();
            if (!seenPhoneOrKey.has(dedupKey)) {
              seenPhoneOrKey.add(dedupKey);
              contacts.push({
                id: `gmail-${resourceName.replace('/', '-')}`,
                name,
                phone: 'নম্বর নেই',
                email,
                avatar,
                tag: 'Google',
                storageLocation: 'google',
                isFavorite: false,
                note: 'Gmail কন্টাক্ট থেকে সিঙ্ক করা',
              });
            }
          }
        }
      } else {
        const otherErr = await otherRes.json().catch(() => ({}));
        console.warn('Gmail otherContacts fetch notice:', otherErr);
      }
    } catch (e: any) {
      console.warn('Gmail otherContacts fetch warning:', e);
    }

    return contacts;
  }

  /**
   * Create a new contact in Google Contacts
   */
  public static async createGoogleContact(contact: {
    givenName: string;
    familyName?: string;
    phoneNumber: string;
    email?: string;
    organization?: string;
  }): Promise<Contact> {
    if (!cachedAccessToken) {
      const signInRes = await this.signInWithGoogleContacts();
      cachedAccessToken = signInRes.accessToken;
    }

    const payload: any = {
      names: [
        {
          givenName: contact.givenName,
          familyName: contact.familyName || '',
        },
      ],
      phoneNumbers: [
        {
          value: contact.phoneNumber,
          type: 'mobile',
        },
      ],
    };

    if (contact.email) {
      payload.emailAddresses = [{ value: contact.email, type: 'work' }];
    }

    if (contact.organization) {
      payload.organizations = [{ name: contact.organization }];
    }

    const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Google Contacts-এ কন্টাক্ট সেভ করতে ব্যর্থ হয়েছে।');
    }

    const created = await response.json();
    const resourceName = created.resourceName || `people/c-${Date.now()}`;
    return {
      id: `google-${resourceName.replace('/', '-')}`,
      name: `${contact.givenName} ${contact.familyName || ''}`.trim(),
      phone: contact.phoneNumber,
      email: contact.email,
      company: contact.organization,
      tag: 'Google',
      storageLocation: 'device',
      isFavorite: false,
      note: 'Google Contacts-এ সংরক্ষিত',
    };
  }

  /**
   * Delete a contact from Google Contacts (Requires user confirmation)
   */
  public static async deleteGoogleContact(resourceName: string): Promise<boolean> {
    if (!cachedAccessToken) {
      const signInRes = await this.signInWithGoogleContacts();
      cachedAccessToken = signInRes.accessToken;
    }

    const formattedResource = resourceName.startsWith('people/') ? resourceName : `people/${resourceName}`;
    const response = await fetch(`https://people.googleapis.com/v1/${formattedResource}:deleteContact`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Google Contacts থেকে ডিলিট করতে ব্যর্থ হয়েছে।');
    }

    return true;
  }
}
