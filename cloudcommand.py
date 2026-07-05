#!/usr/bin/env python3
"""
CloudCommand Core Bootstrap Agent

This script is the bootstrap-time CloudCommand Core agent.

During early installation, cloudcommand.py prepares a raw machine to become
part of a CloudCommand-managed infrastructure environment. It performs local
host discovery, validates prerequisites, writes bootstrap state, discovers
provider-native facts, and starts the local setup interface.

In the future, these responsibilities may move into a long-running
CloudCommand daemon. For now, this script is the first executable form of
CloudCommand Core.
"""

import argparse
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


VERSION = "0.1.0-bootstrap"

STATE_DIR = Path("/var/lib/cloudcommand")
CONFIG_DIR = Path("/etc/cloudcommand")
LOG_DIR = Path("/var/log/cloudcommand")

STATE_FILE = STATE_DIR / "state.json"
PROVIDER_REGISTRY_FILE = STATE_DIR / "providers.json"
DISCOVERY_FILE = STATE_DIR / "discovery.json"

INSTALL_LIB_DIR = Path("/usr/local/lib/cloudcommand")
INSTALL_SCRIPT = INSTALL_LIB_DIR / "cloudcommand.py"
PRIMARY_BIN = Path("/usr/local/bin/cloud-command")
ALIAS_BIN = Path("/usr/local/bin/cloudcommand")

DEFAULT_UI_PORT = 3000


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_root():
    return os.geteuid() == 0


def run_command(command, check=False, timeout=20):
    try:
        result = subprocess.run(
            command,
            check=check,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
        )
        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "returncode": 127,
            "stdout": "",
            "stderr": f"Command not found: {command[0]}",
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "returncode": 124,
            "stdout": "",
            "stderr": f"Command timed out: {' '.join(command)}",
        }


def print_ok(message):
    print(f"✓ {message}")


def print_warn(message):
    print(f"! {message}")


def print_fail(message):
    print(f"✗ {message}")


def ensure_dir(path, mode=0o755):
    if path.exists():
        return False
    path.mkdir(parents=True, exist_ok=True)
    try:
        path.chmod(mode)
    except PermissionError:
        pass
    return True


def load_json(path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return default


def write_json(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")
    tmp.replace(path)


def command_exists(command):
    return shutil.which(command) is not None


def port_is_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((host, port)) == 0


def host_checks():
    return {
        "hostname": socket.gethostname(),
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "python": sys.version.split()[0],
        "root": is_root(),
    }


def ensure_cloudcommand_dirs():
    changed = []
    for path in [STATE_DIR, CONFIG_DIR, LOG_DIR, INSTALL_LIB_DIR]:
        if ensure_dir(path):
            changed.append(str(path))
    return changed


def install_cli():
    if not is_root():
        print_fail("install-cli requires sudo/root.")
        print()
        print("Run:")
        print("  sudo python3 cloudcommand.py install-cli")
        return 1

    ensure_cloudcommand_dirs()

    source = Path(__file__).resolve()
    if source != INSTALL_SCRIPT:
        shutil.copy2(source, INSTALL_SCRIPT)

    INSTALL_SCRIPT.chmod(0o755)

    wrapper = f"""#!/usr/bin/env sh
exec /usr/bin/env python3 "{INSTALL_SCRIPT}" "$@"
"""

    for bin_path in [PRIMARY_BIN, ALIAS_BIN]:
        bin_path.write_text(wrapper, encoding="utf-8")
        bin_path.chmod(0o755)

    print_ok("CloudCommand CLI installed")
    print(f"  {PRIMARY_BIN}")
    print(f"  {ALIAS_BIN}")
    return 0


def cli_installed():
    return PRIMARY_BIN.exists() and os.access(PRIMARY_BIN, os.X_OK)


def ensure_cli_installed():
    if cli_installed():
        return False
    install_cli()
    return True


def ensure_provider_registry():
    if PROVIDER_REGISTRY_FILE.exists():
        registry = load_json(PROVIDER_REGISTRY_FILE, {"providers": []})
        if "providers" not in registry:
            registry["providers"] = []
            write_json(PROVIDER_REGISTRY_FILE, registry)
        return False

    registry = {
        "version": 1,
        "created_at": now_iso(),
        "providers": [],
    }
    write_json(PROVIDER_REGISTRY_FILE, registry)
    return True


def discover_kubernetes():
    discovery = {
        "checked_at": now_iso(),
        "kubectl_detected": False,
        "cluster_reachable": False,
        "current_context": None,
        "cluster_info": None,
        "nodes": [],
        "errors": [],
    }

    if not command_exists("kubectl"):
        discovery["errors"].append("kubectl not found in PATH")
        return discovery

    discovery["kubectl_detected"] = True

    context = run_command(["kubectl", "config", "current-context"], timeout=10)
    if context["ok"]:
        discovery["current_context"] = context["stdout"]
    else:
        discovery["errors"].append(context["stderr"] or "Unable to read kubectl current context")

    cluster_info = run_command(["kubectl", "cluster-info"], timeout=15)
    if cluster_info["ok"]:
        discovery["cluster_reachable"] = True
        discovery["cluster_info"] = cluster_info["stdout"]
    else:
        discovery["errors"].append(cluster_info["stderr"] or "Kubernetes cluster is not reachable")

    nodes = run_command(["kubectl", "get", "nodes", "-o", "json"], timeout=20)
    if nodes["ok"]:
        try:
            parsed = json.loads(nodes["stdout"])
            for item in parsed.get("items", []):
                labels = item.get("metadata", {}).get("labels", {})
                conditions = item.get("status", {}).get("conditions", [])

                ready = "Unknown"
                for condition in conditions:
                    if condition.get("type") == "Ready":
                        ready = condition.get("status", "Unknown")

                role = "worker"
                if (
                    "node-role.kubernetes.io/control-plane" in labels
                    or "node-role.kubernetes.io/master" in labels
                ):
                    role = "control-plane"

                discovery["nodes"].append(
                    {
                        "name": item.get("metadata", {}).get("name"),
                        "role": role,
                        "ready": ready,
                        "architecture": labels.get("kubernetes.io/arch"),
                        "os": labels.get("kubernetes.io/os"),
                    }
                )
        except json.JSONDecodeError:
            discovery["errors"].append("Unable to parse kubectl node JSON")
    else:
        if discovery["cluster_reachable"]:
            discovery["errors"].append(nodes["stderr"] or "Unable to read Kubernetes nodes")

    return discovery


def update_state(host, kube_discovery):
    state = load_json(
        STATE_FILE,
        {
            "version": 1,
            "created_at": now_iso(),
        },
    )

    state["updated_at"] = now_iso()
    state["cloudcommand_version"] = VERSION
    state["host"] = host
    state["bootstrap"] = {
        "state_dir": str(STATE_DIR),
        "config_dir": str(CONFIG_DIR),
        "log_dir": str(LOG_DIR),
        "cli_primary": str(PRIMARY_BIN),
        "cli_alias": str(ALIAS_BIN),
    }
    state["kubernetes"] = {
        "kubectl_detected": kube_discovery["kubectl_detected"],
        "cluster_reachable": kube_discovery["cluster_reachable"],
        "current_context": kube_discovery["current_context"],
        "node_count": len(kube_discovery["nodes"]),
    }

    write_json(STATE_FILE, state)
    write_json(DISCOVERY_FILE, kube_discovery)


def provider_count():
    registry = load_json(PROVIDER_REGISTRY_FILE, {"providers": []})
    return len(registry.get("providers", []))


def find_repo_root():
    current = Path.cwd()
    candidates = [current, current.parent, Path(__file__).resolve().parent]

    for candidate in candidates:
        if (candidate / "package.json").exists():
            return candidate

    return None


def start_local_ui(port):
    if port_is_open("127.0.0.1", port):
        return {
            "started": False,
            "already_running": True,
            "url": f"http://localhost:{port}",
            "message": "Local setup interface already appears to be running",
        }

    repo = find_repo_root()
    if repo is None:
        return {
            "started": False,
            "already_running": False,
            "url": None,
            "message": "No package.json found; local setup interface was not started",
        }

    if not command_exists("npm"):
        return {
            "started": False,
            "already_running": False,
            "url": None,
            "message": "npm not found; local setup interface was not started",
        }

    package_json = load_json(repo / "package.json", {})
    scripts = package_json.get("scripts", {})

    if "dev" in scripts:
        command = ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port)]
    elif "start" in scripts:
        command = ["npm", "run", "start"]
    else:
        return {
            "started": False,
            "already_running": False,
            "url": None,
            "message": "package.json found, but no dev or start script exists",
        }

    log_file = LOG_DIR / "bootstrap-ui.log"
    ensure_dir(LOG_DIR)

    with log_file.open("a", encoding="utf-8") as log:
        log.write(f"\n[{now_iso()}] Starting local setup interface\n")
        log.write(f"Command: {' '.join(command)}\n")
        subprocess.Popen(
            command,
            cwd=str(repo),
            stdout=log,
            stderr=log,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )

    for _ in range(20):
        if port_is_open("127.0.0.1", port):
            return {
                "started": True,
                "already_running": False,
                "url": f"http://localhost:{port}",
                "message": "Local setup interface started",
            }
        time.sleep(0.25)

    return {
        "started": False,
        "already_running": False,
        "url": f"http://localhost:{port}",
        "message": f"Local setup interface attempted to start; check {log_file}",
    }


def cmd_bootstrap(args):
    if not is_root():
        print_fail("bootstrap requires sudo/root for system install and state initialization.")
        print()
        print("Run:")
        print("  sudo python3 cloudcommand.py bootstrap")
        print()
        print("After the CLI is installed, you can use:")
        print("  sudo cloud-command bootstrap")
        return 1

    print()
    print("CloudCommand Bootstrap")
    print()

    host = host_checks()
    print_ok("Host checks passed")

    ensure_cloudcommand_dirs()
    print_ok("CloudCommand state directory exists")

    cli_was_installed = ensure_cli_installed()
    if not cli_was_installed:
        print_ok("CloudCommand CLI installed")

    kube = discover_kubernetes()

    if kube["kubectl_detected"]:
        print_ok("Kubernetes CLI detected")
    else:
        print_warn("Kubernetes CLI not detected")

    if kube["cluster_reachable"]:
        print_ok("Kubernetes cluster reachable")
    else:
        print_warn("Kubernetes cluster not reachable")

    ensure_provider_registry()
    print_ok("Provider registry initialized")

    update_state(host, kube)

    providers = provider_count()
    if providers == 0:
        print_warn("No providers registered")
    elif providers == 1:
        print_ok("1 provider registered")
    else:
        print_ok(f"{providers} providers registered")

    ui_result = None
    if not args.no_ui:
        ui_result = start_local_ui(args.ui_port)
        if ui_result["started"] or ui_result["already_running"]:
            print()
            print_ok("Local setup interface started")
        else:
            print()
            print_warn(ui_result["message"])

    print()
    if ui_result and ui_result.get("url"):
        print("Continue setup here:")
        print()
        print(f"  {ui_result['url']}")
        print()

    if providers == 0:
        print("No providers are registered yet.")
        print("The next step is to register your first provider.")
    else:
        print("CloudCommand bootstrap is complete.")

    print()
    return 0


def cmd_status(args):
    print()
    print("CloudCommand Status")
    print()

    if not STATE_FILE.exists():
        print_warn("CloudCommand state has not been initialized")
        print()
        print("Run:")
        print("  sudo cloud-command bootstrap")
        return 1

    state = load_json(STATE_FILE, {})
    registry = load_json(PROVIDER_REGISTRY_FILE, {"providers": []})
    discovery = load_json(DISCOVERY_FILE, {})

    print(f"Version: {state.get('cloudcommand_version', 'unknown')}")
    print(f"Host: {state.get('host', {}).get('hostname', 'unknown')}")
    print(f"State: {STATE_FILE}")
    print()

    kube = state.get("kubernetes", {})
    print("Kubernetes")
    print(f"  kubectl detected: {kube.get('kubectl_detected', False)}")
    print(f"  cluster reachable: {kube.get('cluster_reachable', False)}")
    print(f"  current context: {kube.get('current_context') or 'unknown'}")
    print(f"  nodes discovered: {kube.get('node_count', 0)}")

    nodes = discovery.get("nodes", [])
    if nodes:
        print()
        print("Discovered Nodes")
        for node in nodes:
            print(
                f"  {node.get('name')}  "
                f"{node.get('role')}  "
                f"Ready={node.get('ready')}"
            )

    print()
    print(f"Providers registered: {len(registry.get('providers', []))}")

    if len(registry.get("providers", [])) == 0:
        print()
        print_warn("No providers registered")
        print("CloudCommand cannot deploy or manage applications until a provider is registered.")

    print()
    return 0


def cmd_doctor(args):
    print()
    print("CloudCommand Doctor")
    print()

    failures = 0

    if is_root():
        print_ok("Running with root privileges")
    else:
        print_warn("Not running as root; some checks may be limited")

    if STATE_DIR.exists():
        print_ok("State directory exists")
    else:
        print_fail("State directory missing")
        failures += 1

    if CONFIG_DIR.exists():
        print_ok("Config directory exists")
    else:
        print_fail("Config directory missing")
        failures += 1

    if cli_installed():
        print_ok("cloud-command is installed")
    else:
        print_fail("cloud-command is not installed")
        failures += 1

    if command_exists("kubectl"):
        print_ok("kubectl detected")
    else:
        print_warn("kubectl not detected")

    kube = discover_kubernetes()
    if kube["cluster_reachable"]:
        print_ok("Kubernetes cluster reachable")
    else:
        print_warn("Kubernetes cluster not reachable")

    if PROVIDER_REGISTRY_FILE.exists():
        print_ok("Provider registry exists")
    else:
        print_fail("Provider registry missing")
        failures += 1

    print()
    if failures == 0:
        print("Doctor completed. No blocking CloudCommand bootstrap problems found.")
        return 0

    print(f"Doctor completed with {failures} blocking issue(s).")
    return 1


def cmd_version(args):
    print(f"CloudCommand {VERSION}")
    return 0


def cmd_help(args):
    print(
        f"""
CloudCommand

Usage:
  cloud-command <command> [options]

Commands:
  bootstrap      Prepare this machine as a CloudCommand-managed node
  status         Show local CloudCommand bootstrap state
  doctor         Check host prerequisites and common setup problems
  install-cli    Install cloud-command and cloudcommand into PATH
  version        Show CloudCommand CLI version
  help           Show this help page

Examples:
  sudo cloud-command bootstrap
  cloud-command status
  cloud-command doctor
  cloud-command version
  cloud-command help

Bootstrap Options:
  --no-ui              Do not start the local setup interface
  --ui-port <port>     Port for the local setup interface, default {DEFAULT_UI_PORT}

Notes:
  During bootstrap, cloud-command acts as the local CloudCommand Core agent.
  Future releases may replace this bootstrap process with a long-running daemon.

Command Model:
  kubectl is provider-native.
  cloud-command is CloudCommand-native.
"""
    )
    return 0


def build_parser():
    parser = argparse.ArgumentParser(
        prog="cloud-command",
        add_help=False,
        description="CloudCommand bootstrap CLI",
    )

    subparsers = parser.add_subparsers(dest="command")

    bootstrap = subparsers.add_parser("bootstrap")
    bootstrap.add_argument("--no-ui", action="store_true")
    bootstrap.add_argument("--ui-port", type=int, default=DEFAULT_UI_PORT)
    bootstrap.set_defaults(func=cmd_bootstrap)

    status = subparsers.add_parser("status")
    status.set_defaults(func=cmd_status)

    doctor = subparsers.add_parser("doctor")
    doctor.set_defaults(func=cmd_doctor)

    install = subparsers.add_parser("install-cli")
    install.set_defaults(func=lambda args: install_cli())

    version = subparsers.add_parser("version")
    version.set_defaults(func=cmd_version)

    help_cmd = subparsers.add_parser("help")
    help_cmd.set_defaults(func=cmd_help)

    return parser


def main():
    parser = build_parser()

    if len(sys.argv) == 1:
        return cmd_help(None)

    args = parser.parse_args()

    if not hasattr(args, "func"):
        return cmd_help(args)

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
