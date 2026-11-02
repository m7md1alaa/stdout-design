// "metricValue" -> "metric Value", "ctaURL" -> "cta URL"
const CAMEL_BOUNDARY = /(?<before>[a-z0-9])(?<after>[A-Z])/gu;
// "URLPath" -> "URL Path"
const ACRONYM_BOUNDARY = /(?<acronym>[A-Z]+)(?<word>[A-Z][a-z])/gu;
const WORD_SEPARATORS = /[_\-\s]+/u;
const ACRONYM = /^[A-Z0-9]{2,}$/u;

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

/**
 * The label a prop field shows, derived from its key in sentence case
 * ("accentColor" -> "Accent color"). Acronyms keep their case ("ctaURL" ->
 * "Cta URL"). A dotted path uses its last segment, so a list item's field
 * ("receipt.0.item") reads as "Item".
 */
export const labelFromKey = (path: string): string => {
  const key = path.slice(path.lastIndexOf(".") + 1);
  const words = key
    .replaceAll(ACRONYM_BOUNDARY, "$<acronym> $<word>")
    .replaceAll(CAMEL_BOUNDARY, "$<before> $<after>")
    .split(WORD_SEPARATORS)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return path;
  }

  return words
    .map((word, index) => {
      if (ACRONYM.test(word)) {
        return word;
      }
      return index === 0 ? capitalize(word.toLowerCase()) : word.toLowerCase();
    })
    .join(" ");
};

/**
 * The hint shown under a field: the schema's `description`, unless it is
 * missing or only repeats the label.
 */
export const fieldHint = (
  label: string,
  description: unknown
): string | undefined => {
  if (typeof description !== "string") {
    return undefined;
  }
  const text = description.trim();
  if (text.length === 0 || text.toLowerCase() === label.toLowerCase()) {
    return undefined;
  }
  return text;
};
