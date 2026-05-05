interface MockNode {
  nodeType: number;
  childNodes: MockNode[];
  textContent?: string;
  tagName?: string;
}

function parseCenterElementOriginal(centerElement: MockNode): string[] {
  const lines: string[] = [];
  let currentLine = "";

  const traverse = (node: MockNode) => {
    if (node.nodeType === 3) {
      // Text node
      currentLine += node.textContent || "";
    } else if (node.nodeType === 1) {
      // Element node
      const element = node;
      if (element.tagName?.toLowerCase() === "br") {
        lines.push(currentLine.trim());
        currentLine = "";
      } else {
        // @ts-ignore
        for (const child of Array.from(node.childNodes)) {
          traverse(child);
        }
      }
    }
  };

  traverse(centerElement);
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.filter(Boolean);
}

function parseCenterElementOptimized(centerElement: MockNode): string[] {
  const lines: string[] = [];
  let currentLine = "";

  const traverse = (node: MockNode) => {
    if (node.nodeType === 3) {
      // Text node
      currentLine += node.textContent || "";
    } else if (node.nodeType === 1) {
      // Element node
      const element = node;
      if (element.tagName?.toLowerCase() === "br") {
        lines.push(currentLine.trim());
        currentLine = "";
      } else {
        // Optimized: avoid Array.from
        const childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
          traverse(childNodes[i]);
        }
      }
    }
  };

  traverse(centerElement);
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.filter(Boolean);
}

// Generate a deep and wide tree
function generateComplexTree(depth: number, width: number): MockNode {
  if (depth <= 0) {
    return {
      nodeType: 3,
      childNodes: [],
      textContent: "Text node",
    };
  }

  const node: MockNode = {
    nodeType: 1,
    tagName: "div",
    childNodes: [],
  };

  for (let i = 0; i < width; i++) {
    node.childNodes.push(generateComplexTree(depth - 1, width));
    node.childNodes.push({
      nodeType: 1,
      tagName: "br",
      childNodes: [],
    });
  }

  return node;
}

const complexTree = generateComplexTree(6, 6);

console.log(`Running benchmark with complex tree (depth 6, width 6)...`);

const iterations = 1000;

console.time("Original");
for (let i = 0; i < iterations; i++) {
  parseCenterElementOriginal(complexTree);
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  parseCenterElementOptimized(complexTree);
}
console.timeEnd("Optimized");

// Verify they return the same results
const res1 = parseCenterElementOriginal(complexTree);
const res2 = parseCenterElementOptimized(complexTree);
console.log(
  "Results match:",
  JSON.stringify(res1) === JSON.stringify(res2)
);
console.log("Result size:", res1.length);
