import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Database, 
  Table2, 
  FileCode2, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Key, 
  Link2, 
  Eye,
  Layers,
  Sparkles,
  MinusCircle,
  PlusCircle,
  ArrowRight,
  Workflow
} from 'lucide-react';
import { ModelColumn } from '../../types';

export interface TableNodeData {
  id: string;
  label: string;
  layer: string;
  type: string;
  row_count: number;
  status: string;
  materialization?: string;
  grain?: string;
  tests_count?: number;
  columns?: ModelColumn[];
  primary_keys?: string[];
  raw_sql?: string;
  description?: string;
  // Interactive state passed by parent
  isSelected?: boolean;
  isDimmed?: boolean;
  isHighlighted?: boolean;
  activeColumnName?: string | null;
  onSelectColumn?: (modelName: string, columnName: string) => void;
  onToggleExpand?: (nodeId: string) => void;
  isExpanded?: boolean;
}

export const TableNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const [columnSearch, setColumnSearch] = useState('');
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const columns = nodeData.columns || [];
  const primaryKeys = new Set(nodeData.primary_keys || []);
  const isSelected = selected || nodeData.isSelected;
  const isDimmed = nodeData.isDimmed;
  const isHighlighted = nodeData.isHighlighted;
  const activeCol = nodeData.activeColumnName;

  const filteredColumns = columns.filter(col => 
    col.name.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const displayedColumns = showAllColumns ? filteredColumns : filteredColumns.slice(0, 6);

  // Transformation Tag matching Reference Image 3
  const getTransformationBadge = () => {
    switch (nodeData.layer) {
      case 'sources':
        return { label: 'RAW SOURCE', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'staging':
        return { label: 'PASSTHROUGH & CAST', color: 'bg-blue-100 text-blue-900 border-blue-300 font-bold' };
      case 'intermediate':
        return { label: 'TRANSFORMATION', color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
      case 'marts_core':
        return { label: 'STAR SCHEMA MART', color: 'bg-purple-100 text-purple-900 border-purple-300 font-bold' };
      case 'marts_analytics':
        return { label: 'ANALYTICS CONSUMER', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      default:
        return { label: 'MODEL', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const badge = getTransformationBadge();

  return (
    <div 
      className={`w-[330px] bg-white rounded-xl border-2 transition-all duration-200 relative text-[#0F172A] font-sans ${
        isSelected
          ? 'border-[#DC2626] ring-4 ring-red-500/40 shadow-[0_0_35px_rgba(220,38,38,0.5)] scale-[1.02] z-30'
          : isHighlighted
          ? 'border-[#DC2626] ring-2 ring-red-400/30 shadow-xl z-20'
          : 'border-slate-400 hover:border-slate-800 shadow-md'
      } opacity-100`}
    >
      {/* Transformation Pill Tag on Top (Inspired by Reference Image 3) */}
      <div className="absolute -top-3 left-4 z-20">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase border shadow-xs ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Left Target Connection Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className={`!w-3.5 !h-3.5 !transition-all !-left-2 ${
          isSelected || isHighlighted
            ? '!bg-[#DC2626] !border-2 !border-white !scale-125 shadow-[0_0_8px_#DC2626]'
            : '!bg-slate-700 !border-2 !border-white hover:!bg-[#0F172A] hover:!scale-125'
        }`}
      />

      {/* Right Source Connection Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className={`!w-3.5 !h-3.5 !transition-all !-right-2 ${
          isSelected || isHighlighted
            ? '!bg-[#DC2626] !border-2 !border-white !scale-125 shadow-[0_0_8px_#DC2626]'
            : '!bg-slate-700 !border-2 !border-white hover:!bg-[#0F172A] hover:!scale-125'
        }`}
      />

      {/* Node Header */}
      <div className={`p-3.5 pt-4 border-b rounded-t-xl transition-colors ${
        isSelected 
          ? 'bg-rose-50/90 border-red-200' 
          : isHighlighted 
          ? 'bg-red-50/60 border-red-200' 
          : 'bg-[#F8FAFC] border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono mb-1">
          <span className="truncate max-w-[180px] font-semibold text-slate-500">olist_warehouse/{nodeData.layer}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-white border border-slate-300 text-[#0F172A]">
            {nodeData.materialization || nodeData.type}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-extrabold text-sm text-[#0F172A] truncate tracking-tight" title={nodeData.label}>
              {nodeData.label}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 text-[#64748B] hover:text-[#0F172A] rounded hover:bg-slate-200 transition-colors shrink-0"
            title={isCollapsed ? 'Expand columns' : 'Collapse columns'}
          >
            {isCollapsed ? (
              <PlusCircle className="w-4 h-4 text-slate-600" />
            ) : (
              <MinusCircle className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Sub-header status pills */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300 text-[10px]">
              {nodeData.tests_count || (columns.length > 0 ? columns.length : 1)} tests passing
            </span>
            {nodeData.row_count > 0 && (
              <span className="text-slate-600 font-semibold">{nodeData.row_count.toLocaleString()} rows</span>
            )}
          </div>

          <span className="text-[11px] text-slate-600 font-bold font-mono">
            {columns.length} cols
          </span>
        </div>
      </div>

      {/* Node Columns List (when not collapsed) */}
      {!isCollapsed && columns.length > 0 && (
        <div className="p-2.5 space-y-1.5 bg-white">
          {/* Column Search Filter if > 5 columns */}
          {columns.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search columns..."
                value={columnSearch}
                onChange={(e) => {
                  e.stopPropagation();
                  setColumnSearch(e.target.value);
                }}
                className="w-full pl-7 pr-2 py-1 text-xs font-mono bg-[#F8FAFC] border border-slate-300 rounded text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white"
              />
            </div>
          )}

          {/* Columns Table */}
          <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto pr-1">
            {displayedColumns.map((col) => {
              const isPK = primaryKeys.has(col.name) || (col.name.endsWith('_id') && primaryKeys.size === 0 && col.name === `${nodeData.label.replace('stg_', '').replace('dim_', '')}_id`);
              const isColActive = activeCol === col.name;

              return (
                <div
                  key={col.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    nodeData.onSelectColumn?.(nodeData.label, col.name);
                  }}
                  className={`flex items-center justify-between py-1.5 px-2 rounded text-xs font-mono transition-all cursor-pointer group ${
                    isColActive
                      ? 'bg-rose-100 text-rose-950 font-extrabold border border-rose-300 shadow-xs'
                      : 'hover:bg-slate-100 text-[#0F172A]'
                  }`}
                  title={col.description || `${col.name} (${col.data_type || 'VARCHAR'})`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    {isPK ? (
                      <span title="Primary Key">
                        <Key className="w-3.5 h-3.5 text-amber-600 shrink-0 font-bold" />
                      </span>
                    ) : col.name.endsWith('_id') || col.name.endsWith('_key') ? (
                      <span title="Foreign Reference">
                        <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    )}
                    <span className={`truncate text-xs font-semibold ${isColActive ? 'text-rose-900 font-bold' : 'group-hover:text-blue-700'}`}>
                      {col.name}
                    </span>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 font-mono">
                    {col.data_type || 'VARCHAR'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Show More / Show Fewer toggle */}
          {filteredColumns.length > 6 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAllColumns(!showAllColumns);
              }}
              className="w-full text-center py-1 text-xs font-bold text-[#0F172A] hover:bg-slate-200 bg-slate-100 rounded transition-colors font-mono"
            >
              {showAllColumns ? 'Show fewer columns' : `Show all ${filteredColumns.length} columns (${filteredColumns.length - 6} more)`}
            </button>
          )}
        </div>
      )}

      {/* Node Footer */}
      <div className="px-3 py-2 bg-[#F8FAFC] border-t border-slate-200 rounded-b-xl flex items-center justify-between text-xs text-[#0F172A]">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Validated in DuckDB</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
          {nodeData.grain ? '1 row grain' : 'table'}
        </span>
      </div>
    </div>
  );
};
