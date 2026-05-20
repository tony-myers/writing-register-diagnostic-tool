import type { AiProfileScope, AiStyleMetric } from "../lib/aiStyleProfiles";
import {
  aiStyleScopeLabels,
  getAiStyleProfile,
  getAiStyleTaskCode,
  getProfileCentre,
  metricKeyForAiStyleMetric,
} from "../lib/aiStyleProfiles";
import { formatNumber } from "../lib/format";
import type { RegisterId, StyleAnalysis } from "../types";

interface AiStyleComparisonChartsProps {
  analysis: StyleAnalysis;
  scope: AiProfileScope;
  selectedRegister: RegisterId;
  embedded?: boolean;
}

interface ChartDatum {
  label: string;
  fullLabel: string;
  submitted: number;
  profile: number;
  submittedActual: number;
  profileActual: number;
  interval50Lower: number;
  interval50Upper: number;
  interval90Lower: number;
  interval90Upper: number;
  unit: string;
}

const chartMetricIds = [
  "article_opener",
  "hedge_rate",
  "sentence_length_sd",
  "type_token_ratio",
  "paragraph_mean_words",
];

const shortMetricLabels: Record<string, string> = {
  article_opener: "Article openers",
  hedge_rate: "Hedges",
  sentence_length_sd: "Sentence SD",
  type_token_ratio: "Vocabulary ratio",
  paragraph_mean_words: "Paragraph words",
};

function displayMetricName(metric: AiStyleMetric) {
  return metric.profile_metric_id === "type_token_ratio"
    ? "Vocabulary type-token ratio (TTR)"
    : metric.metric_name;
}

function toIndexedValue(value: number, profileCentre: number) {
  if (!Number.isFinite(value) || !Number.isFinite(profileCentre) || profileCentre === 0) {
    return 0;
  }
  return (value / profileCentre) * 100;
}

function getSubmittedValue(metric: AiStyleMetric, analysis: StyleAnalysis) {
  const metricKey = metricKeyForAiStyleMetric(metric);
  return metricKey ? analysis.metricValues[metricKey] : null;
}

function buildChartData(analysis: StyleAnalysis, scope: AiProfileScope, selectedRegister: RegisterId) {
  const profile = getAiStyleProfile(scope, getAiStyleTaskCode(selectedRegister));
  const metrics = profile.metrics.filter((metric) =>
    chartMetricIds.includes(metric.profile_metric_id) &&
    ["primary_default", "contextual_with_caution"].includes(metric.display_tier),
  );

  return metrics
    .sort(
      (a, b) => chartMetricIds.indexOf(a.profile_metric_id) - chartMetricIds.indexOf(b.profile_metric_id),
    )
    .map<ChartDatum | null>((metric) => {
      const submitted = getSubmittedValue(metric, analysis);
      if (submitted === null) {
        return null;
      }

      const profileCentre = getProfileCentre(metric);
      return {
        label: shortMetricLabels[metric.profile_metric_id] ?? metric.metric_name,
        fullLabel: displayMetricName(metric),
        submitted: toIndexedValue(submitted, profileCentre),
        profile: 100,
        submittedActual: submitted,
        profileActual: profileCentre,
        interval50Lower: metric.posterior_predict.interval_50.lower,
        interval50Upper: metric.posterior_predict.interval_50.upper,
        interval90Lower: metric.posterior_predict.interval_90.lower,
        interval90Upper: metric.posterior_predict.interval_90.upper,
        unit: metric.unit,
      };
    })
    .filter((datum): datum is ChartDatum => Boolean(datum));
}

function formatActual(value: number, unit: string) {
  return formatNumber(value, unit === "ratio" ? 3 : 2);
}

function niceChartMax(values: number[]) {
  const maximum = Math.max(120, ...values.filter(Number.isFinite));
  return Math.ceil(maximum / 25) * 25;
}

function BarComparison({ data }: { data: ChartDatum[] }) {
  const width = 720;
  const height = 340;
  const margin = { top: 22, right: 22, bottom: 76, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = niceChartMax(data.flatMap((datum) => [datum.submitted, datum.profile]));
  const groupWidth = plotWidth / data.length;
  const barWidth = Math.min(36, groupWidth / 3.4);
  const yFor = (value: number) => margin.top + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;
  const yTicks = [0, 25, 50, 75, 100, 125, 150, maxValue].filter(
    (tick, index, ticks) => tick <= maxValue && ticks.indexOf(tick) === index,
  );

  return (
    <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Indexed bar comparison between submitted document and AI profile centre">
      {yTicks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} className="chart-grid-line" />
            <text x={margin.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">
              {tick}
            </text>
          </g>
        );
      })}
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={yFor(100)}
        y2={yFor(100)}
        className="chart-profile-line"
      />
      {data.map((datum, index) => {
        const groupCenter = margin.left + groupWidth * index + groupWidth / 2;
        const submittedHeight = Math.max(0, margin.top + plotHeight - yFor(datum.submitted));
        const profileHeight = Math.max(0, margin.top + plotHeight - yFor(datum.profile));
        return (
          <g key={datum.fullLabel}>
            <rect
              x={groupCenter - barWidth - 4}
              y={yFor(datum.submitted)}
              width={barWidth}
              height={submittedHeight}
              className="chart-submitted"
              rx={4}
            />
            <rect
              x={groupCenter + 4}
              y={yFor(datum.profile)}
              width={barWidth}
              height={profileHeight}
              className="chart-profile"
              rx={4}
            />
            <text
              x={groupCenter}
              y={height - 46}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {datum.label}
            </text>
            <text
              x={groupCenter}
              y={height - 24}
              textAnchor="middle"
              className="chart-mini-label"
            >
              {formatNumber(datum.submitted, 0)} / 100
            </text>
            <title>
              {`${datum.fullLabel}. Submitted ${formatActual(datum.submittedActual, datum.unit)} ${datum.unit}; AI profile centre ${formatActual(datum.profileActual, datum.unit)} ${datum.unit}; 50% document band ${formatActual(datum.interval50Lower, datum.unit)} to ${formatActual(datum.interval50Upper, datum.unit)}; 90% document band ${formatActual(datum.interval90Lower, datum.unit)} to ${formatActual(datum.interval90Upper, datum.unit)}.`}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

function pointOnCircle(centerX: number, centerY: number, radius: number, angle: number) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function RadarComparison({ data }: { data: ChartDatum[] }) {
  const width = 520;
  const height = 360;
  const centerX = width / 2;
  const centerY = 168;
  const radius = 108;
  const maxValue = niceChartMax(data.flatMap((datum) => [datum.submitted, datum.profile]));
  const rings = [0.25, 0.5, 0.75, 1];
  const angleFor = (index: number) => -Math.PI / 2 + (index / data.length) * Math.PI * 2;
  const pointsFor = (key: "submitted" | "profile") =>
    data
      .map((datum, index) =>
        pointOnCircle(centerX, centerY, radius * (Math.max(0, datum[key]) / maxValue), angleFor(index)),
      )
      .map((point) => `${point.x},${point.y}`)
      .join(" ");

  return (
    <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Indexed radar comparison between submitted document and AI profile centre">
      {rings.map((ring) => {
        const ringPoints = data
          .map((_, index) => pointOnCircle(centerX, centerY, radius * ring, angleFor(index)))
          .map((point) => `${point.x},${point.y}`)
          .join(" ");
        return <polygon key={ring} points={ringPoints} className="radar-ring" />;
      })}
      {data.map((datum, index) => {
        const angle = angleFor(index);
        const end = pointOnCircle(centerX, centerY, radius, angle);
        const label = pointOnCircle(centerX, centerY, radius + 36, angle);
        return (
          <g key={datum.fullLabel}>
            <line x1={centerX} y1={centerY} x2={end.x} y2={end.y} className="chart-grid-line" />
            <text x={label.x} y={label.y + 4} textAnchor="middle" className="chart-axis-label">
              {datum.label}
            </text>
          </g>
        );
      })}
      <polygon points={pointsFor("profile")} className="radar-profile" />
      <polygon points={pointsFor("submitted")} className="radar-submitted" />
      <circle cx={centerX} cy={centerY} r={2.5} className="radar-center" />
      <text x={centerX} y={height - 18} textAnchor="middle" className="chart-mini-label">
        Indexed scale: AI profile centre = 100
      </text>
    </svg>
  );
}

function ChartLegend() {
  return (
    <div className="chart-legend" aria-label="Chart legend">
      <span>
        <i className="legend-swatch legend-submitted" /> Submitted document
      </span>
      <span>
        <i className="legend-swatch legend-profile" /> AI profile centre
      </span>
    </div>
  );
}

function CompactBarPlot({ data }: { data: ChartDatum[] }) {
  const maxValue = niceChartMax(data.flatMap((datum) => [datum.submitted, datum.profile]));

  return (
    <div className="compact-ai-plot" aria-label="Compact indexed AI corpus bar plot">
      {data.map((datum) => {
        const submittedWidth = Math.max(2, Math.min(100, (Math.max(0, datum.submitted) / maxValue) * 100));
        const profileWidth = Math.max(2, Math.min(100, (datum.profile / maxValue) * 100));
        return (
          <div className="compact-ai-plot-row" key={datum.fullLabel}>
            <strong>{datum.label}</strong>
            <div className="compact-ai-bars">
              <span className="compact-ai-bar submitted" style={{ width: `${submittedWidth}%` }}>
                {formatNumber(datum.submitted, 0)}
              </span>
              <span className="compact-ai-bar profile" style={{ width: `${profileWidth}%` }}>
                100
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AiStyleComparisonCharts({
  analysis,
  scope,
  selectedRegister,
  embedded = false,
}: AiStyleComparisonChartsProps) {
  const chartData = buildChartData(analysis, scope, selectedRegister);

  return (
    <section
      className={embedded ? "ai-chart-panel ai-chart-embedded" : "panel ai-chart-panel"}
      aria-labelledby="ai-chart-heading"
    >
      <div className="panel-heading">
        <div>
          <h2 id="ai-chart-heading">AI corpus comparison plots</h2>
          <p>
            The plots compare the submitted document with the selected curated AI-style profile.
            Values are indexed so the AI profile centre is 100 for each metric.
          </p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
          <ChartLegend />
          <CompactBarPlot data={chartData} />
          <div className="ai-chart-grid">
            <article>
              <h3>Indexed bar comparison</h3>
              <div className="chart-frame">
                <BarComparison data={chartData} />
              </div>
            </article>

            <article>
              <h3>Indexed radar comparison</h3>
              <div className="chart-frame">
                <RadarComparison data={chartData} />
              </div>
            </article>
          </div>
        </>
      ) : (
        <p className="chart-note">No AI-style profile metrics are available for charting.</p>
      )}

      <p className="chart-note">
        These plots are style comparisons to a corpus-derived AI benchmark, not AI detection,
        authorship classification, plagiarism detection or a judgement of quality.
      </p>
      <p className="chart-note">Reference set: {aiStyleScopeLabels[scope]}</p>
    </section>
  );
}
