export function splitKeywords(inputString: string): string[] {
  const splitRegex = /,(?![^{\[\(<]*[\]\)}>])/;
  const resplitRegex = / ·|-|–||\/ /;
  return inputString
    .split(splitRegex)
    .map((s) => s.split(resplitRegex))
    .flat()
    .map((s) => s.trim());
}
