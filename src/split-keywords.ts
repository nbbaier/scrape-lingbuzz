/**
 * Splits a string of keywords into an array of individual keywords.
 *
 * The function first splits the input string by commas, but ignores commas that are inside brackets, parentheses, or curly braces.
 * Then it further splits each resulting string by various separators such as " ·", "-", "–", "", or "/ ".
 * Finally, it trims any leading or trailing whitespace from each keyword.
 *
 * @param {string} inputString - The string of keywords to be split.
 * @returns {string[]} An array of individual keywords.
 */
const KEYWORDS_REGEXP = /,(?![^{[(<]*[\])}>])| ·|-|–||\/ /;

export function splitKeywords(inputString: string): string[] {
  const trimmedInput = inputString.trim();
  if (!trimmedInput) {
    return [];
  }

  const parts = trimmedInput.split(KEYWORDS_REGEXP);
  const result: string[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part) {
      result.push(part);
    }
  }

  return result;
}
