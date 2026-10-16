import React, { useState } from 'react';
import { PipelineRunItem } from '../types';
import { api } from '../services/api';
import { 
  GitBranch, 
  Play, 
  RotateCcw, 
  Bug, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  AlertOctagon,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface PipelinesPageProps {
  runs: PipelineRunItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const PipelinesPage: React.FC<PipelinesPageProps> = ({
  runs,
  loading,
  onRefresh
}) => {
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleRunPipeline = async (injectFailure: boolean = false) => {
    try {
      setRunning(true);
      setActionMessage(injectFailure ? 'Injecting controlled failure into pipeline...' : 'Executing full ELT pipeline...');
      const res = await api.runPipeline(injectFailure);
      setActionMessage(`Pipeline execution finished with status: ${res.status} (${res.duration_ms}ms)`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Execution error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRecover = async (runId: string) => {
    try {
      setRunning(true);
      setActionMessage(`Attempting idempotent recovery for ${runId}...`);
      const res = await api.recoverPipeline(runId);
      setActionMessage(`Recovery finished! New run: ${res.new_run_id} (${res.recovery_status})`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Recovery failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const selectedRun = runs.find(r => r.run_id === selectedRunId) || runs[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            Orchestration & Lineage
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Pipeline Explorer & DAG Execution
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Inspect execution steps, task durations, idempotency guarantees, and controlled recovery workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRunPipeline(true)}
            disabled={running}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-200 text-xs font-mono rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Controlled failure injection for testing recovery resilience"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Inject Test Failure</span>
          </button>

          <button
            onClick={() => handleRunPipeline(false)}
            disabled={running}
            className="flex items-center space-x-2 px-3.5 py-1.5 border border-white bg-white text-black text-xs font-mono font-semibold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{running ? 'Executing...' : 'Run Full Pipeline'}</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="border border-neutral-700 bg-neutral-900 p-3 rounded text-xs font-mono text-neutral-200 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Interactive Visual DAG Diagram */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold uppercase text-white tracking-wider">
              Pipeline Directed Acyclic Graph (DAG)
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Pipeline: olist_ecommerce_elt
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Step 1 */}
          <div className="border border-neutral-800 bg-black p-4 rounded relative">
            <div className="text-[10px] font-mono text-neutral-400 uppercase">Step 01</div>
            <div className="text-sm font-semibold text-white mt-1">Bronze Ingestion</div>
            <div className="text-[11px] text-neutral-400 mt-1">Preserve 8 raw CSVs</div>
            <div className="mt-3 text-[10px] font-mono border-t border-neutral-900 pt-2 text-neutral-400">
              550k+ raw records
            </div>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-neutral-600">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="border border-neutral-800 bg-black p-4 rounded relative">
            <div className="text-[10px] font-mono text-neutral-400 uppercase">Step 02</div>
            <div className="text-sm font-semibold text-white mt-1">Silver Cleansing</div>
            <div className="text-[11px] text-neutral-400 mt-1">Type casting & quarantine</div>
            <div className="mt-3 text-[10px] font-mono border-t border-neutral-900 pt-2 text-neutral-400">
              Isolates defective rows
            </div>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-neutral-600">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="border border-neutral-800 bg-black p-4 rounded relative">
            <div className="text-[10px] font-mono text-neutral-400 uppercase">Step 03</div>
            <div className="text-sm font-semibold text-white mt-1">Gold Star Schema</div>
            <div className="text-[11px] text-neutral-400 mt-1">Facts, dims & marts</div>
            <div className="mt-3 text-[10px] font-mono border-t border-neutral-900 pt-2 text-neutral-400">
              fact_orders (99.4k rows)
            </div>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-neutral-600">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="border border-neutral-800 bg-black p-4 rounded">
            <div className="text-[10px] font-mono text-neutral-400 uppercase">Step 04</div>
            <div className="text-sm font-semibold text-white mt-1">Quality Verification</div>
            <div className="text-[11px] text-neutral-400 mt-1">10 automated checks</div>
            <div className="mt-3 text-[10px] font-mono border-t border-neutral-900 pt-2 text-neutral-400">
              Completeness, Uniqueness
            </div>
          </div>
        </div>
      </div>

      {/* Execution Run History */}
      <div className="border border-neutral-800 rounded bg-neutral-950 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
              Execution Run History ({runs.length})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-neutral-300">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-[11px] text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Run Identifier</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Records In / Out</th>
                <th className="py-3 px-4">Executed At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {runs.map((r) => {
                const isSelected = selectedRunId === r.run_id;
                const isFailed = r.status === 'FAILED';
                return (
                  <React.Fragment key={r.run_id}>
                    <tr className={`hover:bg-neutral-900/40 transition-colors ${isSelected ? 'bg-neutral-900/50' : ''}`}>
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedRunId(isSelected ? null : r.run_id)}
                            className="text-neutral-400 hover:text-white"
                          >
                            {isSelected ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <span>{r.run_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-400">{r.trigger_type}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                          r.status === 'COMPLETED'
                            ? 'border-neutral-700 bg-neutral-900 text-neutral-200'
                            : 'border-white text-white font-bold bg-black'
                        }`}>
                          {r.status === 'COMPLETED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-200">{r.duration_ms} ms</td>
                      <td className="py-3 px-4 text-neutral-300">
                        {r.records_in.toLocaleString()} / {r.records_out.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 text-[11px]">
                        {r.start_time?.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isFailed && (
                          <button
                            onClick={() => handleRecover(r.run_id)}
                            className="inline-flex items-center space-x-1 px-2 py-1 border border-neutral-600 rounded hover:bg-neutral-800 text-[11px] text-white"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Recover</span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Step Details */}
                    {isSelected && (
                      <tr className="bg-neutral-900/60 border-y border-neutral-800">
                        <td colSpan={7} className="p-4 space-y-3">
                          <div className="font-semibold text-white text-xs mb-2">
                            Step Execution Breakdown for {r.run_id}
                          </div>

                          {r.error_message && (
                            <div className="p-3 border border-neutral-700 bg-black text-neutral-200 rounded text-xs font-mono">
                              <div className="text-white font-bold mb-1 flex items-center space-x-1">
                                <AlertOctagon className="w-3.5 h-3.5" />
                                <span>Failure Diagnostic:</span>
                              </div>
                              <pre className="text-[11px] whitespace-pre-wrap">{r.error_message}</pre>
                            </div>
                          )}

                          <div className="space-y-2">
                            {r.execution_steps?.map((step, idx) => (
                              <div 
                                key={idx} 
                                className="border border-neutral-800 bg-black p-3 rounded flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-white">
                                    [{step.layer}] {step.step_name}
                                  </div>
                                  <div className="text-neutral-400 text-[11px]">{step.details}</div>
                                </div>
                                <div className="text-right font-mono text-[11px] text-neutral-400">
                                  <div>{step.status}</div>
                                  <div>{step.duration_ms} ms</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
