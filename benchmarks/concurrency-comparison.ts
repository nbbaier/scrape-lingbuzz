import { chunkArray, mapWithConcurrency } from "../src/utils/utils";

const ITEM_COUNT = 50;
const CONCURRENCY = 5;
const MIN_DELAY = 50;
const MAX_DELAY = 150;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () =>
  Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY);

async function runChunked() {
  const items = Array.from({ length: ITEM_COUNT }, (_, i) => i);
  const chunks = chunkArray(items, CONCURRENCY);

  const start = performance.now();

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async () => {
        await delay(randomDelay());
      })
    );
  }

  return performance.now() - start;
}

async function runSliding() {
  const items = Array.from({ length: ITEM_COUNT }, (_, i) => i);

  const start = performance.now();

  await mapWithConcurrency(items, CONCURRENCY, async () => {
    await delay(randomDelay());
  });

  return performance.now() - start;
}

console.log(
  `Benchmarking ${ITEM_COUNT} items with concurrency ${CONCURRENCY}...`
);
console.log(`Task duration: ${MIN_DELAY}-${MAX_DELAY}ms`);

const chunkedTime = await runChunked();
console.log(`Chunked time: ${chunkedTime.toFixed(2)}ms`);

const slidingTime = await runSliding();
console.log(`Sliding time: ${slidingTime.toFixed(2)}ms`);

const improvement = ((chunkedTime - slidingTime) / chunkedTime) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
