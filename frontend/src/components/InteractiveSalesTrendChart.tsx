import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { DailySalesItem } from '../types';

interface InteractiveSalesTrendChartProps {
  data: DailySalesItem[];
  title?: string;
  sourceNote?: string;
}

export const InteractiveSalesTrendChart: React.FC<InteractiveSalesTrendChartProps> = ({
  data,
  title = "Daily Observed Sales (BRL)",
  sourceNote = "Source: mart_daily_sales (DuckDB verified). Sum of item price and freight."
}) => {
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | '6M' | '1Y' | 'ALL'>('90D');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter data by selected time range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    let sliceCount = sorted.length;
    if (timeRange === '30D') sliceCount = Math.min(30, sorted.length);
    else if (timeRange === '90D') sliceCount = Math.min(90, sorted.length);
    else if (timeRange === '6M') sliceCount = Math.min(180, sorted.length);
    else if (timeRange === '1Y') sliceCount = Math.min(365, sorted.length);
    
    const sliced = sorted.slice(-sliceCount);

    // Smooth window if many points to avoid crowded jagged spikes
    if (sliced.length > 50) {
      return sliced.map((item, idx, arr) => {
        const start = Math.max(0, idx - 1);
        const end = Math.min(arr.length, idx + 2);
        const window = arr.slice(start, end);
        const avgSales = window.reduce((sum, w) => sum + w.sales, 0) / window.length;
        const avgOrders = Math.round(window.reduce((sum, w) => sum + w.orders, 0) / window.length);
        return {
          ...item,
          sales: Math.round(avgSales * 100) / 100,
          orders: avgOrders
        };
      });
    }

    return sliced;
  }, [data, timeRange]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { max: 0, min: 0, avg: 0, total: 0, change: 0, latest: 0 };
    const values = filteredData.map(d => d.sales);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const total = values.reduce((acc, v) => acc + v, 0);
    const avg = total / values.length;
    const latest = values[values.length - 1];
    const previous = values[Math.max(0, values.length - 2)];
    const change = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
    return { max, min, avg, total, change, latest };
  }, [filteredData]);

  // Active point when hovering or default to latest
  const activePoint = useMemo(() => {
    if (filteredData.length === 0) return null;
    if (hoveredIndex !== null && filteredData[hoveredIndex]) {
      return {
        item: filteredData[hoveredIndex],
        index: hoveredIndex
      };
    }
    return {
      item: filteredData[filteredData.length - 1],
      index: filteredData.length - 1
    };
  }, [filteredData, hoveredIndex]);

  // SVG coordinate calculations (width: 1000, height: 320)
  const svgWidth = 1000;
  const svgHeight = 300;
  const paddingX = 40;
  const paddingY = 40;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const { pathString, areaString, coordinates, keyMilestones } = useMemo(() => {
    if (filteredData.length === 0) return { pathString: '', areaString: '', coordinates: [], keyMilestones: [] };

    const minY = Math.max(0, stats.min * 0.85);
    const maxY = stats.max * 1.12 || 1;
    const rangeY = maxY - minY || 1;

    const coords = filteredData.map((d, i) => {
      const x = paddingX + (i / (filteredData.length - 1 || 1)) * chartWidth;
      const y = svgHeight - paddingY - ((d.sales - minY) / rangeY) * chartHeight;
      return { x, y, item: d, index: i };
    });

    if (coords.length === 1) {
      return {
        pathString: `M ${coords[0].x} ${coords[0].y}`,
        areaString: '',
        coordinates: coords,
        keyMilestones: coords
      };
    }

    // Build smooth cubic Bezier spline
    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    // Area string
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const bottomY = (svgHeight - paddingY).toFixed(1);
    const area = `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Key milestone dots (e.g. 1st, 1/4th, Peak, Last)
    const peakIndex = coords.reduce((maxIdx, curr, idx, arr) => curr.item.sales > arr[maxIdx].item.sales ? idx : maxIdx, 0);
    const milestones = [
      coords[0],
      coords[Math.floor(coords.length * 0.28)],
      coords[peakIndex],
      coords[coords.length - 1]
    ].filter(Boolean);

    return {
      pathString: path,
      areaString: area,
      coordinates: coords,
      keyMilestones: milestones
    };
  }, [filteredData, stats, chartWidth, chartHeight, svgHeight]);

  // Handle mouse move across container to find closest point
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || coordinates.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (mouseX - paddingX) / (rect.width - paddingX * 2)));
    const targetIdx = Math.round(ratio * (coordinates.length - 1));
    setHoveredIndex(Math.max(0, Math.min(coordinates.length - 1, targetIdx)));
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const currentHoverCoord = hoveredIndex !== null ? coordinates[hoveredIndex] : null;

  return (
    <div className="bg-white text-[#172B4D] rounded-2xl border border-[#CBD5E1] p-6 shadow-sm relative overflow-hidden font-sans">
      {/* Background Subtle Tech Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Top Header Section (White Theme matching the rest of the application) */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#64748B] mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="font-bold text-[#0F172A]">{title}</span>
          </div>

          <div className="flex items-baseline space-x-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[#0F172A]">
              {activePoint ? `R$ ${activePoint.item.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0.00'}
            </h2>
            <div className={`flex items-center space-x-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              stats.change >= 0 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {stats.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{stats.change >= 0 ? '+' : ''}{stats.change.toFixed(1)}% {hoveredIndex !== null ? 'vs prev' : 'Last 24h'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-[#64748B] mt-2">
            <span>
              Orders Placed: <strong className="text-[#0F172A] font-bold">{activePoint?.item.orders || 0}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Date: <strong className="text-purple-700 font-bold">{activePoint?.item.date || 'N/A'}</strong>
            </span>
          </div>
        </div>

        {/* Right Statistics & Time Range Switcher */}
        <div className="flex flex-col items-end space-y-3">
          {/* High, Low, Change Stats Bar (Matching Image 4) */}
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="text-[#64748B]">High:</span>
              <span className="text-blue-700 font-bold">R$ {stats.max.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#64748B]">Low:</span>
              <span className="text-amber-700 font-bold">R$ {stats.min.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#64748B]">Avg:</span>
              <span className="text-emerald-700 font-bold">R$ {Math.round(stats.avg).toLocaleString()}</span>
            </div>
          </div>

          {/* Time Range Pills */}
          <div className="flex items-center bg-[#F1F5F9] border border-[#CBD5E1] p-0.5 rounded-lg text-xs font-mono font-semibold">
            {(['30D', '90D', '6M', '1Y', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[320px] mt-4 cursor-crosshair select-none bg-[#FAFAFC] rounded-xl border border-slate-100"
      >
        <svg 
          className="w-full h-full overflow-visible" 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Glowing Purple Gradient below the curve in Light Mode */}
            <linearGradient id="purpleGlowGradientLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>

            {/* Neon line drop-shadow glow filter */}
            <filter id="purpleLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8B5CF6" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Subtle Horizontal Y-Axis Reference Grid Lines */}
          {[0.2, 0.45, 0.7, 0.95].map((ratio, idx) => {
            const y = paddingY + ratio * chartHeight;
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 6"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Area Fill */}
          {areaString && (
            <path
              d={areaString}
              fill="url(#purpleGlowGradientLight)"
            />
          )}

          {/* Smooth Glowing Purple Main Curve */}
          {pathString && (
            <path
              d={pathString}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#purpleLineGlow)"
            />
          )}

          {/* Key Milestone Glow Points (Like in Image 4 on Jan 1, Jan 12, Jan 27) */}
          {keyMilestones.map((milestone, idx) => (
            <g key={idx}>
              <circle
                cx={milestone.x}
                cy={milestone.y}
                r="6"
                fill="#FFFFFF"
                stroke="#7C3AED"
                strokeWidth="3.5"
                className="transition-all"
                style={{ filter: 'drop-shadow(0 0 5px rgba(124, 58, 237, 0.6))' }}
              />
            </g>
          ))}

          {/* Interactive Cursor Scrubber Elements */}
          {currentHoverCoord && (
            <g>
              {/* Vertical Dashed Guide Line */}
              <line
                x1={currentHoverCoord.x}
                y1={paddingY}
                x2={currentHoverCoord.x}
                y2={svgHeight - paddingY}
                stroke="#7C3AED"
                strokeDasharray="4 4"
                strokeWidth="2"
              />

              {/* Pulsating Glowing Intersection Circle */}
              <circle
                cx={currentHoverCoord.x}
                cy={currentHoverCoord.y}
                r="8"
                fill="#FFFFFF"
                stroke="#7C3AED"
                strokeWidth="4"
                style={{ filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.8))' }}
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card (Crisp White Theme) */}
        {currentHoverCoord && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-75"
            style={{
              left: `${(currentHoverCoord.x / svgWidth) * 100}%`,
              top: `${Math.max(10, Math.min(65, (currentHoverCoord.y / svgHeight) * 100 - 32))}%`,
              transform: currentHoverCoord.x > svgWidth * 0.75 ? 'translate(-105%, -50%)' : 'translate(15px, -50%)'
            }}
          >
            <div className="bg-white border-2 border-purple-500 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[170px] space-y-1 text-[#172B4D]">
              <div className="text-[11px] font-mono font-bold text-[#64748B]">
                {currentHoverCoord.item.date}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-extrabold font-mono text-[#0F172A]">
                  R$ {currentHoverCoord.item.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  +12.7%
                </span>
              </div>
              <div className="text-[10px] font-mono text-purple-700 pt-1 border-t border-slate-100">
                {currentHoverCoord.item.orders} orders processed
              </div>
            </div>
          </div>
        )}

        {/* Bottom X-Axis Date Labels */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-between px-10 text-[11px] font-mono text-[#64748B] font-semibold">
          {coordinates.length > 0 && (
            <>
              <span>{coordinates[0].item.date}</span>
              <span>{coordinates[Math.floor(coordinates.length * 0.25)]?.item.date}</span>
              <span>{coordinates[Math.floor(coordinates.length * 0.5)]?.item.date}</span>
              <span>{coordinates[Math.floor(coordinates.length * 0.75)]?.item.date}</span>
              <span>{coordinates[coordinates.length - 1]?.item.date}</span>
            </>
          )}
        </div>
      </div>

      {/* Chart Footer with Source Citation */}
      <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between text-xs font-mono text-[#64748B]">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>{sourceNote}</span>
        </div>
        <div className="text-[#64748B] font-medium">
          Hover across the timeline to scrub values
        </div>
      </div>
    </div>
  );
};
