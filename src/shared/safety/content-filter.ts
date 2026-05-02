const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const normalizeVietnameseText = (value: string): string =>
  collapseWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

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
  "bi danh",
  "dam",
  "tat",
  "hanh hung",
  "de doa",
  "tu sat",
  "giet",
  "bat coc",
  "ep buoc",
  "xam hai",
];

export const extractDangerKeywords = (input: string): string[] => {
  const normalized = normalizeVietnameseText(sanitizeText(input));
  return dangerKeywords.filter((keyword) => normalized.includes(keyword));
};

export const hasDangerSignal = (input: string): boolean =>
  extractDangerKeywords(input).length > 0;
