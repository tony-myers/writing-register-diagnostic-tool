import { useMemo } from "react";
import { AiStyleComparisonCharts } from "./AiStyleComparisonCharts";
import type { AiProfileBand, AiProfileScope, AiStyleMetric } from "../lib/aiStyleProfiles";
import {
  aiStyleNonDetectionWording,
  aiStyleScopeLabels,
  compareToPosteriorPredictBand,
  getAiStyleProfile,
  getAiStyleTaskCode,
  getProfileCentre,
  metricKeyForAiStyleMetric,
} from "../lib/aiStyleProfiles";
import { formatNumber } from "../lib/format";
import type { RegisterId, StyleAnalysis } from "../types";

interface AiStyleProfilesPanelProps {
  analysis: StyleAnalysis;
  scope: AiProfileScope;
  selectedRegister: RegisterId | "auto";
  onScopeChange: (scope: AiProfileScope) => void;
  targetRegisterId: RegisterId;
}

const bandLabels: Record<AiProfileBand, string> = {
  typical: "Within typical document band",
  somewhat_unusual: "Somewhat unusual",
  highly_unusual: "Highly unusual",
};

const metricOrder = [
  "article_opener",
  "hedge_rate",
  "sentence_length_sd",
  "type_token_ratio",
  "paragraph_mean_words",
  "sentence_length_sd_random_slope",
];

const ttrFullDefinition =
  "Vocabulary type-token ratio (TTR) is calculated as unique word forms divided by total counted words. Here, 'token' means a word token in the text-analysis sense, not generative-AI tokenizer units. TTR is a simple lexical diversity measure, but it is sensitive to text length.";

const aiProfileMethodsUrl =
  "https://tony-myers.github.io/AI-for-education/writing-register-profile-methods.html";

function formatInterval({ lower, upper }: { lower: number; upper: number }, digits: number) {
  return `${formatNumber(lower, digits)} to ${formatNumber(upper, digits)}`;
}

function digitsFor(metric: AiStyleMetric) {
  return metric.unit === "ratio" ? 3 : 2;
}

function sortMetrics(metrics: AiStyleMetric[]) {
  return [...metrics].sort(
    (a, b) => metricOrder.indexOf(a.profile_metric_id) - metricOrder.indexOf(b.profile_metric_id),
  );
}

function displayMetricName(metric: AiStyleMetric) {
  return metric.profile_metric_id === "type_token_ratio"
    ? "Vocabulary TTR (unique word forms / total words)"
    : metric.metric_name;
}

function metricHelpText(metric: AiStyleMetric) {
  return metric.profile_metric_id === "type_token_ratio"
    ? "Unique word forms divided by total counted words; not generative-AI tokenizer units."
    : null;
}

function submittedValueFor(metric: AiStyleMetric, analysis: StyleAnalysis): number | null {
  const appMetricKey = metricKeyForAiStyleMetric(metric);
  return appMetricKey ? analysis.metricValues[appMetricKey] : null;
}

function MetricRows({
  analysis,
  metrics,
}: {
  analysis: StyleAnalysis;
  metrics: AiStyleMetric[];
}) {
  return (
    <div className="ai-profile-table-wrap">
      <table className="ai-profile-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Submitted document</th>
            <th scope="col">Profile centre</th>
            <th scope="col">Document band</th>
            <th scope="col">Comparison</th>
          </tr>
        </thead>
        <tbody>
          {sortMetrics(metrics).map((metric) => {
            const submitted = submittedValueFor(metric, analysis);
            const digits = digitsFor(metric);
            const band = submitted === null ? null : compareToPosteriorPredictBand(metric, submitted);
            return (
              <tr key={`${metric.profile_metric_id}-${metric.structure_id}`}>
                <th scope="row">
                  <span>{displayMetricName(metric)}</span>
                  {metricHelpText(metric) && (
                    <small className="metric-help-text">{metricHelpText(metric)}</small>
                  )}
                  <small>
                    {metric.display_tier.replaceAll("_", " ")}
                    {"; "}
                    {metric.export_status.replaceAll("_", " ")}
                  </small>
                </th>
                <td>{submitted === null ? "Not available" : formatNumber(submitted, digits)}</td>
                <td>
                  {formatNumber(getProfileCentre(metric), digits)}
                  <small>posterior expected median</small>
                </td>
                <td>
                  <span>{formatInterval(metric.posterior_predict.interval_50, digits)}</span>
                  <small>50% document-level band</small>
                  <span>{formatInterval(metric.posterior_predict.interval_90, digits)}</span>
                  <small>90% document-level band</small>
                </td>
                <td>
                  <strong>{band ? bandLabels[band] : "Not compared"}</strong>
                  <small>{metric.caution}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AiStyleProfilesPanel({
  analysis,
  scope,
  selectedRegister,
  onScopeChange,
  targetRegisterId,
}: AiStyleProfilesPanelProps) {
  const taskRegisterId = selectedRegister === "auto" ? targetRegisterId : selectedRegister;
  const taskCode = getAiStyleTaskCode(taskRegisterId);
  const profile = useMemo(() => getAiStyleProfile(scope, taskCode), [scope, taskCode]);

  const primaryMetrics = profile.metrics.filter((metric) => metric.display_tier === "primary_default");
  const contextualMetrics = profile.metrics.filter((metric) =>
    ["contextual_with_caution", "hidden_from_default"].includes(metric.display_tier),
  );
  const advancedMetrics = profile.metrics.filter(
    (metric) => metric.display_tier === "advanced_or_exploratory",
  );

  return (
    <section className="panel ai-style-panel" aria-labelledby="ai-style-profile-heading">
      <div className="panel-heading">
        <div>
          <h2 id="ai-style-profile-heading">AI-style comparison profile</h2>
          <p>{aiStyleNonDetectionWording}</p>
          <p className="ai-methods-link">
            <a href={aiProfileMethodsUrl} target="_blank" rel="noreferrer">
              How this tool's AI-style comparison profiles were constructed
            </a>
          </p>
        </div>
        <label className="ai-scope-control">
          <span>Reference set</span>
          <select
            value={scope}
            onChange={(event) => onScopeChange(event.target.value as AiProfileScope)}
          >
            <option value="cloud_frontier">{aiStyleScopeLabels.cloud_frontier}</option>
            <option value="all_models">{aiStyleScopeLabels.all_models}</option>
          </select>
        </label>
      </div>

      <div className="ai-profile-summary">
        <p>
          <strong>{profile.task_label}</strong>
          <span>{aiStyleScopeLabels[scope]}</span>
        </p>
        <p>{profile.global_caution}</p>
      </div>

      <AiStyleComparisonCharts
        analysis={analysis}
        scope={scope}
        selectedRegister={taskRegisterId}
        embedded
      />

      <MetricRows analysis={analysis} metrics={primaryMetrics} />

      {contextualMetrics.length > 0 && (
        <details className="ai-profile-details">
          <summary>Contextual metrics with caution</summary>
          <p>
            These metrics are useful context, but they are length-sensitive or otherwise less
            suitable as primary public style benchmarks.
          </p>
          {contextualMetrics.some((metric) => metric.profile_metric_id === "type_token_ratio") && (
            <p>{ttrFullDefinition}</p>
          )}
          <MetricRows analysis={analysis} metrics={contextualMetrics} />
        </details>
      )}

      {advancedMetrics.length > 0 && (
        <details className="ai-profile-details">
          <summary>Advanced exploratory sensitivity result</summary>
          <p>
            Advanced entries are retained for review and sensitivity comparison only. They are not
            part of the default public view.
          </p>
          <MetricRows analysis={analysis} metrics={advancedMetrics} />
        </details>
      )}
    </section>
  );
}
