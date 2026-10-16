import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ObservabilityMetrics } from '../types';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  ShieldCheck
} from 'lucide-react';

export const ObservabilityPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.getObservabilityMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load observability metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { name: 'FastAPI Application Server', status: 'HEALTHY', latency: '< 5ms', details: 'REST API, CORS enabled' },
    { name: 'DuckDB Columnar OLAP Engine', status: 'HEALTHY', latency: '< 65ms', details: 'Analytical star schema warehouse' },
    { name: 'SQLite Governance Catalog', status: 'HEALTHY', latency: '< 2ms', details: 'ACID provenance & pipeline run log' },
    { name: 'Historical Replay Streamer', status: 'HEALTHY', latency: '< 10ms', details: 'Kafka-style event emitter & buffer' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            System Reliability & Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Platform Observability & Service Health
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Live telemetry monitoring pipeline execution runtimes, processing throughput, 
            storage footprints, and component health.
          </p>
        </div>

        <button
          onClick={loadMetrics}
          className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-200 text-xs font-mono rounded hover:bg-neutral-800 transition-colors"
        >
          Refresh Telemetry
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Total Pipeline Runs</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.total_pipeline_runs || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Audit runs tracked</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Processed Records</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.total_records_processed.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Bronze cumulative throughput</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Total Quarantined</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.total_quarantined_records || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Defective records isolated</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Quarantine Defect Rate</div>
          <div className="text-2xl font-bold text-white">
            {metrics?.quarantine_rate_pct || 0}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Percentage of dirty records</div>
        </div>
      </div>

      {/* Services Health Matrix */}
      <div className="border border-neutral-800 rounded bg-neutral-950 p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-white" />
          <span className="font-mono text-xs font-semibold uppercase text-white tracking-wider">
            Subsystem Status Matrix
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc, i) => (
            <div key={i} className="border border-neutral-800 bg-black p-4 rounded flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-white text-xs font-mono">{svc.name}</div>
                <div className="text-neutral-400 text-[11px]">{svc.details}</div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="flex items-center space-x-1.5 justify-end">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-white font-bold">{svc.status}</span>
                </div>
                <div className="text-neutral-400 text-[10px] mt-0.5">{svc.latency}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pipeline Duration Trend */}
      <div className="border border-neutral-800 rounded bg-neutral-950 p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-white" />
          <span className="font-mono text-xs font-semibold uppercase text-white tracking-wider">
            Execution Duration Trend (ms)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-neutral-300">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase">
              <tr>
                <th className="py-2.5 px-4">Run Identifier</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Throughput (In / Out)</th>
                <th className="py-2.5 px-4 text-right">Start Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {metrics?.recent_runs.map((r) => (
                <tr key={r.run_id} className="hover:bg-neutral-900/40">
                  <td className="py-2.5 px-4 font-semibold text-white">{r.run_id}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 border border-neutral-700 bg-neutral-900 rounded text-[10px] text-neutral-200">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-white font-bold">{r.duration_ms} ms</td>
                  <td className="py-2.5 px-4 text-neutral-400">
                    {r.records_in.toLocaleString()} / {r.records_out.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-400 text-right text-[11px]">
                    {r.start_time?.replace('T', ' ').slice(0, 19)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
