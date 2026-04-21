import requests
import re
from rich.console import Console
from rich.table import Table
from rich import box

def fetch_openrouter_free():
    resp = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
    resp.raise_for_status()
    models = resp.json().get("data", [])
    
    # Filter only free ones
    return [
        m for m in models 
        if m.get("pricing", {}).get("prompt") == "0" and m.get("pricing", {}).get("completion") == "0"
    ]

def fetch_models_dev():
    resp = requests.get("https://models.dev/api.json", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    
    # Flatten all models into a single dictionary mapping standard ID to features
    all_models = {}
    for provider, p_data in data.items():
        if "models" in p_data:
            for m_id, m_data in p_data["models"].items():
                # Store it. If multiple providers have it, the specs are usually the same community spec
                all_models[m_id.lower()] = m_data
                
    return all_models

def extract_standard_id(openrouter_id):
    """
    OpenRouter IDs look like: 'meta-llama/llama-3.3-70b-instruct:free'
    models.dev IDs look like: 'llama-3.3-70b-instruct'
    """
    # Remove the provider prefix
    base = openrouter_id.split("/")[-1] if "/" in openrouter_id else openrouter_id
    # Remove the :free suffix
    base = base.split(":")[0]
    return base.lower()

def estimate_parameters(model_id, name):
    text = f"{model_id} {name}".lower()
    matches = re.findall(r'(?<![x\da])(\d+(?:\.\d+)?)\s*b\b', text)
    if matches:
        return max(float(m) for m in matches)
    # MoE
    moe = re.findall(r'(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b', text)
    if moe:
        return max(float(m[0]) * float(m[1]) for m in moe)
    active = re.findall(r'(\d+(?:\.\d+)?)\s*b[^\s]*?a(\d+(?:\.\d+)?)\s*b', text)
    if active:
        return max(float(m[0]) for m in active)
    return 1.0

def main():
    console = Console()
    
    with console.status("[bold green]Syncing with models.dev and OpenRouter...[/bold green]"):
        or_free = fetch_openrouter_free()
        md_db = fetch_models_dev()
        
    enriched_models = []
    
    for m in or_free:
        or_id = m["id"]
        standard_id = extract_standard_id(or_id)
        
        # Try to find authoritative data in models.dev
        md_data = md_db.get(standard_id)
        
        # If we can't find exact match, try stripping hyphens or matching parts (fallback)
        if not md_data:
            for k, v in md_db.items():
                if standard_id in k or k in standard_id:
                    md_data = v
                    break
                    
        # Base data
        name = m["name"]
        params = estimate_parameters(standard_id, name)
        
        # We will merge OpenRouter's guaranteed free context limit with models.dev's rich feature set
        context_limit = m.get("context_length", 0)
        
        if md_data:
            has_tools = md_data.get("tool_call", False)
            is_reasoning = md_data.get("reasoning", False)
            open_weights = md_data.get("open_weights", False)
            family = md_data.get("family", "unknown")
            release = md_data.get("release_date", "unknown")
            # Prefer models.dev context limit if available as it is the canonical limit
            if md_data.get("limit", {}).get("context", 0) > 0:
                context_limit = md_data["limit"]["context"]
        else:
            # Fallback if not found in community DB
            has_tools = "tool_choice" in m.get("supported_parameters", [])
            is_reasoning = "reasoning" in m.get("supported_parameters", [])
            open_weights = False
            family = "unknown"
            release = "unknown"
            
        # Simple capability score: Params * log(context)
        import math
        cap_score = params * (math.log10(context_limit + 1) if context_limit > 0 else 1.0)
        
        enriched_models.append({
            "id": or_id,
            "standard_id": standard_id,
            "name": name,
            "params": params,
            "context": context_limit,
            "tools": has_tools,
            "reasoning": is_reasoning,
            "open": open_weights,
            "family": family,
            "release": release,
            "score": cap_score,
            "found_in_db": md_data is not None
        })
        
    # Sort by score
    enriched_models.sort(key=lambda x: x["score"], reverse=True)
    
    console.print("\n[bold yellow]📚 OpenRouter Free Models mapped to Models.dev Specifications[/bold yellow]\n")
    
    table = Table(show_header=True, header_style="bold bright_blue", box=box.SIMPLE)
    table.add_column("Rank", style="dim", width=4)
    table.add_column("Model ID", style="white bold")
    table.add_column("Params", justify="right", style="magenta")
    table.add_column("Context", justify="right", style="blue")
    table.add_column("Tools", justify="center")
    table.add_column("Reasoning", justify="center")
    table.add_column("Open Source", justify="center")
    table.add_column("Database Match", justify="center", style="dim")
    
    for i, m in enumerate(enriched_models, 1):
        tools_str = "✅" if m["tools"] else "❌"
        reasoning_str = "🧠" if m["reasoning"] else "❌"
        open_str = "📖" if m["open"] else "🔒"
        db_str = "✓" if m["found_in_db"] else "⨯"
        
        ctx_str = f"{m['context'] // 1000}K" if m['context'] >= 1000 else str(m['context'])
        params_str = f"{m['params']:g}B"
        
        table.add_row(
            str(i),
            m["id"],
            params_str,
            ctx_str,
            tools_str,
            reasoning_str,
            open_str,
            db_str
        )
        
    console.print(table)
    print()

if __name__ == "__main__":
    main()
