import React from 'react';
import { ChatMetrics } from '../../types';

interface MetricsSubtextProps {
  metrics: ChatMetrics | null;
}

const MetricsSubtext: React.FC<MetricsSubtextProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="metrics-subtext">
        <span className="metrics-badge">Metrics loading…</span>
      </div>
    );
  }

  return (
    <div className="metrics-subtext">

      {metrics.llm_model !== undefined && (
        <span className="metrics-badge">Model {metrics.llm_model}</span>
      )}
      {metrics.total_latency_ms !== undefined && (
        <span className="metrics-badge">⏱ {metrics.total_latency_ms} ms</span>
      )}
      {metrics.row_count !== undefined && (
        <span className="metrics-badge">⬚ {metrics.row_count} rows</span>
      )}
      {metrics.rag_ms !== undefined && (
        <span className="metrics-badge">RAG {metrics.rag_ms} ms</span>
      )}
      {metrics.duckdb_exec_ms !== undefined && (
        <span className="metrics-badge">SQL {metrics.duckdb_exec_ms} ms</span>
      )}
      {metrics.stats_skipped !== undefined && (
        <span className="metrics-badge">
          {metrics.stats_skipped ? '⚠ Stats skipped' : '✓ Stats OK'}
        </span>
      )}
    </div>
  );
};

export default MetricsSubtext;
