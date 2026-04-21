import requests
import json
import re

def get_free_models():
    print("Fetching OpenRouter models...")
    response = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
    response.raise_for_status()
    models = response.json().get("data", [])
    
    free_models = [
        m for m in models 
        if m.get("pricing", {}).get("prompt") == "0" and m.get("pricing", {}).get("completion") == "0"
    ]
    return free_models

def estimate_parameters(model):
    """
    Attempt to extract the parameter count from the model ID, name, or description.
    Returns a float representing billions of parameters, or 0 if unknown.
    """
    text_to_search = f"{model.get('id', '')} {model.get('name', '')} {model.get('description', '')}".lower()
    
    # Look for patterns like "70b", "31b", "8x7b", "100b-parameter"
    matches = re.findall(r'(\d+(?:\.\d+)?)\s*b\b', text_to_search)
    if matches:
        # Return the largest found value just in case
        return max([float(m) for m in matches])
        
    # Look for MoE patterns like "8x7b"
    moe_matches = re.findall(r'(\d+)x(\d+(?:\.\d+)?)\s*b\b', text_to_search)
    if moe_matches:
        # e.g., 8x7b -> 8 * 7 = 56b effective or total
        return max([float(m[0]) * float(m[1]) for m in moe_matches])
        
    return 0.0

def rank_models():
    models = get_free_models()
    
    ranked_list = []
    for m in models:
        params = estimate_parameters(m)
        ctx = m.get("context_length", 0)
        max_out = m.get("top_provider", {}).get("max_completion_tokens", 0) or 0
        
        # Calculate a basic "score" heuristic:
        # 1. Parameter count is the heaviest weight (proxy for intelligence)
        # 2. Context length is a secondary weight
        # Note: Some highly rated models like DeepSeek R1 or specific new models might not have 'b' in their name
        # so we also add a bonus for known high-tier model families.
        
        score = params * 1000  # 70b = 70,000 points
        
        # Bonus for known high-tier reasoning models
        name_id = (m['id'] + " " + m['name']).lower()
        if "llama-3.3-70b" in name_id:
            score += 50000
        if "deepseek-r1" in name_id:
            score += 60000
        if "nemotron" in name_id:
            score += 40000
        if "gemma-4-31b" in name_id:
            score += 30000
            
        score += ctx / 10000.0  # 128k context = 12.8 points
        
        ranked_list.append({
            "id": m["id"],
            "name": m["name"],
            "params_b": params,
            "context_length": ctx,
            "max_output": max_out,
            "score": score
        })
        
    # Sort by our computed score in descending order
    ranked_list.sort(key=lambda x: x["score"], reverse=True)
    
    print("\n--- TOP FREE OPENROUTER MODELS ---")
    print(f"{'Rank':<5} | {'ID':<40} | {'Params':<8} | {'Context':<8} | {'Max Out':<8} | {'Score':<10}")
    print("-" * 95)
    for i, rm in enumerate(ranked_list, 1):
        print(f"{i:<5} | {rm['id']:<40} | {rm['params_b']:<6}B | {rm['context_length']:<8} | {rm['max_output']:<8} | {rm['score']:.1f}")

if __name__ == "__main__":
    rank_models()
