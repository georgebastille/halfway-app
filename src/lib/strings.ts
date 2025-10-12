const WORD_START_REGEX = /(^|[\s-/(])([a-z])/g;
const APOSTROPHE_REGEX = /'([a-z])/g;

export function toTitleCase(input: string): string {
  const lower = input.toLowerCase();
  const spaced = lower.replace(
    WORD_START_REGEX,
    (_, prefix: string, char: string) => prefix + char.toUpperCase(),
  );

  return spaced.replace(APOSTROPHE_REGEX, (_, char: string) =>
    char === 's' ? `'${char}` : `'${char.toUpperCase()}`,
  );
}
