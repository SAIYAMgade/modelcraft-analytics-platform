import React from 'react';
import { 
  Database, 
  Workflow, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  Code2,
  Table,
  Cpu
} from 'lucide-react';
import { PageId } from '../components/Sidebar';

interface GettingStartedPageProps {
  onNavigate: (page: PageId) => void;
}

export const GettingStartedPage: React.FC<GettingStartedPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Analytics Engineering Guide</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
          Getting Started with ModelCraft
        </h1>
        <p className="text-base text-[#64748B] mt-2 max-w-3xl leading-relaxed">
          Analytics engineering sits between data engineering and data analysis. We take raw, uncurated commerce events from disparate sources and transform them into clean, tested, documented dimensional models ready for BI reporting.
        </p>
      </div>

      {/* 4-Step Pipeline Journey Cards */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#172B4D]">The 4-Step Analytical Journey</h2>
          <p className="text-sm text-[#64748B]">Click on any stage to jump directly into the live studio tool.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 w-full bg-slate-300 group-hover:bg-slate-700 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#334155]">
                Step 01
              </span>
              <Database className="w-5 h-5 text-[#64748B]" />
            </div>
            <h3 className="text-xl font-bold text-[#172B4D] mb-2">
              1. Raw Sources & Extraction
            </h3>
            <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
              Messy commerce data lands in raw formats (CSV, JSON events, PDF invoices, and third-party API payloads). Raw data is loaded into the warehouse without heavy transformations to maintain an immutable audit trail.
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1.5 mb-5 font-mono text-[#334155]">
              <div className="flex items-center justify-between">
                <span>raw_orders (CSV)</span>
                <span className="text-emerald-700 font-semibold">10,000 rows</span>
              </div>
              <div className="flex items-center justify-between">
                <span>raw_customers (JSON)</span>
                <span className="text-emerald-700 font-semibold">5,000 rows</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('sources')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155] hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all"
            >
              <span>Inspect Raw Data Sources</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 w-full bg-blue-300 group-hover:bg-blue-600 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Step 02
              </span>
              <Code2 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-[#172B4D] mb-2">
              2. Staging & Normalization
            </h3>
            <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
              Staging models (prefixed with <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-xs font-mono text-[#172B4D]">stg_</code>) clean column naming, cast data types (e.g. timestamps and decimal currencies), standardize null values, and apply light filtering.
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1.5 mb-5 font-mono text-[#334155]">
              <div className="text-[#64748B]">// dbt SQL Staging rule:</div>
              <div>SELECT CAST(order_id AS VARCHAR) AS order_id,</div>
              <div>&nbsp;&nbsp;COALESCE(status, &apos;unknown&apos;) AS order_status</div>
            </div>
            <button
              onClick={() => onNavigate('models')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155] hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all"
            >
              <span>Explore Staging SQL Models</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 w-full bg-purple-300 group-hover:bg-purple-600 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Step 03
              </span>
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-[#172B4D] mb-2">
              3. Dimensional Modeling (Star Schema)
            </h3>
            <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
              We separate measurements from business contexts using Kimball dimensional design. Numerical events live in Fact tables (<code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-xs font-mono text-[#172B4D]">fact_orders</code>), connected via Foreign Keys to descriptive Dimension tables (<code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-xs font-mono text-[#172B4D]">dim_customers</code>).
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1.5 mb-5 font-mono text-[#334155]">
              <div className="flex items-center justify-between">
                <span>Grain: 1 row per order</span>
                <span className="text-purple-700 font-semibold">Primary Key: order_id</span>
              </div>
              <div className="text-[#64748B]">Surrogate Keys: customer_key, seller_key</div>
            </div>
            <button
              onClick={() => onNavigate('schema')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155] hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all"
            >
              <span>Open Interactive Star Schema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 h-1 w-full bg-emerald-300 group-hover:bg-emerald-600 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Step 04
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-[#172B4D] mb-2">
              4. Automated Testing & Commercial Marts
            </h3>
            <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
              Every build executes automated assertions: uniqueness, not_null, referential integrity, and source-to-warehouse reconciliation. Verified models feed downstream commercial marts for executive dashboards and customer segmentation.
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1.5 mb-5 font-mono text-[#334155]">
              <div className="flex items-center justify-between">
                <span>Quality Tests Passing</span>
                <span className="text-emerald-700 font-semibold">28 / 28 Passed</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Warehouse Variance</span>
                <span className="text-emerald-700 font-semibold">0.00% (Reconciled)</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('quality')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155] hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all"
            >
              <span>View Data Quality & Tests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Terminology Glossary for Beginners */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#334155]" />
          <h2 className="text-lg font-bold text-[#172B4D]">Key Analytics Engineering Terminology</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Model Grain</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              The atomic level of detail represented by a single row in a table. In <code className="font-mono text-[#334155]">fact_orders</code>, the grain is exactly <em>one completed order</em>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Fact Table</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Contains quantitative numerical measurements (prices, quantities, discounts, durations) resulting from business events. Facts have foreign keys pointing to dimensions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Dimension Table</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Contains descriptive attributes (who, what, where, when) used to slice, filter, and group facts—such as customer names, product categories, or date quarters.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Surrogate Key</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              A synthetic primary key (often a hash of natural keys) generated within the data warehouse to protect against upstream system changes and track slowly changing dimensions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Data Lineage (DAG)</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              A Directed Acyclic Graph showing the complete dependency chain from raw ingested sources through staging and transformations into final marts.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#172B4D] mb-1">Source Reconciliation</div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Mathematical verification ensuring total records and financial sums in the warehouse match the raw source extractions with zero undetected data loss.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch Banner */}
      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-[#172B4D]">Ready to trace your first model?</h3>
          <p className="text-sm text-[#64748B] mt-1">
            Follow a single commerce transaction from its raw CSV extraction all the way to customer lifetime value.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('flow')}
            className="px-5 py-2.5 bg-[#334155] text-white text-sm font-semibold rounded-lg hover:bg-[#1E293B] shadow-sm transition-colors"
          >
            Follow the Data
          </button>
          <button
            onClick={() => onNavigate('schema')}
            className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#172B4D] text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Explore Star Schema
          </button>
        </div>
      </div>
    </div>
  );
};
