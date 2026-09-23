import { User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

let cachedAccessToken: string | null = null;

export class GoogleContactsService {
  /**
   * Get cached token or attempt to prompt sign in
   */
  public static async getAccessToken(): Promise<string | null> {
    return cachedAccessToken;
  }

  public static setAccessToken(token: string | null) {
    cachedAccessToken = token;
  }

  /**
   * Sign in with Google with Contacts scopes
   */
  public static async signInWithGoogleContacts(): Promise<{ user: User; accessToken: string }> {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth Access Token পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  }

  /**
   * Fetch contacts from Google People API
   */
  public static async fetchGoogleContacts(): Promise<Contact[]> {
    if (!cachedAccessToken) {
      const signInRes = await this.signInWithGoogleContacts();
      cachedAccessToken = signInRes.accessToken;
    }

    const personFields = 'names,phoneNumbers,emailAddresses,organizations,userDefined,photos';
    const pageSize = 100;
    const url = `https://people.googleapis.com/v1/people/me/connections?personFields=${personFields}&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google সেশন শেষ হয়েছে। অনুগ্রহ করে পুনরায় সাইন-ইন করুন।');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `Google People API Error: ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    const connections = data.connections || [];

    const contacts: Contact[] = [];

    for (const person of connections) {
      const resourceName = person.resourceName || `people/c-${Date.now()}`;
      const name = person.names?.[0]?.displayName || person.names?.[0]?.givenName || 'নামহীন কন্টাক্ট';
      const phoneNumbers = person.phoneNumbers || [];
      const primaryPhone = phoneNumbers.find((p: any) => p.metadata?.primary)?.value || phoneNumbers[0]?.value || '';
      const email = person.emailAddresses?.[0]?.value || undefined;
      const company = person.organizations?.[0]?.name || undefined;
      const avatar = person.photos?.[0]?.url || undefined;

      if (!primaryPhone && !name) continue;

      contacts.push({
        id: `google-${resourceName.replace('/', '-')}`,
        name: name,
        phone: primaryPhone || 'নম্বর নেই',
        email,
        company,
        avatar,
        tag: 'Google',
        storageLocation: 'device',
        isFavorite: false,
        note: 'Google Contacts থেকে সিঙ্ক করা',
      });
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
