import type { TextCounts } from "../types";

const ABBREVIATIONS = [
  "et al.",
  "e.g.",
  "i.e.",
  "cf.",
  "vs.",
  "Fig.",
  "fig.",
  "Dr.",
  "Prof.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Sr.",
  "Jr.",
  "p.",
  "pp.",
  "vol.",
  "Vol.",
  "no.",
  "No.",
  "approx.",
  "esp.",
  "incl.",
];

export function stripYamlFrontmatter(text: string): string {
  if (!text.startsWith("---")) {
    return text;
  }

  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4);
}

export function stripMarkdownFurniture(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const stripped = line.trim();
      if (!stripped) {
        return "";
      }
      if (
        stripped.startsWith("#") ||
        stripped.startsWith(">") ||
        stripped.startsWith("|") ||
        stripped.startsWith("---") ||
        stripped.startsWith("**[FIGURE") ||
        stripped.startsWith("**[TABLE") ||
        stripped.startsWith("*Interviewees*")
      ) {
        return "";
      }
      return line;
    })
    .join("\n");
}

export function cleanText(text: string): string {
  return stripMarkdownFurniture(stripYamlFrontmatter(text)).trim();
}

export function wordTokens(text: string): string[] {
  return text.match(/\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g) ?? [];
}

export function wordCount(text: string): number {
  return wordTokens(text).length;
}

export function extractParagraphs(text: string, minWords = 0): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim().replace(/\s+/g, " "))
    .filter((paragraph) => paragraph.length > 0)
    .filter((paragraph) => wordCount(paragraph) >= minWords);
}

export function splitSentences(text: string): string[] {
  let protectedText = text;
  ABBREVIATIONS.forEach((abbr) => {
    protectedText = protectedText.replaceAll(abbr, abbr.replaceAll(".", "<DOT>"));
  });
  protectedText = protectedText.replace(/(\d)\.([\d])/g, "$1<DOT>$2");

  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z"(\[]|$)/g)
    .map((part) => part.replaceAll("<DOT>", ".").trim())
    .filter((sentence) => wordCount(sentence) >= 3);
}

export function getLiveCounts(text: string): TextCounts {
  const cleaned = cleanText(text);
  const paragraphs = extractParagraphs(cleaned, 1);
  return {
    words: wordCount(cleaned),
    sentences: splitSentences(cleaned).length,
    paragraphs: paragraphs.length,
  };
}

export function truncateText(text: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}
