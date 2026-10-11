/**
 * Converts a raw text string into a URL-safe, lowercase slug.
 *
 * Transformations applied:
 * 1. Converts all letters to lowercase.
 * 2. Trims leading and trailing whitespace.
 * 3. Replaces contiguous sequences of non-alphanumeric characters with a single hyphen.
 * 4. Strips leading and trailing hyphens.
 *
 * @example
 * slugify("Intro to Computer Science 101!") // "intro-to-computer-science-101"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
