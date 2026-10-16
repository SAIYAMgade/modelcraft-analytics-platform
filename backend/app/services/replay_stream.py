import threading
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import duckdb

from backend.app.database import get_duckdb_conn

class HistoricalEventReplayEngine:
    """
    Simulates high-throughput event streaming / Kafka replay using real historical e-commerce events.
    Enforces clear separation between Event Time (2016-2018 historical occurrence)
    and Ingestion Time (current wall-clock timestamp).
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(HistoricalEventReplayEngine, cls).__new__(cls)
                cls._instance._init_state()
            return cls._instance

    def _init_state(self):
        self.is_running = False
        self.is_paused = False
        self.replay_speed = 100 # Multiplier (e.g. 100x speed)
        self.current_index = 0
        self.total_events = 0
        self.events_processed = 0
        self.events_errored = 0
        self.out_of_order_events = 0
        self.current_event_time: Optional[str] = None
        self.last_ingestion_time: Optional[str] = None
        self.accumulated_stream_revenue = 0.0
        self.recent_events_log: List[Dict[str, Any]] = []
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.cached_event_data: List[Dict[str, Any]] = []

    def load_events(self, limit: int = 5000):
        """Loads chronologically sorted order lifecycle events from the warehouse."""
        try:
            conn = get_duckdb_conn()
            # Check if fact_orders exists
            tables = [r[0] for r in conn.execute("SHOW TABLES").fetchall()]
            if "fact_orders" not in tables:
                conn.close()
                return False
                
            query = f"""
                SELECT 
                    o.order_id,
                    o.customer_id,
                    o.order_status,
                    CAST(o.order_purchase_timestamp AS VARCHAR) AS event_time,
                    o.total_order_cost,
                    o.total_items,
                    o.payment_methods
                FROM fact_orders o
                WHERE o.order_purchase_timestamp IS NOT NULL
                ORDER BY o.order_purchase_timestamp ASC
                LIMIT {limit};
            """
            rows = conn.execute(query).fetchall()
            conn.close()
            
            self.cached_event_data = [
                {
                    "event_id": f"evt_{row[0]}",
                    "order_id": row[0],
                    "customer_id": row[1],
                    "order_status": row[2],
                    "event_time": row[3],
                    "total_cost": float(row[4] or 0.0),
                    "items": int(row[5] or 0),
                    "payment_methods": row[6] or "unknown",
                    "event_type": "ORDER_CREATED"
                }
                for row in rows
            ]
            self.total_events = len(self.cached_event_data)
            self.current_index = 0
            self.events_processed = 0
            self.accumulated_stream_revenue = 0.0
            return True
        except Exception as e:
            print("Error loading replay events:", e)
            return False

    def start_replay(self, speed: int = 100):
        """Starts the background event streaming loop."""
        if not self.cached_event_data:
            success = self.load_events()
            if not success or not self.cached_event_data:
                raise ValueError("No warehouse order events available. Please ingest and process the dataset first.")
                
        self.replay_speed = max(1, speed)
        self.is_running = True
        self.is_paused = False
        self._stop_event.clear()
        
        if self._thread is None or not self._thread.is_alive():
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def pause_replay(self):
        """Pauses stream emission."""
        self.is_paused = True

    def resume_replay(self):
        """Resumes stream emission."""
        self.is_paused = False

    def reset_replay(self):
        """Resets stream replay back to the beginning."""
        self.is_running = False
        self.is_paused = False
        self._stop_event.set()
        self.current_index = 0
        self.events_processed = 0
        self.accumulated_stream_revenue = 0.0
        self.recent_events_log.clear()

    def set_speed(self, speed: int):
        """Updates replay speed."""
        self.replay_speed = max(1, speed)

    def _run_loop(self):
        """Background thread streaming events."""
        while self.is_running and not self._stop_event.is_set():
            if self.is_paused:
                time.sleep(0.2)
                continue
                
            if self.current_index >= len(self.cached_event_data):
                self.is_running = False
                break
                
            event = self.cached_event_data[self.current_index]
            self.current_index += 1
            self.events_processed += 1
            self.current_event_time = event["event_time"]
            self.last_ingestion_time = datetime.utcnow().isoformat()
            self.accumulated_stream_revenue += event["total_cost"]
            
            # Detect simulated out-of-order jitter if any
            if len(self.recent_events_log) > 0:
                prev_time = self.recent_events_log[-1]["event_time"]
                if event["event_time"] < prev_time:
                    self.out_of_order_events += 1
                    
            event_entry = {
                "event_id": event["event_id"],
                "order_id": event["order_id"],
                "event_type": event["event_type"],
                "event_time": event["event_time"],
                "ingestion_time": self.last_ingestion_time,
                "amount": event["total_cost"],
                "payment_methods": event["payment_methods"],
                "status": "ACKNOWLEDGED"
            }
            self.recent_events_log.append(event_entry)
            if len(self.recent_events_log) > 50:
                self.recent_events_log.pop(0)
                
            # Sleep inversely proportional to replay speed
            sleep_time = max(0.005, 0.5 / self.replay_speed)
            time.sleep(sleep_time)

    def get_status(self) -> Dict[str, Any]:
        """Returns the streaming engine metrics and diagnostics."""
        reconciliation_pct = 0.0
        if self.total_events > 0:
            reconciliation_pct = round((self.events_processed / self.total_events) * 100.0, 1)
            
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "replay_speed": self.replay_speed,
            "total_events": self.total_events,
            "events_processed": self.events_processed,
            "events_errored": self.events_errored,
            "out_of_order_events": self.out_of_order_events,
            "current_event_time": self.current_event_time,
            "last_ingestion_time": self.last_ingestion_time,
            "accumulated_stream_revenue": round(self.accumulated_stream_revenue, 2),
            "reconciliation_pct": reconciliation_pct,
            "recent_events": list(reversed(self.recent_events_log[-15:]))
        }

replay_engine = HistoricalEventReplayEngine()
