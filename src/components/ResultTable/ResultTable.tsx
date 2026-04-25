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

// Clinical-themed colour palette
const PALETTE = [
  '#3A82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

const COMMON_LAYOUT: Partial<any> = {
  autosize: true,
  margin: { t: 30, b: 50, l: 55, r: 20 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Trebuchet MS, Segoe UI, sans-serif', size: 12, color: '#333' },
  xaxis: {
    gridcolor: '#e5e7eb',
    zerolinecolor: '#d1d5db',
    tickfont: { size: 11 },
  },
  yaxis: {
    gridcolor: '#e5e7eb',
    zerolinecolor: '#d1d5db',
    tickfont: { size: 11 },
  },
  legend: { font: { size: 11 } },
};

function buildPlotData(chartTypeLower: string, columns: string[], rows: Record<string, unknown>[]): { data: any[]; layout?: Partial<any> } {
  const col0 = columns[0];
  const col1 = columns.length > 1 ? columns[1] : columns[0];
  const col2 = columns.length > 2 ? columns[2] : null;

  const x0 = rows.map(r => r[col0]);
  const y1 = rows.map(r => r[col1]);
  const z2 = col2 ? rows.map(r => r[col2]) : null;

  switch (chartTypeLower) {

    // ── Bar ──────────────────────────────────────────────────────────────────
    case 'bar':
      return {
        data: [{ x: x0, y: y1, type: 'bar', marker: { color: PALETTE[0] } }],
      };

    // ── Horizontal bar (timeline / Gantt proxy) ───────────────────────────────
    case 'timeline':
      return {
        data: [{ x: y1, y: x0, type: 'bar', orientation: 'h', marker: { color: PALETTE[0] } }],
        layout: { margin: { t: 30, b: 50, l: 120, r: 20 } },
      };

    // ── Line ──────────────────────────────────────────────────────────────────
    case 'line':
      return {
        data: [{ x: x0, y: y1, type: 'scatter', mode: 'lines+markers', line: { color: PALETTE[0], width: 2 }, marker: { color: PALETTE[0], size: 6 } }],
      };

    // ── Area ──────────────────────────────────────────────────────────────────
    case 'area':
      return {
        data: [{ x: x0, y: y1, type: 'scatter', mode: 'lines', fill: 'tozeroy', fillcolor: `${PALETTE[0]}33`, line: { color: PALETTE[0], width: 2 } }],
      };

    // ── Scatter ───────────────────────────────────────────────────────────────
    case 'scatter':
      return {
        data: [{ x: x0, y: y1, type: 'scatter', mode: 'markers', marker: { color: PALETTE[0], size: 8, opacity: 0.7 } }],
      };

    // ── Bubble ────────────────────────────────────────────────────────────────
    case 'bubble': {
      const sizeRaw = z2 ?? y1;
      const maxSize = Math.max(...(sizeRaw as number[])) || 1;
      const sizeNorm = (sizeRaw as number[]).map(v => Math.max(6, (Number(v) / maxSize) * 50));
      return {
        data: [{
          x: x0, y: y1, type: 'scatter', mode: 'markers',
          marker: { color: PALETTE[0], size: sizeNorm, opacity: 0.7, sizemode: 'diameter' },
          text: z2 ? (z2 as any[]).map(String) : undefined,
          hovertemplate: `${col0}: %{x}<br>${col1}: %{y}${col2 ? `<br>${col2}: %{text}` : ''}<extra></extra>`,
        }],
      };
    }

    // ── Pie ───────────────────────────────────────────────────────────────────
    case 'pie':
      return {
        data: [{
          labels: x0, values: y1, type: 'pie',
          textinfo: 'label+percent',
          hoverinfo: 'label+percent+value',
          marker: { colors: PALETTE },
        }],
        layout: { margin: { t: 30, b: 10, l: 10, r: 10 }, legend: { orientation: 'h', y: -0.1 } },
      };

    // ── Histogram ─────────────────────────────────────────────────────────────
    case 'histogram':
      return {
        data: [{ x: x0, type: 'histogram', marker: { color: PALETTE[0] }, opacity: 0.85 }],
      };

    // ── Box plot ──────────────────────────────────────────────────────────────
    case 'box': {
      if (columns.length >= 2) {
        // Group by col0, values from col1
        const groups: Record<string, number[]> = {};
        rows.forEach(r => {
          const g = String(r[col0]);
          if (!groups[g]) groups[g] = [];
          groups[g].push(Number(r[col1]));
        });
        const traces = Object.entries(groups).map(([name, vals], i) => ({
          y: vals, type: 'box', name,
          marker: { color: PALETTE[i % PALETTE.length] },
          boxpoints: 'outliers',
        }));
        return { data: traces };
      }
      // Single column — one box
      return {
        data: [{ y: x0, type: 'box', name: col0, marker: { color: PALETTE[0] }, boxpoints: 'outliers' }],
      };
    }

    // ── Heatmap ───────────────────────────────────────────────────────────────
    case 'heatmap': {
      if (columns.length >= 3) {
        // col0=row-category, col1=col-category, col2=value → pivot
        const rowLabels = [...new Set(rows.map(r => String(r[col0])))];
        const colLabels = [...new Set(rows.map(r => String(r[col1])))];
        const zMatrix = rowLabels.map(rl =>
          colLabels.map(cl => {
            const match = rows.find(r => String(r[col0]) === rl && String(r[col1]) === cl);
            return match ? Number(match[col2!]) : 0;
          })
        );
        return {
          data: [{
            z: zMatrix, x: colLabels, y: rowLabels, type: 'heatmap',
            colorscale: 'Blues', showscale: true,
          }],
          layout: { margin: { t: 30, b: 80, l: 100, r: 20 } },
        };
      }
      // 2-col fallback: single-row heatmap
      return {
        data: [{ z: [y1.map(Number)], x: x0, type: 'heatmap', colorscale: 'Blues', showscale: true }],
        layout: { margin: { t: 30, b: 60, l: 20, r: 20 }, yaxis: { showticklabels: false } },
      };
    }

    // ── Treemap ───────────────────────────────────────────────────────────────
    case 'treemap':
      return {
        data: [{
          labels: x0, parents: x0.map(() => ''), values: y1,
          type: 'treemap',
          marker: { colorscale: 'Blues' },
          textinfo: 'label+value+percent root',
        }],
        layout: { margin: { t: 30, b: 10, l: 10, r: 10 } },
      };

    // ── Funnel ────────────────────────────────────────────────────────────────
    case 'funnel':
      return {
        data: [{
          y: x0, x: y1, type: 'funnel',
          textposition: 'inside', textinfo: 'value+percent initial',
          marker: { color: PALETTE.slice(0, x0.length) },
        }],
        layout: { margin: { t: 30, b: 10, l: 120, r: 20 }, funnelmode: 'stack' },
      };

    // ── Waterfall ─────────────────────────────────────────────────────────────
    case 'waterfall':
      return {
        data: [{
          x: x0, y: y1, type: 'waterfall',
          connector: { line: { color: '#6b7280' } },
          increasing: { marker: { color: PALETTE[1] } },
          decreasing: { marker: { color: PALETTE[3] } },
          totals: { marker: { color: PALETTE[0] } },
        }],
      };

    // ── Spider / Radar ────────────────────────────────────────────────────────
    case 'spider':
    case 'radar': {
      const categories = [...(x0 as string[]), x0[0]]; // close the polygon
      const values = [...(y1 as number[]), (y1 as number[])[0]];
      return {
        data: [{
          type: 'scatterpolar', r: values, theta: categories, fill: 'toself',
          fillcolor: `${PALETTE[0]}33`, line: { color: PALETTE[0] },
        }],
        layout: {
          polar: {
            radialaxis: { visible: true, gridcolor: '#e5e7eb' },
            angularaxis: { gridcolor: '#e5e7eb' },
            bgcolor: 'rgba(0,0,0,0)',
          },
          margin: { t: 40, b: 40, l: 40, r: 40 },
        },
      };
    }

    // ── Default fallback → bar ────────────────────────────────────────────────
    default:
      return {
        data: [{ x: x0, y: y1, type: 'bar', marker: { color: PALETTE[0] } }],
      };
  }
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
    const { data: plotData, layout: extraLayout } = buildPlotData(chartTypeLower, columns, rows);

    const layout = { ...COMMON_LAYOUT, ...extraLayout };

    chartElement = (
      <div
        className="chart-wrapper"
        style={{ marginTop: '12px', marginBottom: '12px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden' }}
      >
        <ErrorBoundary>
          <PlotComponent
            data={plotData}
            layout={layout}
            useResizeHandler={true}
            style={{ width: '100%', minHeight: '360px' }}
            config={{ displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d'], responsive: true }}
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
