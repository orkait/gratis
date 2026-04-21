import requests
import re
import math
from rich.console import Console
from rich.table import Table
from rich import box

def get_models():
    response = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
    response.raise_for_status()
    return response.json().get("data", [])

def extract_parameters(model_id, name, description):
    text = f"{model_id} {name} {description}".lower()
    
    total_params = 0.0
    active_params = 0.0
    
    # Match standard dense parameter counts (e.g. 70b, 1.5b)
    dense_matches = re.findall(r'(?<![x\da])(\d+(?:\.\d+)?)\s*b\b', text)
    if dense_matches:
        total_params = max(float(m) for m in dense_matches)
        active_params = total_params
        
    # Match MoE patterns (e.g. 8x22b, 4x8b)
    moe_matches = re.findall(r'(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b', text)
    if moe_matches:
        for m in moe_matches:
            experts = float(m[0])
            expert_size = float(m[1])
            calc_total = experts * expert_size
            if calc_total > total_params:
                total_params = calc_total
                # Active params in standard MoE is usually 2 experts
                active_params = expert_size * 2
                
    # Match explicit active parameter counts (e.g., 120b-a12b, 26b-a4b)
    active_matches = re.findall(r'(\d+(?:\.\d+)?)\s*b[^\s]*?a(\d+(?:\.\d+)?)\s*b', text)
    if active_matches:
        for m in active_matches:
            t_params = float(m[0])
            a_params = float(m[1])
            if t_params > total_params:
                total_params = t_params
                active_params = a_params

    # Match just "-a4b" style if we already found total
    if total_params > 0 and active_params == total_params:
        just_active = re.findall(r'a(\d+(?:\.\d+)?)\s*b\b', text)
        if just_active:
            active_params = min(active_params, float(just_active[0]))
            
    return total_params, active_params

def main():
    console = Console()
    
    with console.status("[bold green]Fetching OpenRouter models...[/bold green]"):
        models = get_models()
        
    ranked_models = []
    
    for m in models:
        model_id = m.get("id", "")
        name = m.get("name", "")
        description = m.get("description", "")
        
        # 1. Extract Parameters
        total_params, active_params = extract_parameters(model_id, name, description)
        
        # If we can't determine parameters, we can't mathematically rank its intelligence
        # We assign a baseline of 1B to avoid multiplying by zero if it's a known model without 'b' in the name
        if total_params == 0:
            total_params = 1.0
            active_params = 1.0
            
        # 2. Extract Context
        ctx = m.get("context_length", 0)
        # Use log10 to scale context length reasonably (e.g. 100k -> 5, 1M -> 6)
        # Add 1 to avoid log(0) errors
        ctx_multiplier = math.log10(ctx + 1) if ctx > 0 else 1.0
        
        # 3. Calculate Costs
        pricing = m.get("pricing", {})
        try:
            in_cost = float(pricing.get("prompt", 0)) * 1_000_000
            out_cost = float(pricing.get("completion", 0)) * 1_000_000
        except:
            in_cost = 0
            out_cost = 0
            
        # Assume a standard prompt:completion ratio of 3:1 for blended cost
        # 750k input tokens + 250k output tokens = 1M blended tokens
        blended_cost_per_1m = (in_cost * 0.75) + (out_cost * 0.25)
        
        # 4. Capability Score (Intelligence Proxy)
        capability_score = total_params * ctx_multiplier
        
        # 5. Value Score (Capability / Cost)
        # To avoid infinite value scores, we assign a nominal cost of $0.01 per 1M tokens to free models
        effective_cost = blended_cost_per_1m if blended_cost_per_1m > 0 else 0.01
        value_score = capability_score / effective_cost
            
        # 6. Speed Proxy (Fast Tag)
        # We consider models with < 15B active parameters to be "Fast"
        is_fast = active_params > 0 and active_params < 15.0
        
        ranked_models.append({
            "id": model_id,
            "total_params": total_params,
            "active_params": active_params,
            "in_cost": in_cost,
            "out_cost": out_cost,
            "blended_cost": blended_cost_per_1m,
            "context": ctx,
            "capability_score": capability_score,
            "value_score": value_score,
            "is_fast": is_fast
        })
        
    # Sort models. 
    # Primary sort: Value Score (Descending)
    # Secondary sort: Capability Score (Descending)
    ranked_models.sort(key=lambda x: (x["value_score"], x["capability_score"]), reverse=True)
    
    console.print("\n[bold yellow]🧮 Objective Mathematical Rankings (Top 25)[/bold yellow]\n")
    
    table = Table(show_header=True, header_style="bold bright_blue", box=box.SIMPLE)
    table.add_column("#", style="dim", width=3, justify="right")
    table.add_column("Model", style="white bold")
    table.add_column("Params (Tot/Act)", justify="right", style="magenta")
    table.add_column("Blended Cost/1M", justify="right", style="cyan")
    table.add_column("Context", justify="right", style="blue")
    table.add_column("Fast", justify="center")
    table.add_column("Capability", justify="right", style="green")
    table.add_column("Value Score", justify="right", style="white bold")
    
    best_free = None
    best_paid = None
    best_fast_paid = None
    
    top_models = [m for m in ranked_models if m['blended_cost'] == 0]
    
    for i, m in enumerate(top_models, 1):
        if best_free is None and m['blended_cost'] == 0:
            best_free = m
        if best_paid is None and m['blended_cost'] > 0:
            best_paid = m
        if best_fast_paid is None and m['blended_cost'] > 0 and m['is_fast']:
            best_fast_paid = m
            
        if m['blended_cost'] == 0:
            cost_str = "FREE"
        else:
            cost_str = f"${m['blended_cost']:.3f}"
            
        if m['total_params'] == m['active_params']:
            params_str = f"{m['total_params']:g}B"
        else:
            params_str = f"{m['total_params']:g}B / {m['active_params']:g}B"
            
        ctx_str = f"{m['context'] // 1000}K" if m['context'] >= 1000 else str(m['context'])
        fast_str = "⚡" if m['is_fast'] else ""
        cap_str = f"{m['capability_score']:.1f}"
        val_str = f"{m['value_score']:,.1f}"
        
        table.add_row(
            str(i),
            m['id'],
            params_str,
            cost_str,
            ctx_str,
            fast_str,
            cap_str,
            val_str
        )
        
    console.print(table)
    
    console.print("\n[bold red]📊 Data-Driven Recommendations[/bold red]\n")
    
    if best_free:
        console.print(f"🥇 [bold green]Ultimate Free Model:[/bold green] `{best_free['id']}`")
        console.print(f"   - Capability Score: {best_free['capability_score']:.1f} (Highest among free tier)")
        console.print(f"   - Specs: {best_free['total_params']:g}B parameters, {best_free['context']//1000}K context")
        
    if best_paid:
        console.print(f"\n💎 [bold yellow]Ultimate Paid Value:[/bold yellow] `{best_paid['id']}`")
        console.print(f"   - Value Score: {best_paid['value_score']:.1f} (Most capability per dollar)")
        console.print(f"   - Cost: ${best_paid['blended_cost']:.3f} per 1M blended tokens")
        console.print(f"   - Specs: {best_paid['total_params']:g}B parameters, {best_paid['context']//1000}K context")
        
    if best_fast_paid:
        console.print(f"\n⚡ [bold cyan]Ultimate Fast Value:[/bold cyan] `{best_fast_paid['id']}`")
        console.print(f"   - Active Parameters: {best_fast_paid['active_params']:g}B (High inference speed)")
        console.print(f"   - Cost: ${best_fast_paid['blended_cost']:.3f} per 1M blended tokens")
        console.print(f"   - Value Score: {best_fast_paid['value_score']:.1f}")
    
    print()

if __name__ == "__main__":
    main()
