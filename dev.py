#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
import threading

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")

PROCS: list[subprocess.Popen] = []


def prefix_output(proc: subprocess.Popen, label: str, color: str) -> None:
    reset = "\033[0m"
    for line in proc.stdout:
        print(f"{color}[{label}]{reset} {line}", end="", flush=True)


def shutdown(sig=None, frame=None) -> None:
    print("\n\033[33m[dev] shutting down...\033[0m", flush=True)
    for p in PROCS:
        if p.poll() is None:
            p.terminate()
    for p in PROCS:
        try:
            p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

backend = subprocess.Popen(
    ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
    cwd=BACKEND_DIR,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
)
PROCS.append(backend)

ui = subprocess.Popen(
    ["bun", "run", "dev"],
    cwd=ROOT,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
)
PROCS.append(ui)

threading.Thread(target=prefix_output, args=(backend, "backend", "\033[36m"), daemon=True).start()
threading.Thread(target=prefix_output, args=(ui, "ui", "\033[35m"), daemon=True).start()

print("\033[32m[dev] backend → http://localhost:8000  |  ui → http://localhost:3000\033[0m", flush=True)

try:
    while all(p.poll() is None for p in PROCS):
        pass
    dead = next(p for p in PROCS if p.poll() is not None)
    label = "backend" if dead is backend else "ui"
    print(f"\033[31m[dev] {label} exited with code {dead.returncode}\033[0m", flush=True)
finally:
    shutdown()
