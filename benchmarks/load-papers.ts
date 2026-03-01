import { loadPapers } from "../src/utils/utils";

async function run() {
  console.time("First load");
  await loadPapers();
  console.timeEnd("First load");

  console.time("Second load");
  await loadPapers();
  console.timeEnd("Second load");

  console.time("Third load");
  await loadPapers();
  console.timeEnd("Third load");
}

run();
