import type {
  ConnectiveUsage,
  FirstPersonUsage,
  HedgingAnalysis,
  MetricDefinition,
  MetricKey,
  MetricMeans,
  SentenceLengthStats,
  SentenceOpenerStats,
  StyleAnalysis,
  VocabularyRichness,
} from "../types";
import {
  cleanText,
  extractParagraphs,
  getLiveCounts,
  splitSentences,
  wordCount,
  wordTokens,
} from "./textProcessing";

export const metricDefinitions: MetricDefinition[] = [
  {
    key: "sentenceLengthMean",
    label: "Sentence length mean",
    shortLabel: "Sent mean",
    unit: "words",
    defaultTolerance: 4,
    weight: 1,
  },
  {
    key: "sentenceLengthStdev",
    label: "Sentence length standard deviation",
    shortLabel: "Sent SD",
    unit: "words",
    defaultTolerance: 3,
    weight: 1.2,
    lowerIsAiLike: true,
  },
  {
    key: "paragraphMeanSentences",
    label: "Paragraph length",
    shortLabel: "Para sents",
    unit: "sentences",
    defaultTolerance: 1.5,
    weight: 0.7,
  },
  {
    key: "paragraphMeanWords",
    label: "Paragraph word length",
    shortLabel: "Para words",
    unit: "words",
    defaultTolerance: 35,
    weight: 0.6,
  },
  {
    key: "hedgesPer1000",
    label: "Hedges per 1,000 words",
    shortLabel: "Hedges/1k",
    unit: "per 1k",
    defaultTolerance: 8,
    weight: 1.1,
  },
  {
    key: "firstPersonPer1000",
    label: "First-person pronouns",
    shortLabel: "FP/1k",
    unit: "per 1k",
    defaultTolerance: 4,
    weight: 0.9,
  },
  {
    key: "passivePercent",
    label: "Passive voice approximation",
    shortLabel: "Passive %",
    unit: "%",
    defaultTolerance: 10,
    weight: 0.9,
  },
  {
    key: "longListPercent",
    label: "4+ item list sentences",
    shortLabel: "4+ lists %",
    unit: "%",
    defaultTolerance: 4,
    weight: 1.2,
    higherIsAiLike: true,
  },
  {
    key: "articleOpenersPercent",
    label: "Article openers",
    shortLabel: "Article %",
    unit: "%",
    defaultTolerance: 8,
    weight: 0.55,
  },
  {
    key: "demonstrativeOpenersPercent",
    label: "Demonstrative openers",
    shortLabel: "Demo %",
    unit: "%",
    defaultTolerance: 6,
    weight: 0.5,
  },
  {
    key: "transitionOpenersPercent",
    label: "Transition openers",
    shortLabel: "Trans %",
    unit: "%",
    defaultTolerance: 6,
    weight: 0.6,
  },
  {
    key: "concessiveOpenersPercent",
    label: "Concessive or qualifying openers",
    shortLabel: "Conc %",
    unit: "%",
    defaultTolerance: 5,
    weight: 0.8,
  },
  {
    key: "connectivesPer1000",
    label: "Connectives and conjunctions",
    shortLabel: "Conn/1k",
    unit: "per 1k",
    defaultTolerance: 18,
    weight: 0.7,
  },
  {
    key: "vocabularyTtr",
    label: "Vocabulary type-token ratio",
    shortLabel: "TTR",
    unit: "ratio",
    defaultTolerance: 0.06,
    weight: 0.5,
  },
  {
    key: "hapaxRatio",
    label: "Hapax ratio",
    shortLabel: "Hapax",
    unit: "ratio",
    defaultTolerance: 0.08,
    weight: 0.45,
  },
  {
    key: "monotoneRunPercent",
    label: "Monotone sentence-length runs",
    shortLabel: "Mono %",
    unit: "%",
    defaultTolerance: 15,
    weight: 1.1,
    higherIsAiLike: true,
  },
];

const metricKeySet = new Set<MetricKey>(metricDefinitions.map((metric) => metric.key));

export function isMetricKey(value: string): value is MetricKey {
  return metricKeySet.has(value as MetricKey);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function stdev(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function quantile(values: number[], q: number): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[index];
}

function histogram(values: number[], bins: number[]): Record<string, number> {
  return bins.slice(0, -1).reduce<Record<string, number>>((acc, low, index) => {
    const high = bins[index + 1];
    const label = high < 999 ? `${low}-${high}` : `${low}+`;
    acc[label] = values.filter((value) => value >= low && value < high).length;
    return acc;
  }, {});
}

export function sentenceLengths(sentences: string[]): SentenceLengthStats {
  const lengths = sentences.map((sentence) => wordCount(sentence));
  if (!lengths.length) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      stdev: 0,
      min: 0,
      max: 0,
      q10: 0,
      q25: 0,
      q75: 0,
      q90: 0,
      histogram: {},
    };
  }

  return {
    count: lengths.length,
    mean: round(mean(lengths)),
    median: round(median(lengths)),
    stdev: round(stdev(lengths)),
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    q10: round(quantile(lengths, 0.1), 1),
    q25: round(quantile(lengths, 0.25), 1),
    q75: round(quantile(lengths, 0.75), 1),
    q90: round(quantile(lengths, 0.9), 1),
    histogram: histogram(lengths, [0, 10, 15, 20, 25, 30, 40, 50, 999]),
  };
}

export function vocabularyRichness(text: string): VocabularyRichness {
  const words = wordTokens(text).map((word) => word.toLowerCase());
  if (!words.length) {
    return {
      totalTokens: 0,
      totalTypes: 0,
      ttrGlobal: 0,
      ttrRolling1000Mean: null,
      ttrRolling1000Stdev: null,
      hapaxRatio: 0,
    };
  }

  const frequency = new Map<string, number>();
  words.forEach((word) => frequency.set(word, (frequency.get(word) ?? 0) + 1));
  const typeCount = frequency.size;
  const hapax = [...frequency.values()].filter((count) => count === 1).length;
  const windowSize = 1000;
  const rolling = [];

  for (let i = 0; i <= words.length - windowSize; i += windowSize / 2) {
    const chunk = words.slice(i, i + windowSize);
    rolling.push(new Set(chunk).size / chunk.length);
  }

  return {
    totalTokens: words.length,
    totalTypes: typeCount,
    ttrGlobal: round(typeCount / words.length, 4),
    ttrRolling1000Mean: rolling.length ? round(mean(rolling), 4) : null,
    ttrRolling1000Stdev: rolling.length > 1 ? round(stdev(rolling), 4) : null,
    hapaxRatio: round(hapax / typeCount, 4),
  };
}

export function firstPersonUsage(sentences: string[]): FirstPersonUsage {
  const singularPattern = /\bI\b(?!')|\bmy\b|\bme\b|\bmyself\b/gi;
  const pluralPattern = /\bwe\b|\bour\b|\bus\b(?!\w)|\bourselves\b/gi;
  const totalWords = sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);
  let singular = 0;
  let plural = 0;
  let sentencesWithFirstPerson = 0;

  sentences.forEach((sentence) => {
    const singularCount = [...sentence.matchAll(singularPattern)].length;
    const pluralCount = [...sentence.matchAll(pluralPattern)].length;
    singular += singularCount;
    plural += pluralCount;
    if (singularCount + pluralCount > 0) {
      sentencesWithFirstPerson += 1;
    }
  });

  const total = singular + plural;
  return {
    totalFirstPerson: total,
    singularIMyMe: singular,
    pluralWeOurUs: plural,
    per1000Words: totalWords ? round(total / (totalWords / 1000)) : 0,
    pctSentencesWithFirstPerson: sentences.length
      ? round((100 * sentencesWithFirstPerson) / sentences.length)
      : 0,
  };
}

export function passiveVoiceFrequency(sentences: string[]): {
  passiveSentenceCount: number;
  pctSentencesPassive: number;
} {
  const passivePattern = /\b(was|were|is|are|been|being|be)\s+(\w+ed|\w+en)\b/i;
  const passiveSentenceCount = sentences.filter((sentence) =>
    passivePattern.test(sentence),
  ).length;

  return {
    passiveSentenceCount,
    pctSentencesPassive: sentences.length
      ? round((100 * passiveSentenceCount) / sentences.length)
      : 0,
  };
}

const hedgePatterns: Record<string, RegExp> = {
  "may/might/could": /\b(may|might|could)\b/gi,
  "suggest/indicate/imply": /\b(suggests?|indicates?|implies?)\b/gi,
  "appear/seem": /\b(appears?|seems?)\b/gi,
  "perhaps/possibly/probably": /\b(perhaps|possibly|probably|likely)\b/gi,
  "tend to": /\btend(?:s|ed)?\s+to\b/gi,
  "I would argue/suggest": /\bI\s+would\s+(argue|suggest|contend|propose)\b/g,
  "it is worth noting": /\bit\s+is\s+worth\s+noting\b/gi,
  "it should be noted": /\bit\s+should\s+be\s+noted\b/gi,
  "to some extent/degree": /\bto\s+some\s+(extent|degree)\b/gi,
  "in my view/judgement": /\bin\s+my\s+(view|judgement|judgment|opinion)\b/gi,
  "some/several/a number of": /\b(some|several|a\s+number\s+of)\b/gi,
  "relatively/somewhat/rather": /\b(relatively|somewhat|rather)\b/gi,
  "however/nevertheless/nonetheless": /\b(however|nevertheless|nonetheless)\b/gi,
  "while/although/though": /\b(while|although|though)\b/gi,
};

export function hedgingAnalysis(sentences: string[]): HedgingAnalysis {
  const hedgeInventory = Object.entries(hedgePatterns).reduce<Record<string, number>>(
    (acc, [label, pattern]) => {
      acc[label] = sentences.reduce(
        (sum, sentence) => sum + [...sentence.matchAll(pattern)].length,
        0,
      );
      return acc;
    },
    {},
  );
  const totalHedges = Object.values(hedgeInventory).reduce((sum, value) => sum + value, 0);
  const totalWords = sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);

  return {
    totalHedges,
    hedgesPer1000Words: totalWords ? round(totalHedges / (totalWords / 1000)) : 0,
    hedgeInventory,
  };
}

const transitionOpeners = new Set([
  "however",
  "nevertheless",
  "furthermore",
  "moreover",
  "therefore",
  "consequently",
  "additionally",
  "similarly",
  "conversely",
  "nonetheless",
  "accordingly",
]);

const concessiveOpenerPattern =
  /^(however|nevertheless|nonetheless|although|while|even\s+though|despite|notwithstanding|that\s+said|to\s+be\s+sure|it\s+must\s+be\s+acknowledged|it\s+should\s+be\s+noted|admittedly|granted|yet)\b/i;

export function hasConcessiveOpener(text: string): boolean {
  return concessiveOpenerPattern.test(text.trim());
}

export function sentenceOpeners(sentences: string[], topN = 20): SentenceOpenerStats {
  const firstWords = new Map<string, number>();
  const firstBigrams = new Map<string, number>();

  sentences.forEach((sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return;
    }
    const first = words[0].replace(/^["'(\[]+/, "");
    const second = words[1]?.replace(/^["'(\[]+/, "");
    firstWords.set(first, (firstWords.get(first) ?? 0) + 1);
    if (second) {
      const bigram = `${first} ${second}`;
      firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
    }
  });

  const total = sentences.length;
  const firstWordEntries = [...firstWords.entries()];
  const articleStart = firstWordEntries
    .filter(([word]) => ["the", "a", "an"].includes(word.toLowerCase()))
    .reduce((sum, [, count]) => sum + count, 0);
  const demonstrativeStart = firstWordEntries
    .filter(([word]) =>
      ["this", "that", "these", "those", "it", "its"].includes(word.toLowerCase()),
    )
    .reduce((sum, [, count]) => sum + count, 0);
  const firstPersonStart = firstWordEntries
    .filter(([word]) => ["I", "We", "My", "Our"].includes(word))
    .reduce((sum, [, count]) => sum + count, 0);
  const transitionStart = firstWordEntries
    .filter(([word]) => transitionOpeners.has(word.toLowerCase()))
    .reduce((sum, [, count]) => sum + count, 0);
  const concessiveStart = sentences.filter(hasConcessiveOpener).length;

  const toTopRecord = (entries: [string, number][]) =>
    Object.fromEntries(
      entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([label, count]) => [label, { count, pct: total ? round((100 * count) / total) : 0 }]),
    );

  return {
    topFirstWords: toTopRecord(firstWordEntries),
    topFirstBigrams: toTopRecord([...firstBigrams.entries()]),
    pctStartingWithArticle: total ? round((100 * articleStart) / total) : 0,
    pctStartingWithDemonstrative: total ? round((100 * demonstrativeStart) / total) : 0,
    pctStartingWithFirstPerson: total ? round((100 * firstPersonStart) / total) : 0,
    pctStartingWithTransition: total ? round((100 * transitionStart) / total) : 0,
    pctStartingWithConcessive: total ? round((100 * concessiveStart) / total) : 0,
    openerVariety: total ? round(firstWords.size / total, 3) : 0,
  };
}

const connectivePatterns: Record<string, RegExp> = {
  and: /\band\b/gi,
  but: /\bbut\b/gi,
  or: /\bor\b/gi,
  because: /\bbecause\b/gi,
  therefore: /\btherefore\b/gi,
  forExample: /\bfor\s+example\b/gi,
  although: /\balthough\b/gi,
  while: /\bwhile\b/gi,
  however: /\bhowever\b/gi,
  nevertheless: /\bnevertheless\b/gi,
};

export function conjunctionAndConnectiveUsage(sentences: string[]): ConnectiveUsage {
  const totalWords = sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);
  const connectiveCounts = Object.entries(connectivePatterns).reduce<Record<string, number>>(
    (acc, [label, pattern]) => {
      acc[label] = sentences.reduce(
        (sum, sentence) => sum + [...sentence.matchAll(pattern)].length,
        0,
      );
      return acc;
    },
    {},
  );

  const connectivesPer1000Words = Object.fromEntries(
    Object.entries(connectiveCounts).map(([label, count]) => [
      label,
      totalWords ? round(count / (totalWords / 1000)) : 0,
    ]),
  );

  return {
    connectiveCounts,
    connectivesPer1000Words,
    totalConnectivesPer1000: Object.values(connectivesPer1000Words).reduce(
      (sum, value) => sum + value,
      0,
    ),
  };
}

export function listPatternDetection(sentences: string[]): {
  sentencesWith4PlusItemLists: number;
  pctSentencesWithLongLists: number;
  totalLongListInstances: number;
} {
  const list4Plus =
    /(?:\b\w+(?:\s+\w+)?\s*,\s*){3,}\b\w+(?:\s+\w+)?(?:\s+and\s+\w+(?:\s+\w+)?)?/g;
  let sentencesWith4PlusItemLists = 0;
  let totalLongListInstances = 0;

  sentences.forEach((sentence) => {
    const matches = [...sentence.matchAll(list4Plus)];
    if (matches.length) {
      sentencesWith4PlusItemLists += 1;
      totalLongListInstances += matches.length;
    }
  });

  return {
    sentencesWith4PlusItemLists,
    pctSentencesWithLongLists: sentences.length
      ? round((100 * sentencesWith4PlusItemLists) / sentences.length)
      : 0,
    totalLongListInstances,
  };
}

export function sentenceLengthVarianceRuns(sentences: string[]): {
  monotoneRuns3Plus: number;
  pctSentencesInMonotoneRuns: number;
} {
  const lengths = sentences.map((sentence) => wordCount(sentence));
  if (lengths.length < 3) {
    return { monotoneRuns3Plus: 0, pctSentencesInMonotoneRuns: 0 };
  }

  const tolerance = 5;
  let runLength = 1;
  let totalInRuns = 0;
  let runCount = 0;

  for (let i = 1; i < lengths.length; i += 1) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= tolerance) {
      runLength += 1;
    } else {
      if (runLength >= 3) {
        totalInRuns += runLength;
        runCount += 1;
      }
      runLength = 1;
    }
  }

  if (runLength >= 3) {
    totalInRuns += runLength;
    runCount += 1;
  }

  return {
    monotoneRuns3Plus: runCount,
    pctSentencesInMonotoneRuns: round((100 * totalInRuns) / lengths.length),
  };
}

export function paragraphLengthStats(paragraphs: string[]): StyleAnalysis["paragraphLength"] {
  const lengths = paragraphs.map((paragraph) => splitSentences(paragraph).length);
  if (!lengths.length) {
    return {
      count: 0,
      meanSentences: 0,
      medianSentences: 0,
      stdevSentences: 0,
      minSentences: 0,
      maxSentences: 0,
    };
  }
  return {
    count: lengths.length,
    meanSentences: round(mean(lengths)),
    medianSentences: round(median(lengths)),
    stdevSentences: round(stdev(lengths)),
    minSentences: Math.min(...lengths),
    maxSentences: Math.max(...lengths),
  };
}

export function paragraphWordLengthStats(
  paragraphs: string[],
): StyleAnalysis["paragraphWordLength"] {
  const lengths = paragraphs.map(wordCount);
  if (!lengths.length) {
    return {
      meanWords: 0,
      medianWords: 0,
      stdevWords: 0,
      minWords: 0,
      maxWords: 0,
    };
  }
  return {
    meanWords: round(mean(lengths)),
    medianWords: round(median(lengths)),
    stdevWords: round(stdev(lengths)),
    minWords: Math.min(...lengths),
    maxWords: Math.max(...lengths),
  };
}

export function analyseText(text: string): StyleAnalysis {
  const cleaned = cleanText(text);
  const counts = getLiveCounts(text);
  const paragraphs = extractParagraphs(cleaned, 10);
  const sentences = paragraphs.flatMap(splitSentences);
  const fullText = paragraphs.join(" ");
  const sentenceLength = sentenceLengths(sentences);
  const paragraphLength = paragraphLengthStats(paragraphs);
  const paragraphWordLength = paragraphWordLengthStats(paragraphs);
  const vocabulary = vocabularyRichness(fullText);
  const firstPerson = firstPersonUsage(sentences);
  const passiveVoice = passiveVoiceFrequency(sentences);
  const hedging = hedgingAnalysis(sentences);
  const openers = sentenceOpeners(sentences);
  const connectives = conjunctionAndConnectiveUsage(sentences);
  const listPatterns = listPatternDetection(sentences);
  const monotoneRuns = sentenceLengthVarianceRuns(sentences);

  const metricValues: MetricMeans = {
    sentenceLengthMean: sentenceLength.mean,
    sentenceLengthStdev: sentenceLength.stdev,
    paragraphMeanSentences: paragraphLength.meanSentences,
    paragraphMeanWords: paragraphWordLength.meanWords,
    hedgesPer1000: hedging.hedgesPer1000Words,
    firstPersonPer1000: firstPerson.per1000Words,
    passivePercent: passiveVoice.pctSentencesPassive,
    longListPercent: listPatterns.pctSentencesWithLongLists,
    articleOpenersPercent: openers.pctStartingWithArticle,
    demonstrativeOpenersPercent: openers.pctStartingWithDemonstrative,
    transitionOpenersPercent: openers.pctStartingWithTransition,
    concessiveOpenersPercent: openers.pctStartingWithConcessive,
    connectivesPer1000: round(connectives.totalConnectivesPer1000),
    vocabularyTtr: vocabulary.ttrRolling1000Mean ?? vocabulary.ttrGlobal,
    hapaxRatio: vocabulary.hapaxRatio,
    monotoneRunPercent: monotoneRuns.pctSentencesInMonotoneRuns,
  };

  return {
    counts,
    paragraphs,
    sentences,
    sentenceLengths: sentenceLength,
    paragraphLength,
    paragraphWordLength,
    vocabularyRichness: vocabulary,
    firstPerson,
    passiveVoice,
    hedging,
    sentenceOpeners: openers,
    connectives,
    listPatterns,
    monotoneRuns,
    metricValues,
  };
}

export function metricDefinitionFor(key: MetricKey): MetricDefinition {
  const definition = metricDefinitions.find((metric) => metric.key === key);
  if (!definition) {
    throw new Error(`Unknown metric: ${key}`);
  }
  return definition;
}
