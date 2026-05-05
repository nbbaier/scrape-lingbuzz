import { describe, expect, test } from "vitest";
import { parseCenterElement } from "../parsing-helpers";

describe("parseCenterElement Logic", () => {
  test("extracts text correctly using a mock document structure", () => {
    const mockBr = {
      nodeType: 1,
      tagName: "BR",
      childNodes: [],
    };

    const mockText = (text: string) => ({
      nodeType: 3,
      textContent: text,
      childNodes: [],
    });

    const mockCenter = {
      nodeType: 1,
      tagName: "CENTER",
      childNodes: [
        mockText("Title"),
        mockBr,
        mockText("Author"),
        mockBr,
        mockText("Date"),
      ],
    };

    const mockDocument = {
      querySelector: (selector: string) => {
        if (selector === "body > center") return mockCenter;
        return null;
      },
    };

    const result = parseCenterElement(mockDocument as any);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Title");
    expect(result[1]).toBe("Author");
    expect(result[2]).toBe("Date");
  });

  test("returns empty array when center element is missing", () => {
    const mockDocument = {
      querySelector: () => null,
    };
    const result = parseCenterElement(mockDocument as any);
    expect(result).toEqual([]);
  });
});
