export type RecognizedWordType = {
  text: string;
  /** OCR confidence, 0..100. */
  confidence: number;
};

/** Below this the OCR mostly reads texture and edges as letters. */
const MIN_WORD_CONFIDENCE = 70;
const MIN_TERM_LENGTH = 3;
const MAX_TERMS = 6;

/** Words that appear on almost any box or label and say nothing about which product it is. */
const NOISE_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "new",
  "made",
  "model",
  "series",
  "www",
  "com",
  "inc",
  "ltd",
  "usb",
]);

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

/** Trims punctuation around a word ("(Samsung)," → "Samsung"); a loop, as OCR noise can be long. */
function normalizeTerm(text: string): string {
  const characters = [...text];
  const start = characters.findIndex((character) => WORD_CHARACTER.test(character));

  if (start === -1) {
    return "";
  }

  let end = characters.length - 1;

  while (!WORD_CHARACTER.test(characters[end])) {
    end--;
  }

  return characters.slice(start, end + 1).join("");
}

function isMeaningfulTerm(term: string): boolean {
  const letters = term.replace(/[^\p{L}]/gu, "");

  // A bare number ("2024", "65") is rarely a brand; a model code keeps its letters ("MX3", "T9").
  return term.length >= MIN_TERM_LENGTH && letters.length > 0 && !NOISE_WORDS.has(term.toLowerCase());
}

/**
 * Turns what the OCR read on the photo into search terms: brand, model and product words that are likely to
 * be printed on the item or its box. Confident and longer words come first; duplicates are dropped.
 */
export function extractSearchTerms(words: RecognizedWordType[]): string[] {
  const seen = new Set<string>();

  return words
    .filter((word) => word.confidence >= MIN_WORD_CONFIDENCE)
    .map((word) => ({ term: normalizeTerm(word.text), confidence: word.confidence }))
    .filter(({ term }) => isMeaningfulTerm(term))
    .sort((a, b) => b.confidence * b.term.length - a.confidence * a.term.length)
    .map(({ term }) => term)
    .filter((term) => {
      const key = term.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_TERMS);
}

/** Splits what the shopper typed into terms the same way, so typed and read text are matched alike. */
export function splitTypedText(text: string): string[] {
  return extractSearchTerms(text.split(/\s+/).map((word) => ({ text: word, confidence: 100 })));
}
