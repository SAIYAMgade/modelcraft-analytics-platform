import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import { 
  Layers, 
  Key, 
  Database, 
  Search, 
  ArrowRight, 
  Info, 
  Sparkles, 
  Box, 
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Hash,
  Link2,
  Table2,
  CheckCircle2,
  X,
  Code2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { api } from '../services/api';
import { 
  StarSchemaData, 
  StarSchemaFact, 
  StarSchemaDimension, 
  StarSchemaColumn 
} from '../types';
import { StarSchemaFactNode, StarSchemaFactNodeData } from '../components/graph/StarSchemaFactNode';
import { StarSchemaDimNode, StarSchemaDimNodeData } from '../components/graph/StarSchemaDimNode';
import { CardinalityEdge } from '../components/graph/CardinalityEdge';

const nodeTypes = {
  factNode: StarSchemaFactNode,
  dimNode: StarSchemaDimNode,
};

const edgeTypes = {
  cardinalityEdge: CardinalityEdge,
};

interface StarSchemaPageProps {
  onNavigateToModel?: (modelName: string) => void;
}

export const StarSchemaPage: React.FC<StarSchemaPageProps> = ({ onNavigateToModel }) => {
  const [data, setData] = useState<StarSchemaData | null>(null);
  const [selectedFactKey, setSelectedFactKey] = useState<'fact_orders' | 'fact_order_items'>('fact_orders');
  const [selectedTableId, setSelectedTableId] = useState<string>('fact_orders');
  const [selectedColumnName, setSelectedColumnName] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const fullscreenContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (fullscreenContainerRef.current?.requestFullscreen) {
        fullscreenContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Escape key closes fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // React Flow elements state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const loadStarSchema = async () => {
      try {
        setLoading(true);
        const res = await api.getStarSchemaData();
        setData(res);
      } catch (err) {
        console.error('Failed to load star schema metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStarSchema();
  }, []);

  const currentFact = data?.schemas?.[selectedFactKey];

  // Auto-fit whenever nodes load, fact changes, or fullscreen toggles
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.14, duration: 250 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, nodes.length, selectedFactKey, isFullscreen]);

  // Callback when a column is clicked inside any node
  const handleSelectColumn = useCallback((tableName: string, columnName: string) => {
    setSelectedTableId(tableName);
    setSelectedColumnName(prev => (prev === columnName ? null : columnName));
  }, []);

  // Callback when a table is clicked
  const handleSelectTable = useCallback((tableName: string) => {
    setSelectedTableId(tableName);
    setSelectedEdgeId(null);
  }, []);

  // Build the radial star schema graph whenever currentFact or selections change
  useEffect(() => {
    if (!currentFact) return;

    const factNodeId = currentFact.name;
    const isFactSelected = selectedTableId === factNodeId;

    // 1. Central Fact Node
    const factNode: Node = {
      id: factNodeId,
      type: 'factNode',
      position: { x: 440, y: 320 },
      data: {
        id: factNodeId,
        name: currentFact.name,
        title: currentFact.title,
        grain: currentFact.grain,
        row_count: currentFact.row_count,
        columns: currentFact.columns,
        description: currentFact.description,
        selectedColumn: selectedColumnName,
        onSelectColumn: handleSelectColumn,
        onSelectTable: handleSelectTable
      }
    };

    // 2. Surrounding Dimension Nodes (Calculated Radial Positions with no overlaps)
    const dimPositions = [
      { x: 440, y: 20, sourceHandle: 'bottom', targetHandle: 'top' },        // Top
      { x: 40, y: 320, sourceHandle: 'right', targetHandle: 'left' },         // Left
      { x: 860, y: 320, sourceHandle: 'left', targetHandle: 'right' },        // Right
      { x: 440, y: 760, sourceHandle: 'top', targetHandle: 'bottom' },       // Bottom
      { x: 860, y: 760, sourceHandle: 'top', targetHandle: 'bottom' }        // Bottom-Right
    ];

    const dimNodes: Node[] = currentFact.dimensions.map((dim, idx) => {
      const pos = dimPositions[idx % dimPositions.length];
      const isSelected = selectedTableId === dim.table_name;
      const joinKey = dim.join_key || dim.foreign_key || dim.primary_key;

      return {
        id: dim.table_name,
        type: 'dimNode',
        position: { x: pos.x, y: pos.y },
        data: {
          id: dim.table_name,
          name: dim.table_name,
          title: dim.title,
          row_count: dim.row_count,
          columns: dim.columns,
          description: dim.description,
          joinKey: joinKey,
          selectedColumn: selectedColumnName,
          onSelectColumn: handleSelectColumn,
          onSelectTable: handleSelectTable
        }
      };
    });

    // 3. Radial Edges with 1 : N Cardinality Badge (Default crisp black; turns glowing red when active)
    const starEdges: Edge[] = currentFact.dimensions.map((dim, idx) => {
      const pos = dimPositions[idx % dimPositions.length];
      const edgeId = `${dim.table_name}->${factNodeId}`;
      const isEdgeSelected = selectedEdgeId === edgeId;
      const isConnectedToSelectedTable = selectedTableId === dim.table_name || isFactSelected;
      const joinKey = dim.join_key || dim.foreign_key || dim.primary_key;
      const isHighlighted = isEdgeSelected || isConnectedToSelectedTable;

      return {
        id: edgeId,
        source: dim.table_name,
        target: factNodeId,
        sourceHandle: pos.sourceHandle,
        targetHandle: pos.targetHandle,
        type: 'cardinalityEdge',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isHighlighted ? '#DC2626' : '#0F172A'
        },
        data: {
          cardinality: '1 : N',
          joinCondition: `Foreign Key Join: ${dim.table_name}.${joinKey} = ${factNodeId}.${joinKey}`,
          isHighlighted
        }
      };
    });

    setNodes([factNode, ...dimNodes]);
    setEdges(starEdges);
  }, [
    currentFact, 
    selectedTableId, 
    selectedColumnName, 
    selectedEdgeId, 
    handleSelectColumn, 
    handleSelectTable
  ]);

  // Handle Edge click
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  // Currently selected table metadata for the right inspector
  const activeTable = useMemo(() => {
    if (!currentFact) return null;
    if (selectedTableId === currentFact.name) {
      return {
        name: currentFact.name,
        title: currentFact.title,
        type: 'fact' as const,
        description: currentFact.description,
        grain: currentFact.grain,
        row_count: currentFact.row_count,
        columns: currentFact.columns
      };
    }
    const dim = currentFact.dimensions.find(d => d.table_name === selectedTableId);
    if (dim) {
      const joinKey = dim.join_key || dim.foreign_key || dim.primary_key;
      return {
        name: dim.table_name,
        title: dim.title,
        type: 'dimension' as const,
        description: dim.description,
        grain: `1 row per ${dim.title.toLowerCase().replace('dimension', '').trim()}`,
        row_count: dim.row_count,
        columns: dim.columns,
        joinKey: joinKey
      };
    }
    return null;
  }, [currentFact, selectedTableId]);

  // Active edge details
  const activeEdgeInfo = useMemo(() => {
    if (!selectedEdgeId || !currentFact) return null;
    const [dimName] = selectedEdgeId.split('->');
    const dim = currentFact.dimensions.find(d => d.table_name === dimName);
    if (!dim) return null;
    const joinKey = dim.join_key || dim.foreign_key || dim.primary_key;
    return {
      dimName: dim.title,
      dimTable: dim.table_name,
      factName: currentFact.title,
      factTable: currentFact.name,
      joinKey: joinKey,
      explanation: `Each record in ${dim.title} (${dim.table_name}) has a unique primary key (${joinKey}) that is referenced multiple times (1:N) in ${currentFact.title} (${currentFact.name}). This eliminates repeated string storage while allowing instant multidimensional aggregation.`
    };
  }, [selectedEdgeId, currentFact]);

  const handleSelectFact = (key: 'fact_orders' | 'fact_order_items') => {
    setSelectedFactKey(key);
    setSelectedTableId(key);
    setSelectedColumnName(null);
    setSelectedEdgeId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#172B4D] max-w-7xl mx-auto pb-16 font-sans">
      {/* ── 1. Page Header & Educational Explainer ───────────────────────── */}
      <div className="border-b border-[#E2E8F0] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold tracking-wider text-[#64748B] uppercase mb-1">
            <Layers className="w-4 h-4 text-[#0F172A]" />
            <span>Kimball Dimensional Modeling &bull; Star Schema</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
            STAR SCHEMA EXPLORER
          </h1>
          <p className="text-sm text-[#475569] mt-1 max-w-2xl leading-relaxed">
            Authentic radial star schema with a central fact table and surrounding descriptive dimensions. 
            Inspect 1:N cardinality joins, primary and foreign keys, additive measures, and DuckDB table grains.
          </p>
        </div>

        {/* Fact Selector Switcher */}
        <div className="flex items-center bg-[#F1F5F9] border border-[#CBD5E1] p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => handleSelectFact('fact_orders')}
            className={`px-3.5 py-1.5 rounded-lg transition-all font-mono text-xs ${
              selectedFactKey === 'fact_orders'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            fact_orders (Order Grain)
          </button>
          <button
            onClick={() => handleSelectFact('fact_order_items')}
            className={`px-3.5 py-1.5 rounded-lg transition-all font-mono text-xs ${
              selectedFactKey === 'fact_order_items'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            fact_order_items (Line-Item Grain)
          </button>
        </div>
      </div>

      {/* ── 2. Legend & Relational Guidance Bar ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#CBD5E1] p-3 rounded-xl shadow-xs text-xs">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[#475569]">
          <span className="font-mono font-bold text-[11px] text-[#0F172A] uppercase">LEGEND:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-[#0F172A]" />
            <span className="font-semibold text-[#0F172A]">Central Fact Table</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-[#1E293B]" />
            <span className="font-semibold text-[#1E293B]">Dimension Table</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Primary Key (PK)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Foreign Key (FK)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1 rounded border border-emerald-300">
              #
            </span>
            <span>Additive Measure</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.2 rounded-full border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-800">
              1 : N
            </span>
            <span>One-to-Many Cardinality</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#64748B] hidden sm:inline">Pan &bull; Zoom &bull; Click any table or 1:N edge</span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-semibold transition-all shadow-sm"
            title="Toggle Fullscreen View (Press Esc to exit)"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 3. Radial Canvas Workspace & Right Inspector ─────────────────── */}
      <div 
        ref={fullscreenContainerRef}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${
          isFullscreen ? 'fixed inset-0 z-[99999] bg-white p-6 w-screen h-screen overflow-hidden' : ''
        }`}
      >
        {/* Left: Interactive Radial Graph Canvas (8 cols) */}
        <div className={`${
          isFullscreen ? 'lg:col-span-8 h-[calc(100vh-48px)]' : 'lg:col-span-8 h-[740px]'
        } bg-white border-2 border-slate-300 rounded-2xl relative shadow-md overflow-hidden flex flex-col`}>
          {/* Canvas Title Banner */}
          <div className="bg-white border-b-2 border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#0F172A] z-10 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[#0F172A] font-bold uppercase tracking-wider text-sm">
                Radial Star Schema &bull; {currentFact?.title}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => reactFlowInstance?.fitView({ padding: 0.15, duration: 300 })}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-bold text-xs"
                title="Fit diagram into viewport"
              >
                Fit Diagram
              </button>

              <span className="text-emerald-700 font-semibold flex items-center space-x-1 pl-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Grain Validated</span>
              </span>

              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs shadow-xs ml-2"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit (Esc)</span>
                </button>
              )}
            </div>
          </div>

          {/* React Flow Radial Canvas */}
          <div className="flex-1 w-full h-full relative bg-white">
            <ReactFlow
              key={`${selectedFactKey}-${nodes.length}-${isFullscreen ? 'fs' : 'norm'}`}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onEdgeClick={onEdgeClick}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ padding: 0.14 }}
              minZoom={0.35}
              maxZoom={1.8}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#94A3B8" />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                nodeColor={(node: any) => (node.type === 'factNode' ? '#0F172A' : '#1E293B')}
                className="!bg-white !border-2 !border-slate-300 !rounded-lg !shadow-md !w-36 !h-24"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Right: Relational Inspector Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Edge Cardinality Banner (if edge clicked) */}
          {activeEdgeInfo && (
            <div className="border-2 border-[#0F172A] bg-white rounded-xl p-5 shadow-md space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#0F172A] uppercase">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span>1 : N Foreign Key Relationship</span>
                </div>
                <button 
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">{activeEdgeInfo.dimTable} (1)</span>
                <span className="text-[10px] font-bold bg-[#0F172A] text-white px-2 py-0.5 rounded-full">
                  1 : N
                </span>
                <span className="font-bold text-[#0F172A]">{activeEdgeInfo.factTable} (N)</span>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed font-sans">
                {activeEdgeInfo.explanation}
              </p>

              <div className="text-[11px] font-mono text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                Join Predicate: <code className="font-bold">{activeEdgeInfo.dimTable}.{activeEdgeInfo.joinKey} = {activeEdgeInfo.factTable}.{activeEdgeInfo.joinKey}</code>
              </div>
            </div>
          )}

          {/* Active Table Details */}
          {activeTable ? (
            <div className="border border-[#CBD5E1] bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-1">
                  <span>DIMENSIONAL ROLE</span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                    activeTable.type === 'fact' ? 'bg-[#0F172A] text-white' : 'bg-[#1E293B] text-white'
                  }`}>
                    {activeTable.type === 'fact' ? 'Central Fact Table' : 'Dimension Table'}
                  </span>
                </div>
                <h3 className="text-xl font-mono font-bold text-[#0F172A]">
                  {activeTable.name}
                </h3>
                <div className="text-xs font-mono text-[#64748B] mt-0.5 flex items-center space-x-2">
                  <span>{activeTable.row_count.toLocaleString()} Verified Records in DuckDB</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#334155] leading-relaxed">
                <div className="font-bold text-[#0F172A] font-sans">Business Purpose:</div>
                <p>{activeTable.description}</p>
              </div>

              {activeTable.grain && (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase font-bold">Table Grain:</div>
                  <div className="text-[#0F172A] font-semibold">{activeTable.grain}</div>
                </div>
              )}

              {/* Column Inventory */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#0F172A] flex items-center justify-between">
                  <span>Column Inventory ({activeTable.columns.length})</span>
                  <span className="text-[10px] text-[#64748B] font-mono">Click to inspect</span>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl">
                  {activeTable.columns.map((c) => (
                    <div 
                      key={c.name} 
                      onClick={() => setSelectedColumnName(prev => (prev === c.name ? null : c.name))}
                      className={`p-2.5 text-xs font-mono flex items-start justify-between cursor-pointer transition-colors ${
                        selectedColumnName === c.name ? 'bg-amber-50 font-bold' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          {c.role === 'primary_key' && <Key className="w-3 h-3 text-amber-600 shrink-0" />}
                          {c.role === 'foreign_key' && <Link2 className="w-3 h-3 text-blue-600 shrink-0" />}
                          {c.role === 'measure' && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded border border-emerald-300 shrink-0">
                              #
                            </span>
                          )}
                          <span className="text-[#0F172A]">{c.name}</span>
                        </div>
                        {c.description && (
                          <div className="text-[11px] text-[#64748B] font-sans mt-0.5">
                            {c.description}
                          </div>
                        )}
                        {c.references && (
                          <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                            &rarr; References {c.references}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B] uppercase shrink-0 ml-2">
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {onNavigateToModel && (
                <button
                  onClick={() => onNavigateToModel(activeTable.name)}
                  className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-semibold font-mono flex items-center justify-center space-x-2 transition-colors shadow-sm"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect in SQL Model Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="border border-[#CBD5E1] bg-white rounded-2xl p-8 text-center text-[#64748B] text-xs font-mono space-y-2">
              <Box className="w-8 h-8 mx-auto text-[#94A3B8]" />
              <div>Select any table or edge in the Star Schema canvas to inspect relational metadata.</div>
            </div>
          )}

          {/* Beginner-friendly explanation card */}
          <div className="border border-[#E2E8F0] bg-white p-5 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A]">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Why Star Schema Modeling Matters</span>
            </div>
            <div className="text-xs text-[#475569] leading-relaxed space-y-2">
              <p>
                <strong>1. Eliminates Fanout Multiplication:</strong> Multi-item line charges and multiple payment tenders are grouped at the order grain before joining.
              </p>
              <p>
                <strong>2. Simple Analytical Joins:</strong> Business analysts query revenue by customer city, product category, or order month by joining directly from the fact table to dimensions without multi-table hops.
              </p>
              <p>
                <strong>3. Vectorized DuckDB Performance:</strong> Columnar databases execute star-join filter predicates in milliseconds without disk spilling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
