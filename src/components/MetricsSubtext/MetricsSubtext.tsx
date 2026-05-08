import React, { useState } from 'react';
import { ChatMetrics } from '../../types';

interface MetricsSubtextProps {
  metrics: ChatMetrics | null;
}

const MetricsSubtext: React.FC<MetricsSubtextProps> = ({ metrics }) => {
  const [showStats, setShowStats] = useState(false);

  if (!metrics) {
    return (
      <div className="metrics-subtext">
        <span className="metrics-badge">Metrics loading…</span>
      </div>
    );
  }

  return (
    <>
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
        {metrics.compression_stats !== undefined && (
          <span 
            className="metrics-badge" 
            style={{ cursor: 'pointer', backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }}
            onClick={() => setShowStats(true)}
          >
            📉 Compression stats
          </span>
        )}
      </div>

      {showStats && metrics.compression_stats && (
        <div className="modal-overlay">
          <div className="modal-window" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Compression Stats</h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em' }}>
                <span><strong>Original tokens:</strong></span>
                <span>{metrics.compression_stats.original_tokens.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em' }}>
                <span><strong>Actual tokens:</strong></span>
                <span>{metrics.compression_stats.actual_tokens.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', color: '#27ae60', marginTop: '10px' }}>
                <span><strong>Savings percentage:</strong></span>
                <strong>{metrics.compression_stats.savings_percentage}%</strong>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'flex-end', display: 'flex' }}>
              <button className="btn" onClick={() => setShowStats(false)}>Ok</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MetricsSubtext;
