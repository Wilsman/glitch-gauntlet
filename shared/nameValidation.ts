import * as LeoProfanity from 'leo-profanity';

let dictionaryLoaded = false;

function ensureDictionaryLoaded() {
  if (!dictionaryLoaded) {
    LeoProfanity.loadDictionary('en');
    dictionaryLoaded = true;
  }
}

const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'mod',
  'system',
  'support',
  'staff',
  'owner',
  'dev',
]);

export type NameValidationResult = {
  normalizedName: string;
  error: string | null;
};

export function validatePlayerName(input: string): NameValidationResult {
  ensureDictionaryLoaded();

  const normalized = input.normalize('NFKC').replace(/\s+/g, ' ').trim();

  if (normalized.length === 0) {
    return { normalizedName: normalized, error: 'Please enter a name' };
  }

  if (normalized.length < 2) {
    return { normalizedName: normalized, error: 'Name must be at least 2 characters' };
  }

  if (normalized.length > 20) {
    return { normalizedName: normalized, error: 'Name must be 20 characters or less' };
  }

  if (!/^[a-zA-Z0-9 _-]+$/.test(normalized)) {
    return {
      normalizedName: normalized,
      error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  if (RESERVED_NAMES.has(normalized.toLowerCase())) {
    return { normalizedName: normalized, error: 'Please choose a different name' };
  }

  if (LeoProfanity.check(normalized)) {
    return { normalizedName: normalized, error: 'Please choose a more appropriate name' };
  }

  const condensed = normalized.replace(/[\s_-]+/g, '');
  if (condensed !== normalized && LeoProfanity.check(condensed)) {
    return { normalizedName: normalized, error: 'Please choose a more appropriate name' };
  }

  return { normalizedName: normalized, error: null };
}
