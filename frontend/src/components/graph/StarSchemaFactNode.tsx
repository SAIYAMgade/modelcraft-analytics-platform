import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Link2, Hash, Layers, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { StarSchemaColumn } from '../../types';

export interface StarSchemaFactNodeData {
  id: string;
  name: string;
  title: string;
  grain: string;
  row_count: number;
  columns: StarSchemaColumn[];
  description: string;
  selectedColumn?: string | null;
  onSelectColumn?: (tableName: string, columnName: string) => void;
  onSelectTable?: (tableName: string) => void;
}

export const StarSchemaFactNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as StarSchemaFactNodeData;
  const [columnSearch, setColumnSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const columns = nodeData.columns || [];
  const filteredColumns = columns.filter(col =>
    col.name.toLowerCase().includes(columnSearch.toLowerCase())
  );
  const displayedColumns = showAll ? filteredColumns : filteredColumns.slice(0, 8);

  return (
    <div
      onClick={() => nodeData.onSelectTable?.(nodeData.name)}
      className={`w-[330px] bg-white rounded-xl border-2 transition-all duration-200 relative font-sans ${
        selected
          ? 'border-[#DC2626] ring-4 ring-red-500/40 shadow-[0_0_35px_rgba(220,38,38,0.5)] scale-[1.02] z-20'
          : 'border-slate-700 hover:border-[#DC2626] hover:shadow-lg shadow-md'
      }`}
    >
      {/* 4 Handles for Radial Connectivity */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-top-1.5 opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-right-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-right-1.5 opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-bottom-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-bottom-1.5 opacity-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#0F172A] hover:!scale-125 !transition-all !-left-1.5 opacity-0 pointer-events-none"
      />

      {/* Header (Kimball Fact Navy/Charcoal) */}
      <div className="bg-[#0F172A] text-white p-3.5 rounded-t-xl border-b border-slate-800">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-1">
          <span className="flex items-center gap-1 font-bold text-amber-300 uppercase tracking-wider">
            <Layers className="w-3 h-3 text-amber-400" />
            Central Fact Table
          </span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-white font-mono font-bold text-[9px]">
            {nodeData.row_count?.toLocaleString()} ROWS
          </span>
        </div>

        <div className="font-mono font-bold text-sm tracking-wide text-white">
          {nodeData.title || nodeData.name}
        </div>

        <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1 font-sans">
          {nodeData.grain}
        </div>
      </div>

      {/* Column Search Filter */}
      {columns.length > 6 && (
        <div className="p-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="relative">
            <Search className="w-3 h-3 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search measures & keys..."
              value={columnSearch}
              onChange={(e) => {
                e.stopPropagation();
                setColumnSearch(e.target.value);
              }}
              className="w-full pl-6 pr-2 py-1 text-[10px] font-mono bg-white border border-[#CBD5E1] rounded text-[#172B4D] focus:outline-none focus:border-[#0F172A]"
            />
          </div>
        </div>
      )}

      {/* Column List (Striped like Reference Image 2) */}
      <div className="divide-y divide-[#F1F5F9] text-xs font-mono max-h-[260px] overflow-y-auto">
        {displayedColumns.map((col, idx) => {
          const isPk = col.role === 'primary_key';
          const isFk = col.role === 'foreign_key';
          const isMeasure = col.role === 'measure';
          const isColActive = nodeData.selectedColumn === col.name;

          return (
            <div
              key={col.name}
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onSelectColumn?.(nodeData.name, col.name);
              }}
              className={`px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'
              } ${isColActive ? 'bg-amber-100 font-bold text-amber-900 border-y border-amber-300' : 'hover:bg-slate-100'}`}
              title={col.description || col.name}
            >
              <div className="flex items-center gap-1.5 truncate mr-2">
                {isPk && (
                  <span title="Primary Key">
                    <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </span>
                )}
                {isFk && (
                  <span title="Foreign Key to Dimension">
                    <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </span>
                )}
                {isMeasure && (
                  <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                    #
                  </span>
                )}
                {!isPk && !isFk && !isMeasure && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 ml-1" />
                )}
                <span className={`truncate text-[11px] ${isPk || isFk ? 'font-bold text-[#0F172A]' : isMeasure ? 'font-semibold text-emerald-800' : 'text-[#334155]'}`}>
                  {col.name}
                </span>
              </div>

              <span className="text-[9px] uppercase font-semibold text-[#64748B] shrink-0 font-mono">
                {col.type}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show more toggle */}
      {filteredColumns.length > 8 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
          className="w-full text-center py-1 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[10px] font-semibold text-[#334155] hover:bg-slate-100 transition-colors"
        >
          {showAll ? 'Show fewer columns' : `Show all ${filteredColumns.length} columns`}
        </button>
      )}

      {/* Footer */}
      <div className="p-2 bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-xl flex items-center justify-between text-[10px] text-[#64748B]">
        <span className="font-mono">{columns.length} columns defined</span>
        <span className="text-emerald-700 font-semibold font-mono">Materialized Table</span>
      </div>
    </div>
  );
};
