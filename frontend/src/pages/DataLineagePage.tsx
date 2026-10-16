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
  GitBranch, 
  Search, 
  Filter, 
  Database, 
  Layers, 
  Table2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  ExternalLink, 
  ChevronRight, 
  ListFilter,
  Eye,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Workflow,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { api } from '../services/api';
import { LineageGraph, LineageNode, LineageEdge, ModelMetadata } from '../types';
import { TableNode } from '../components/graph/TableNode';
import { getLayoutedElements } from '../components/graph/dagreLayout';

const nodeTypes = {
  tableNode: TableNode,
};

interface DataLineagePageProps {
  initialSelectedModel?: string;
  onNavigateToModel?: (modelName: string) => void;
}

export const DataLineagePage: React.FC<DataLineagePageProps> = ({
  initialSelectedModel,
  onNavigateToModel
}) => {
  const [graph, setGraph] = useState<LineageGraph | null>(null);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedModel || 'fact_orders');
  const [layerFilter, setLayerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'canvas' | 'columns' | 'tree'>('canvas');
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

  // Flow canvas state
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  // Auto-fit whenever fullscreen or layout changes
  useEffect(() => {
    if (reactFlowInstance && rfNodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.12, duration: 250 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, isFullscreen, layerFilter]);

  useEffect(() => {
    const loadLineage = async () => {
      try {
        setLoading(true);
        const [gData, mData] = await Promise.all([
          api.getAnalyticsEngineeringLineage(),
          api.getAnalyticsEngineeringModels()
        ]);
        setGraph(gData);
        setModels(mData);
        if (initialSelectedModel) {
          setSelectedNodeId(initialSelectedModel);
        } else if (gData.nodes.length > 0 && !selectedNodeId) {
          setSelectedNodeId('fact_orders');
        }
      } catch (err) {
        console.error('Failed to load lineage graph:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLineage();
  }, [initialSelectedModel]);

  // Compute upstream and downstream dependencies for selected node
  const activeLineage = useMemo(() => {
    if (!graph || !selectedNodeId) return { upstreams: new Set<string>(), downstreams: new Set<string>() };

    const upstreams = new Set<string>();
    const downstreams = new Set<string>();

    // BFS Upstream
    const queueUp = [selectedNodeId];
    while (queueUp.length > 0) {
      const current = queueUp.shift()!;
      for (const edge of graph.edges) {
        if (edge.target === current && !upstreams.has(edge.source)) {
          upstreams.add(edge.source);
          queueUp.push(edge.source);
        }
      }
    }

    // BFS Downstream
    const queueDown = [selectedNodeId];
    while (queueDown.length > 0) {
      const current = queueDown.shift()!;
      for (const edge of graph.edges) {
        if (edge.source === current && !downstreams.has(edge.target)) {
          downstreams.add(edge.target);
          queueDown.push(edge.target);
        }
      }
    }

    return { upstreams, downstreams };
  }, [graph, selectedNodeId]);

  // React Flow elements calculation
  useEffect(() => {
    if (!graph) return;

    const filteredNodes = graph.nodes.filter(n => {
      const matchesSearch = searchQuery === '' ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLayer = layerFilter === 'ALL' || n.layer.toUpperCase() === layerFilter.toUpperCase();
      return matchesSearch && matchesLayer;
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graph.edges.filter(
      e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );

    const nodesToLayout: Node[] = filteredNodes.map(n => {
      const isSelected = selectedNodeId === n.id;
      const isUpstream = activeLineage.upstreams.has(n.id);
      const isDownstream = activeLineage.downstreams.has(n.id);
      const isDimmed = selectedNodeId !== null && !isSelected && !isUpstream && !isDownstream;
      const isHighlighted = isUpstream || isDownstream;

      return {
        id: n.id,
        type: 'tableNode',
        position: { x: 0, y: 0 },
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
          isHighlighted
        }
      };
    });

    const edgesToLayout: Edge[] = filteredEdges.map(e => {
      const edgeId = `${e.source}->${e.target}`;
      const isDirectlyActive = 
        (selectedNodeId === e.source && (activeLineage.downstreams.has(e.target) || e.target === selectedNodeId)) ||
        (selectedNodeId === e.target && (activeLineage.upstreams.has(e.source) || e.source === selectedNodeId)) ||
        (activeLineage.upstreams.has(e.source) && (activeLineage.upstreams.has(e.target) || e.target === selectedNodeId)) ||
        ((activeLineage.downstreams.has(e.source) || e.source === selectedNodeId) && activeLineage.downstreams.has(e.target));

      const isDimmed = selectedNodeId !== null && !isDirectlyActive;

      const edgeColor = isDirectlyActive ? '#DC2626' : '#0F172A';
      const edgeWidth = isDirectlyActive ? 4.0 : 2.4;
      const glowFilter = isDirectlyActive
        ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.95))'
        : 'none';

      return {
        id: edgeId,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
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
          strokeDasharray: isDirectlyActive ? 'none' : '6 6',
          opacity: isDimmed ? 0.75 : 1.0,
          transition: 'all 0.2s ease'
        }
      };
    });

    const layouted = getLayoutedElements(nodesToLayout, edgesToLayout, {
      direction: 'LR',
      nodeWidth: 330,
      rankSep: 110,
      nodeSep: 40
    });

    setRfNodes(layouted.nodes);
    setRfEdges(layouted.edges);
  }, [graph, layerFilter, searchQuery, selectedNodeId, activeLineage]);

  // Group nodes by layer for column-based DAG layout
  const layeredNodes = useMemo(() => {
    if (!graph) return { sources: [], staging: [], intermediate: [], marts_core: [], marts_analytics: [], snapshots: [], consumers: [] };
    
    const filterNode = (n: LineageNode) => {
      const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            n.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLayer = layerFilter === 'ALL' || n.layer.toUpperCase() === layerFilter.toUpperCase();
      return matchesSearch && matchesLayer;
    };

    const groups: Record<string, LineageNode[]> = {
      sources: [],
      staging: [],
      intermediate: [],
      marts_core: [],
      marts_analytics: [],
      snapshots: [],
      consumers: []
    };

    for (const node of graph.nodes) {
      if (filterNode(node)) {
        if (groups[node.layer]) {
          groups[node.layer].push(node);
        } else {
          groups['marts_core'].push(node);
        }
      }
    }

    return groups;
  }, [graph, layerFilter, searchQuery]);

  const selectedNode = graph?.nodes.find(n => n.id === selectedNodeId);
  const selectedModelMeta = models.find(m => m.name === selectedNodeId);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Page Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold text-[#334155] mb-2 font-mono">
            <GitBranch className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Dependency DAG &bull; Left to Right Flow</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Model Lineage & DAG Explorer
          </h1>
          <p className="mt-1 text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Live directed acyclic graph compiled from dbt manifest artifacts. Trace upstream provenance, evaluate downstream blast radius, and audit table grains.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1 font-mono text-xs">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'canvas' ? 'bg-white text-[#172B4D] shadow-sm' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Interactive Graph Canvas
            </button>
            <button
              onClick={() => setViewMode('columns')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'columns' ? 'bg-white text-[#172B4D] shadow-sm' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              DAG Columns
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'tree' ? 'bg-white text-[#172B4D] shadow-sm' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Layer List
            </button>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-sm font-mono text-xs">
        {/* Layer Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'SOURCES', 'STAGING', 'INTERMEDIATE', 'MARTS_CORE', 'MARTS_ANALYTICS'].map(layer => (
            <button
              key={layer}
              onClick={() => setLayerFilter(layer)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                layerFilter === layer
                  ? 'bg-[#334155] text-white font-semibold shadow-sm'
                  : 'text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100'
              }`}
            >
              {layer.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search models or tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#172B4D] placeholder-[#64748B] focus:outline-none focus:border-[#334155] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Main Workspace Layout: Visual DAG + Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Graph / Tree Area */}
        <div 
          ref={fullscreenContainerRef}
          className={`${
            isFullscreen ? 'fixed inset-0 z-[99999] bg-white p-6 w-screen h-screen overflow-hidden flex flex-col' : 'lg:col-span-8 space-y-4'
          }`}
        >
          {viewMode === 'canvas' ? (
            /* React Flow Canvas DAG */
            <div className={`bg-white border-2 border-slate-300 rounded-2xl relative shadow-md overflow-hidden ${
              isFullscreen ? 'h-full flex-1' : 'h-[720px]'
            } flex flex-col`}>
              <div className="bg-white border-b-2 border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#0F172A] z-10 shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[#0F172A] font-bold text-sm">
                    {rfNodes.length} Nodes &bull; {rfEdges.length} Directed Connectors
                  </span>
                  <span className="text-slate-500 font-semibold">(Left &rarr; Right Flow)</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => reactFlowInstance?.fitView({ padding: 0.12, duration: 300 })}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-bold text-xs"
                    title="Fit diagram into viewport"
                  >
                    Fit Diagram
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-[#0F172A] hover:bg-slate-800 text-white rounded text-xs font-mono font-semibold transition-all shadow-xs"
                    title="Toggle Fullscreen View"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Exit (Esc)</span>
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
              <div className="flex-1 w-full h-full relative bg-white">
                <ReactFlow
                  key={`${layerFilter}-${rfNodes.length}-${isFullscreen ? 'fs' : 'norm'}`}
                  nodes={rfNodes}
                  edges={rfEdges}
                  nodeTypes={nodeTypes}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
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
                    className="!bg-white !border-2 !border-slate-300 !rounded-lg !shadow-md !w-36 !h-24"
                  />
                </ReactFlow>
              </div>
            </div>
          ) : viewMode === 'columns' ? (
            /* Visual Columnar DAG */
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 shadow-sm overflow-x-auto min-h-[620px]">
              <div className="min-w-[1000px] flex gap-6">
                {/* 1. SOURCES */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>1. Sources</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.sources.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.sources.map(n => renderNodeCard(n))}
                  </div>
                </div>

                {/* 2. STAGING */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>2. Staging</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.staging.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.staging.map(n => renderNodeCard(n))}
                  </div>
                </div>

                {/* 3. INTERMEDIATE */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>3. Intermediate</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.intermediate.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.intermediate.map(n => renderNodeCard(n))}
                  </div>
                </div>

                {/* 4. MARTS CORE */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>4. Core Schema</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.marts_core.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.marts_core.map(n => renderNodeCard(n))}
                  </div>
                </div>

                {/* 5. MARTS ANALYTICS */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>5. Analytics Marts</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.marts_analytics.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.marts_analytics.map(n => renderNodeCard(n))}
                  </div>
                </div>

                {/* 6. CONSUMERS */}
                <div className="flex-1 space-y-3">
                  <div className="text-xs uppercase text-[#64748B] font-bold border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                    <span>6. Consumers</span>
                    <span className="text-[10px] bg-slate-200 text-[#334155] px-1.5 py-0.5 rounded font-mono">{layeredNodes.consumers.length}</span>
                  </div>
                  <div className="space-y-2">
                    {layeredNodes.consumers.map(n => renderNodeCard(n))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Hierarchical List / Tree View */
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 divide-y divide-[#E2E8F0] shadow-sm">
              {['sources', 'staging', 'intermediate', 'marts_core', 'marts_analytics', 'snapshots', 'consumers'].map(layerKey => {
                const nodesInLayer = graph?.nodes.filter(n => n.layer === layerKey) || [];
                if (nodesInLayer.length === 0) return null;

                return (
                  <div key={layerKey} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase text-[#172B4D] font-bold">
                        {layerKey.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {nodesInLayer.length} components
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nodesInLayer.map(n => renderNodeCard(n, true))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Node Inspector Drawer */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6 shadow-sm sticky top-20">
          {selectedNode ? (
            <>
              {/* Node Title & Layer */}
              <div className="border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155]">
                    {selectedNode.layer.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#64748B] capitalize">
                    {selectedNode.materialization || selectedNode.type}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-mono text-[#172B4D] tracking-tight break-all">
                  {selectedNode.label}
                </h3>
                <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                  {selectedNode.description || selectedModelMeta?.business_description}
                </p>
              </div>

              {/* Verified Metrics: Rows & Tests */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Row Count</span>
                  <span className="text-sm font-mono font-bold text-[#172B4D] mt-0.5 block">
                    {selectedNode.row_count > 0 ? selectedNode.row_count.toLocaleString() : 'Computed View'}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Tests Passing</span>
                  <span className="text-sm font-mono font-bold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedNode.tests_count || selectedModelMeta?.tests_count || 0} Passed</span>
                  </span>
                </div>
              </div>

              {/* Grain & Primary Keys */}
              {selectedModelMeta && (
                <div className="space-y-3 p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Declared Grain</span>
                    <span className="text-xs text-[#172B4D] font-medium">{selectedModelMeta.grain}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Primary Key</span>
                    <span className="text-xs font-mono text-[#172B4D] font-bold">
                      {selectedModelMeta.primary_keys.join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* Upstream & Downstream Lineage Lists */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] mb-2">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    <span>Direct Upstream ({activeLineage.upstreams.size})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {Array.from(activeLineage.upstreams).map(up => (
                      <button
                        key={up}
                        onClick={() => setSelectedNodeId(up)}
                        className="px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-mono text-[#334155] hover:border-slate-400 transition-colors"
                      >
                        {up}
                      </button>
                    ))}
                    {activeLineage.upstreams.size === 0 && (
                      <span className="text-xs text-[#64748B] italic">None (Root source)</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] mb-2">
                    <ArrowDownRight className="w-4 h-4 text-purple-600" />
                    <span>Downstream Scope ({activeLineage.downstreams.size})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {Array.from(activeLineage.downstreams).map(down => (
                      <button
                        key={down}
                        onClick={() => setSelectedNodeId(down)}
                        className="px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-mono text-[#334155] hover:border-slate-400 transition-colors"
                      >
                        {down}
                      </button>
                    ))}
                    {activeLineage.downstreams.size === 0 && (
                      <span className="text-xs text-[#64748B] italic">None (Terminal mart)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Jump to SQL Explorer */}
              {selectedModelMeta && onNavigateToModel && (
                <button
                  onClick={() => onNavigateToModel(selectedModelMeta.name)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#334155] hover:bg-[#1E293B] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm font-mono"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Inspect SQL & Schema</span>
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-[#64748B] text-xs font-mono">
              Select any node in the DAG graph to inspect dependencies, grain, schema tests, and SQL logic.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderNodeCard(node: LineageNode, compact: boolean = false) {
    const isSelected = node.id === selectedNodeId;
    const isUpstream = activeLineage.upstreams.has(node.id);
    const isDownstream = activeLineage.downstreams.has(node.id);

    let cardClasses = 'bg-white border-[#E2E8F0] text-[#172B4D] hover:border-slate-300 hover:bg-slate-50';
    if (isSelected) {
      cardClasses = 'bg-slate-100/90 border-[#334155] text-[#172B4D] shadow-sm ring-1 ring-[#334155]/20';
    } else if (isUpstream) {
      cardClasses = 'bg-blue-50/60 border-blue-300 text-blue-900';
    } else if (isDownstream) {
      cardClasses = 'bg-purple-50/60 border-purple-300 text-purple-900';
    }

    return (
      <button
        key={node.id}
        onClick={() => setSelectedNodeId(node.id)}
        className={`w-full text-left p-3 rounded-lg border transition-all text-xs group shadow-sm focus:outline-none ${cardClasses}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="truncate font-mono font-semibold tracking-tight text-xs">
            {node.label}
          </span>
          {isSelected && (
            <span className="w-2 h-2 rounded-full bg-[#334155] shrink-0"></span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#64748B]">
          <span className="capitalize">{node.materialization || node.type}</span>
          <span className="font-mono">{node.row_count > 0 ? `${node.row_count.toLocaleString()} rows` : ''}</span>
        </div>
      </button>
    );
  }
};
