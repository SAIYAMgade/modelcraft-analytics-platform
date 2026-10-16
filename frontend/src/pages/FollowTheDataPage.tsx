import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import { 
  ArrowRight, 
  Workflow, 
  Database, 
  Code2, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Search,
  Filter,
  Eye,
  Sparkles, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  FileCode,
  Copy,
  Check,
  Columns,
  Route,
  Info,
  Maximize2,
  Minimize2,
  Table2
} from 'lucide-react';
import { api } from '../services/api';
import { 
  LineageGraph, 
  LineageNode, 
  LineageEdge, 
  FollowTheDataStage,
  ColumnLineageItem,
  ModelColumn
} from '../types';
import { TableNode, TableNodeData } from '../components/graph/TableNode';
import { getLayoutedElements } from '../components/graph/dagreLayout';

const nodeTypes = {
  tableNode: TableNode,
};

interface FollowTheDataPageProps {
  onNavigateToLineage?: (modelName?: string) => void;
  onNavigateToModels?: (modelName?: string) => void;
}

export const FollowTheDataPage: React.FC<FollowTheDataPageProps> = ({
  onNavigateToLineage,
  onNavigateToModels
}) => {
  // Lineage data
  const [graphData, setGraphData] = useState<LineageGraph | null>(null);
  const [stages, setStages] = useState<FollowTheDataStage[]>([]);
  const [columnLineageData, setColumnLineageData] = useState<ColumnLineageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Flow canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Selection & Mode State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('fact_orders');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedColumnName, setSelectedColumnName] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [layerFilter, setLayerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'sql' | 'tests'>('overview');
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
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

  // Auto-fit whenever fullscreen or layout changes
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.12, duration: 250 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, isFullscreen, layerFilter]);

  // Fetch initial graph and stages
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [graphRes, stagesRes, colRes] = await Promise.all([
          api.getAnalyticsEngineeringLineage(),
          api.getFollowTheDataStages().catch(() => []),
          api.getColumnLineage().catch(() => ({ columns: [] }))
        ]);
        setGraphData(graphRes);
        setStages(stagesRes);
        setColumnLineageData(colRes.columns || []);
      } catch (err) {
        console.error('Failed to load Follow The Data graph:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute upstream & downstream sets for active selection
  const { upstreamIds, downstreamIds, columnActiveModels } = useMemo(() => {
    const upstreams = new Set<string>();
    const downstreams = new Set<string>();
    const colModels = new Set<string>();

    if (selectedColumnName && columnLineageData.length > 0) {
      const colItem = columnLineageData.find(c => c.column_name === selectedColumnName);
      if (colItem) {
        colItem.path.forEach(step => colModels.add(step.model));
      }
    }

    if (graphData && selectedNodeId) {
      // BFS Upstream
      const qUp = [selectedNodeId];
      while (qUp.length > 0) {
        const curr = qUp.shift()!;
        for (const edge of graphData.edges) {
          if (edge.target === curr && !upstreams.has(edge.source)) {
            upstreams.add(edge.source);
            qUp.push(edge.source);
          }
        }
      }

      // BFS Downstream
      const qDown = [selectedNodeId];
      while (qDown.length > 0) {
        const curr = qDown.shift()!;
        for (const edge of graphData.edges) {
          if (edge.source === curr && !downstreams.has(edge.target)) {
            downstreams.add(edge.target);
            qDown.push(edge.target);
          }
        }
      }
    }

    return { 
      upstreamIds: upstreams, 
      downstreamIds: downstreams,
      columnActiveModels: colModels
    };
  }, [graphData, selectedNodeId, selectedColumnName, columnLineageData]);

  // Handle column selection inside any node
  const handleSelectColumn = useCallback((modelName: string, columnName: string) => {
    if (selectedColumnName === columnName) {
      setSelectedColumnName(null);
    } else {
      setSelectedColumnName(columnName);
      setSelectedNodeId(modelName);
    }
  }, [selectedColumnName]);

  // Build React Flow Elements with Dagre LR Layout
  useEffect(() => {
    if (!graphData) return;

    // Filter nodes based on layer filter and search query
    const filteredNodes = graphData.nodes.filter(n => {
      const matchesSearch = searchQuery === '' || 
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.columns?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      if (layerFilter === 'ALL') return true;
      if (layerFilter === 'SOURCES') return n.layer === 'sources';
      if (layerFilter === 'STAGING') return n.layer === 'staging';
      if (layerFilter === 'INTERMEDIATE') return n.layer === 'intermediate';
      if (layerFilter === 'MARTS') return n.layer === 'marts_core' || n.layer === 'marts_analytics';
      return true;
    });

    const activeNodeIdSet = new Set(filteredNodes.map(n => n.id));

    // Filter edges where both source and target exist in filtered set
    const filteredEdges = graphData.edges.filter(
      e => activeNodeIdSet.has(e.source) && activeNodeIdSet.has(e.target)
    );

    // Map to React Flow Nodes
    const rfNodes: Node[] = filteredNodes.map(n => {
      const isSelected = selectedNodeId === n.id;
      const isUpstream = upstreamIds.has(n.id);
      const isDownstream = downstreamIds.has(n.id);
      const isColActive = columnActiveModels.has(n.id);

      const isDimmed = (selectedNodeId !== null && !isSelected && !isUpstream && !isDownstream && !isColActive) ||
        (selectedColumnName !== null && !isColActive);

      const isHighlighted = isUpstream || isDownstream || isColActive;

      return {
        id: n.id,
        type: 'tableNode',
        position: { x: 0, y: 0 }, // Dagre will position
        data: {
          id: n.id,
          label: n.label,
          layer: n.layer,
          type: n.type,
          row_count: n.row_count,
          status: n.status,
          materialization: n.materialization,
          grain: n.grain,
          tests_count: n.tests?.length || 2,
          columns: n.columns || [],
          primary_keys: n.primary_keys || [],
          raw_sql: n.raw_sql,
          description: n.description,
          isSelected,
          isDimmed,
          isHighlighted,
          activeColumnName: selectedColumnName,
          onSelectColumn: handleSelectColumn,
          isExpanded: allExpanded
        }
      };
    });

    // Map to React Flow Edges:
    // Default: crisp, running black dashed line (#0F172A)
    // Selected / Active Lineage Path: glowing vibrant red (#DC2626) with glow filter
    // Active Column Trace: luminous neon purple (#A855F7)
    const rfEdges: Edge[] = filteredEdges.map(e => {
      const edgeId = `${e.source}->${e.target}`;
      const isSelected = selectedEdgeId === edgeId;
      const isDirectlyActive = 
        (selectedNodeId === e.source && (downstreamIds.has(e.target) || e.target === selectedNodeId)) ||
        (selectedNodeId === e.target && (upstreamIds.has(e.source) || e.source === selectedNodeId)) ||
        (upstreamIds.has(e.source) && (upstreamIds.has(e.target) || e.target === selectedNodeId)) ||
        ((downstreamIds.has(e.source) || e.source === selectedNodeId) && downstreamIds.has(e.target));

      const isColEdge = Boolean(selectedColumnName && columnActiveModels.has(e.source) && columnActiveModels.has(e.target));
      const isDimmed = (selectedNodeId !== null || selectedColumnName !== null) && !isDirectlyActive && !isColEdge && !isSelected;

      const edgeColor = isDirectlyActive || isSelected
        ? '#DC2626'
        : isColEdge
        ? '#A855F7'
        : '#0F172A';

      const edgeWidth = isDirectlyActive || isSelected ? 4.0 : isColEdge ? 3.2 : 2.4;
      const glowFilter = isDirectlyActive || isSelected
        ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.95))'
        : isColEdge
        ? 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.9))'
        : 'none';

      return {
        id: edgeId,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true, // Continuously moving running dots as requested!
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: edgeColor
        },
        style: {
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          filter: glowFilter,
          strokeDasharray: isDirectlyActive || isSelected ? 'none' : '6 6',
          opacity: isDimmed ? 0.75 : 1.0, // High contrast, never camouflaged!
          transition: 'all 0.2s ease'
        },
        data: {
          source: e.source,
          target: e.target,
          transformation: e.transformation || 'SQL Model Dependency'
        }
      };
    });

    // Run Dagre Left-to-Right layout with spacious readable dimensions
    const layouted = getLayoutedElements(rfNodes, rfEdges, {
      direction: 'LR',
      nodeWidth: 330,
      rankSep: 110,
      nodeSep: 40
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [
    graphData, 
    layerFilter, 
    searchQuery, 
    selectedNodeId, 
    selectedEdgeId, 
    selectedColumnName, 
    upstreamIds, 
    downstreamIds, 
    columnActiveModels, 
    handleSelectColumn,
    allExpanded
  ]);

  // Node Click
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Edge Click
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  // Pane Click (Clear selections)
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  // Copy SQL snippet
  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  // Currently selected node metadata
  const selectedNode = useMemo(() => {
    if (!graphData || !selectedNodeId) return null;
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [graphData, selectedNodeId]);

  // Currently selected edge data
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId || !edges) return null;
    return edges.find(e => e.id === selectedEdgeId) || null;
  }, [selectedEdgeId, edges]);

  // Active Stage object
  const activeStage = stages[activeStageIndex] || stages[0];

  // Stage click handler - also filter/highlight that layer
  const handleStageSelect = (idx: number, stageId: string) => {
    setActiveStageIndex(idx);
    if (stageId === 'raw_sources') {
      setSelectedNodeId('raw_orders');
    } else if (stageId === 'silver' || stageId === 'ingestion') {
      setSelectedNodeId('stg_orders');
    } else if (stageId === 'dimensional_models') {
      setSelectedNodeId('fact_orders');
    } else if (stageId === 'analytics_marts') {
      setSelectedNodeId('mart_daily_sales');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#172B4D] max-w-7xl mx-auto pb-16 font-sans">
      {/* ── 1. Page Header & Editorial Title ─────────────────────────────── */}
      <div className="border-b border-[#E2E8F0] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold tracking-wider text-[#64748B] uppercase mb-1">
            <Workflow className="w-4 h-4 text-[#0F172A]" />
            <span>Production Analytics Engineering DAG</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
            FOLLOW THE DATA
          </h1>
          <p className="text-sm text-[#475569] mt-1 max-w-2xl leading-relaxed">
            From raw commerce events to trusted business decisions. Inspect true table-level and column-level 
            dependencies across Ingestion, Staging, Kimball Star Schemas, and Aggregated Marts.
          </p>
        </div>

        {/* Guided Stage Tour Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto bg-[#F1F5F9] border border-[#CBD5E1] p-1 rounded-xl text-xs font-semibold shrink-0">
          <span className="text-[10px] uppercase font-mono text-[#64748B] px-2">Pipeline:</span>
          {stages.slice(0, 5).map((s, idx) => (
            <button
              key={s.id}
              onClick={() => handleStageSelect(idx, s.id)}
              className={`px-3 py-1.5 rounded-lg transition-all font-mono text-[11px] whitespace-nowrap ${
                activeStageIndex === idx
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/60'
              }`}
            >
              0{idx + 1} {s.badge}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Interactive Controls & Filtering Toolbar ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#CBD5E1] p-3 rounded-xl shadow-xs text-xs">
        {/* Layer Filters */}
        <div className="flex items-center space-x-1 font-mono text-xs">
          <span className="text-[10px] text-[#64748B] uppercase font-bold mr-1">Layer:</span>
          {['ALL', 'SOURCES', 'STAGING', 'INTERMEDIATE', 'MARTS'].map((l) => (
            <button
              key={l}
              onClick={() => setLayerFilter(l)}
              className={`px-2.5 py-1 rounded-md transition-all font-bold ${
                layerFilter === l
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Column-level Lineage Trace Dropdown (Reference C) */}
        <div className="flex items-center space-x-2">
          <Route className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[11px] font-bold text-[#0F172A]">Trace Column:</span>
          <select
            value={selectedColumnName || ''}
            onChange={(e) => setSelectedColumnName(e.target.value ? e.target.value : null)}
            className="px-2.5 py-1 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          >
            <option value="">-- No Column Trace (Table View) --</option>
            {columnLineageData.map((c) => (
              <option key={c.column_name} value={c.column_name}>
                {c.column_name} ({c.path.length} steps across DAG)
              </option>
            ))}
          </select>
          {selectedColumnName && (
            <button
              onClick={() => setSelectedColumnName(null)}
              className="p-1 text-slate-500 hover:text-slate-800"
              title="Clear Column Trace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search, Collapse & Full Screen controls */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter models or columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172B4D] focus:outline-none focus:border-[#0F172A] w-44"
            />
          </div>

          <button
            onClick={() => setAllExpanded(!allExpanded)}
            className="px-2.5 py-1 border border-[#CBD5E1] rounded-lg text-xs font-mono font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            {allExpanded ? 'Collapse' : 'Expand'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-semibold transition-all shadow-sm shrink-0"
            title="Toggle Full Screen View (Press Esc to exit)"
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

      {/* ── 3. Main Directed Lineage Graph Canvas & Inspector Drawer ───────── */}
      <div 
        ref={fullscreenContainerRef}
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${
          isFullscreen ? 'fixed inset-0 z-[99999] bg-white p-6 w-screen h-screen overflow-hidden' : ''
        }`}
      >
        {/* Left: React Flow Lineage Graph Canvas (8 cols or 9 cols in fullscreen) */}
        <div className={`${
          isFullscreen ? 'lg:col-span-8 h-[calc(100vh-48px)]' : 'lg:col-span-8 h-[740px]'
        } bg-white border-2 border-slate-300 rounded-2xl relative shadow-md overflow-hidden flex flex-col`}>
          {/* Canvas status banner */}
          <div className="bg-white border-b-2 border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#0F172A] z-10 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[#0F172A] font-bold text-sm">
                {nodes.length} Models &bull; {edges.length} Directed Lineage Edges
              </span>
              <span className="text-slate-500 font-semibold">(Left &rarr; Right Data Flow)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => reactFlowInstance?.fitView({ padding: 0.12, duration: 300 })}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-bold text-xs"
                title="Fit diagram into viewport"
              >
                Fit Diagram
              </button>

              {selectedColumnName && (
                <div className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full font-bold border border-purple-300 text-[11px] flex items-center space-x-1.5 shadow-xs">
                  <Route className="w-3 h-3 text-purple-700" />
                  <span>Tracing Column: {selectedColumnName}</span>
                </div>
              )}

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

          {/* React Flow Graph */}
          <div className="flex-1 w-full h-full relative bg-white">
            <ReactFlow
              key={`${layerFilter}-${nodes.length}-${isFullscreen ? 'fs' : 'norm'}`}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.35}
              maxZoom={1.8}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#94A3B8" />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                nodeColor={(node: any) => {
                  if (node.data?.layer === 'sources') return '#94A3B8';
                  if (node.data?.layer === 'staging') return '#3B82F6';
                  if (node.data?.layer === 'intermediate') return '#F59E0B';
                  if (node.data?.layer === 'marts_core') return '#A855F7';
                  return '#10B981';
                }}
                className="!bg-white !border-2 !border-slate-300 !rounded-lg !shadow-md !w-36 !h-24"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Right: Model & Edge Inspector Drawer (4 cols, styled after Reference A) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Edge Inspector Card (when an edge is clicked) */}
          {selectedEdge && (
            <div className="border-2 border-blue-500 bg-white rounded-xl p-5 shadow-md space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-blue-700 uppercase">
                  <Workflow className="w-3.5 h-3.5" />
                  <span>Lineage Transformation Edge</span>
                </div>
                <button 
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="font-bold text-[#0F172A]">{selectedEdge.source}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-[#0F172A]">{selectedEdge.target}</span>
                </div>
                <div className="text-[11px] text-[#475569] leading-relaxed">
                  <strong>Transformation Logic:</strong> {String(selectedEdge.data?.transformation || 'Data transformation & dependency')}
                </div>
              </div>
            </div>
          )}

          {/* Model Inspector Drawer (styled after Reference A) */}
          {selectedNode ? (
            <div className="border border-[#CBD5E1] bg-white rounded-2xl shadow-sm overflow-hidden space-y-0">
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-1">
                  <span>LAYER &bull; {selectedNode.layer}</span>
                  <span className="px-1.5 py-0.2 rounded font-bold bg-[#E2E8F0] text-[#0F172A]">
                    {selectedNode.materialization || selectedNode.type}
                  </span>
                </div>
                <h3 className="text-xl font-mono font-bold text-[#0F172A] truncate">
                  {selectedNode.label}
                </h3>
                <div className="flex items-center space-x-3 text-xs font-mono text-[#64748B] mt-1">
                  <span>{selectedNode.row_count?.toLocaleString()} rows</span>
                  <span>&bull;</span>
                  <span>{selectedNode.columns?.length || 0} columns</span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Validated</span>
                  </span>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-[#E2E8F0] text-xs font-mono bg-white">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-[#0F172A] text-[#0F172A] bg-slate-50'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors ${
                    activeTab === 'columns'
                      ? 'border-[#0F172A] text-[#0F172A] bg-slate-50'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Columns ({selectedNode.columns?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('sql')}
                  className={`flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors ${
                    activeTab === 'sql'
                      ? 'border-[#0F172A] text-[#0F172A] bg-slate-50'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Compiled SQL
                </button>
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors ${
                    activeTab === 'tests'
                      ? 'border-[#0F172A] text-[#0F172A] bg-slate-50'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Tests ({selectedNode.tests?.length || 2})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 max-h-[380px] overflow-y-auto">
                {activeTab === 'overview' && (
                  <div className="space-y-4 text-xs font-sans">
                    <div>
                      <div className="text-[10px] font-mono uppercase font-bold text-[#64748B] mb-1">
                        Business Purpose
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {selectedNode.description || 'Transforms raw Brazilian e-commerce events into reliable analytical structures.'}
                      </p>
                    </div>

                    {selectedNode.grain && (
                      <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-mono space-y-0.5">
                        <div className="text-[10px] text-[#64748B] uppercase font-bold">Model Grain:</div>
                        <div className="text-[#0F172A] font-semibold">{selectedNode.grain}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="text-[10px] text-[#64748B] uppercase font-bold mb-1">Upstream Inputs</div>
                        <div className="text-[#0F172A] font-bold">{upstreamIds.size} models</div>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="text-[10px] text-[#64748B] uppercase font-bold mb-1">Downstream Users</div>
                        <div className="text-[#0F172A] font-bold">{downstreamIds.size} models</div>
                      </div>
                    </div>

                    {onNavigateToModels && (
                      <button
                        onClick={() => onNavigateToModels(selectedNode.label)}
                        className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-semibold font-mono flex items-center justify-center space-x-2 transition-colors shadow-sm"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Open in SQL Model Explorer</span>
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'columns' && (
                  <div className="divide-y divide-[#F1F5F9] font-mono text-xs">
                    {(selectedNode.columns || []).map((col) => {
                      const isPk = selectedNode.primary_keys?.includes(col.name);
                      return (
                        <div 
                          key={col.name} 
                          onClick={() => handleSelectColumn(selectedNode.label, col.name)}
                          className={`py-2 px-1 flex items-start justify-between cursor-pointer rounded transition-colors ${
                            selectedColumnName === col.name ? 'bg-blue-50 font-bold' : 'hover:bg-slate-50'
                          }`}
                          title="Click to trace column lineage"
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center space-x-1.5">
                              {isPk && <span className="text-amber-600 font-bold text-[10px]">[PK]</span>}
                              <span className="text-[#0F172A] font-semibold">{col.name}</span>
                            </div>
                            {col.description && (
                              <div className="text-[10px] font-sans text-[#64748B] mt-0.5">
                                {col.description}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] uppercase font-semibold text-[#64748B] shrink-0">
                            {col.data_type || 'VARCHAR'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'sql' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
                      <span>Compiled Model SQL</span>
                      <button
                        onClick={() => handleCopySql(selectedNode.raw_sql || `-- Model: ${selectedNode.label}\nSELECT * FROM ...`)}
                        className="flex items-center space-x-1 text-[#0F172A] hover:underline"
                      >
                        {sqlCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{sqlCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-[#0F172A] text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                      <code>{selectedNode.raw_sql || `-- Compiled dbt SQL for ${selectedNode.label}\nSELECT\n  * \nFROM {{ ref('${selectedNode.label}') }};`}</code>
                    </pre>
                  </div>
                )}

                {activeTab === 'tests' && (
                  <div className="space-y-2 font-mono text-xs">
                    {(selectedNode.tests || ['unique_primary_key', 'not_null_foreign_keys', 'accepted_status_values']).map((testItem, i) => {
                      const testLabel = typeof testItem === 'string' ? testItem : (testItem.test_name || testItem.test_id);
                      return (
                        <div key={i} className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[#0F172A] font-medium">{testLabel}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase px-1.5 py-0.2 bg-white rounded border border-emerald-300">
                            PASS
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-[#CBD5E1] bg-white rounded-2xl p-8 text-center text-[#64748B] text-xs font-mono space-y-2">
              <Database className="w-8 h-8 mx-auto text-[#94A3B8]" />
              <div>Click any model node in the DAG to inspect columns, compiled SQL, and data tests.</div>
            </div>
          )}

          {/* Column Lineage Explanation Card (when column active) */}
          {selectedColumnName && (
            <div className="border border-blue-200 bg-blue-50/70 p-4 rounded-xl space-y-2 text-xs font-mono animate-fade-in">
              <div className="flex items-center justify-between font-bold text-blue-950">
                <div className="flex items-center space-x-1.5">
                  <Route className="w-4 h-4 text-blue-600" />
                  <span>Column Lineage Flow: {selectedColumnName}</span>
                </div>
                <button onClick={() => setSelectedColumnName(null)} className="text-blue-600 hover:text-blue-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 text-[11px] text-[#334155] font-sans">
                {columnLineageData.find(c => c.column_name === selectedColumnName)?.description}
              </div>

              <div className="pt-2 border-t border-blue-200 space-y-1.5">
                {columnLineageData.find(c => c.column_name === selectedColumnName)?.path.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#0F172A]">{step.model}</span>
                    <span className="px-1.5 py-0.2 rounded bg-white text-blue-800 border border-blue-200 text-[9px] font-bold">
                      {step.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Stage Contextual Business & Technical Card ──────────────────── */}
      {activeStage && (
        <div className="border border-[#CBD5E1] bg-white rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-[#64748B] mb-1">
                <span className="font-bold text-[#0F172A]">STAGE 0{activeStage.stage_index} OF 07</span>
                <span>&bull;</span>
                <span className="px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[10px] uppercase font-bold text-[#0F172A]">
                  {activeStage.badge}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                {activeStage.title}
              </h2>
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (activeStageIndex > 0) {
                    handleStageSelect(activeStageIndex - 1, stages[activeStageIndex - 1].id);
                  }
                }}
                disabled={activeStageIndex <= 0}
                className="flex items-center space-x-1 px-3 py-1.5 border border-[#CBD5E1] bg-white rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Stage</span>
              </button>
              <button
                onClick={() => {
                  if (activeStageIndex < stages.length - 1) {
                    handleStageSelect(activeStageIndex + 1, stages[activeStageIndex + 1].id);
                  }
                }}
                disabled={activeStageIndex >= stages.length - 1}
                className="flex items-center space-x-1 px-3 py-1.5 border border-[#CBD5E1] bg-white rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 transition-colors"
              >
                <span>Next Stage</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Business & Technical Explanations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>Plain English Business Explanation</span>
              </div>
              <div className="text-xs text-blue-950 leading-relaxed font-sans">
                {activeStage.business_summary}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-1.5">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider font-mono">
                Technical Execution Details
              </div>
              <div className="text-xs text-[#475569] leading-relaxed">
                {activeStage.engineering_explanation.technical_details}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#E2E8F0] bg-white space-y-2">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Automated Quality Gates</span>
              </div>
              <ul className="space-y-1.5 text-xs font-mono text-[#334155]">
                {activeStage.engineering_explanation.quality_checks.map((qc, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{qc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-[#E2E8F0] bg-white space-y-2">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider font-mono">
                Verified In-Memory Metrics
              </div>
              <div className="space-y-1.5 font-mono text-xs divide-y divide-[#F1F5F9]">
                {Object.entries(activeStage.engineering_explanation.verified_metrics).map(([k, v]) => (
                  <div key={k} className="flex justify-between pt-1">
                    <span className="text-[#64748B] capitalize">{k.replace(/_/g, ' ')}:</span>
                    <span className="text-[#0F172A] font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
