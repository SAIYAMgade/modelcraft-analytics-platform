import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StreamingStatus } from '../types';
import { 
  Radio, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Activity, 
  CheckCircle2, 
  Clock, 
  HelpCircle
} from 'lucide-react';

export const StreamingPage: React.FC = () => {
  const [status, setStatus] = useState<StreamingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<number>(100);

  const fetchStatus = async () => {
    try {
      const data = await api.getStreamingStatus();
      setStatus(data);
    } catch (e) {
      console.error('Error fetching stream status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (action: string, newSpeed?: number) => {
    try {
      setLoading(true);
      const res = await api.controlStream(action, newSpeed ?? speed);
      setStatus(res);
    } catch (e: any) {
      alert(`Streaming control error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Mandatory Label */}
      <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
            Event-Driven Architecture (Streaming / Replay)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Historical Event Replay
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Controlled simulation of Kafka streaming using genuine historical order events. 
            Demonstrates real-time state reconstruction, event-time windowing, and stream-to-batch reconciliation.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!status?.is_running || status?.is_paused ? (
            <button
              onClick={() => handleControl(status?.is_paused ? 'resume' : 'start')}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-white bg-white text-black font-mono text-xs font-semibold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{status?.is_paused ? 'Resume' : 'Start Replay'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleControl('pause')}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-700 bg-neutral-900 text-white font-mono text-xs font-semibold rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => handleControl('reset')}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-800 bg-black text-neutral-300 font-mono text-xs rounded hover:bg-neutral-900 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Speed & Stream Configuration Bar */}
      <div className="border border-neutral-800 bg-neutral-950 p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-neutral-400">REPLAY SPEED:</span>
          {[10, 50, 100, 500].map(s => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                handleControl('set_speed', s);
              }}
              className={`px-2.5 py-1 rounded transition-colors ${
                status?.replay_speed === s
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4 text-neutral-400">
          <div>
            <span>Stream Status: </span>
            <span className="text-white font-bold">
              {status?.is_running ? (status?.is_paused ? 'PAUSED' : 'STREAMING') : 'IDLE'}
            </span>
          </div>
          <div>
            <span>Reconciliation: </span>
            <span className="text-white font-bold">{status?.reconciliation_pct || 0}%</span>
          </div>
        </div>
      </div>

      {/* Distinction Explanation: Event Time vs Ingestion Time */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-white" />
          <span>Core Engineering Distinction: Event Time vs Ingestion Time</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="border border-neutral-800 bg-black p-4 rounded space-y-2">
            <div className="text-neutral-400 uppercase text-[10px] tracking-wider">Historical Occurrence</div>
            <div className="text-white font-bold text-sm">Event Time</div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              The immutable point in time when the order was placed by the customer in Brazil (2016-2018).
            </p>
            <div className="text-neutral-200 border-t border-neutral-900 pt-2 text-[11px]">
              Current Event: <code className="text-white">{status?.current_event_time || 'Waiting for stream'}</code>
            </div>
          </div>

          <div className="border border-neutral-800 bg-black p-4 rounded space-y-2">
            <div className="text-neutral-400 uppercase text-[10px] tracking-wider">Wall-Clock Processing</div>
            <div className="text-white font-bold text-sm">Ingestion Time</div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              The wall-clock timestamp when this data platform's consumer reads and acknowledges the message.
            </p>
            <div className="text-neutral-200 border-t border-neutral-900 pt-2 text-[11px]">
              Last Processed: <code className="text-white">{status?.last_ingestion_time?.slice(11, 19) || 'Idle'}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs font-mono uppercase mb-1">Streamed Events</div>
          <div className="text-2xl font-bold text-white font-mono">
            {status?.events_processed.toLocaleString() || '0'} / {status?.total_events.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Total acknowledged events</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs font-mono uppercase mb-1">Accumulated GMV</div>
          <div className="text-2xl font-bold text-white font-mono">
            R$ {status?.accumulated_stream_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Reconstructed from stream</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs font-mono uppercase mb-1">Out-of-Order Events</div>
          <div className="text-2xl font-bold text-white font-mono">
            {status?.out_of_order_events || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Temporal jitter detected</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded">
          <div className="text-neutral-400 text-xs font-mono uppercase mb-1">Replay Multiplier</div>
          <div className="text-2xl font-bold text-white font-mono">
            {status?.replay_speed || 100}x
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Historical time acceleration</div>
        </div>
      </div>

      {/* Recent Streamed Events Log Table */}
      <div className="border border-neutral-800 rounded bg-neutral-950 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
              Recent Ingestion Stream Feed (Last 15 Events)
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Consumer Ack: At-Least-Once Delivery
          </span>
        </div>

        {!status?.recent_events || status.recent_events.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-400">
            Event buffer empty. Click "Start Replay" to initiate streaming.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-neutral-300">
              <thead className="bg-neutral-900/80 border-b border-neutral-800 text-[11px] text-neutral-400 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Event ID</th>
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Event Time (Historical)</th>
                  <th className="py-2.5 px-4">Ingestion Time (Wall-Clock)</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Payment Method</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {status.recent_events.map((evt) => (
                  <tr key={evt.event_id} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">{evt.event_id.slice(0, 14)}...</td>
                    <td className="py-2.5 px-4 text-neutral-300">{evt.order_id.slice(0, 12)}...</td>
                    <td className="py-2.5 px-4 text-neutral-400">{evt.event_time}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{evt.ingestion_time.slice(11, 23)}</td>
                    <td className="py-2.5 px-4 text-white font-semibold">R$ {evt.amount.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{evt.payment_methods}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="px-2 py-0.5 border border-neutral-700 bg-neutral-900 rounded text-[10px] text-neutral-200">
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
