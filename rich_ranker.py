import requests
import re
from rich.console import Console
from rich.table import Table
from rich.text import Text
from rich import box

def get_models():
    response = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
    response.raise_for_status()
    return response.json().get("data", [])

def is_s_plus_tier(model_id, name):
    # Heuristic for top tier models (including future/2026 models like gpt-5, gemma-4)
    text = (model_id + " " + name).lower()
    s_tier_keywords = [
        "gpt-4o", "gpt-4.5", "gpt-5", "claude-3.5", "claude-3.7", "claude-4", 
        "gemini-2.5", "gemini-3", "gemma-4", "llama-3.3", "llama-3.1-405b",
        "deepseek-r1", "deepseek-v3", "qwen3", "nemotron"
    ]
    return any(k in text for k in s_tier_keywords)

def determine_fast(model_id, name):
    text = (model_id + " " + name).lower()
    fast_keywords = ["nano", "mini", "flash", "fast", "8b", "haiku", "e4b", "e2b", "3b", "12b", "8x7b"]
    return any(k in text for k in fast_keywords)

def get_intelligence_score(model_id, name):
    text = (model_id + " " + name).lower()
    if "nano" in text or "mini" in text or "haiku" in text or "flash" in text:
        return 80
    if "pro" in text or "opus" in text or "gpt-4" in text or "gpt-5" in text or "405b" in text:
        if "mini" not in text and "nano" not in text:
            return 100
    if "70b" in text or "coder" in text or "deepseek-r1" in text:
        return 95
    return 85

def main():
    console = Console()
    
    with console.status("[bold green]Fetching OpenRouter models...[/bold green]"):
        models = get_models()
        
    s_tier_models = []
    
    for m in models:
        model_id = m.get("id", "")
        name = m.get("name", "")
        
        # We can either show only S+ tier, or show everything. Let's filter to S+ to keep it clean like the screenshot.
        if not is_s_plus_tier(model_id, name):
            continue
            
        pricing = m.get("pricing", {})
        try:
            in_cost = float(pricing.get("prompt", 0)) * 1_000_000
            out_cost = float(pricing.get("completion", 0)) * 1_000_000
        except:
            in_cost = 0
            out_cost = 0
            
        ctx = m.get("context_length", 0)
        fast = determine_fast(model_id, name)
        int_score = get_intelligence_score(model_id, name)
        
        # Value heuristic similar to screenshot: Intelligence / Cost
        total_cost = in_cost + out_cost
        if total_cost == 0:
            value = float('inf') # Infinite value for free models
        else:
            value = (int_score / 100) / total_cost * 15 # Multiplier to scale the value to look like the screenshot (0.1 to 2.0+)
            
        s_tier_models.append({
            "id": model_id,
            "in_cost": in_cost,
            "out_cost": out_cost,
            "context": ctx,
            "fast": fast,
            "value": value,
            "int_score": int_score
        })
        
    # Sort by Value (descending), then by intelligence score
    s_tier_models.sort(key=lambda x: (x["value"], x["int_score"]), reverse=True)
    
    # Let's take the top 15 models to show
    top_models = s_tier_models[:15]
    
    console.print("\n[bold yellow]🏆 S+ Tier Models — Cheapest + Most Intelligent + Fastest[/bold yellow]\n")
    
    table = Table(show_header=True, header_style="bold bright_blue", box=box.SIMPLE)
    table.add_column("#", style="dim", width=3, justify="right")
    table.add_column("Model", style="white bold")
    table.add_column("In/1M", justify="right", style="cyan")
    table.add_column("Out/1M", justify="right", style="cyan")
    table.add_column("Context", justify="right", style="blue")
    table.add_column("Fast", justify="center")
    table.add_column("Value", justify="right", style="white bold")
    
    best_paid_model = None
    best_free_model = None
    
    for i, m in enumerate(top_models, 1):
        if best_paid_model is None and m['in_cost'] > 0: 
            best_paid_model = m
        if best_free_model is None and m['in_cost'] == 0:
            best_free_model = m
            
        if m['in_cost'] == 0 and m['out_cost'] == 0:
            in_str = "FREE"
            out_str = "FREE"
        else:
            in_str = f"${m['in_cost']:.2f}"
            out_str = f"${m['out_cost']:.2f}"
            
        ctx_str = f"{m['context'] // 1000}K" if m['context'] >= 1000 else str(m['context'])
        fast_str = "✅" if m['fast'] else ""
        val_str = "∞" if m['value'] == float('inf') else f"{m['value']:.1f}"
        
        table.add_row(
            str(i),
            m['id'],
            in_str,
            out_str,
            ctx_str,
            fast_str,
            val_str
        )
        
    console.print(table)
    
    console.print("\n[bold red]🎯 Recommendation[/bold red]\n")
    
    if best_free_model:
        console.print(f"`{best_free_model['id']}` is the clear winner for [bold green]ZERO COST[/bold green]:")
        console.print(f"- S+ tier intelligence")
        console.print(f"- $0.00/1M input — entirely free")
        console.print(f"- {'Fast route enabled' if best_free_model['fast'] else 'Standard latency'}")
        console.print(f"- {best_free_model['context'] // 1000}K context\n")
        
    if best_paid_model:
        console.print(f"`{best_paid_model['id']}` is the clear winner for [bold yellow]PAID ROUTING[/bold yellow]:")
        console.print(f"- S+ tier intelligence")
        console.print(f"- ${best_paid_model['in_cost']:.2f}/1M input")
        console.print(f"- {'Fast route enabled' if best_paid_model['fast'] else 'Standard latency'}")
        console.print(f"- {best_paid_model['context'] // 1000}K context")
    print()

if __name__ == "__main__":
    main()
