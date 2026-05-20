import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const profilePath = resolve(
  appRoot,
  "src/data/ai-style-profiles/public_profile_preview_curated_fixed.json",
);

const expectedWording =
  "These profiles are corpus-derived AI-style comparison benchmarks. They are not AI detectors, not authorship classifiers, not plagiarism tools, and not universal averages of AI writing.";

function fail(message) {
  throw new Error(`AI-style profile validation failed: ${message}`);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function checkInterval(metric, summaryKey, intervalKey, lowerBound, upperBound, problems) {
  const interval = metric?.[summaryKey]?.[intervalKey];
  if (!interval || !isFiniteNumber(interval.lower) || !isFiniteNumber(interval.upper)) {
    problems.push(`${metric.profile_metric_id}: missing ${summaryKey}.${intervalKey}`);
    return;
  }
  if (interval.lower > interval.upper) {
    problems.push(`${metric.profile_metric_id}: ${summaryKey}.${intervalKey} lower > upper`);
  }
  if (lowerBound !== null && interval.lower < lowerBound) {
    problems.push(`${metric.profile_metric_id}: ${summaryKey}.${intervalKey}.lower below ${lowerBound}`);
  }
  if (upperBound !== null && interval.upper > upperBound) {
    problems.push(`${metric.profile_metric_id}: ${summaryKey}.${intervalKey}.upper above ${upperBound}`);
  }
}

const bundle = JSON.parse(readFileSync(profilePath, "utf8"));

if (!Array.isArray(bundle.profiles) || bundle.profiles.length !== 8) {
  fail(`expected 8 task profiles, found ${bundle.profiles?.length ?? "none"}`);
}

const metrics = bundle.profiles.flatMap((profile) =>
  (profile.metrics ?? []).map((metric) => ({
    ...metric,
    corpus_scope: profile.corpus_scope,
    task_code: profile.task_code,
  })),
);

if (metrics.length !== 44) {
  fail(`expected 44 metric entries, found ${metrics.length}`);
}

if (metrics.some((metric) => !metric.export_status)) {
  fail("every metric entry must include export_status");
}

if (bundle.non_detection_wording !== expectedWording) {
  fail("non-detection wording does not match the approved public wording");
}

if (!bundle.non_detection_wording.includes("not plagiarism tools")) {
  fail('non-detection wording must include "not plagiarism tools"');
}

if (bundle.recommended_default_reference_scope !== "cloud_frontier") {
  fail("cloud_frontier must be the recommended default scope");
}

if (bundle.optional_reference_scope !== "all_models") {
  fail("all_models must be the optional broader/exploratory scope");
}

const allModelsProfiles = bundle.profiles.filter((profile) => profile.corpus_scope === "all_models");
if (
  allModelsProfiles.length !== 4 ||
  allModelsProfiles.some((profile) => profile.reference_scope_role !== "optional_broader_exploratory_reference")
) {
  fail("all_models profiles must be labelled exploratory");
}

const primaryPairs = new Set(
  metrics
    .filter((metric) => metric.display_tier === "primary_default")
    .map((metric) => `${metric.profile_metric_id}:${metric.structure_id}`),
);
const expectedPrimaryPairs = new Set([
  "article_opener:pp_model_intercept",
  "hedge_rate:pp_model_intercept",
  "sentence_length_sd:pp_model_intercept",
]);
if (
  primaryPairs.size !== expectedPrimaryPairs.size ||
  [...primaryPairs].some((pair) => !expectedPrimaryPairs.has(pair))
) {
  fail(`unexpected primary_default metric set: ${[...primaryPairs].join(", ")}`);
}

const impossibleValues = [];
for (const metric of metrics) {
  let lowerBound = null;
  let upperBound = null;
  if (metric.profile_metric_id === "type_token_ratio") {
    lowerBound = 0;
    upperBound = 1;
  } else if (metric.profile_metric_id === "article_opener") {
    lowerBound = 0;
    upperBound = 100;
  } else if (
    [
      "hedge_rate",
      "paragraph_mean_words",
      "sentence_length_sd",
      "sentence_length_sd_random_slope",
    ].includes(metric.profile_metric_id)
  ) {
    lowerBound = 0;
  }

  for (const summaryKey of ["posterior_epred", "posterior_predict"]) {
    const summary = metric[summaryKey];
    if (!summary || !isFiniteNumber(summary.median) || !isFiniteNumber(summary.mean)) {
      impossibleValues.push(`${metric.corpus_scope}:${metric.task_code}:${metric.profile_metric_id}: missing ${summaryKey}`);
      continue;
    }
    if (lowerBound !== null && summary.median < lowerBound) {
      impossibleValues.push(`${metric.profile_metric_id}: ${summaryKey}.median below ${lowerBound}`);
    }
    if (upperBound !== null && summary.median > upperBound) {
      impossibleValues.push(`${metric.profile_metric_id}: ${summaryKey}.median above ${upperBound}`);
    }
    checkInterval(metric, summaryKey, "interval_50", lowerBound, upperBound, impossibleValues);
    checkInterval(metric, summaryKey, "interval_90", lowerBound, upperBound, impossibleValues);
  }
}

if (impossibleValues.length) {
  fail(`impossible values found: ${impossibleValues.join("; ")}`);
}

console.log("AI-style profile validation passed.");
console.log(`Profiles: ${bundle.profiles.length}`);
console.log(`Metric entries: ${metrics.length}`);
console.log(`Default scope: ${bundle.recommended_default_reference_scope}`);
