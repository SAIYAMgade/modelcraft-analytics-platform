import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.services.source_fetcher import fetch_all_sources
from backend.app.services.warehouse import run_full_pipeline
from backend.app.services.benchmarks import run_analytical_workload_benchmark

def main():
    print("=== STEP 1: VERIFYING & FETCHING REAL OLIST DATASET ===")
    sources = fetch_all_sources(force_download=False)
    for s in sources:
        print(f"-> {s['source_name']}: {s['record_count']} rows, {s['file_size_bytes']} bytes, SHA: {s['file_fingerprint'][:16]}")

    print("\n=== STEP 2: RUNNING FULL BRONZE-SILVER-GOLD PIPELINE ===")
    pipe_res = run_full_pipeline(trigger_type="TEST_VERIFICATION", inject_failure=False)
    print(f"Status: {pipe_res['status']} | Duration: {pipe_res['duration_ms']}ms")
    print(f"Records In (Bronze): {pipe_res['records_in']} | Records Out (Gold): {pipe_res['records_out']}")
    for step in pipe_res.get("steps", []):
        print(f"  [{step['layer']}] {step['step_name']}: {step['status']} ({step['duration_ms']}ms) - {step['details']}")

    print("\n=== STEP 3: RUNNING REAL OLAP BENCHMARK WORKLOAD ===")
    bench_res = run_analytical_workload_benchmark()
    print(f"Benchmark Status: {bench_res['status']} | Throughput: {bench_res['throughput_rec_sec']} rec/s")
    print(f"P50 Latency: {bench_res['query_p50_ms']}ms | P95 Latency: {bench_res['query_p95_ms']}ms")

if __name__ == "__main__":
    main()
