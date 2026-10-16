import React, { useState } from 'react';

interface BarDataPoint {
  label: string;
  value: number;
  sublabel?: string;
}

interface LineDataPoint {
  x: string;
  y: number;
}

interface MonochromeBarChartProps {
  data: BarDataPoint[];
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

export const MonochromeBarChart: React.FC<MonochromeBarChartProps> = ({
  data,
  height = 240,
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-dashed border-[#E2E8F0] text-[#64748B] font-mono text-xs rounded-lg"
        style={{ height }}
      >
        No chart records available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Gridlines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
      </div>

      {/* SVG Bars */}
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barHeightPct = (d.value / maxValue) * 85;
          const isHovered = hoveredIdx === i;
          return (
            <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <rect
                x={`${i * barWidth + barWidth * 0.15}%`}
                y={`${100 - barHeightPct}%`}
                width={`${barWidth * 0.7}%`}
                height={`${barHeightPct}%`}
                rx="3"
                className={`transition-all duration-150 cursor-pointer ${
                  isHovered ? 'fill-[#1E293B] stroke-[#0F172A]' : 'fill-[#64748B] hover:fill-[#334155]'
                }`}
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 pointer-events-none bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono text-white"
          style={{
            left: `${Math.min(85, Math.max(10, hoveredIdx * barWidth + barWidth / 2))}%`,
            top: '10%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-slate-400 text-[10px] uppercase tracking-wider">{data[hoveredIdx].label}</div>
          <div className="font-semibold text-white">
            {valuePrefix}{data[hoveredIdx].value.toLocaleString()}{valueSuffix}
          </div>
          {data[hoveredIdx].sublabel && (
            <div className="text-slate-300 text-[10px]">{data[hoveredIdx].sublabel}</div>
          )}
        </div>
      )}

      {/* X-axis labels */}
      <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono mt-2 truncate">
        {data.length <= 15 ? (
          data.map((d, i) => (
            <span key={i} className="truncate text-center" style={{ width: `${barWidth}%` }}>
              {d.label.slice(0, 10)}
            </span>
          ))
        ) : (
          <>
            <span>{data[0]?.label}</span>
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </>
        )}
      </div>
    </div>
  );
};

interface MonochromeLineChartProps {
  data: LineDataPoint[];
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

export const MonochromeLineChart: React.FC<MonochromeLineChartProps> = ({
  data,
  height = 240,
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center border border-dashed border-[#E2E8F0] text-[#64748B] font-mono text-xs rounded-lg"
        style={{ height }}
      >
        No time-series data available
      </div>
    );
  }

  const maxY = Math.max(...data.map(d => d.y), 1);
  const minY = Math.min(...data.map(d => d.y), 0);
  const rangeY = maxY - minY || 1;

  // Compute SVG polyline points
  const points = data.map((d, i) => {
    const xPct = (i / (data.length - 1 || 1)) * 100;
    const yPct = 100 - ((d.y - minY) / rangeY) * 85 - 5;
    return `${xPct},${yPct}`;
  }).join(' ');

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Grid */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
        <div className="border-b border-slate-200 w-full" />
      </div>

      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Fill area below line */}
        <polygon
          points={`0,100 ${points} 100,100`}
          className="fill-slate-100"
        />

        {/* Primary Line */}
        <polyline
          fill="none"
          stroke="#334155"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Hover interaction overlay points */}
        {data.map((d, i) => {
          const xPct = (i / (data.length - 1 || 1)) * 100;
          const yPct = 100 - ((d.y - minY) / rangeY) * 85 - 5;
          const isHovered = hoveredIdx === i;
          return (
            <circle
              key={i}
              cx={xPct}
              cy={yPct}
              r={isHovered ? 4 : 2}
              className={`transition-all cursor-pointer ${
                isHovered ? 'fill-[#0F172A] stroke-white stroke-2' : 'fill-[#64748B]'
              }`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 pointer-events-none bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono text-white"
          style={{
            left: `${Math.min(85, Math.max(15, (hoveredIdx / (data.length - 1 || 1)) * 100))}%`,
            top: '5%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-slate-400 text-[10px]">{data[hoveredIdx].x}</div>
          <div className="font-semibold text-white">
            {valuePrefix}{data[hoveredIdx].y.toLocaleString()}{valueSuffix}
          </div>
        </div>
      )}

      {/* Date labels */}
      <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono mt-2">
        <span>{data[0]?.x}</span>
        <span>{data[Math.floor(data.length / 2)]?.x}</span>
        <span>{data[data.length - 1]?.x}</span>
      </div>
    </div>
  );
};
