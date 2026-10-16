import React, { useState } from 'react';
import { QualityRule, QuarantineRecordItem } from '../types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  FileCode,
  Archive,
  Info,
  RefreshCw,
  X
} from 'lucide-react';

interface QualityPageProps {
  rules: QualityRule[];
  quarantine: QuarantineRecordItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const QualityPage: React.FC<QualityPageProps> = ({
  rules,
  quarantine,
  loading,
  onRefresh
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedQuarantine, setSelectedQuarantine] = useState<QuarantineRecordItem | null>(null);

  const categories = ['ALL', 'UNIQUENESS', 'COMPLETENESS', 'VALIDITY', 'INTEGRITY', 'RECONCILIATION'];

  const filteredRules = rules.filter(r => 
    filterCategory === 'ALL' ? true : r.rule_category === filterCategory
  );

  const passedCount = rules.filter(r => r.status === 'PASSED').length;
  const failedCount = rules.filter(r => r.status === 'FAILED').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Data Governance & Quality Guardrails</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Data Quality & Schema Assertions
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Automated schema tests evaluated on every pipeline run. Defective records are isolated into 
            quarantine for traceability rather than deleted.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="border border-[#E2E8F0] bg-white px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <span className="text-[#64748B] font-sans">PASSED:</span>
            <span className="text-emerald-700 font-bold">{passedCount}</span>
          </div>
          <div className="border border-[#E2E8F0] bg-white px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <span className="text-[#64748B] font-sans">FAILED:</span>
            <span className={`font-bold ${failedCount > 0 ? 'text-rose-600' : 'text-[#172B4D]'}`}>{failedCount}</span>
          </div>
          <div className="border border-[#E2E8F0] bg-white px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <span className="text-[#64748B] font-sans">QUARANTINED:</span>
            <span className="text-[#172B4D] font-bold">{quarantine.length}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#172B4D] hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            title="Refresh quality results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] pb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterCategory === cat
                ? 'bg-[#334155] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Rules Scorecard */}
      <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
              Quality Rules Scorecard ({filteredRules.length})
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {filteredRules.map((rule) => {
            const isPassed = rule.status === 'PASSED';
            return (
              <div key={rule.rule_id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                    <div>
                      <span className="font-mono text-xs text-[#64748B] mr-2">{rule.rule_id}</span>
                      <span className="font-semibold text-[#172B4D] text-sm">{rule.rule_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 rounded text-[#64748B] font-sans">
                      {rule.rule_category}
                    </span>
                    <span className="border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 rounded text-[#172B4D] font-mono">
                      Target: {rule.target_entity}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {rule.status} ({rule.records_failed} failed)
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#64748B] pl-7">
                  <span className="font-semibold text-[#172B4D]">Rationale: </span>
                  {rule.rationale}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quarantine Inspector */}
      <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
              Quarantine Storage Inspector ({quarantine.length} records)
            </span>
          </div>
          <div className="text-xs text-[#64748B]">
            Defective Records Policy: Isolated & Audit Preserved
          </div>
        </div>

        {quarantine.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No defective records currently quarantined. Pipeline data passed all strict integrity gates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#172B4D] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Record Identifier</th>
                  <th className="py-2.5 px-4">Violated Rule</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4 text-right">Raw Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono">
                {quarantine.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#172B4D]">{q.entity_name}</td>
                    <td className="py-3 px-4 text-[#334155]">{q.record_identifier}</td>
                    <td className="py-3 px-4 text-[#64748B]">{q.violated_rule}</td>
                    <td className="py-3 px-4 text-[#334155] font-sans">{q.reason}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedQuarantine(q)}
                        className="text-[#334155] hover:text-[#0F172A] inline-flex items-center gap-1 font-semibold"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Payload Modal */}
      {selectedQuarantine && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="font-mono text-sm font-bold text-[#172B4D]">
                Quarantined Payload: {selectedQuarantine.record_identifier}
              </div>
              <button 
                onClick={() => setSelectedQuarantine(null)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#64748B] space-y-1">
              <div><strong className="text-[#172B4D]">Rule:</strong> {selectedQuarantine.violated_rule}</div>
              <div><strong className="text-[#172B4D]">Reason:</strong> {selectedQuarantine.reason}</div>
            </div>
            <pre className="p-4 border border-slate-700 bg-[#1E293B] rounded-lg text-xs font-mono text-slate-200 overflow-x-auto max-h-60">
              {JSON.stringify(selectedQuarantine.raw_payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
