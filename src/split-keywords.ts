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
const COMBINED_REGEX = /,(?![^{[(<]*[\])}>])| ·|-|–||\/ /;

export function splitKeywords(inputString: string): string[] {
  if (!inputString.trim()) {
    return [];
  }

  const result: string[] = [];
  const split = inputString.split(COMBINED_REGEX);

  for (const item of split) {
    const trimmed = item.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}
