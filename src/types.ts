export type RegisterId = "explanatory" | "evaluative" | "empirical" | "email" | "ai";

export type MetricKey =
  | "sentenceLengthMean"
  | "sentenceLengthStdev"
  | "paragraphMeanSentences"
  | "paragraphMeanWords"
  | "hedgesPer1000"
  | "firstPersonPer1000"
  | "passivePercent"
  | "longListPercent"
  | "articleOpenersPercent"
  | "demonstrativeOpenersPercent"
  | "transitionOpenersPercent"
  | "concessiveOpenersPercent"
  | "connectivesPer1000"
  | "vocabularyTtr"
  | "hapaxRatio"
  | "monotoneRunPercent";

export type MetricMeans = Record<MetricKey, number>;

export interface MetricRange {
  min: number;
  max: number;
}

export interface WritingProfile {
  id: RegisterId;
  name: string;
  shortName: string;
  displayName: string;
  profileType: "register-reference" | "ai-style-reference";
  provenance: string;
  corpusDescription: string;
  isProvisional: boolean;
  caution: string;
  corpusWordCount: number;
  sourceFileCount: number;
  isAiReference: boolean;
  isPlaceholder: boolean;
  placeholderNote: string;
  notes: string[];
  metricMeans: MetricMeans;
  tolerances: MetricMeans;
  acceptableRanges: Record<MetricKey, MetricRange>;
  weights?: Partial<Record<MetricKey, number>>;
}

export interface TextCounts {
  words: number;
  sentences: number;
  paragraphs: number;
}

export interface SentenceLengthStats {
  count: number;
  mean: number;
  median: number;
  stdev: number;
  min: number;
  max: number;
  q10: number;
  q25: number;
  q75: number;
  q90: number;
  histogram: Record<string, number>;
}

export interface VocabularyRichness {
  totalTokens: number;
  totalTypes: number;
  ttrGlobal: number;
  ttrRolling1000Mean: number | null;
  ttrRolling1000Stdev: number | null;
  hapaxRatio: number;
}

export interface FirstPersonUsage {
  totalFirstPerson: number;
  singularIMyMe: number;
  pluralWeOurUs: number;
  per1000Words: number;
  pctSentencesWithFirstPerson: number;
}

export interface HedgingAnalysis {
  totalHedges: number;
  hedgesPer1000Words: number;
  hedgeInventory: Record<string, number>;
}

export interface SentenceOpenerStats {
  topFirstWords: Record<string, { count: number; pct: number }>;
  topFirstBigrams: Record<string, { count: number; pct: number }>;
  pctStartingWithArticle: number;
  pctStartingWithDemonstrative: number;
  pctStartingWithFirstPerson: number;
  pctStartingWithTransition: number;
  pctStartingWithConcessive: number;
  openerVariety: number;
}

export interface ConnectiveUsage {
  connectiveCounts: Record<string, number>;
  connectivesPer1000Words: Record<string, number>;
  totalConnectivesPer1000: number;
}

export interface StyleAnalysis {
  counts: TextCounts;
  paragraphs: string[];
  sentences: string[];
  sentenceLengths: SentenceLengthStats;
  paragraphLength: {
    count: number;
    meanSentences: number;
    medianSentences: number;
    stdevSentences: number;
    minSentences: number;
    maxSentences: number;
  };
  paragraphWordLength: {
    meanWords: number;
    medianWords: number;
    stdevWords: number;
    minWords: number;
    maxWords: number;
  };
  vocabularyRichness: VocabularyRichness;
  firstPerson: FirstPersonUsage;
  passiveVoice: {
    passiveSentenceCount: number;
    pctSentencesPassive: number;
  };
  hedging: HedgingAnalysis;
  sentenceOpeners: SentenceOpenerStats;
  connectives: ConnectiveUsage;
  listPatterns: {
    sentencesWith4PlusItemLists: number;
    pctSentencesWithLongLists: number;
    totalLongListInstances: number;
  };
  monotoneRuns: {
    monotoneRuns3Plus: number;
    pctSentencesInMonotoneRuns: number;
  };
  metricValues: MetricMeans;
}

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  defaultTolerance: number;
  weight: number;
  higherIsAiLike?: boolean;
  lowerIsAiLike?: boolean;
}

export interface MetricContribution {
  key: MetricKey;
  label: string;
  submitted: number;
  reference: number;
  delta: number;
  tolerance: number;
  normalizedDelta: number;
  weight: number;
  weightedContribution: number;
  similarity: number;
  flagged: boolean;
}

export interface ProfileDistance {
  profile: WritingProfile;
  distance: number;
  similarity: number;
  contributions: MetricContribution[];
}

export interface ParagraphFlag {
  index: number;
  text: string;
  preview: string;
  wordCount: number;
  sentenceCount: number;
  lengthSd: number;
  hedgesPer1000: number;
  passivePercent: number;
  firstPersonPer1000: number;
  longListPercent: number;
  monotoneRunPercent: number;
  hasConcessiveOpener: boolean;
  distance: number;
  flagged: boolean;
  reasons: string[];
}

export interface StyleReport {
  closestProfile: string;
  profileProvenance: string[];
  technicalProvenance: string[];
  alignment: string[];
  divergences: string[];
  aiLikeFeatures: string[];
  revisions: string[];
  caution: string;
}
