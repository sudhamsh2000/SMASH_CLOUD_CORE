#!/usr/bin/env python3
"""
SMASH Cloud Core - System Dashboard

Displays live system statistics using Rich + psutil for a small terminal display.
Shows: CPU %, per-core load, memory usage, disk usage, network I/O, uptime.

Run locally for testing:
  python3 scripts/smash_display.py

On Ubuntu, the systemd service `smash-display@<user>` will run this at boot
on /dev/tty1.
"""

import os
import time
import socket
import shutil
import psutil
from datetime import datetime, timedelta
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.align import Align


def format_bytes(num_bytes: float) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0:
            return f"{size:3.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


def get_uptime() -> str:
    boot_ts = psutil.boot_time()
    delta = datetime.now() - datetime.fromtimestamp(boot_ts)
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    return f"{days}d {hours}h {minutes}m"


def render_dashboard() -> Panel:
    hostname = socket.gethostname()
    ip_addr = psutil.net_if_addrs()

    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    per_core = psutil.cpu_percent(interval=None, percpu=True)
    load_avg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)

    # Memory
    mem = psutil.virtual_memory()

    # Disk
    root_usage = shutil.disk_usage("/")
    disk_total = root_usage.total
    disk_used = root_usage.used
    disk_free = root_usage.free

    # Network (aggregate)
    net = psutil.net_io_counters()

    # Uptime
    uptime = get_uptime()

    table = Table.grid(expand=True)
    table.add_column(justify="left")
    table.add_column(justify="right")

    left = Table.grid(padding=(0, 1))
    left.add_row("[bold cyan]Host[/]", f"{hostname}")
    left.add_row("[bold cyan]Uptime[/]", uptime)
    left.add_row("[bold cyan]CPU[/]", f"{cpu_percent:.0f}% | load {load_avg[0]:.2f} {load_avg[1]:.2f} {load_avg[2]:.2f}")
    left.add_row("[bold cyan]Cores[/]", " ".join(f"{p:.0f}%" for p in per_core))
    left.add_row("[bold cyan]Memory[/]", f"{format_bytes(mem.used)} / {format_bytes(mem.total)} ({mem.percent:.0f}%)")
    left.add_row("[bold cyan]Disk /[/]", f"{format_bytes(disk_used)} / {format_bytes(disk_total)} ({(disk_used/disk_total)*100:.0f}%)")

    right = Table.grid(padding=(0, 1))
    right.add_row("[bold magenta]Net Sent[/]", format_bytes(net.bytes_sent))
    right.add_row("[bold magenta]Net Rcvd[/]", format_bytes(net.bytes_recv))
    right.add_row("[bold yellow]Time[/]", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    table.add_row(left, right)

    return Panel(Align.center(table), title="[bold green]SMASH Cloud Core[/]", border_style="green")


def main() -> None:
    console = Console()
    refresh_seconds = float(os.getenv("SMASH_DASH_REFRESH", "1.0"))
    with Live(render_dashboard(), console=console, refresh_per_second=max(1, int(1/refresh_seconds))):
        while True:
            time.sleep(refresh_seconds)
            console.update_live(render_dashboard())


if __name__ == "__main__":
    main()


