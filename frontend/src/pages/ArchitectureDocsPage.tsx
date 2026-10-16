import React from 'react';
import { 
  Layers, 
  Database, 
  Cpu, 
  GitBranch, 
  CheckCircle2, 
  ShieldCheck, 
  FileCode2, 
  ExternalLink,
  BookOpen,
  ArrowRight,
  Server,
  Zap,
  BarChart3
} from 'lucide-react';
import { PageId } from '../components/Sidebar';

interface ArchitectureDocsPageProps {
  onNavigate?: (page: PageId) => void;
}

export const ArchitectureDocsPage: React.FC<ArchitectureDocsPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
          <Cpu className="w-4 h-4 text-[#334155]" />
          <span>Technical Whitepaper & Design Specifications</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
          Platform Architecture & Engineering Standards
        </h1>
        <p className="text-base text-[#64748B] mt-2 max-w-3xl leading-relaxed">
          ModelCraft adheres to Ralph Kimball&apos;s dimensional modeling doctrine, modern dbt transformation conventions, and in-process OLAP execution via DuckDB. Below is an engineering overview of our design patterns, idempotency guarantees, and data pipelines.
        </p>
      </div>

      {/* High-Level Architecture Diagram Grid */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#172B4D] mb-4">Architecture Stack Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Layer 01</span>
              <Database className="w-4 h-4 text-slate-600" />
            </div>
            <div className="font-bold text-[#172B4D] text-sm">Storage & In-Process OLAP</div>
            <p className="text-xs text-[#64748B] mt-1">
              DuckDB embedded engine for fast columnar analytics, zero-copy Parquet reads, and ACID transactions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Layer 02</span>
              <FileCode2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="font-bold text-[#172B4D] text-sm">Transformation Engine</div>
            <p className="text-xs text-[#64748B] mt-1">
              dbt Core paradigms: modular staging, dimensional marts, Jinja macro templating, and manifest DAG compilation.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Layer 03</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-bold text-[#172B4D] text-sm">Testing & Reconciliation</div>
            <p className="text-xs text-[#64748B] mt-1">
              Automated schema tests (unique, not_null, relationships) and mathematical reconciliation audits.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Layer 04</span>
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="font-bold text-[#172B4D] text-sm">Consumer Marts & BI</div>
            <p className="text-xs text-[#64748B] mt-1">
              Star schema marts optimized for BI self-service, cohort retention matrices, and executive KPI reports.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Kimball Dimensional Modeling */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-[#172B4D]">1. Kimball Dimensional Modeling Philosophy</h2>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Instead of exposing wide denormalized tables or messy 3NF relational schemas to business analysts, we structure data into a strict <strong>Star Schema</strong>. This minimizes query joins for end users, eliminates aggregation fanout traps, and standardizes metric definitions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="font-semibold text-sm text-[#172B4D] mb-1">Atomic Fact Tables (Measurement Events)</div>
            <ul className="text-xs text-[#64748B] space-y-1.5 list-disc pl-4">
              <li><strong>fact_orders</strong>: Grain is one order placed by a customer. Measures total order value, shipping fees, tax, and order item counts.</li>
              <li><strong>fact_order_items</strong>: Grain is one line-item inside an order. Measures unit price, discount amount, and quantity.</li>
              <li>Contains foreign keys pointing exclusively to conformed dimensions.</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="font-semibold text-sm text-[#172B4D] mb-1">Conformed Dimensions (Context & Slicing)</div>
            <ul className="text-xs text-[#64748B] space-y-1.5 list-disc pl-4">
              <li><strong>dim_customers</strong>: Customer demographics, city, state, and first-order cohort tags.</li>
              <li><strong>dim_products</strong>: SKU, category, manufacturer, and retail pricing tiers.</li>
              <li><strong>dim_date</strong>: Pre-computed calendar dates with quarters, fiscal periods, and weekend flags.</li>
              <li><strong>dim_sellers</strong>: Merchant profiles, performance ratings, and fulfillment warehouses.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: Preventing Fanout Traps */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-bold text-[#172B4D]">2. Anti-Fanout Architecture & Grain Protection</h2>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          One of the most dangerous bugs in analytics engineering is <strong>join fanout</strong>, where joining a parent table (<code className="font-mono text-xs text-[#334155]">orders</code>) to a child table (<code className="font-mono text-xs text-[#334155]">order_items</code>) duplicates order values when computing metrics like GMV.
        </p>
        <div className="bg-[#1E293B] text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <div className="text-emerald-400">// Correct: Aggregate items to order grain BEFORE joining, or keep facts separate</div>
          <div className="text-slate-300 mt-1">
            WITH aggregated_items AS (<br/>
            &nbsp;&nbsp;SELECT order_id, SUM(item_price) AS items_total_revenue, COUNT(*) AS total_items<br/>
            &nbsp;&nbsp;FROM &#123;&#123; ref(&apos;stg_order_items&apos;) &#125;&#125;<br/>
            &nbsp;&nbsp;GROUP BY order_id<br/>
            )<br/>
            SELECT<br/>
            &nbsp;&nbsp;o.order_id,<br/>
            &nbsp;&nbsp;o.customer_id,<br/>
            &nbsp;&nbsp;o.order_total_amount,   -- Uncorrupted order level measure<br/>
            &nbsp;&nbsp;COALESCE(i.total_items, 0) AS total_items<br/>
            FROM &#123;&#123; ref(&apos;stg_orders&apos;) &#125;&#125; o<br/>
            LEFT JOIN aggregated_items i ON o.order_id = i.order_id;
          </div>
        </div>
      </div>

      {/* Section 3: Slowly Changing Dimensions (SCD Type 2) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-[#172B4D]">3. Historical Tracking (SCD Type 2 Snapshots)</h2>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          When customers update their delivery address or sellers change tiers, overwriting records (SCD Type 1) corrupts historical regional reporting. ModelCraft supports SCD Type 2 snapshotting to preserve temporal truth using validity windows (<code className="font-mono text-xs text-[#334155]">valid_from</code> and <code className="font-mono text-xs text-[#334155]">valid_to</code>).
        </p>
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#172B4D]">
              <tr>
                <th className="px-4 py-2.5">customer_key (SK)</th>
                <th className="px-4 py-2.5">customer_id</th>
                <th className="px-4 py-2.5">city</th>
                <th className="px-4 py-2.5">valid_from</th>
                <th className="px-4 py-2.5">valid_to</th>
                <th className="px-4 py-2.5">is_current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[#334155]">
              <tr className="bg-white">
                <td className="px-4 py-2">c_901a_v1</td>
                <td className="px-4 py-2">CUST-1042</td>
                <td className="px-4 py-2">San Francisco</td>
                <td className="px-4 py-2 text-[#64748B]">2023-01-15</td>
                <td className="px-4 py-2 text-[#64748B]">2023-11-20</td>
                <td className="px-4 py-2 text-rose-600 font-semibold">false</td>
              </tr>
              <tr className="bg-emerald-50/50">
                <td className="px-4 py-2 font-semibold">c_901a_v2</td>
                <td className="px-4 py-2">CUST-1042</td>
                <td className="px-4 py-2 font-semibold">Seattle</td>
                <td className="px-4 py-2 text-[#64748B]">2023-11-20</td>
                <td className="px-4 py-2 text-[#64748B]">9999-12-31</td>
                <td className="px-4 py-2 text-emerald-700 font-semibold">true</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Testing & Reconciliation Protocol */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-[#172B4D]">4. Data Quality & Reconciliation Matrix</h2>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Reliability is guaranteed via automated assertions evaluated at every pipeline run. If an assertion fails, contaminated records are automatically routed to quarantine tables, preventing corrupt data from entering executive dashboards.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Uniqueness Tests</div>
            <div className="text-sm font-semibold text-[#172B4D] mb-1">Primary Key Uniqueness</div>
            <p className="text-xs text-[#64748B]">
              Ensures zero duplicate keys in <code className="font-mono text-[#334155]">order_id</code>, <code className="font-mono text-[#334155]">customer_key</code>, and <code className="font-mono text-[#334155]">product_key</code>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Referential Integrity</div>
            <div className="text-sm font-semibold text-[#172B4D] mb-1">Foreign Key Validation</div>
            <p className="text-xs text-[#64748B]">
              Ensures every foreign key in fact tables resolves to a valid record in the corresponding dimension table.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Reconciliation</div>
            <div className="text-sm font-semibold text-[#172B4D] mb-1">Financial Reconciliation</div>
            <p className="text-xs text-[#64748B]">
              Verifies: <code className="font-mono text-[#334155]">SUM(raw.payment_value) == SUM(fact.revenue)</code> with a maximum allowable variance of 0.00%.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      {onNavigate && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
          <div>
            <div className="font-bold text-[#172B4D]">Explore Live Artifacts</div>
            <div className="text-xs text-[#64748B] mt-0.5">Test our architecture against actual models and automated reconciliation.</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('schema')}
              className="px-4 py-2 bg-[#334155] text-white text-xs font-semibold rounded-lg hover:bg-[#1E293B] transition-colors"
            >
              Star Schema Explorer
            </button>
            <button
              onClick={() => onNavigate('reconciliation')}
              className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#172B4D] text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reconciliation Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
