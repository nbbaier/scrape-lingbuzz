
const STR_LENGTH = 1000;
const ITERATIONS = 100_000;

function originalStripControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || (code >= 127 && code <= 159));
    })
    .join("");
}

const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F]/g;
function optimizedStripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, "");
}

// Generate test string with some control characters
let testString = "";
for (let i = 0; i < STR_LENGTH; i++) {
  if (i % 10 === 0) {
    testString += String.fromCharCode(i % 32); // Control char
  } else if (i % 15 === 0) {
    testString += String.fromCharCode(127 + (i % 33)); // Range 127-159
  } else {
    testString += "a";
  }
}

console.log(`String length: ${testString.length}`);
console.log(`Iterations: ${ITERATIONS}`);

// Warmup
for (let i = 0; i < 1000; i++) {
    originalStripControlChars(testString);
    optimizedStripControlChars(testString);
}

console.time("Original");
for (let i = 0; i < ITERATIONS; i++) {
  originalStripControlChars(testString);
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < ITERATIONS; i++) {
  optimizedStripControlChars(testString);
}
console.timeEnd("Optimized");

// Verification
const res1 = originalStripControlChars(testString);
const res2 = optimizedStripControlChars(testString);
if (res1 !== res2) {
    console.error("Verification failed!");
    console.log("Original result length:", res1.length);
    console.log("Optimized result length:", res2.length);
    for(let i=0; i < Math.max(res1.length, res2.length); i++) {
        if(res1[i] !== res2[i]) {
            console.log(`First mismatch at index ${i}: original=${res1.charCodeAt(i)}, optimized=${res2.charCodeAt(i)}`);
            break;
        }
    }
} else {
    console.log("Verification successful: results match.");
}
