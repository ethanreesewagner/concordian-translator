/**
 * Concordian Translator Engine
 * 
 * A deterministic, dictionary-based translator that:
 * 1. Uses a hardcoded bidirectional dictionary from the Concordian language
 * 2. Generates new Concordian-sounding words for unknown terms using syllable patterns
 * 3. Persists newly generated words in localStorage so they're consistent across sessions
 */

// ─── Core Dictionary ───────────────────────────────────────────────────────────
// Bidirectional: English (lowercase) ↔ Concordian (original case)

const DICTIONARY_ENTRIES: [string, string][] = [
  // Greetings & basics
  ["hello", "Zun"],
  ["hi", "Zun"],
  ["no", "Nauta"],
  ["yes", "Yessant"],
  ["goodbye", "Ashanakumaku"],
  ["bye", "Ashanah"],
  ["thank you", "Malanal"],
  ["thanks", "Malanal"],
  ["foslium", "Murder"],
  ["dick", "kior"],
  ["chorus fruit","melodi pi tarpae"],
  ["music","melodi"],
  ["fruit","tarpae"],

  // Articles & prepositions
  ["the", "Zalthar"],
  ["of", "Olvish"],
  ["and", "Andrion"],
  ["a", "Aylish"],
  ["an", "Aylish"],
  ["in", "Inzolix"],
  ["to", "Torivan"],
  ["is", "Torivan"],
  ["with", "Wixarno"],
  ["for", "Forinx"],
  ["on", "Onzor"],
  ["by", "Byrinxo"],
  ["about", "Abixorinu"],
  ["against", "Agistokrau"],
  ["between", "Betwexinnu"],
  ["into", "Intovarin"],
  ["through", "Thruzixan"],
  ["over", "Ovrenixo"],
  ["after", "Aftrisxin"],
  ["beyond", "Beyontarixu"],
  ["under", "Undrixono"],
  ["before", "Befrisunar"],
  ["inside", "Insidrinumo"],
  ["without", "Witovrisar"],
  ["near", "Neawrinmo"],
  ["since", "Sinzunar"],
  ["during", "Durimtar"],
  ["despite", "Despitarun"],
  ["around", "Arundorix"],
  ["across", "Acronstar"],
  ["among", "Amungorin"],

  // Pronouns & possessives
  ["i", "You"],
  ["my", "Mi"],
  ["me", "Mi"],
  ["your", "Ma"],
  ["you", "Amm"],
  ["we", "Mi"],
  ["am", "Amm"],
  ["have", "Amm"],
  ["bug", "Kamar"],
  ["bedroom", "Mastoor batoor"],
  ["room","Mastoor"],
  ["bed","batoor"],

  // People & relationships
  ["friend", "Sir"],
  ["friends", "Masir"],
  ["mom", "Metta"],
  ["mother", "Metta"],
  ["father", "Petta"],
  ["brother", "Brennta"],
  ["sister", "Gretna"],
  ["dad", "Petta"],
  ["son", "Anmu"],
  ["king", "Kron"],
  ["feel", "salena"],
  ["world", "verda"],
  ["teacher", "samanu"],
  ["exist", "aya"],
  ["never", "inau"],
  ["help", "areku"],
  ["peace", "konrda"],

  // Nature & objects
  ["tree", "Teh"],
  ["big", "Ovrenixo"],
  ["fish", "Feeah"],
  ["broccoli", "Bronco"],
  ["water", "Haimak"],
  ["fire", "Kamakukumaki"],
  ["air", "Aeoli"],
  ["ball", "Kasa"],
  ["dog", "Dunkata"],
  ["war", "Kakumiko"],
  ["death", "Deacesent"],
  ["life", "Hamamruku"],
  ["religion", "Akman"],
  ["wheat", "Wautoma"],

  // Concepts
  ["god", "Amma"],
  ["heaven", "Zarion pi Amma"],
  ["hell", "Takujen"],
  ["devil", "Takujen"],
  ["love", "Onzo"],
  ["favorite", "Onzonzo"],
  ["here", "Intobexu"],
  ["smart", "Beyondarixu-onzor"],
  ["intelligent", "Onzorforinx"],
  ["very", "Torivan"],
  ["cold", "Krion"],
  ["healthy", "Ferin"],
  ["divine help", "Shakeleh"],
  ["dumb", "Dungarae"],
  ["idiot", "Idiotiraxeiu"],

  // Numbers
  ["1", "Do"],
  ["2", "Re"],
  ["3", "Me"],
  ["4", "Fa"],
  ["5", "So"],
  ["6", "La"],
  ["7", "Ti"],
  ["8", "TiDo"],
  ["9", "TiRe"],
  ["10", "SoSo"],
  ["one", "Do"],
  ["two", "Re"],
  ["three", "Me"],
  ["four", "Fa"],
  ["five", "So"],
  ["six", "La"],
  ["seven", "Ti"],
  ["eight", "TiDo"],
  ["nine", "TiRe"],
  ["ten", "SoSo"],

  // Slang & profanity
  ["fuck", "Chacuantu"],
  ["shit", "Gatu"],
  ["damn", "Vannu"],
  ["goddamn", "Amma vannu"],
  ["bitch", "Dunkata A Met"],
  ["dumbass", "Dungarae"],
  ["idiot", "Idiotiraxeiu"],
  ["retard", "Danki"],
  ["dog", "Dunkata"],
];

// ─── Build lookup maps ──────────────────────────────────────────────────────────

const enToCon = new Map<string, string>();
const conToEn = new Map<string, string>();

for (const [en, con] of DICTIONARY_ENTRIES) {
  enToCon.set(en.toLowerCase(), con);
  conToEn.set(con.toLowerCase(), en);
}

// ─── Concordian Syllable Patterns (for generating new words) ────────────────────

const ONSETS = [
  "z", "v", "k", "tr", "x", "w", "f",
  "m", "n", "s", "g", "t", "p", "l", "d", "b",
];
const NUCLEI = ["a", "e", "i", "o", "u", "ai", "oi"];
const CODAS = [
  "n", "r", "x", "l", "m", "k", "s", "", "", "",
];
const SUFFIXES = [
  "an", "ix", "or", "un", "ar", "en", "ol",
  "in", "ak", "um", "is", "al", "on",
];

// ─── Deterministic hash ─────────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], hash: number, offset: number): T {
  return arr[((hash >>> offset) ^ (hash >>> (offset + 7))) % arr.length];
}

// ─── Word Generator ─────────────────────────────────────────────────────────────

function generateConcordianWord(englishWord: string): string {
  const h = hashString(englishWord.toLowerCase());

  // 1-2 syllables to keep words short like real Concordian
  const syllableCount = 1 + (h % 2);
  let word = "";

  for (let i = 0; i < syllableCount; i++) {
    const onset = pick(ONSETS, h, i * 5);
    const nucleus = pick(NUCLEI, h, i * 5 + 2);
    const coda = i < syllableCount - 1 ? pick(CODAS, h, i * 5 + 4) : "";
    word += onset + nucleus + coda;
  }

  // Short Concordian suffix
  const suffix = pick(SUFFIXES, h, 16);
  word += suffix;

  // Capitalize first letter
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ─── localStorage Persistence ───────────────────────────────────────────────────

const STORAGE_KEY = "concordian_custom_dictionary";
const STORAGE_VERSION_KEY = "concordian_dict_version";
const CURRENT_VERSION = "2"; // Bump when word generation algorithm changes

function loadCustomDictionary(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    // Clear cache if algorithm version changed
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      return new Map();
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries: [string, string][] = JSON.parse(stored);
      return new Map(entries);
    }
  } catch {
    // ignore parse errors
  }
  return new Map();
}

function saveCustomDictionary(dict: Map<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dict.entries())));
  } catch {
    // ignore storage errors
  }
}

// Mutable custom dictionary that grows over time
let customEnToCon: Map<string, string> = new Map();
let customConToEn: Map<string, string> = new Map();
let initialized = false;

function ensureCustomDicts() {
  if (!initialized) {
    customEnToCon = loadCustomDictionary();
    customConToEn = new Map();
    for (const [en, con] of customEnToCon.entries()) {
      customConToEn.set(con.toLowerCase(), en);
    }
    initialized = true;
  }
}

export function exportDictionaryAsJSON(): string {
  ensureCustomDicts();
  const entries: Record<string, string> = {};
  for (const [en, con] of customEnToCon.entries()) {
    entries[en] = con;
  }
  return JSON.stringify(entries, null, 2);
}

export function importDictionaryFromJSON(jsonString: string) {
  try {
    const entries = JSON.parse(jsonString);
    ensureCustomDicts();
    for (const [en, con] of Object.entries(entries)) {
      if (typeof con === "string") {
        customEnToCon.set(en.toLowerCase(), con);
        customConToEn.set(con.toLowerCase(), en.toLowerCase());
      }
    }
    saveCustomDictionary(customEnToCon);
    return true;
  } catch (err) {
    console.error("Failed to parse dictionary JSON:", err);
    return false;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function translateWord(word: string, direction: "en-con" | "con-en"): string {
  ensureCustomDicts();

  if (direction === "en-con") {
    const lower = word.toLowerCase();

    // 1. Check hardcoded dictionary
    const known = enToCon.get(lower);
    if (known) return known;

    // 2. Check custom dictionary 
    const custom = customEnToCon.get(lower);
    if (custom) return custom;

    // 3. Proper noun check: If it begins with a capital letter, it's likely a proper noun
    // or the beginning of a sentence. We keep the word roughly the same to avoid 
    // heavily mutating names, while applying Concordian phonetics.
    if (word.length > 0 && word[0] === word[0].toUpperCase()) {
      return word
        .replace(/e/g, "ay")
        .replace(/E/g, "Ay")
        .replace(/z/g, "zh")
        .replace(/Z/g, "Zh")
        .replace(/x/g, "sh")
        .replace(/X/g, "Sh");
    }

    // 4. Generate hash-based placeholder word
    return generateConcordianWord(word);
  } else {
    const lower = word.toLowerCase();

    // 1. Check hardcoded dictionary
    const known = conToEn.get(lower);
    if (known) return known;

    // 2. Check custom dictionary
    const custom = customConToEn.get(lower);
    if (custom) return custom;

    // 3. Unknown Concordian word — return as-is
    return word;
  }
}

export function translate(text: string, direction: "en-con" | "con-en"): string {
  if (!text.trim()) return "";

  // Split text into words while preserving punctuation and spacing
  const tokens = text.match(/[\w']+|[^\w\s]+|\s+/g) || [];

  const translated = tokens.map((token) => {
    // Skip whitespace and punctuation
    if (/^\s+$/.test(token) || /^[^\w]+$/.test(token)) {
      return token;
    }

    const result = translateWord(token, direction);

    // Preserve original capitalization pattern
    if (token === token.toUpperCase() && token.length > 1) {
      return result.toUpperCase();
    }
    if (token[0] === token[0].toUpperCase()) {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result.toLowerCase();
  });

  return translated.join("");
}

export function getFullDictionary(): { english: string; concordian: string }[] {
  ensureCustomDicts();
  const entries: { english: string; concordian: string }[] = [];

  for (const [en, con] of DICTIONARY_ENTRIES) {
    entries.push({ english: en, concordian: con });
  }

  for (const [en, con] of customEnToCon.entries()) {
    entries.push({ english: en, concordian: `${con} (generated)` });
  }

  return entries;
}

export async function clearCustomDictionary() {
  customEnToCon.clear();
  customConToEn.clear();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Learn a new word from the AI model (or user input), pushing to API */
export async function learnWord(english: string, concordian: string) {
  ensureCustomDicts();
  const lower = english.toLowerCase();
  
  // Set locally for instant UI update
  customEnToCon.set(lower, concordian);
  customConToEn.set(concordian.toLowerCase(), lower);
  
  saveCustomDictionary(customEnToCon);
}

/** Find words in a text that aren't in the hardcoded nor custom dictionary */
export function getUnknownWords(text: string): string[] {
  ensureCustomDicts();
  const tokens = text.match(/[\w']+/g) || [];
  const unknowns: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    // Skip if it's in the hardcoded dictionary
    if (enToCon.has(lower)) continue;
    // Skip if we already learned it in our custom dictionary
    if (customEnToCon.has(lower)) continue;

    // Skip short words, numbers, etc.
    if (lower.length <= 2) continue;
    if (/^\d+$/.test(lower)) continue;

    unknowns.push(lower);
  }

  return unknowns;
}

