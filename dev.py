#!/usr/bin/env python3
"""Local stack manager for Gratis.

    python dev.py                 backend :3460 + ui :3470
    python dev.py backend         backend only
    python dev.py ui              ui only
    python dev.py test            vitest + pytest
    python dev.py lint            eslint
    python dev.py build           next build
    python dev.py docker up       docker compose up --build
    python dev.py docker down     docker compose down

Runs on Linux, macOS and Windows. See --help for flags.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
IS_WINDOWS = os.name == "nt"

RESET = "\x1b[0m"
BOLD = "\x1b[1m"
DIM = "\x1b[2m"
RED = "\x1b[31m"
GREEN = "\x1b[32m"
YELLOW = "\x1b[33m"
CYAN = "\x1b[36m"
MAGENTA = "\x1b[35m"

if IS_WINDOWS:
    os.system("")

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

DEFAULT_BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "3460"))
DEFAULT_UI_PORT = int(os.environ.get("UI_PORT", "3470"))
DEFAULT_ENV_FILE = ".env.local"

SERVICES = ("backend", "ui")
COMMANDS = ("up", "test", "lint", "build", "docker")

HELP = f"""{BOLD}Gratis local stack{RESET}

  python dev.py [SERVICE ...]        start services (default: {' + '.join(SERVICES)})
  python dev.py test [SERVICE]       vitest (ui) and pytest (backend)
  python dev.py lint                 eslint
  python dev.py build                next build
  python dev.py docker up|down|logs|ps

{BOLD}Services{RESET}
  backend    FastAPI + uvicorn, port {DEFAULT_BACKEND_PORT}
  ui         Next.js dev server, port {DEFAULT_UI_PORT}

{BOLD}Flags{RESET}
  --env NAME, -e NAME    load .env.NAME instead of {DEFAULT_ENV_FILE}
  --no-install           skip bun install / uv sync
  --backend-port N       override backend port
  --ui-port N            override ui port
  --force-port           kill a port holder even if it is not from this repo
  --minimal              docker up: use docker-compose.minimal.yml
  -h, --help             this

{BOLD}Examples{RESET}
  python dev.py                      everything
  python dev.py ui --no-install      ui only, fast restart
  python dev.py backend -e prod      backend on .env.prod
  python dev.py test backend         pytest only
"""


def log(name: str, color: str, msg: str) -> None:
    print(f"{color}[{name}]{RESET} {msg}", flush=True)


def step(msg: str) -> None:
    print(f"{CYAN}▶ {msg}{RESET}", flush=True)


def die(msg: str) -> None:
    print(f"{RED}✗ {msg}{RESET}", file=sys.stderr, flush=True)
    sys.exit(1)


class Args:
    def __init__(self) -> None:
        self.command = "up"
        self.services: set[str] = set(SERVICES)
        self.docker_action = "up"
        self.env_name: str | None = None
        self.install = True
        self.backend_port = DEFAULT_BACKEND_PORT
        self.ui_port = DEFAULT_UI_PORT
        self.minimal = False
        self.force_port = False


def parse_args(argv: list[str]) -> Args:
    args = Args()
    if any(a in ("-h", "--help") for a in argv):
        print(HELP)
        sys.exit(0)

    positional: list[str] = []
    i = 0
    while i < len(argv):
        a = argv[i].strip()
        if a in ("-e", "--env"):
            if i + 1 >= len(argv):
                die("--env needs a value, e.g. --env prod (loads .env.prod)")
            args.env_name = argv[i + 1].strip()
            i += 2
        elif a.startswith("--env="):
            args.env_name = a.split("=", 1)[1].strip()
            i += 1
        elif a == "--no-install":
            args.install = False
            i += 1
        elif a == "--minimal":
            args.minimal = True
            i += 1
        elif a == "--force-port":
            args.force_port = True
            i += 1
        elif a in ("--backend-port", "--ui-port"):
            if i + 1 >= len(argv):
                die(f"{a} needs a port number")
            setattr(args, a[2:].replace("-", "_"), parse_port(argv[i + 1], a))
            i += 2
        elif a.startswith(("--backend-port=", "--ui-port=")):
            flag, value = a.split("=", 1)
            setattr(args, flag[2:].replace("-", "_"), parse_port(value, flag))
            i += 1
        elif a.startswith("-"):
            die(f"Unknown flag: {a}\n  run 'python dev.py --help'")
        else:
            positional.append(a.lower())
            i += 1

    if positional and positional[0] in COMMANDS:
        args.command = positional.pop(0)

    if args.command == "docker":
        action = positional.pop(0) if positional else "up"
        if action not in ("up", "down", "logs", "ps"):
            die(f"Unknown docker action: {action}\n  choose from: up | down | logs | ps")
        args.docker_action = action

    unknown = [p for p in positional if p not in SERVICES]
    if unknown:
        die(f"Unknown service(s): {', '.join(unknown)}\n  choose from: {' | '.join(SERVICES)}")
    if positional:
        args.services = set(positional)
    return args


def parse_port(value: str, flag: str) -> int:
    try:
        port = int(value)
    except ValueError:
        die(f"{flag} expects a number, got '{value}'")
    if not 1 <= port <= 65535:
        die(f"{flag} must be between 1 and 65535, got {port}")
    return port


def require_tool(name: str, posix_hint: str, windows_hint: str) -> str:
    path = shutil.which(name)
    if path:
        return path
    die(f"'{name}' is required but not on PATH.\n  Install it:\n  {windows_hint if IS_WINDOWS else posix_hint}")
    return ""


def need_bun() -> str:
    return require_tool(
        "bun",
        "curl -fsSL https://bun.sh/install | bash",
        'powershell -c "irm bun.sh/install.ps1 | iex"',
    )


def need_uv() -> str:
    return require_tool(
        "uv",
        "curl -LsSf https://astral.sh/uv/install.sh | sh",
        'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
    )


def env_file_for(env_name: str | None) -> tuple[Path, bool]:
    if not env_name:
        return ROOT / DEFAULT_ENV_FILE, False
    suffix = env_name
    for prefix in (".env.", "env."):
        if suffix.startswith(prefix):
            suffix = suffix[len(prefix):]
            break
    return ROOT / f".env.{suffix}", True


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_env(args: Args) -> dict[str, str]:
    """Root .env.local is the documented key store, but backend/main.py's
    load_dotenv() resolves against backend/, so it never sees it. Read it here
    and hand it to the child explicitly."""
    path, explicit = env_file_for(args.env_name)
    if not path.exists():
        if explicit:
            die(f"env file not found: {path.name}\n  create it, or pick another with --env NAME")
        print(f"{YELLOW}! {path.name} not found - starting with no provider keys.{RESET}")
        print(f"{DIM}  cp .env.local.example .env.local, then add whichever keys you have.{RESET}")
        return {}
    values = read_env_file(path)
    keyed = [k for k, v in values.items() if v and k.endswith(("_API_KEY", "_ACCOUNT_ID"))]
    step(f"Env: {path.name} ({len(keyed)} key{'s' if len(keyed) != 1 else ''} set)")
    return values


PROCS: list[subprocess.Popen] = []
PROCS_LOCK = threading.Lock()
STOP = threading.Event()


def install_signal_handlers() -> None:
    """Handle SIGTERM as well as SIGINT, and re-arm SIGINT explicitly: a shell
    that backgrounds dev.py hands it SIGINT as SIG_IGN, so relying on the
    default KeyboardInterrupt would leak the children."""
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: STOP.set())


def spawn(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.Popen:
    kwargs: dict = dict(
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        env=env or os.environ.copy(),
    )
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    proc = subprocess.Popen(cmd, **kwargs)
    with PROCS_LOCK:
        PROCS.append(proc)
    return proc


def kill_pid(pid: int) -> None:
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
        return
    try:
        os.kill(pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def kill_tree(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if IS_WINDOWS:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except (ProcessLookupError, OSError):
        pass


def shutdown() -> None:
    print(f"\n{CYAN}▶ Stopping…{RESET}", flush=True)
    with PROCS_LOCK:
        procs = list(PROCS)
    for p in procs:
        kill_tree(p)
    deadline = time.time() + 5
    for p in procs:
        try:
            p.wait(timeout=max(0, deadline - time.time()))
        except subprocess.TimeoutExpired:
            if IS_WINDOWS:
                continue
            try:
                os.killpg(os.getpgid(p.pid), signal.SIGKILL)
            except (ProcessLookupError, OSError):
                pass


def stream_output(proc: subprocess.Popen, name: str, color: str) -> None:
    for line in proc.stdout:
        line = line.rstrip("\n")
        if line.strip():
            log(name, color, line)


def announce_ready(proc: subprocess.Popen, name: str, port: int, url: str) -> None:
    """Readiness is a socket that accepts, not a log line. Next prints both
    '- Local:' and '✓ Ready in' before it bails on a duplicate dev server, so
    matching its output would report a UI that never served a request."""
    while not STOP.is_set() and proc.poll() is None:
        if port_in_use(port):
            log(name, GREEN, f"ready → {url}")
            return
        time.sleep(0.3)


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def port_holders(port: int) -> list[int]:
    """PIDs *listening* on the port. `lsof -i:PORT` also matches clients with an
    open connection to it, so it happily reports your browser and misses the
    real server - never use it to decide what to kill."""
    if IS_WINDOWS:
        out = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=False).stdout
        pids = {
            line.split()[-1]
            for line in out.splitlines()
            if f":{port}" in line and "LISTENING" in line
        }
        return sorted(int(p) for p in pids if p.isdigit())

    ss = shutil.which("ss")
    if ss:
        out = subprocess.run(
            [ss, "-ltnpH", f"sport = :{port}"], capture_output=True, text=True, check=False
        ).stdout
        return sorted({int(m) for m in re.findall(r"pid=(\d+)", out)})

    lsof = shutil.which("lsof")
    if lsof:
        out = subprocess.run(
            [lsof, "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
            capture_output=True, text=True, check=False,
        ).stdout
        return sorted({int(p) for p in out.split() if p.isdigit()})
    return []


def describe_pid(pid: int) -> str:
    if IS_WINDOWS:
        out = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True, text=True, check=False,
        ).stdout.strip()
        return out.split(",")[0].strip('"') if out else f"pid {pid}"
    out = subprocess.run(
        ["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True, check=False
    ).stdout.strip()
    return out or f"pid {pid}"


def pid_belongs_to_repo(pid: int) -> bool:
    """A port holder is ours only if it runs from this repo. Other projects on
    this machine bind the same default ports; killing them blindly is not ours
    to do."""
    root = str(ROOT)
    try:
        cwd = os.readlink(f"/proc/{pid}/cwd")
        if cwd == root or cwd.startswith(root + os.sep):
            return True
    except OSError:
        pass
    return root in describe_pid(pid)


def free_port(port: int, label: str, force: bool) -> None:
    if not port_in_use(port):
        return
    holders = port_holders(port)
    if not holders:
        die(f"port {port} ({label}) is in use but the owner could not be identified.\n"
            f"  free it yourself, or pick another with --{label}-port N")

    foreign = [p for p in holders if not (force or pid_belongs_to_repo(p))]
    if foreign:
        owners = "\n".join(f"    pid {p}  {describe_pid(p)}" for p in foreign)
        die(f"port {port} ({label}) is held by a process outside this repo:\n{owners}\n"
            f"  dev.py will not kill it. Either:\n"
            f"    python dev.py --{label}-port <other>   run gratis elsewhere\n"
            f"    python dev.py --force-port             kill the holder anyway")

    log("dev", YELLOW, f"port {port} held by a stale gratis process, freeing it")
    for pid in holders:
        kill_pid(pid)
    time.sleep(0.3)
    if port_in_use(port):
        die(f"port {port} ({label}) is still in use after freeing it")


NEXT_DEV_LOCK = ROOT / ".next" / "dev" / "lock"


def proc_state(pid: int) -> str:
    try:
        stat = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
        return stat[stat.rindex(")") + 1:].split()[0]
    except (OSError, ValueError):
        pass
    out = subprocess.run(
        ["ps", "-p", str(pid), "-o", "stat="], capture_output=True, text=True, check=False
    ).stdout.strip()
    return out[:1]


def pid_alive(pid: int) -> bool:
    """A killed process whose parent never reaps it stays a zombie, and
    os.kill(pid, 0) keeps succeeding on it. Zombies hold no port; treat as
    dead or we wait forever on a process that is already gone."""
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return proc_state(pid) != "Z"


def parent_pid(pid: int) -> int:
    try:
        stat = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
        return int(stat[stat.rindex(")") + 1:].split()[1])
    except (OSError, ValueError, IndexError):
        pass
    out = subprocess.run(
        ["ps", "-p", str(pid), "-o", "ppid="], capture_output=True, text=True, check=False
    ).stdout.strip()
    return int(out) if out.isdigit() else 0


def reclaim_next_dev_lock() -> None:
    """Next 16 allows one dev server per project directory, whatever port it is
    on, so a leftover `next dev` makes ours exit 1 even on a free port. The lock
    lives in this repo, so its owner is ours to reclaim."""
    if not NEXT_DEV_LOCK.exists():
        return
    try:
        lock = json.loads(NEXT_DEV_LOCK.read_text(encoding="utf-8"))
        pid = int(lock["pid"])
    except (OSError, ValueError, KeyError):
        return
    if not pid_alive(pid):
        return
    log("dev", YELLOW, f"another next dev server for this repo is running on port {lock.get('port')} "
                       f"(pid {pid}), stopping it")
    # The lock names the next-server child; its `next dev` parent respawns and
    # would keep the lock, so take the wrapper too.
    ppid = parent_pid(pid)
    kill_pid(pid)
    if ppid > 1 and pid_belongs_to_repo(ppid) and "next" in describe_pid(ppid):
        kill_pid(ppid)
    for _ in range(20):
        if not pid_alive(pid):
            return
        time.sleep(0.25)
    die(f"could not stop the existing next dev server (pid {pid}).\n  stop it yourself: kill -9 {pid}")


def run_step(cmd: list[str], cwd: Path, label: str, env: dict[str, str] | None = None) -> int:
    step(label)
    return subprocess.run(cmd, cwd=str(cwd), env=env).returncode


def run_step_or_die(cmd: list[str], cwd: Path, label: str) -> None:
    code = run_step(cmd, cwd, label)
    if code != 0:
        die(f"{label} failed (exit {code})")


def install_ui() -> None:
    run_step_or_die([need_bun(), "install"], ROOT, "Installing UI deps")


def install_backend() -> None:
    run_step_or_die([need_uv(), "sync", "--quiet"], BACKEND_DIR, "Installing backend deps")


def cmd_up(args: Args) -> None:
    want_backend = "backend" in args.services
    want_ui = "ui" in args.services
    file_env = load_env(args)

    if args.install:
        if want_ui:
            install_ui()
        if want_backend:
            install_backend()
    elif want_backend:
        need_uv()
    if want_ui:
        need_bun()

    if want_backend:
        free_port(args.backend_port, "backend", args.force_port)
    if want_ui:
        reclaim_next_dev_lock()
        free_port(args.ui_port, "ui", args.force_port)

    backend_url = f"http://localhost:{args.backend_port}"
    ui_url = f"http://localhost:{args.ui_port}"

    install_signal_handlers()

    def watch(proc: subprocess.Popen, name: str, color: str, port: int, url: str) -> None:
        threading.Thread(target=stream_output, args=(proc, name, color), daemon=True).start()
        threading.Thread(target=announce_ready, args=(proc, name, port, url), daemon=True).start()

    if want_backend:
        env = {**os.environ, **file_env}
        cmd = [
            shutil.which("uv"), "run", "uvicorn", "main:app",
            "--host", "0.0.0.0", "--port", str(args.backend_port), "--reload",
        ]
        watch(spawn(cmd, BACKEND_DIR, env=env), "backend", CYAN, args.backend_port, backend_url)

    if want_ui:
        env = {**os.environ, **file_env, "NEXT_PUBLIC_API_BASE_URL": backend_url}
        proc = spawn([shutil.which("bun"), "run", "dev", "--port", str(args.ui_port)], ROOT, env=env)
        watch(proc, "ui", MAGENTA, args.ui_port, ui_url)

    summary = []
    if want_backend:
        summary.append(f"backend {backend_url}")
    if want_ui:
        summary.append(f"ui {ui_url}")
    print(f"{BOLD}▶ Starting - {'  |  '.join(summary)}{RESET}")
    print(f"{DIM}Press Ctrl+C to stop.{RESET}\n")

    try:
        while not STOP.wait(0.5):
            with PROCS_LOCK:
                procs = list(PROCS)
            for p in procs:
                if p.poll() is not None:
                    log("dev", RED, f"a process exited (pid {p.pid}, code {p.returncode})")
                    return
    except KeyboardInterrupt:
        pass
    finally:
        shutdown()


def cmd_test(args: Args) -> None:
    failures = []
    if "ui" in args.services:
        if args.install:
            install_ui()
        if run_step([need_bun(), "run", "test"], ROOT, "Testing UI (vitest)") != 0:
            failures.append("ui")
    if "backend" in args.services:
        if args.install:
            install_backend()
        if run_step([need_uv(), "run", "pytest", "-q"], BACKEND_DIR, "Testing backend (pytest)") != 0:
            failures.append("backend")
    if failures:
        die(f"tests failed: {', '.join(failures)}")
    print(f"{GREEN}✓ tests passed{RESET}")


def cmd_lint(args: Args) -> None:
    if args.install:
        install_ui()
    run_step_or_die([need_bun(), "run", "lint"], ROOT, "Linting (eslint)")
    print(f"{GREEN}✓ lint clean{RESET}")


def cmd_build(args: Args) -> None:
    if args.install:
        install_ui()
    file_env = load_env(args)
    env = {**os.environ, **file_env, "NEXT_PUBLIC_API_BASE_URL": f"http://localhost:{args.backend_port}"}
    code = run_step([need_bun(), "run", "build"], ROOT, "Building UI (next build)", env=env)
    if code != 0:
        die(f"build failed (exit {code})")
    print(f"{GREEN}✓ build complete{RESET}")


def cmd_docker(args: Args) -> None:
    docker = require_tool("docker", "https://docs.docker.com/engine/install/", "https://docs.docker.com/desktop/")
    compose_file = "docker-compose.minimal.yml" if args.minimal else "docker-compose.yml"
    if not (ROOT / compose_file).exists():
        die(f"{compose_file} not found")

    env_path, _ = env_file_for(args.env_name)
    if not env_path.exists():
        die(f"{env_path.name} not found - compose needs it as env_file.\n  cp .env.local.example .env.local")

    base = [docker, "compose", "-f", compose_file]
    actions = {
        "up": (base + ["up", "--build"], f"docker compose up ({compose_file})"),
        "down": (base + ["down"], "docker compose down"),
        "logs": (base + ["logs", "-f"], "docker compose logs"),
        "ps": (base + ["ps"], "docker compose ps"),
    }
    cmd, label = actions[args.docker_action]
    code = run_step(cmd, ROOT, label)
    if code != 0:
        sys.exit(code)


def main() -> None:
    args = parse_args(sys.argv[1:])
    handlers = {
        "up": cmd_up,
        "test": cmd_test,
        "lint": cmd_lint,
        "build": cmd_build,
        "docker": cmd_docker,
    }
    handlers[args.command](args)


if __name__ == "__main__":
    main()
