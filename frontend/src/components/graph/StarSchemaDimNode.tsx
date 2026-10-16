import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Key, Database, Search } from 'lucide-react';
import { StarSchemaColumn } from '../../types';

export interface StarSchemaDimNodeData {
  id: string;
  name: string;
  title: string;
  row_count: number;
  columns: StarSchemaColumn[];
  description: string;
  joinKey?: string;
  selectedColumn?: string | null;
  onSelectColumn?: (tableName: string, columnName: string) => void;
  onSelectTable?: (tableName: string) => void;
}

export const StarSchemaDimNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as StarSchemaDimNodeData;
  const [columnSearch, setColumnSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const columns = nodeData.columns || [];
  const filteredColumns = columns.filter(col =>
    col.name.toLowerCase().includes(columnSearch.toLowerCase())
  );
  const displayedColumns = showAll ? filteredColumns : filteredColumns.slice(0, 6);

  return (
    <div
      onClick={() => nodeData.onSelectTable?.(nodeData.name)}
      className={`w-[290px] bg-white rounded-xl border-2 transition-all duration-200 relative font-sans ${
        selected
          ? 'border-[#DC2626] ring-4 ring-red-500/40 shadow-[0_0_35px_rgba(220,38,38,0.5)] scale-[1.02] z-20'
          : 'border-slate-400 hover:border-[#DC2626] hover:shadow-md shadow-sm'
      }`}
    >
      {/* 4 Handles for Multi-directional Connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#475569] hover:!scale-125 !transition-all !-bottom-1.5"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#475569] hover:!scale-125 !transition-all !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#475569] hover:!scale-125 !transition-all !-right-1.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-white !border-2 !border-[#475569] hover:!scale-125 !transition-all !-left-1.5"
      />

      {/* Header (Kimball Dimension Slate #1E293B styled after Reference B) */}
      <div className="bg-[#1E293B] text-white p-3 rounded-t-xl border-b border-slate-700">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-0.5">
          <span className="flex items-center gap-1 font-bold text-slate-300 uppercase tracking-wider">
            <Database className="w-3 h-3 text-slate-400" />
            Dimension
          </span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-300">
            {nodeData.row_count?.toLocaleString()} rows
          </span>
        </div>

        <div className="font-mono font-bold text-xs tracking-wide text-white uppercase">
          {nodeData.title || nodeData.name}
        </div>
      </div>

      {/* Column Search Filter */}
      {columns.length > 5 && (
        <div className="p-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="relative">
            <Search className="w-3 h-3 text-[#64748B] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter attributes..."
              value={columnSearch}
              onChange={(e) => {
                e.stopPropagation();
                setColumnSearch(e.target.value);
              }}
              className="w-full pl-6 pr-2 py-0.5 text-[10px] font-mono bg-white border border-[#CBD5E1] rounded text-[#172B4D] focus:outline-none focus:border-[#1E293B]"
            />
          </div>
        </div>
      )}

      {/* Column List (Striped like Reference Image 2) */}
      <div className="divide-y divide-[#F1F5F9] text-xs font-mono max-h-[220px] overflow-y-auto">
        {displayedColumns.map((col, idx) => {
          const isPk = col.role === 'primary_key';
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
                {isPk ? (
                  <span title="Primary Key / Surrogate Key">
                    <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 ml-1" />
                )}
                <span className={`truncate text-[11px] ${isPk ? 'font-bold text-[#0F172A]' : 'text-[#334155]'}`}>
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
      {filteredColumns.length > 6 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
          className="w-full text-center py-1 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[10px] font-semibold text-[#334155] hover:bg-slate-100 transition-colors"
        >
          {showAll ? 'Show fewer' : `+${filteredColumns.length - 6} more attributes`}
        </button>
      )}

      {/* Footer */}
      <div className="p-2 bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-xl flex items-center justify-between text-[10px] text-[#64748B]">
        <span className="font-mono">{columns.length} attributes</span>
        {nodeData.joinKey && (
          <span className="font-mono text-[9px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
            FK: {nodeData.joinKey}
          </span>
        )}
      </div>
    </div>
  );
};
