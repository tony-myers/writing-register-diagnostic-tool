import type { StyleAnalysis } from "../types";
import { formatNumber } from "../lib/format";
import { metricDefinitions } from "../lib/metrics";

interface MetricTableProps {
  analysis: StyleAnalysis;
}

const metricDefinitionItems = [
  {
    name: "Article opener sentences (%)",
    definition:
      "Percentage of analysed sentences that begin with an article such as 'a', 'an' or 'the'. This can reflect sentence-opening patterns, not quality.",
  },
  {
    name: "Hedges per 1,000 words",
    definition:
      "Frequency of cautious or qualifying expressions per 1,000 words, such as 'may', 'might', 'appears', 'suggests' or similar terms in the app dictionary. This reflects measured qualification, not necessarily intellectual caution.",
  },
  {
    name: "Sentence length SD",
    definition:
      "Standard deviation of sentence length in words. Higher values indicate more variation in sentence length; lower values indicate more even sentence lengths.",
  },
  {
    name: "Vocabulary type-token ratio (TTR)",
    definition:
      "Number of unique word types divided by total word tokens. Higher values indicate more varied vocabulary, but this metric is length-sensitive and should be interpreted cautiously.",
  },
  {
    name: "Paragraph word length",
    definition:
      "Average number of words per analysed paragraph. This is strongly affected by document structure and extraction quality, especially for uploaded PDFs and DOCX files.",
  },
];

function displayMetricLabel(metric: (typeof metricDefinitions)[number]) {
  return metric.key === "vocabularyTtr" ? "Vocabulary type-token ratio (TTR)" : metric.label;
}

function metricHelpText(metric: (typeof metricDefinitions)[number]) {
  return metric.key === "vocabularyTtr"
    ? "Unique word forms divided by total words; length-sensitive."
    : null;
}

export function MetricTable({ analysis }: MetricTableProps) {
  return (
    <section className="panel" aria-labelledby="metric-table-heading">
      <div className="panel-heading">
        <div>
          <h2 id="metric-table-heading">Computed metrics</h2>
          <p>Direct measurements for the submitted document.</p>
        </div>
      </div>

      <div className="metric-table-wrap">
        <table className="metric-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Value</th>
              <th scope="col">Unit</th>
            </tr>
          </thead>
          <tbody>
            {metricDefinitions.map((metric) => (
              <tr key={metric.key}>
                <th scope="row">
                  <span>{displayMetricLabel(metric)}</span>
                  {metricHelpText(metric) && (
                    <small className="metric-help-text">{metricHelpText(metric)}</small>
                  )}
                </th>
                <td>{formatNumber(analysis.metricValues[metric.key], metric.unit === "ratio" ? 3 : 2)}</td>
                <td>{metric.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="metric-definitions">
        <summary>Metric definitions</summary>
        <p>
          These are mechanical text features. They are useful for reflection on style patterns, but
          they are not measures of writing quality, authorship, plagiarism or AI use.
        </p>
        <dl>
          {metricDefinitionItems.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd>{item.definition}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
