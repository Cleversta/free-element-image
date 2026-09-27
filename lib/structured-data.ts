// JSON in an HTML script element must not contain a literal closing tag.
export function structuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
