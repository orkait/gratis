import time
import json
import asyncio
import httpx
from rich.console import Console
from rich.table import Table
from rich import box

# Our Local Proxy URL
API_URL = "http://localhost:8000/v1/chat/completions"

# A hard reasoning prompt to test intelligence
LOGIC_TEST = """
A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? 
Explain your reasoning clearly.
"""

async def benchmark_model(model_id: str):
    console = Console()
    
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": LOGIC_TEST}],
        "stream": True,
        "temperature": 0
    }
    
    start_time = time.monotonic()
    first_token_time = None
    tokens = 0
    full_content = ""
    
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", API_URL, json=payload) as response:
                if response.status_code != 200:
                    return {"id": model_id, "error": f"HTTP {response.status_code}"}
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0]["delta"].get("content", "")
                            
                            if delta and first_token_time is None:
                                first_token_time = time.monotonic() - start_time
                            
                            if delta:
                                tokens += 1
                                full_content += delta
                        except:
                            continue
                            
    except Exception as e:
        return {"id": model_id, "error": str(e)}
        
    end_time = time.monotonic()
    total_time = end_time - start_time
    tps = tokens / (total_time - (first_token_time or 0)) if tokens > 0 else 0
    
    # Simple check for the correct answer ($0.05 or 5 cents)
    is_correct = "0.05" in full_content or "5 cent" in full_content.lower()
    
    return {
        "id": model_id,
        "ttft": first_token_time or 0,
        "tps": tps,
        "total_time": total_time,
        "tokens": tokens,
        "correct": is_correct,
        "answer": full_content[:100].replace("\n", " ") + "..."
    }

async def run_suite():
    console = Console()
    console.print("\n[bold cyan]🚀 ZeroCostLLM Empirical Benchmark Suite[/bold cyan]")
    console.print("Testing Top Free Models for Live Speed & Logic Accuracy...\n")
    
    # We'll test the top 5 from our mathematical list
    models_to_test = [
        "qwen/qwen3-coder:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-oss-120b:free",
        "meta-llama/llama-3.3-70b-instruct:free"
    ]
    
    results = []
    for mid in models_to_test:
        console.print(f"Testing [bold magenta]{mid}[/bold magenta]...")
        res = await benchmark_model(mid)
        results.append(res)
        
    table = Table(show_header=True, header_style="bold bright_blue", box=box.SIMPLE)
    table.add_column("Model ID", style="white bold")
    table.add_column("TTFT", justify="right", style="cyan")
    table.add_column("TPS", justify="right", style="yellow")
    table.add_column("Logic", justify="center")
    table.add_column("Sample Answer", width=50, style="dim")
    
    for r in results:
        if "error" in r:
            table.add_row(r["id"], "-", "-", "[red]ERR[/red]", r["error"])
            continue
            
        logic_str = "[green]PASS[/green]" if r["correct"] else "[red]FAIL[/red]"
        ttft_str = f"{r['ttft']:.2f}s"
        tps_str = f"{r['tps']:.1f}"
        
        table.add_row(
            r["id"],
            ttft_str,
            tps_str,
            logic_str,
            r["answer"]
        )
        
    console.print("\n")
    console.print(table)
    console.print("\n[bold green]Done.[/bold green] Use these metrics to decide which model to prioritize for your specific task.")

if __name__ == "__main__":
    asyncio.run(run_suite())
