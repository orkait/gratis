import requests
import re
import math
import os
import json
import concurrent.futures
import typer
import time
from typing import List, Optional
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich import box

app = typer.Typer()
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

def fetch_openrouter_free():
    resp = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
    resp.raise_for_status()
    return [m for m in resp.json().get("data", []) if m.get("pricing", {}).get("prompt") == "0" and m.get("pricing", {}).get("completion") == "0"]

def fetch_models_dev():
    try:
        resp = requests.get("https://models.dev/api.json", timeout=10)
        return resp.json()
    except: return {}

def estimate_parameters(model_id, name):
    text = f"{model_id} {name}".lower()
    matches = re.findall(r'(?<![x\da])(\d+(?:\.\d+)?)\s*b\b', text)
    if matches: return max(float(m) for m in matches)
    moe = re.findall(r'(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b', text)
    if moe: return max(float(m[0]) * float(m[1]) for m in moe)
    return 1.0

def fetch_endpoint_stats(model_id):
    try:
        headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"} if OPENROUTER_API_KEY else {}
        resp = requests.get(f"https://openrouter.ai/api/v1/models/{model_id}/endpoints", headers=headers, timeout=5)
        if resp.status_code == 200:
            endpoints = resp.json().get("data", {}).get("endpoints", [])
            if endpoints:
                ep = endpoints[0]
                tps = ep.get("throughput_last_30m", None)
                if isinstance(tps, dict): tps = tps.get("p50", None)
                return {"provider": ep.get("provider_name", "Unknown"), "uptime": ep.get("uptime_last_1d", 0) or 0, "tps": tps}
    except: pass
    return {"provider": "Unknown", "uptime": 0, "tps": None}

def normalize(val, min_v, max_v):
    if max_v <= min_v: return 0.0
    return (val - min_v) / (max_v - min_v)

@app.command()
def rank(
    sort: List[str] = typer.Option(["balanced"], "--sort", "-s", help="Columns to sort by"),
    desc: bool = typer.Option(True, "--desc/--asc"),
    ttl: int = typer.Option(60, "--ttl"),
    force: bool = typer.Option(False, "--force", "-f")
):
    """
    Ultimate Balanced LLM Ranker. Uses weighted normalization to find the 'Most Optimal' model.
    """
    console = Console()
    cache_file = "rankings_data.json"
    
    final_list = []
    if not force and os.path.exists(cache_file) and (time.time() - os.path.getmtime(cache_file)) < (ttl * 60):
        console.print(f"[dim]⚡ Loading cache...[/dim]")
        with open(cache_file, "r") as f: final_list = json.load(f)
    else:
        with console.status("[bold green]Syncing metrics...[/bold green]"):
            or_free = fetch_openrouter_free()
            md_raw = fetch_models_dev()
            md_db = {}
            for p, p_data in md_raw.items():
                if "models" in p_data:
                    for m_id, m_data in p_data["models"].items(): md_db[m_id.lower()] = m_data
            
            endpoint_stats_map = {}
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                future_to_model = {executor.submit(fetch_endpoint_stats, m["id"]): m["id"] for m in or_free}
                for future in concurrent.futures.as_completed(future_to_model):
                    endpoint_stats_map[future_to_model[future]] = future.result()
            
            for m in or_free:
                sid = m["id"].split("/")[-1].split(":")[0].lower()
                md = md_db.get(sid) or next((v for k,v in md_db.items() if sid in k or k in sid), None)
                params = estimate_parameters(sid, m["name"])
                ctx = m.get("context_length", 0)
                if md and md.get("limit", {}).get("context", 0) > 0: ctx = md["limit"]["context"]
                cap = params * (math.log10(ctx + 1) if ctx > 0 else 1.0)
                stats = endpoint_stats_map.get(m["id"], {"provider": "Unknown", "uptime": 0, "tps": 0})
                
                final_list.append({
                    "id": m["id"], "params": params, "ctx": ctx,
                    "tools": 1 if (md and md.get("tool_call")) or "tool_choice" in m.get("supported_parameters", []) else 0,
                    "brain": 1 if (md and md.get("reasoning")) or "reasoning" in m.get("supported_parameters", []) else 0,
                    "open": 1 if md and md.get("open_weights") else 0,
                    "uptime": stats["uptime"], "tps": stats["tps"] or 0, "capability": cap
                })
            
            # --- CALCULATE OPTIMAL BALANCED SCORE ---
            # 1. Prepare metrics with Log-scaling for TPS to prevent outliers from skewing
            for x in final_list:
                # If TPS is masked, give it a baseline of 5.0 so it doesn't get zeroed out
                eff_tps = x['tps'] if x['tps'] > 0 else 5.0
                x['_log_tps'] = math.log10(eff_tps + 1)
            
            caps = [x['capability'] for x in final_list]
            log_tpss = [x['_log_tps'] for x in final_list]
            uptimes = [x['uptime'] for x in final_list]
            
            min_cap, max_cap = min(caps), max(caps)
            min_ltps, max_log_tps = min(log_tpss), max(log_tpss)
            min_up, max_up = min(uptimes), max(uptimes)
            
            for m in final_list:
                # Weights: Intelligence(60%) + Reasoning(20%) + Speed(10%) + Reliability(10%)
                s_cap = normalize(m['capability'], min_cap, max_cap) * 0.6
                s_brain = m['brain'] * 0.2
                s_tps = normalize(m['_log_tps'], min_ltps, max_log_tps) * 0.1
                s_uptime = normalize(m['uptime'], min_up, max_up) * 0.1
                
                m['balanced'] = (s_cap + s_brain + s_tps + s_uptime) * 100
                m['value'] = m['capability'] / 0.01

            with open(cache_file, "w") as f: json.dump(final_list, f, indent=2)

    # Sort
    final_list.sort(key=lambda x: [x.get(col, 0) for col in sort], reverse=desc)
    
    table = Table(title="🏆 THE ULTIMATE ZERO-COST LLM MASTER LIST (BALANCED)", header_style="white bold", box=box.HEAVY_EDGE, show_lines=True)
    table.add_column("#", justify="right", style="white")
    table.add_column("Model ID", style="white")
    table.add_column("Balanced", justify="right", style="white")
    table.add_column("Params", justify="right", style="white")
    table.add_column("Context", justify="right", style="white")
    table.add_column("Brain", justify="center", style="white")
    table.add_column("Tools", justify="center", style="white")
    table.add_column("Open", justify="center", style="white")
    table.add_column("TPS", justify="right", style="white")
    table.add_column("Uptime", justify="right", style="white")
    table.add_column("Capability", justify="right", style="white")
    table.add_column("Value", justify="right", style="white")
    
    for i, m in enumerate(final_list, 1):
        table.add_row(
            str(i), m['id'], 
            f"{m['balanced']:.1f}%",
            f"{m['params']:g}B",
            f"{m['ctx']//1000}K",
            "🧠" if m['brain'] else "❌",
            "✅" if m['tools'] else "❌",
            "📖" if m['open'] else "🔒",
            f"{m['tps']:.1f}" if m['tps'] > 0 else "Masked",
            f"{m['uptime']:.1f}%",
            f"{m['capability']:.1f}",
            f"{m['value']:,.0f}"
        )
    console.print(table)

if __name__ == "__main__":
    app()
