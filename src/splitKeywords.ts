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
export function splitKeywords(inputString: string): string[] {
  const splitRegex = /,(?![^{\[\(<]*[\]\)}>])/;
  const resplitRegex = / ·|-|–||\/ /;
  return inputString
    .split(splitRegex)
    .map((s) => s.split(resplitRegex))
    .flat()
    .map((s) => s.trim());
}
