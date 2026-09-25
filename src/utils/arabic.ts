/**
 * Arabic text normalization and validation utilities for "بنات العيلة"
 */

// Diacritics (Harakat) and Tatweel
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u0640]/g;

/**
 * Strips Tashkeel (Harakat) and Tatweel (Kashida)
 */
export function stripTashkeel(text: string): string {
  if (!text) return '';
  return text.replace(TASHKEEL_REGEX, '');
}

/**
 * Standardize single letter (handling Alef variants, Ta Marbuta, Yeh/Alef Maqsura)
 */
export function normalizeChar(char: string): string {
  if (!char) return '';
  const c = stripTashkeel(char).trim();
  if (['أ', 'إ', 'آ', 'ٱ', 'ا'].includes(c)) return 'ا';
  if (['ة', 'ه', 'هـ'].includes(c)) return 'ه';
  if (['ى', 'ي', 'ئ'].includes(c)) return 'ي';
  return c;
}

/**
 * Normalizes an Arabic string for fair duplicate matching:
 * - strips diacritics
 * - normalizes alef variants (أ / إ / آ / ا)
 * - normalizes taa marbuta (ة -> ه)
 * - normalizes alef maqsura (ى -> ي)
 * - strips optional definite article "ال"
 * - collapses extra whitespace
 */
export function normalizeForComparison(word: string): string {
  if (!word) return '';
  let cleaned = stripTashkeel(word).trim().toLowerCase();

  // Normalize Alef variants
  cleaned = cleaned.replace(/[أإآٱ]/g, 'ا');
  // Normalize Taa Marbuta
  cleaned = cleaned.replace(/ة/g, 'ه');
  // Normalize Alef Maqsura
  cleaned = cleaned.replace(/ى/g, 'ي');
  
  // Collapse whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Strip leading "ال" if the word is longer than 2 characters
  // E.g. "الموز" -> "موز", "المغرب" -> "مغرب", "الاسد" -> "اسد"
  if (cleaned.startsWith('ال') && cleaned.length > 2) {
    cleaned = cleaned.slice(2);
  }

  return cleaned.trim();
}

/**
 * Checks whether an answer word validly starts with the target round letter.
 * Allows:
 * - Word starts with target letter directly (e.g. "موز" for 'م')
 * - Word starts with definite article "ال" followed by target letter (e.g. "الموز" for 'م')
 * - If target letter is 'ا':
 *   - "أحمد", "إبراهيم", "أسد", "أرز" all match 'ا'
 *   - "الاردن", "الاسد" match 'ا' (both with or without 'ال')
 * - If target letter is 'هـ': matches 'ه' and 'هـ'
 */
export function checkStartsWithLetter(word: string, targetLetter: string): boolean {
  if (!word || !targetLetter) return false;

  const cleanWord = stripTashkeel(word).trim();
  if (cleanWord.length === 0) return false;

  const normTarget = normalizeChar(targetLetter);

  // Check 1: Direct first character match
  const firstChar = normalizeChar(cleanWord[0]);
  if (firstChar === normTarget) {
    return true;
  }

  // Check 2: Word starts with "ال" (Definite article) followed by target letter
  // E.g. target = 'م', word = 'الموز' -> after 'ال', char is 'م'
  if (cleanWord.startsWith('ال') && cleanWord.length > 2) {
    const charAfterAl = normalizeChar(cleanWord[2]);
    if (charAfterAl === normTarget) {
      return true;
    }
  }

  // Special case: if target is 'ا' and word starts with 'الـ'
  // E.g. "الاردن", "الاسد", "المانيا"
  if (normTarget === 'ا' && cleanWord.startsWith('ال')) {
    // Both 'ال' starts with 'ا', and if word after 'ال' starts with 'ا'
    return true;
  }

  return false;
}
