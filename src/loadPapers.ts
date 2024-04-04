import fs from "node:fs";
import type { Paper } from "./types";

const PAPERS_FILE_PATH = "./papers.json";

/**
 * Loads the papers data from a JSON file.
 *
 * @param papersFilePath - The path to the papers JSON file. Defaults to "./papers.json".
 * @returns A promise that resolves to an array of Paper objects.
 * @throws If there is an error loading the papers data.
 */
export async function loadPapers(
  papersFilePath = PAPERS_FILE_PATH
): Promise<Paper[]> {
  try {
    if (!fs.existsSync(PAPERS_FILE_PATH)) {
      console.log("Creating papers.json");
      await Bun.write(PAPERS_FILE_PATH, JSON.stringify([]));
    }
    const papersFile = Bun.file(PAPERS_FILE_PATH);
    return JSON.parse(await papersFile.text());
  } catch (error) {
    console.error("Failed to load papers:", error);
    throw new Error("Error loading papers data");
  }
}
