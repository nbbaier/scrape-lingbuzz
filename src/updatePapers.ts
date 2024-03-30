import type { Paper } from "./types";

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
