/**
 * Splits a string of keywords into an array of individual keywords.
 *
 * The function first splits the input string by commas or semicolons, but ignores those that are inside brackets, parentheses, or curly braces.
 * Then it further splits each resulting string by various separators such as " ·", "-", "–", "", or "/ ".
 * Finally, it trims any leading or trailing whitespace from each keyword.
 *
 * @param {string} inputString - The string of keywords to be split.
 * @returns {string[]} An array of individual keywords.
 */
const SPLIT_REGEX = /[,;](?![^{[(<]*[\])}>])/;
const RESPLIT_REGEX = / ·|-|–||\/ /;

export function splitKeywords(inputString: string): string[] {
  return inputString
    .split(SPLIT_REGEX)
    .flatMap((s) => s.split(RESPLIT_REGEX))
    .map((s) => s.trim());
}
