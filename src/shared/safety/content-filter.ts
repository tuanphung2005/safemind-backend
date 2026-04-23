const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const sanitizeText = (value: string, maxLength = 500): string => {
  if (!value) {
    return "";
  }

  const normalized = collapseWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength);
};

const dangerKeywords = [
  "dao",
  "sung",
  "danh",
  "hanh hung",
  "de doa",
  "tu sat",
  "giet",
  "bat coc",
];

export const extractDangerKeywords = (input: string): string[] => {
  const normalized = sanitizeText(input).toLowerCase();
  return dangerKeywords.filter((keyword) => normalized.includes(keyword));
};

export const hasDangerSignal = (input: string): boolean =>
  extractDangerKeywords(input).length > 0;
