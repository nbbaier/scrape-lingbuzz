const PERSON_USERNAME_REGEX = /\/_person\/(.*)/;

interface Author {
  firstName: string;
  lastName: string;
  authorUrl: string;
  username: string;
}

function originalLogic(authorsArray: [number, any][]) {
  const authors: Author[] = [];
  for (const [index, a] of authorsArray) {
    const author: Author = {
      firstName: a.textContent?.trim().split(" ")[0] || "",
      lastName: a.textContent?.trim().split(" ")[1] || "",
      authorUrl: a.href || "",
      username: decodeURI(a.href).match(PERSON_USERNAME_REGEX)?.[1] || "",
    };
    authors.push(author);
  }
  return authors;
}

function optimizedLogic(authorsArray: [number, any][]) {
  const authors: Author[] = [];
  for (const [index, a] of authorsArray) {
    const text = a.textContent?.trim() || "";
    const parts = text.split(" ");
    const author: Author = {
      firstName: parts[0] || "",
      lastName: parts[1] || "",
      authorUrl: a.href || "",
      username: decodeURI(a.href).match(PERSON_USERNAME_REGEX)?.[1] || "",
    };
    authors.push(author);
  }
  return authors;
}

const numAuthors = 100;
const authorsArray: [number, any][] = [];
for (let i = 0; i < numAuthors; i++) {
  authorsArray.push([i, {
      textContent: "John Doe",
      href: "https://ling.auf.net/lingbuzz/_person/jdoe"
  }]);
}

const iterations = 10000;

console.log(`Running benchmark with ${numAuthors} authors and ${iterations} iterations...`);

console.time("Original");
for (let i = 0; i < iterations; i++) {
  originalLogic(authorsArray);
}
console.timeEnd("Original");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  optimizedLogic(authorsArray);
}
console.timeEnd("Optimized");

// Verification
const res1 = originalLogic(authorsArray);
const res2 = optimizedLogic(authorsArray);
console.log("Results match:", JSON.stringify(res1) === JSON.stringify(res2));
