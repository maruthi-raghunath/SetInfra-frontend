import React from 'react';
import PlotlyPlot from 'react-plotly.js';
import ErrorBoundary from './ErrorBoundary';

// Vite CommonJS compatibility patch for react-plotly.js
const PlotComponent: any = (PlotlyPlot as any).default || PlotlyPlot;

// Plotly expects 'global' to be available on window
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

interface ResultTableProps {
  rows: Record<string, unknown>[];
  chartType?: string;
}

const ResultTable: React.FC<ResultTableProps> = ({ rows, chartType }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="result-table-wrapper" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
        No data returned.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);
  const isChart = chartType && chartType.toLowerCase() !== 'table' && chartType.toLowerCase() !== 'none';
  
  let chartElement = null;
  if (isChart && columns.length >= 1) {
    const chartTypeLower = chartType!.toLowerCase();
    const xKey = columns[0];
    const yKey = columns.length > 1 ? columns[1] : columns[0];
    
    const xData = rows.map(r => r[xKey]);
    const yData = rows.map(r => r[yKey]);

    let plotData: any[] = [];
    if (chartTypeLower === 'pie') {
      plotData = [{
        values: yData,
        labels: xData,
        type: 'pie',
        textinfo: 'label+percent',
        hoverinfo: 'label+percent+value'
      }];
    } else {
      let plotlyType = chartTypeLower;
      let orientation = undefined;
      
      if (chartTypeLower === 'timeline') {
        plotlyType = 'bar';
        orientation = 'h';
      } else if (chartTypeLower === 'line') {
        plotlyType = 'scatter';
      } else if (!['bar', 'scatter', 'pie'].includes(plotlyType)) {
        plotlyType = 'bar';
      }

      let mode = undefined;
      if (plotlyType === 'scatter' || chartTypeLower === 'line') {
        mode = chartTypeLower === 'line' ? 'lines+markers' : 'markers';
      }

      plotData = [{
        x: chartTypeLower === 'timeline' ? yData : xData,
        y: chartTypeLower === 'timeline' ? xData : yData,
        type: plotlyType,
        mode: mode,
        orientation: orientation,
        marker: { color: '#3A82F6' },
        line: { color: '#3A82F6' }
      }];
    }

    chartElement = (
      <div className="chart-wrapper" style={{ marginTop: '16px', marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-secondary, rgba(255,255,255,0.02))' }}>
        <ErrorBoundary>
          <PlotComponent
            data={plotData}
            layout={{
              autosize: true,
              margin: { t: 20, b: 40, l: 40, r: 20 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              font: { color: 'var(--text-color, #e2e8f0)' },
              xaxis: { 
                color: 'var(--text-muted, #94a3b8)', 
                gridcolor: 'var(--border-color, #334155)',
                zerolinecolor: 'var(--border-color, #334155)'
              },
              yaxis: { 
                color: 'var(--text-muted, #94a3b8)', 
                gridcolor: 'var(--border-color, #334155)',
                zerolinecolor: 'var(--border-color, #334155)'
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', minHeight: '350px' }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="result-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {chartElement}
      <div className="result-table-wrapper">
        <table className="result-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultTable;
