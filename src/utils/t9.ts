import { Contact } from '../types';

/**
 * Standard ITU E.161 / ISO/IEC 9995-8 Keypad mapping for T9 predictive search
 * 2: A, B, C
 * 3: D, E, F
 * 4: G, H, I
 * 5: J, K, L
 * 6: M, N, O
 * 7: P, Q, R, S
 * 8: T, U, V
 * 9: W, X, Y, Z
 * 0: Space / '+'
 */
export const T9_KEY_LETTERS: Record<string, string[]> = {
  '2': ['a', 'b', 'c'],
  '3': ['d', 'e', 'f'],
  '4': ['g', 'h', 'i'],
  '5': ['j', 'k', 'l'],
  '6': ['m', 'n', 'o'],
  '7': ['p', 'q', 'r', 's'],
  '8': ['t', 'u', 'v'],
  '9': ['w', 'x', 'y', 'z'],
  '0': [' '],
};

export const CHAR_TO_T9_DIGIT: Record<string, string> = {
  a: '2', b: '2', c: '2',
  d: '3', e: '3', f: '3',
  g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5',
  m: '6', n: '6', o: '6',
  p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8',
  w: '9', x: '9', y: '9', z: '9',
  ' ': '0',
};

// Common Bengali words to Latin phonetic equivalents for search matching
const KNOWN_BENGALI_WORDS: Record<string, string> = {
  'তানভীর': 'tanvir',
  'আহমেদ': 'ahmed',
  'ডাঃ': 'dr',
  'রফিকুল': 'rafiqul',
  'ইসলাম': 'islam',
  'আফরিন': 'afrin',
  'জাহান': 'jahan',
  'সাকিব': 'sakib',
  'আল': 'al',
  'হাসান': 'hasan',
  'নুসরাত': 'nusrat',
  'চৌধুরী': 'chowdhury',
  'মাহমুদ': 'mahmud',
  'করিম': 'karim',
  'ভাই': 'bhai',
  'বন্ধু': 'bondhu',
};

// Character-by-character Bengali phonetic mapping fallback
const BENGALI_CHAR_MAP: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'া': 'a', 'ই': 'i', 'ি': 'i', 'ঈ': 'i', 'ী': 'i',
  'উ': 'u', 'ু': 'u', 'ঊ': 'u', 'ূ': 'u', 'ঋ': 'ri', 'ৃ': 'ri',
  'এ': 'e', 'ে': 'e', 'ঐ': 'oi', 'ৈ': 'oi', 'ও': 'o', 'ো': 'o', 'ঔ': 'ou', 'ৌ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'c', 'ছ': 'ch', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'v', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h',
  '্': '', 'ঁ': '', ' ': ' ',
};

/**
 * Transliterates a Bengali string to Latin characters
 */
export function transliterateBengali(input: string): string {
  if (!input) return '';
  const words = input.trim().split(/\s+/);
  const latinWords = words.map((w) => {
    const cleanWord = w.replace(/[,.-]/g, '');
    if (KNOWN_BENGALI_WORDS[cleanWord]) {
      return KNOWN_BENGALI_WORDS[cleanWord];
    }
    let res = '';
    for (let i = 0; i < w.length; i++) {
      const char = w[i];
      if (BENGALI_CHAR_MAP[char] !== undefined) {
        res += BENGALI_CHAR_MAP[char];
      } else if (/[a-zA-Z0-9]/.test(char)) {
        res += char.toLowerCase();
      }
    }
    return res;
  });
  return latinWords.join(' ');
}

/**
 * Converts a text string (Latin) to its corresponding T9 digit sequence.
 * Non-alphanumeric chars become spaces or empty.
 */
export function textToT9(text: string): string {
  let digits = '';
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (CHAR_TO_T9_DIGIT[ch] !== undefined) {
      digits += CHAR_TO_T9_DIGIT[ch];
    } else if (ch >= '0' && ch <= '9') {
      digits += ch;
    } else if (ch === ' ') {
      digits += '0';
    } else {
      digits += '_'; // placeholder for punctuation
    }
  }
  return digits;
}

export interface HighlightRange {
  start: number;
  end: number; // exclusive
}

export interface T9SearchResult {
  contact: Contact;
  score: number;
  matchType: 't9_first_name' | 't9_last_name' | 't9_initials' | 't9_substring' | 'phone';
  matchDetail: string; // e.g., 'T9: "A"', 'T9: "TAN"', 'T9: Initials (TA)', 'Phone Match'
  nameHighlights?: HighlightRange[];
  phoneHighlights?: HighlightRange[];
  secondaryName?: string; // English / transliteration preview if primary name is Bengali
  matchedDigits: string;
}

export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

/**
 * Converts text into highlighted and non-highlighted segments for UI rendering
 */
export function getHighlightedSegments(
  text: string,
  ranges?: HighlightRange[]
): HighlightSegment[] {
  if (!ranges || ranges.length === 0 || !text) {
    return [{ text, isHighlighted: false }];
  }

  // Sort and merge overlapping ranges
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [];
  for (const r of sorted) {
    if (r.start >= r.end || r.start >= text.length) continue;
    const clamped = {
      start: Math.max(0, r.start),
      end: Math.min(text.length, r.end),
    };
    if (merged.length === 0) {
      merged.push(clamped);
    } else {
      const last = merged[merged.length - 1];
      if (clamped.start <= last.end) {
        last.end = Math.max(last.end, clamped.end);
      } else {
        merged.push(clamped);
      }
    }
  }

  if (merged.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const segments: HighlightSegment[] = [];
  let curr = 0;
  for (const r of merged) {
    if (r.start > curr) {
      segments.push({ text: text.substring(curr, r.start), isHighlighted: false });
    }
    segments.push({ text: text.substring(r.start, r.end), isHighlighted: true });
    curr = r.end;
  }
  if (curr < text.length) {
    segments.push({ text: text.substring(curr), isHighlighted: false });
  }

  return segments;
}

/**
 * Returns user-friendly description of what letters the typed numbers map to.
 * e.g. "2" -> "A, B, C"
 * "23" -> "[ABC][DEF]"
 */
export function getT9MappingHint(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, '');
  if (!clean) return '';

  if (clean.length === 1) {
    const letters = T9_KEY_LETTERS[clean];
    return letters ? letters.map((l) => l.toUpperCase()).join(', ') : '';
  }

  // Multi-digit summary e.g. [ABC][DEF][GHI]
  return clean
    .split('')
    .map((d) => {
      const letters = T9_KEY_LETTERS[d];
      return letters ? `[${letters.map((l) => l.toUpperCase()).join('')}]` : `[${d}]`;
    })
    .join('');
}

/**
 * Checks a single name string (e.g. "Tanvir Ahmed" or "Afrin") against query digits.
 * Returns match information if found.
 */
function checkNameT9Match(
  name: string,
  queryDigits: string
): {
  matched: boolean;
  score: number;
  matchType: 't9_first_name' | 't9_last_name' | 't9_initials' | 't9_substring';
  highlights: HighlightRange[];
  matchDetail: string;
} | null {
  if (!name || !queryDigits) return null;

  const t9String = textToT9(name); // e.g. "826847024633" for "Tanvir Ahmed"
  const words = name.split(/\s+/);
  
  // Track start positions of each word in the original string
  const wordMeta: { word: string; start: number; end: number; t9: string }[] = [];
  let charIndex = 0;
  for (const w of words) {
    const start = name.indexOf(w, charIndex);
    const end = start + w.length;
    wordMeta.push({
      word: w,
      start,
      end,
      t9: textToT9(w),
    });
    charIndex = end;
  }

  // 1. Check if first word starts with queryDigits (Primary Prefix Match)
  // e.g. Query "2" matches "Alice" or "Afrin" -> score 100
  if (wordMeta.length > 0 && wordMeta[0].t9.startsWith(queryDigits)) {
    const matchedChars = queryDigits.length;
    return {
      matched: true,
      score: 100 + (wordMeta[0].word.length === queryDigits.length ? 15 : 0),
      matchType: 't9_first_name',
      highlights: [{ start: wordMeta[0].start, end: wordMeta[0].start + matchedChars }],
      matchDetail: `T9: "${name.substring(wordMeta[0].start, wordMeta[0].start + matchedChars)}"`,
    };
  }

  // 2. Check if any subsequent word starts with queryDigits (Secondary Word Prefix Match)
  // e.g. Query "2" matches "Tanvir Ahmed" (Ahmed starts with A) -> score 90
  for (let i = 1; i < wordMeta.length; i++) {
    if (wordMeta[i].t9.startsWith(queryDigits)) {
      const matchedChars = queryDigits.length;
      return {
        matched: true,
        score: 90,
        matchType: 't9_last_name',
        highlights: [{ start: wordMeta[i].start, end: wordMeta[i].start + matchedChars }],
        matchDetail: `T9: "${name.substring(wordMeta[i].start, wordMeta[i].start + matchedChars)}"`,
      };
    }
  }

  // 3. Initials Match
  // e.g. "Tanvir Ahmed" has initials T(8) and A(2) => "82"
  if (wordMeta.length >= 2) {
    const initialsT9 = wordMeta.map((wm) => (wm.t9.length > 0 ? wm.t9[0] : '')).join('');
    if (initialsT9.startsWith(queryDigits)) {
      const highlights: HighlightRange[] = [];
      for (let k = 0; k < queryDigits.length && k < wordMeta.length; k++) {
        highlights.push({ start: wordMeta[k].start, end: wordMeta[k].start + 1 });
      }
      return {
        matched: true,
        score: 85,
        matchType: 't9_initials',
        highlights,
        matchDetail: `T9 Initials (${name.split(/\s+/).map((w) => w[0]).join('')})`,
      };
    }
  }

  // 4. Substring anywhere in the name (Contiguous T9 letters)
  // e.g. "Tanvir" has 'a' (2) at index 1 -> query "2" matches 'a'
  const subIdx = t9String.indexOf(queryDigits);
  if (subIdx !== -1) {
    return {
      matched: true,
      score: 60,
      matchType: 't9_substring',
      highlights: [{ start: subIdx, end: subIdx + queryDigits.length }],
      matchDetail: `T9: "${name.substring(subIdx, subIdx + queryDigits.length)}"`,
    };
  }

  return null;
}

/**
 * Checks phone number match
 */
function checkPhoneMatch(
  phone: string,
  queryDigits: string
): {
  matched: boolean;
  score: number;
  highlights: HighlightRange[];
  matchDetail: string;
} | null {
  if (!phone || !queryDigits) return null;

  // Clean phone to just digits
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanIdx = cleanPhone.indexOf(queryDigits);

  if (cleanIdx === -1) return null;

  // Map the clean index range back to the original formatted phone string
  let currDigitCount = 0;
  let startInOriginal = -1;
  let endInOriginal = -1;

  for (let i = 0; i < phone.length; i++) {
    if (/[0-9]/.test(phone[i])) {
      if (currDigitCount === cleanIdx) {
        startInOriginal = i;
      }
      if (currDigitCount === cleanIdx + queryDigits.length - 1) {
        endInOriginal = i + 1;
        break;
      }
      currDigitCount++;
    }
  }

  if (startInOriginal === -1) startInOriginal = 0;
  if (endInOriginal === -1) endInOriginal = phone.length;

  const isPrefix = cleanIdx === 0 || cleanIdx === 3 || cleanIdx === 4; // e.g. after +880
  return {
    matched: true,
    score: isPrefix ? 80 : 50,
    highlights: [{ start: startInOriginal, end: endInOriginal }],
    matchDetail: `Phone: ${queryDigits}`,
  };
}

/**
 * Main T9 Predictive Search function.
 * Given a list of contacts and typed digits, returns sorted matching contacts
 * with highlighted ranges and match metadata.
 */
export function searchContactsT9(
  contacts: Contact[],
  query: string
): T9SearchResult[] {
  const queryDigits = query.replace(/[^0-9]/g, '');
  if (!queryDigits) return [];

  const results: T9SearchResult[] = [];

  for (const contact of contacts) {
    let bestMatch: T9SearchResult | null = null;

    // 1. Test primary name (if Latin)
    const primaryNameMatch = checkNameT9Match(contact.name, queryDigits);
    if (primaryNameMatch) {
      bestMatch = {
        contact,
        score: primaryNameMatch.score,
        matchType: primaryNameMatch.matchType,
        matchDetail: primaryNameMatch.matchDetail,
        nameHighlights: primaryNameMatch.highlights,
        matchedDigits: queryDigits,
      };
    }

    // 2. Test explicit English name (contact.nameEn)
    if (contact.nameEn) {
      const enMatch = checkNameT9Match(contact.nameEn, queryDigits);
      if (enMatch && (!bestMatch || enMatch.score > bestMatch.score)) {
        bestMatch = {
          contact,
          score: enMatch.score,
          matchType: enMatch.matchType,
          matchDetail: enMatch.matchDetail,
          secondaryName: contact.nameEn,
          nameHighlights: enMatch.highlights,
          matchedDigits: queryDigits,
        };
      }
    }

    // 3. If primary name is Bengali/non-Latin, test automatic transliteration
    const isBengali = /[\u0980-\u09FF]/.test(contact.name);
    if (isBengali && !contact.nameEn) {
      const transliterated = transliterateBengali(contact.name);
      if (transliterated) {
        const transMatch = checkNameT9Match(transliterated, queryDigits);
        if (transMatch && (!bestMatch || transMatch.score > bestMatch.score)) {
          bestMatch = {
            contact,
            score: transMatch.score - 5, // slightly lower score than native latin
            matchType: transMatch.matchType,
            matchDetail: transMatch.matchDetail,
            secondaryName: transliterated,
            matchedDigits: queryDigits,
          };
        }
      }
    }

    // 4. Test phone number match
    const phoneMatch = checkPhoneMatch(contact.phone, queryDigits);
    if (phoneMatch) {
      if (!bestMatch || phoneMatch.score > bestMatch.score) {
        bestMatch = {
          contact,
          score: phoneMatch.score,
          matchType: 'phone',
          matchDetail: phoneMatch.matchDetail,
          phoneHighlights: phoneMatch.highlights,
          matchedDigits: queryDigits,
        };
      }
    }

    // If a match was found, apply favorite boost and add to results
    if (bestMatch) {
      if (contact.isFavorite) {
        bestMatch.score += 15;
      }
      results.push(bestMatch);
    }
  }

  // Sort descending by score, then alphabetically
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.contact.name.localeCompare(b.contact.name);
  });

  return results;
}
