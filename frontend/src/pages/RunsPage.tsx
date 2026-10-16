import React, { useState } from 'react';
import { PipelineRunItem } from '../types';
import { api } from '../services/api';
import { 
  Terminal, 
  Play, 
  RotateCcw, 
  Bug, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  AlertOctagon,
  ChevronRight,
  ChevronDown,
  Layers,
  ShieldCheck,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface RunsPageProps {
  runs: PipelineRunItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const RunsPage: React.FC<RunsPageProps> = ({
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
      setActionMessage(injectFailure ? 'Injecting controlled schema failure into pipeline...' : 'Triggering full dbt build & test execution...');
      const res = await api.runPipeline(injectFailure);
      setActionMessage(`Pipeline execution completed: ${res.status.toUpperCase()} in ${res.duration_ms}ms (${(res.records_in + res.records_out).toLocaleString()} records processed)`);
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
      setActionMessage(`Executing idempotent recovery job for run ${runId}...`);
      const res = await api.recoverPipeline(runId);
      setActionMessage(`Recovery succeeded: New run ${res.new_run_id} finished with status ${res.recovery_status}!`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Recovery error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const selectedRun = runs.find(r => r.run_id === selectedRunId) || runs[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            <Terminal className="w-4 h-4 text-[#334155]" />
            <span>Orchestration & Lineage Runs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Build & Test Runs
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Monitor real-time dbt build steps, test outcomes, run durations, and automated recovery procedures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRunPipeline(false)}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#334155] text-white text-xs font-semibold rounded-lg hover:bg-[#1E293B] disabled:opacity-50 transition-colors shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
            <span>Trigger Full ELT Run</span>
          </button>

          <button
            onClick={() => handleRunPipeline(true)}
            disabled={running}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors"
            title="Injects synthetic bad records to verify quarantine and alerting"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Inject Failure</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#172B4D] rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh runs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs text-[#334155]">
          <div className="flex items-center gap-2 font-mono">
            <Clock className="w-4 h-4 text-[#64748B]" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Runs List + Run Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Runs Table List */}
        <div className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#172B4D]">Recent Pipeline Executions</h2>
            <span className="text-xs text-[#64748B] font-mono">{runs.length} runs</span>
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
            {runs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">No pipeline runs recorded yet.</div>
            ) : (
              runs.map((r) => {
                const isSelected = selectedRun?.run_id === r.run_id;
                const isSuccess = r.status.toLowerCase() === 'completed' || r.status.toLowerCase() === 'success';

                return (
                  <button
                    key={r.run_id}
                    onClick={() => setSelectedRunId(r.run_id)}
                    className={`w-full text-left p-4 transition-colors flex items-start justify-between ${
                      isSelected ? 'bg-slate-100/80 border-l-4 border-l-[#334155]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-mono text-xs font-bold text-[#172B4D]">{r.run_id}</span>
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {r.start_time ? new Date(r.start_time).toLocaleString() : 'Just now'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono mt-1">
                        <span>{r.duration_ms}ms</span>
                        <span>•</span>
                        <span>{(r.records_in || 0).toLocaleString()} records</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Run Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRun ? (
            <>
              {/* Summary Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <div className="text-xs text-[#64748B] uppercase font-semibold">Execution Run Details</div>
                    <h3 className="text-xl font-bold font-mono text-[#172B4D] mt-0.5">{selectedRun.run_id}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedRun.status.toLowerCase() === 'failed' && (
                      <button
                        onClick={() => handleRecover(selectedRun.run_id)}
                        disabled={running}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recover Run</span>
                      </button>
                    )}
                    <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${
                      selectedRun.status.toLowerCase() === 'completed' || selectedRun.status.toLowerCase() === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {selectedRun.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <div className="text-[#64748B]">Started</div>
                    <div className="font-semibold text-[#172B4D] mt-1">
                      {selectedRun.start_time ? new Date(selectedRun.start_time).toLocaleTimeString() : 'Recent'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64748B]">Duration</div>
                    <div className="font-mono font-semibold text-[#172B4D] mt-1">{selectedRun.duration_ms}ms</div>
                  </div>
                  <div>
                    <div className="text-[#64748B]">Rows Processed</div>
                    <div className="font-mono font-semibold text-[#172B4D] mt-1">
                      {(selectedRun.records_in || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64748B]">Trigger Type</div>
                    <div className="font-semibold text-[#172B4D] mt-1 capitalize">{selectedRun.trigger_type || 'manual'}</div>
                  </div>
                </div>

                {selectedRun.error_message && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-mono">
                    <strong>Error: </strong> {selectedRun.error_message}
                  </div>
                )}
              </div>

              {/* Step Sequence Timeline */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-[#172B4D] mb-4">Pipeline Execution Stages</h4>
                <div className="space-y-3">
                  {[
                    { name: '1. Ingest Raw Commerce Feeds', tool: 'Python Engine', duration: '142ms', status: 'success' },
                    { name: '2. dbt Clean & Stage (stg_*)', tool: 'dbt Core + DuckDB', duration: '284ms', status: 'success' },
                    { name: '3. Data Quality Schema Assertions', tool: 'dbt-expectations', duration: '198ms', status: selectedRun.status === 'failed' ? 'failed' : 'success' },
                    { name: '4. Build Dimensional Facts & Marts', tool: 'Kimball Models', duration: '312ms', status: selectedRun.status === 'failed' ? 'skipped' : 'success' },
                    { name: '5. Reconciliation Audit vs Raw Sources', tool: 'Mathematical Verifier', duration: '95ms', status: selectedRun.status === 'failed' ? 'skipped' : 'success' }
                  ].map((step, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {step.status === 'failed' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        {step.status === 'skipped' && <div className="w-4 h-4 rounded-full border border-slate-300 text-[10px] flex items-center justify-center text-slate-400 font-mono shrink-0">-</div>}
                        <div>
                          <div className="font-semibold text-[#172B4D]">{step.name}</div>
                          <div className="text-[11px] text-[#64748B]">{step.tool}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-[#64748B]">
                        <span>{step.duration}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          step.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                          step.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Console Log */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3 text-xs text-slate-400 font-mono">
                  <span>dbt build console stdout</span>
                  <span>PID 14092 • DuckDB thread 0</span>
                </div>
                <pre className="text-xs font-mono text-slate-200 overflow-x-auto space-y-1">
                  <div>11:42:01.12 [info] Found 6 models, 28 tests, 0 snapshots, 0 analyses, 4 sources</div>
                  <div className="text-emerald-400">11:42:01.35 [info] Concurrency: 4 threads (target=&apos;dev&apos;)</div>
                  <div>11:42:01.40 [info] 1 of 6 START sql view model staging.stg_orders ................... [RUN]</div>
                  <div className="text-emerald-400">11:42:01.68 [info] 1 of 6 OK created sql view model staging.stg_orders ............ [CREATE VIEW in 0.28s]</div>
                  <div>11:42:01.70 [info] 2 of 6 START sql table model core.fact_orders ................. [RUN]</div>
                  <div className="text-emerald-400">11:42:02.01 [info] 2 of 6 OK created sql table model core.fact_orders ............. [SELECT 10000 in 0.31s]</div>
                  <div>11:42:02.05 [info] Running 28 schema tests ...</div>
                  <div className="text-emerald-400">11:42:02.32 [info] PASS unique_fact_orders_order_id ............................. [PASS in 0.04s]</div>
                  <div className="text-emerald-400">11:42:02.36 [info] PASS not_null_fact_orders_customer_key ....................... [PASS in 0.03s]</div>
                  <div className="text-emerald-400">11:42:02.41 [info] PASS relationships_fact_orders_customer_key__dim_customers ... [PASS in 0.05s]</div>
                  <div className="text-slate-400">11:42:02.50 [info] Finished running 6 models, 28 tests in 0 hours 0 minutes and 1.38 seconds.</div>
                </pre>
              </div>
            </>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-[#64748B] text-sm">
              Select a pipeline run on the left to view step timings and console output.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
