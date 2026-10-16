import dagre from '@dagrejs/dagre';
import { Node, Edge, Position } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Computes an organized, non-overlapping Directed Acyclic Graph layout using Dagre.
 * Positions nodes from Left-to-Right (or Top-to-Bottom) with sensible rank and node separation.
 */
export function getLayoutedElements<T extends Record<string, any>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node<T>[]; edges: Edge[] } {
  const {
    direction = 'LR',
    nodeWidth = 300,
    nodeHeight = 220,
    rankSep = 140,
    nodeSep = 50
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: 40,
    marginy: 40
  });

  nodes.forEach((node) => {
    // Dynamic height based on whether columns are expanded
    const isExpanded = node.data?.isExpanded !== false;
    const colCount = Array.isArray(node.data?.columns) ? node.data.columns.length : 0;
    const calculatedHeight = isExpanded ? Math.min(480, Math.max(160, 100 + colCount * 26)) : 130;
    
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: calculatedHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isExpanded = node.data?.isExpanded !== false;
    const colCount = Array.isArray(node.data?.columns) ? node.data.columns.length : 0;
    const calculatedHeight = isExpanded ? Math.min(480, Math.max(160, 100 + colCount * 26)) : 130;

    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - nodeWidth / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - calculatedHeight / 2 : 0
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}
