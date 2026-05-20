import curatedProfileBundleJson from "../data/ai-style-profiles/public_profile_preview_curated_fixed.json?raw";
import type { MetricKey, RegisterId } from "../types";

export type AiProfileScope = "cloud_frontier" | "all_models";
export type AiDisplayTier =
  | "primary_default"
  | "contextual_with_caution"
  | "advanced_or_exploratory"
  | "hidden_from_default";
export type AiExportStatus =
  | "export_provisional"
  | "export_with_caution"
  | "advanced_or_exploratory_with_caution";

export interface AiInterval {
  lower: number;
  upper: number;
}

export interface AiPosteriorSummary {
  median: number;
  mean: number;
  interval_50: AiInterval;
  interval_90: AiInterval;
}

export interface AiStyleMetric {
  profile_metric_id: string;
  source_metric_id: string;
  metric_name: string;
  app_metric_key: string;
  public_default: boolean;
  public_default_metric: boolean;
  display_tier: AiDisplayTier;
  export_status: AiExportStatus;
  reference_scope_role: string;
  advanced_or_exploratory: boolean;
  pooled_or_contextual: boolean;
  centre_type: string;
  centre: number;
  posterior_epred: AiPosteriorSummary;
  posterior_predict: AiPosteriorSummary;
  scale_for_distance: string;
  unit: string;
  model_family: string;
  structure_id: string;
  formula: string;
  fit_file: string;
  diagnostics_summary: string;
  loo_summary: string;
  caution: string;
  rationale: string;
}

export interface AiStyleTaskProfile {
  profile_id: string;
  display_name: string;
  profile_type: string;
  corpus_scope: AiProfileScope;
  reference_scope_role: string;
  task_code: AiTaskCode;
  task_label: string;
  date_generated: string;
  provenance: string;
  global_caution: string;
  metrics: AiStyleMetric[];
}

export type AiTaskCode = "A" | "B" | "C" | "D";

export interface AiStyleProfileBundle {
  date_generated: string;
  recommended_default_reference_scope: AiProfileScope;
  optional_reference_scope: AiProfileScope;
  optional_reference_scope_caution: string;
  non_detection_wording: string;
  global_caution: string;
  source_fit_directory: string;
  profiles: AiStyleTaskProfile[];
}

export type AiProfileBand = "typical" | "somewhat_unusual" | "highly_unusual";

export const aiStyleScopeLabels: Record<AiProfileScope, string> = {
  cloud_frontier: "Frontier model comparison - recommended default",
  all_models: "Broader model comparison - exploratory",
};

export const aiStyleTaskByRegister: Record<Exclude<RegisterId, "ai">, AiTaskCode> = {
  explanatory: "A",
  empirical: "B",
  evaluative: "C",
  email: "D",
};

const appMetricKeyMap: Record<string, MetricKey> = {
  article_opener_percentage: "articleOpenersPercent",
  hedges_per_1000: "hedgesPer1000",
  sentence_length_sd_raw: "sentenceLengthStdev",
  type_token_ratio_raw: "vocabularyTtr",
  paragraph_mean_words_raw: "paragraphMeanWords",
};

const requiredNonDetectionWording =
  "These profiles are corpus-derived AI-style comparison benchmarks. They are not AI detectors, not authorship classifiers, not plagiarism tools, and not universal averages of AI writing.";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid AI-style profile data: ${label} must be a finite number.`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid AI-style profile data: ${label} must be a non-empty string.`);
  }
}

function assertInterval(value: unknown, label: string): asserts value is AiInterval {
  if (!isObject(value)) {
    throw new Error(`Invalid AI-style profile data: ${label} must be an interval object.`);
  }
  assertNumber(value.lower, `${label}.lower`);
  assertNumber(value.upper, `${label}.upper`);
  if (value.lower > value.upper) {
    throw new Error(`Invalid AI-style profile data: ${label}.lower exceeds upper.`);
  }
}

function assertPosteriorSummary(value: unknown, label: string): asserts value is AiPosteriorSummary {
  if (!isObject(value)) {
    throw new Error(`Invalid AI-style profile data: ${label} must be a posterior summary object.`);
  }
  assertNumber(value.median, `${label}.median`);
  assertNumber(value.mean, `${label}.mean`);
  assertInterval(value.interval_50, `${label}.interval_50`);
  assertInterval(value.interval_90, `${label}.interval_90`);
}

function assertMetric(value: unknown, label: string): asserts value is AiStyleMetric {
  if (!isObject(value)) {
    throw new Error(`Invalid AI-style profile data: ${label} must be an object.`);
  }

  [
    "profile_metric_id",
    "source_metric_id",
    "metric_name",
    "app_metric_key",
    "display_tier",
    "export_status",
    "unit",
    "structure_id",
    "fit_file",
    "caution",
  ].forEach((key) => assertString(value[key], `${label}.${key}`));

  if (!Object.hasOwn(appMetricKeyMap, value.app_metric_key as string)) {
    throw new Error(`Invalid AI-style profile data: ${label}.app_metric_key is not supported.`);
  }

  if (
    !["primary_default", "contextual_with_caution", "advanced_or_exploratory", "hidden_from_default"].includes(
      value.display_tier as string,
    )
  ) {
    throw new Error(`Invalid AI-style profile data: ${label}.display_tier is unsupported.`);
  }

  if (
    !["export_provisional", "export_with_caution", "advanced_or_exploratory_with_caution"].includes(
      value.export_status as string,
    )
  ) {
    throw new Error(`Invalid AI-style profile data: ${label}.export_status is unsupported.`);
  }

  assertNumber(value.centre, `${label}.centre`);
  assertPosteriorSummary(value.posterior_epred, `${label}.posterior_epred`);
  assertPosteriorSummary(value.posterior_predict, `${label}.posterior_predict`);
}

function validateAiStyleProfileBundle(value: unknown): AiStyleProfileBundle {
  if (!isObject(value)) {
    throw new Error("Invalid AI-style profile data: bundle must be an object.");
  }

  assertString(value.non_detection_wording, "non_detection_wording");
  if (value.non_detection_wording !== requiredNonDetectionWording) {
    throw new Error("Invalid AI-style profile data: non-detection wording has changed.");
  }

  if (value.recommended_default_reference_scope !== "cloud_frontier") {
    throw new Error("Invalid AI-style profile data: cloud_frontier must be the recommended default.");
  }

  if (value.optional_reference_scope !== "all_models") {
    throw new Error("Invalid AI-style profile data: all_models must be the optional reference scope.");
  }

  if (!Array.isArray(value.profiles) || value.profiles.length !== 8) {
    throw new Error("Invalid AI-style profile data: expected 8 task profiles.");
  }

  const metricCount = value.profiles.reduce((sum, profile, profileIndex) => {
    if (!isObject(profile)) {
      throw new Error(`Invalid AI-style profile data: profiles[${profileIndex}] must be an object.`);
    }
    if (profile.corpus_scope !== "cloud_frontier" && profile.corpus_scope !== "all_models") {
      throw new Error(`Invalid AI-style profile data: profiles[${profileIndex}].corpus_scope is unsupported.`);
    }
    if (!["A", "B", "C", "D"].includes(profile.task_code as string)) {
      throw new Error(`Invalid AI-style profile data: profiles[${profileIndex}].task_code is unsupported.`);
    }
    if (!Array.isArray(profile.metrics)) {
      throw new Error(`Invalid AI-style profile data: profiles[${profileIndex}].metrics must be an array.`);
    }
    profile.metrics.forEach((metric, metricIndex) =>
      assertMetric(metric, `profiles[${profileIndex}].metrics[${metricIndex}]`),
    );
    return sum + profile.metrics.length;
  }, 0);

  if (metricCount !== 44) {
    throw new Error(`Invalid AI-style profile data: expected 44 metric entries, found ${metricCount}.`);
  }

  return value as unknown as AiStyleProfileBundle;
}

export const aiStyleProfiles = validateAiStyleProfileBundle(JSON.parse(curatedProfileBundleJson));
export const defaultAiStyleScope = aiStyleProfiles.recommended_default_reference_scope;
export const aiStyleNonDetectionWording = aiStyleProfiles.non_detection_wording;

export function metricKeyForAiStyleMetric(metric: AiStyleMetric): MetricKey | null {
  return appMetricKeyMap[metric.app_metric_key] ?? null;
}

export function getAiStyleTaskCode(registerId: RegisterId): AiTaskCode {
  if (registerId === "ai") {
    return "A";
  }
  return aiStyleTaskByRegister[registerId];
}

export function getAiStyleProfile(scope: AiProfileScope, taskCode: AiTaskCode): AiStyleTaskProfile {
  const profile = aiStyleProfiles.profiles.find(
    (item) => item.corpus_scope === scope && item.task_code === taskCode,
  );

  if (!profile) {
    throw new Error(`No AI-style profile for ${scope} task ${taskCode}.`);
  }

  return profile;
}

export function getProfileCentre(metric: AiStyleMetric): number {
  return metric.posterior_epred.median;
}

export function compareToPosteriorPredictBand(metric: AiStyleMetric, value: number): AiProfileBand {
  const band50 = metric.posterior_predict.interval_50;
  const band90 = metric.posterior_predict.interval_90;

  if (value >= band50.lower && value <= band50.upper) {
    return "typical";
  }

  if (value >= band90.lower && value <= band90.upper) {
    return "somewhat_unusual";
  }

  return "highly_unusual";
}
