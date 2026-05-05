const SPLIT_REGEX = /,(?![^{[(<]*[\])}>])/;
const RESPLIT_REGEX = / ·|-|–||\/ /;
const COMBINED_REGEX = /,(?![^{[(<]*[\])}>])| ·|-|–||\/ /;

function original(inputString: string): string[] {
  if (!inputString.trim()) {
    return [];
  }
  return inputString
    .split(SPLIT_REGEX)
    .flatMap((s) => s.split(RESPLIT_REGEX))
    .map((s) => s.trim())
    .filter(Boolean);
}

function optimized(inputString: string): string[] {
  if (!inputString.trim()) {
    return [];
  }
  const parts = inputString.split(COMBINED_REGEX);
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }
  return result;
}

const inputs = [
  "syntax, semantics, phonology",
  "morphology, syntax (generative, minimalist), phonology-phonetics",
  "syntax ·semantics",
  "syntax-semantics",
  "syntax–semantics",
  "syntax/ semantics",
  "syntax, [a, b, c], phonology",
  "syntax, {x, y}, morphology",
  "  syntax  ,  semantics  ,  phonology  ",
  "syntax,, semantics, ",
  "A single keyword",
  "",
  "syntax, (foo-bar), semantics",
];

const largeInputs: string[] = [];
for (let i = 0; i < 10_000; i++) {
  for (const input of inputs) {
    largeInputs.push(input);
  }
}

const iterations = 100;

for (const input of largeInputs) {
  original(input);
  optimized(input);
}

console.time("Original");
for (let i = 0; i < iterations; i++) {
  for (const input of largeInputs) {
    original(input);
  }
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  for (const input of largeInputs) {
    optimized(input);
  }
}
console.timeEnd("Optimized");
