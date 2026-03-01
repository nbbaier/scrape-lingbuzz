const LINGBUZZ_ID_REGEX = /\/lingbuzz\/(\d{6})/;

function originalLogic(anchors: any[]): number[] {
  const hrefs = anchors
    .map((a) => a.href)
    .filter((href) => LINGBUZZ_ID_REGEX.test(href))
    .map((href) => {
      const match = LINGBUZZ_ID_REGEX.exec(href);
      return match ? match[1] : "";
    })
    .map((id) => Number.parseInt(id, 10));

  return [...new Set(hrefs)];
}

function optimizedLogic(anchors: any[]): number[] {
  const ids = new Set<number>();
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const match = LINGBUZZ_ID_REGEX.exec(a.href);
    if (match) {
      const id = Number.parseInt(match[1], 10);
      ids.add(id);
    }
  }
  return Array.from(ids);
}

// Generate a large mock data
const numLinks = 100_000;
const anchors = [];
for (let i = 0; i < numLinks; i++) {
  const id = (100_000 + (i % 1000)).toString();
  anchors.push({ href: `http://ling.auf.net/lingbuzz/${id}` });
  anchors.push({ href: `http://example.com/${i}` });
}

console.log(`Running benchmark with ${anchors.length} links...`);

const iterations = 100;

console.time("Original");
for (let i = 0; i < iterations; i++) {
  originalLogic(anchors);
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  optimizedLogic(anchors);
}
console.timeEnd("Optimized");

// Verify they return the same results
const res1 = originalLogic(anchors);
const res2 = optimizedLogic(anchors);
console.log(
  "Results match:",
  JSON.stringify(res1.sort()) === JSON.stringify(res2.sort())
);
console.log("Result size:", res1.length);
