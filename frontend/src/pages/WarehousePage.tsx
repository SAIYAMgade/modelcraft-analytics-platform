import React, { useState } from 'react';
import { WarehouseTable } from '../types';
import { api } from '../services/api';
import { 
  Box, 
  Terminal, 
  Play, 
  Table as TableIcon, 
  Layers, 
  Code,
  Clock,
  Sparkles,
  RefreshCw,
  Database
} from 'lucide-react';

interface WarehousePageProps {
  tables: WarehouseTable[];
  loading: boolean;
  onRefresh: () => void;
}

export const WarehousePage: React.FC<WarehousePageProps> = ({
  tables,
  loading,
  onRefresh
}) => {
  const [selectedLayer, setSelectedLayer] = useState<'ALL' | 'Bronze' | 'Silver' | 'Gold'>('ALL');
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT category_name, COUNT(*) AS items, ROUND(SUM(item_price), 2) AS sales\nFROM fact_order_items i\nJOIN dim_products p ON i.product_id = p.product_id\nGROUP BY category_name\nORDER BY sales DESC\nLIMIT 10;'
  );
  const [queryResults, setQueryResults] = useState<{
    columns: string[];
    rows: any[][];
    execution_time_ms: number;
    returned_rows: number;
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const filteredTables = tables.filter(t => 
    selectedLayer === 'ALL' ? true : t.layer === selectedLayer
  );

  const currentTable = tables.find(t => t.table_name === activeTable) || filteredTables[0];

  const handleExecuteSql = async () => {
    try {
      setExecuting(true);
      setQueryError(null);
      const res = await api.executeSqlQuery(sqlQuery);
      setQueryResults(res);
    } catch (e: any) {
      setQueryError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const sampleQueries = [
    {
      title: 'Top Categories by Sales',
      sql: 'SELECT category_name, COUNT(*) AS items, ROUND(SUM(item_price), 2) AS sales\nFROM fact_order_items i\nJOIN dim_products p ON i.product_id = p.product_id\nGROUP BY category_name\nORDER BY sales DESC\nLIMIT 10;'
    },
    {
      title: 'Delivery Lead Days by State',
      sql: 'SELECT c.customer_state, COUNT(o.order_id) AS orders, ROUND(AVG(o.delivery_days), 1) AS avg_lead_days\nFROM fact_orders o\nJOIN dim_customers c ON o.customer_id = c.customer_id\nWHERE o.delivery_days IS NOT NULL\nGROUP BY c.customer_state\nORDER BY orders DESC\nLIMIT 10;'
    },
    {
      title: 'Payment Method Breakdown',
      sql: 'SELECT payment_type, COUNT(*) AS transactions, ROUND(SUM(payment_value), 2) AS total_amount\nFROM silver_order_payments\nGROUP BY payment_type\nORDER BY total_amount DESC;'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            <Database className="w-4 h-4 text-[#334155]" />
            <span>Storage & DuckDB Engine</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Warehouse & SQL Sandbox
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            DuckDB-powered columnar engine. Inspect tables, examine schemas, and execute audited, 
            read-only SQL queries against real transformed datasets.
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white p-1 rounded-lg shadow-sm text-xs">
          {(['ALL', 'Bronze', 'Silver', 'Gold'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setSelectedLayer(layer)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedLayer === layer
                  ? 'bg-[#334155] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Tables & Schema Inspector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table Selector List */}
        <div className="border border-[#E2E8F0] rounded-xl bg-white p-4 space-y-3 shadow-sm">
          <div className="text-xs uppercase text-[#172B4D] font-bold tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Warehouse Tables ({filteredTables.length})</span>
          </div>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredTables.map(t => {
              const isActive = (currentTable?.table_name === t.table_name);
              return (
                <button
                  key={t.table_name}
                  onClick={() => setActiveTable(t.table_name)}
                  className={`w-full text-left p-2.5 rounded-lg font-mono text-xs flex items-center justify-between border transition-all ${
                    isActive
                      ? 'border-[#334155] bg-slate-100/80 text-[#172B4D] font-bold shadow-sm'
                      : 'border-transparent hover:border-[#E2E8F0] hover:bg-slate-50 text-[#64748B]'
                  }`}
                >
                  <div className="truncate mr-2">{t.table_name}</div>
                  <div className="text-[10px] text-[#64748B] font-sans font-medium">{t.row_count.toLocaleString()} rows</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Table Schema Viewer */}
        <div className="md:col-span-2 border border-[#E2E8F0] rounded-xl bg-white p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                {currentTable?.layer} Layer Schema
              </div>
              <div className="font-mono text-base font-bold text-[#172B4D]">
                {currentTable?.table_name} <span className="text-xs font-normal text-[#64748B]">({currentTable?.row_count.toLocaleString()} rows)</span>
              </div>
            </div>
            <span className="text-xs font-mono bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-1 rounded text-[#334155] font-semibold">
              {currentTable?.columns.length} columns
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#172B4D] text-xs font-semibold">
                <tr>
                  <th className="py-2 px-3">Column Name</th>
                  <th className="py-2 px-3">Data Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono">
                {currentTable?.columns.map(c => (
                  <tr key={c.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-[#172B4D]">{c.name}</td>
                    <td className="py-2 px-3 text-[#64748B]">{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive SQL Query Sandbox */}
      <div className="border border-[#E2E8F0] rounded-xl bg-white p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#334155]" />
            <span className="text-xs font-bold uppercase text-[#172B4D] tracking-wider">
              Interactive Read-Only SQL Sandbox
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                onClick={() => setSqlQuery(sq.sql)}
                className="text-xs font-medium text-[#334155] hover:text-[#0F172A] border border-[#E2E8F0] hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors"
              >
                {sq.title}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={5}
            className="w-full bg-[#1E293B] border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-500 shadow-inner"
            placeholder="SELECT * FROM fact_orders LIMIT 10;"
          />
          <button
            onClick={handleExecuteSql}
            disabled={executing}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{executing ? 'Querying...' : 'Execute SQL'}</span>
          </button>
        </div>

        {queryError && (
          <div className="border border-rose-200 bg-rose-50 p-3.5 rounded-lg text-xs font-mono text-rose-800">
            Query Error: {queryError}
          </div>
        )}

        {/* Query Output Table */}
        {queryResults && (
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#F8FAFC] p-3 border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <div className="font-semibold text-[#172B4D]">
                Returned {queryResults.returned_rows} rows
              </div>
              <div className="flex items-center gap-1.5 text-[#334155] font-mono">
                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Execution: {queryResults.execution_time_ms} ms</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#172B4D] uppercase font-semibold">
                  <tr>
                    {queryResults.columns.map((col, idx) => (
                      <th key={idx} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {queryResults.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                      {row.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-[#334155]">
                          {typeof cell === 'number' ? cell.toLocaleString() : String(cell ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
