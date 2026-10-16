import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
} from '@xyflow/react';

export interface CardinalityEdgeData {
  cardinality?: string; // e.g. "1 : N"
  joinCondition?: string; // e.g. "customer_key = customer_key"
  isHighlighted?: boolean;
}

export const CardinalityEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const edgeData = data as CardinalityEdgeData | undefined;
  const isHighlighted = selected || edgeData?.isHighlighted;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHighlighted ? 4.0 : 2.5,
          stroke: isHighlighted ? '#DC2626' : '#0F172A',
          filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.95))' : 'none',
          strokeDasharray: isHighlighted ? 'none' : '6 6',
          transition: 'all 0.2s ease',
        }}
      />
      {edgeData?.cardinality && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight border shadow-xs transition-all cursor-pointer ${
                isHighlighted
                  ? 'bg-[#DC2626] text-white border-[#DC2626] ring-2 ring-red-400/50 scale-110 shadow-[0_0_12px_#DC2626]'
                  : 'bg-white text-[#0F172A] border-slate-400 hover:border-slate-800 hover:scale-105'
              }`}
              title={edgeData.joinCondition || `Relationship: ${edgeData.cardinality}`}
            >
              {edgeData.cardinality}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
