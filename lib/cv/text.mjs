export const MAX_TEXT_LENGTH = 60000;

export function prepareExtractedText(value) {
  const cleaned = String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  if (cleaned.length < 40)
    throw new Error("El documento no contiene texto legible suficiente.");
  return cleaned;
}
