import { GeminiCallerIdMetadata, CallerIdRecord } from '../types';

export interface GeminiLookupResponse {
  success: boolean;
  data?: GeminiCallerIdMetadata;
  error?: string;
  isSimulated?: boolean;
  warning?: string;
}

/**
 * Fetch real-time live Caller ID metadata from the Gemini API via server route /api/caller-id/gemini-lookup
 */
export async function fetchLiveGeminiCallerId(
  phone: string,
  contextNote?: string
): Promise<GeminiLookupResponse> {
  try {
    const res = await fetch('/api/caller-id/gemini-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone.trim(),
        context: contextNote || 'User requested live Caller ID lookup',
      }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to reach Gemini Caller ID server`);
    }

    const payload: GeminiLookupResponse = await res.json();
    return payload;
  } catch (err: any) {
    console.error('Error fetching live Gemini Caller ID:', err);
    return {
      success: false,
      error: err.message || 'Network error while contacting Gemini Caller ID API',
    };
  }
}

/**
 * Converts a GeminiCallerIdMetadata object into a standard CallerIdRecord
 * ready to be saved into the Android Room SQLite / IndexedDB database.
 */
export function geminiMetadataToCallerIdRecord(meta: GeminiCallerIdMetadata): CallerIdRecord {
  return {
    phone: meta.phone,
    name: meta.name,
    businessCategory: meta.businessCategory,
    carrier: meta.carrier,
    spamScore: meta.spamScore,
    spamReports: meta.spamReports,
    city: meta.city,
    country: meta.country,
    verified: meta.verified,
    notes: meta.notes,
    trustLevel: meta.trustLevel,
    isGeminiAnalyzed: true,
  };
}
