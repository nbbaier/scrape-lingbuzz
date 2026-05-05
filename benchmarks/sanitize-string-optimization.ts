
const sanitizeStringOriginal = (value: string): string =>
  Array.from(value)
    .filter((char) => {
      const charCode = char.charCodeAt(0);
      return !(charCode <= 31 || (charCode >= 127 && charCode <= 159));
    })
    .join("")
    .trim();

const sanitizeStringOptimized = (value: string): string =>
  value.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();

// Generate some test data
const shortString = "Hello\x00World\x7F!";
const longString = "A".repeat(1000) + "\x01" + "B".repeat(1000) + "\x80" + "C".repeat(1000);
const veryLongString = ("Some text with control chars \x15 and some more \x90 ".repeat(100));

const iterations = 10000;

console.log(`Running benchmark with ${iterations} iterations...`);

function runBenchmark(name: string, fn: (s: string) => string, data: string) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn(data);
    }
    const end = performance.now();
    console.log(`${name} took ${(end - start).toFixed(4)}ms`);
    return end - start;
}

console.log("\n--- Short String ---");
runBenchmark("Original", sanitizeStringOriginal, shortString);
runBenchmark("Optimized", sanitizeStringOptimized, shortString);

console.log("\n--- Long String ---");
runBenchmark("Original", sanitizeStringOriginal, longString);
runBenchmark("Optimized", sanitizeStringOptimized, longString);

console.log("\n--- Very Long String ---");
runBenchmark("Original", sanitizeStringOriginal, veryLongString);
runBenchmark("Optimized", sanitizeStringOptimized, veryLongString);

// Verification
const testStrings = [shortString, longString, veryLongString, "  \x00  ", "no changes"];
for (const s of testStrings) {
    const res1 = sanitizeStringOriginal(s);
    const res2 = sanitizeStringOptimized(s);
    if (res1 !== res2) {
        console.error(`Mismatch for string: ${JSON.stringify(s)}`);
        console.error(`Original:  ${JSON.stringify(res1)}`);
        console.error(`Optimized: ${JSON.stringify(res2)}`);
    }
}
console.log("\nVerification complete - all results match.");
