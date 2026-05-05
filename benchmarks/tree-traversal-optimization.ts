import { JSDOM } from "jsdom";

function parseCenterElementOriginal(centerElement: any): string[] {
  const lines: string[] = [];
  let currentLine = "";

  const traverse = (node: any) => {
    if (node.nodeType === 3) {
      // Text node
      currentLine += node.textContent || "";
    } else if (node.nodeType === 1) {
      // Element node
      const element = node;
      if (element.tagName.toLowerCase() === "br") {
        lines.push(currentLine.trim());
        currentLine = "";
      } else {
        const nodes = Array.from(node.childNodes);
        for (const child of nodes) {
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

function parseCenterElementOptimized(centerElement: any): string[] {
  const lines: string[] = [];
  let currentLine = "";

  const traverse = (node: any) => {
    if (node.nodeType === 3) {
      // Text node
      currentLine += node.textContent || "";
    } else if (node.nodeType === 1) {
      // Element node
      const element = node;
      if (element.tagName.toLowerCase() === "br") {
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
function generateComplexHTML(depth: number, width: number): string {
  let html = "<html><body><center>";
  function addNodes(currentDepth: number) {
    if (currentDepth >= depth) {
      html += "Text node<br>";
      return;
    }
    for (let i = 0; i < width; i++) {
      html += "<span>";
      addNodes(currentDepth + 1);
      html += "</span>";
    }
  }
  addNodes(0);
  html += "</center></body></html>";
  return html;
}

const complexHTML = generateComplexHTML(3, 4); // further reduced
const dom = new JSDOM(complexHTML);
const doc = dom.window.document;
const centerElement = doc.querySelector("body > center");

console.log(`Running benchmark with complex HTML (depth 3, width 4)...`);

const iterations = 500; // reduced iterations

console.time("Original");
for (let i = 0; i < iterations; i++) {
  parseCenterElementOriginal(centerElement);
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  parseCenterElementOptimized(centerElement);
}
console.timeEnd("Optimized");

// Verify they return the same results
const res1 = parseCenterElementOriginal(centerElement);
const res2 = parseCenterElementOptimized(centerElement);
console.log(
  "Results match:",
  JSON.stringify(res1) === JSON.stringify(res2)
);
console.log("Result size:", res1.length);
