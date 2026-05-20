import type { StyleAnalysis } from "../types";
import { formatNumber } from "../lib/format";
import { metricDefinitions } from "../lib/metrics";

interface MetricTableProps {
  analysis: StyleAnalysis;
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
                <th scope="row">{metric.label}</th>
                <td>{formatNumber(analysis.metricValues[metric.key], metric.unit === "ratio" ? 3 : 2)}</td>
                <td>{metric.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
