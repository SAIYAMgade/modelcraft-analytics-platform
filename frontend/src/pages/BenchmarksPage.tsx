import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BenchmarkItem } from '../types';
import { 
  Cpu, 
  Play, 
  Clock, 
  TrendingUp, 
  Server, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

export const BenchmarksPage: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      setLoading(true);
      const data = await api.getBenchmarkHistory();
      setBenchmarks(data);
    } catch (e) {
      console.error('Error loading benchmark history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    try {
      setRunning(true);
      setMessage('Executing real OLAP workload queries on DuckDB...');
      const res = await api.runBenchmark();
      setMessage(`Benchmark completed! Throughput: ${res.throughput_rec_sec.toLocaleString()} rec/sec, P50: ${res.query_p50_ms}ms`);
      loadBenchmarks();
    } catch (e: any) {
      setMessage(`Benchmark failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const latest = benchmarks[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            Empirical Performance & Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Reproducible Benchmarks
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Real workload benchmarks executed on the physical DuckDB analytical warehouse. 
            Measures query latencies, throughput, and system resource specifications.
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={running}
          className="flex items-center space-x-2 px-3.5 py-1.5 border border-white bg-white text-black font-mono text-xs font-semibold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{running ? 'Running Suite...' : 'Execute Benchmark Suite'}</span>
        </button>
      </div>

      {message && (
        <div className="border border-neutral-700 bg-neutral-900 p-3 rounded text-xs font-mono text-neutral-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Latest Benchmark KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Query P50 Latency</div>
          <div className="text-2xl font-bold text-white">
            {latest ? `${latest.query_p50_ms} ms` : 'Not measured'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Median query runtime</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Query P95 Latency</div>
          <div className="text-2xl font-bold text-white">
            {latest ? `${latest.query_p95_ms} ms` : 'Not measured'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">95th percentile latency</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Analytical Throughput</div>
          <div className="text-2xl font-bold text-white">
            {latest ? `${latest.throughput_rec_sec.toLocaleString()} rec/s` : 'Not measured'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">DuckDB vectorized scanning</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs uppercase mb-1">Evaluated Records</div>
          <div className="text-2xl font-bold text-white">
            {latest ? latest.dataset_records.toLocaleString() : 'Not measured'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Fact orders + items rows</div>
        </div>
      </div>

      {/* Hardware & Runtime Environment Specifications */}
      {latest?.environment_specs && (
        <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold uppercase text-white tracking-wider">
              Host Environment & Hardware Specifications
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="border border-neutral-800 p-3 rounded bg-black">
              <div className="text-neutral-400 text-[10px] uppercase">Operating System</div>
              <div className="text-white font-semibold mt-1">{latest.environment_specs.os}</div>
            </div>
            <div className="border border-neutral-800 p-3 rounded bg-black">
              <div className="text-neutral-400 text-[10px] uppercase">Python Runtime</div>
              <div className="text-white font-semibold mt-1">Python {latest.environment_specs.python_version}</div>
            </div>
            <div className="border border-neutral-800 p-3 rounded bg-black">
              <div className="text-neutral-400 text-[10px] uppercase">DuckDB Version</div>
              <div className="text-white font-semibold mt-1">v{latest.environment_specs.duckdb_version}</div>
            </div>
            <div className="border border-neutral-800 p-3 rounded bg-black">
              <div className="text-neutral-400 text-[10px] uppercase">CPU Cores Available</div>
              <div className="text-white font-semibold mt-1">{latest.environment_specs.cpu_count} Physical/Logical Cores</div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Benchmark Runs Table */}
      <div className="border border-neutral-800 rounded bg-neutral-950 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
              Benchmark Execution History ({benchmarks.length})
            </span>
          </div>
        </div>

        {benchmarks.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-400">
            No benchmarks executed yet. Click "Execute Benchmark Suite" to evaluate live performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-neutral-300">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Run Identifier</th>
                  <th className="py-2.5 px-4">Workload Suite</th>
                  <th className="py-2.5 px-4">Total Time</th>
                  <th className="py-2.5 px-4">Throughput</th>
                  <th className="py-2.5 px-4">P50 Latency</th>
                  <th className="py-2.5 px-4">P95 Latency</th>
                  <th className="py-2.5 px-4 text-right">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {benchmarks.map((b) => (
                  <tr key={b.run_id} className="hover:bg-neutral-900/40">
                    <td className="py-2.5 px-4 font-semibold text-white">{b.run_id}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{b.workload_type}</td>
                    <td className="py-2.5 px-4 text-white font-bold">{b.execution_time_ms} ms</td>
                    <td className="py-2.5 px-4 text-neutral-200">{b.throughput_rec_sec.toLocaleString()} rec/s</td>
                    <td className="py-2.5 px-4 text-neutral-300">{b.query_p50_ms} ms</td>
                    <td className="py-2.5 px-4 text-neutral-300">{b.query_p95_ms} ms</td>
                    <td className="py-2.5 px-4 text-neutral-400 text-right text-[11px]">
                      {b.executed_at?.replace('T', ' ').slice(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
