import { bench, run } from "mitata";
import { splitKeywords as splitKeywordsOptimized } from "../src/split-keywords";

const SPLIT_REGEX = /,(?![^{[(<]*[\])}>])/;
const RESPLIT_REGEX = / ·|-|–||\/ /;

function splitKeywordsOriginal(inputString: string): string[] {
  if (!inputString.trim()) {
    return [];
  }

  return inputString
    .split(SPLIT_REGEX)
    .flatMap((s) => s.split(RESPLIT_REGEX))
    .map((s) => s.trim())
    .filter(Boolean);
}

const inputs = [
  "syntax, semantics, phonology",
  "",
  "syntax,, semantics, ",
  "syntax",
  "  syntax  ,  semantics  ,  phonology  ",
  "syntax, (foo, bar), semantics",
  "syntax, [a, b, c], phonology",
  "syntax, {x, y}, morphology",
  "syntax ·semantics",
  "syntax-semantics",
  "syntax–semantics",
  "syntax/ semantics",
  "morphology, syntax (generative, minimalist), phonology-phonetics",
];

bench("splitKeywordsOriginal", () => {
  for (const input of inputs) {
    splitKeywordsOriginal(input);
  }
});

bench("splitKeywordsOptimized", () => {
  for (const input of inputs) {
    splitKeywordsOptimized(input);
  }
});

await run();
