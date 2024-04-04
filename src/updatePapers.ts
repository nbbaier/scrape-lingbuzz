import type { Paper } from "./types";

/**
 * Updates the list of papers with new papers.
 *
 * @param {Paper[]} papers - The new papers to be added.
 * @param {Paper[]} newPapers - The current list of papers.
 * @returns {Promise<Paper[]>} The updated list of papers.
 */
export async function updatePapers(
  papers: Paper[],
  newPapers: Paper[]
): Promise<Paper[]> {
  for (const item of papers) {
    const exists = newPapers.some((obj) => obj.id === item.id);
    if (!exists) {
      newPapers.push(item);
    }
  }
  return newPapers;
}
