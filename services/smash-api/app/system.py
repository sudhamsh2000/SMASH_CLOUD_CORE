"""Host metrics.

Note: inside Docker Desktop on macOS these numbers describe the Linux VM Docker runs in,
not the Mac itself. On bare metal they will describe the real server.
"""

import platform
import time

import psutil
from fastapi import APIRouter, Depends

from .auth import require_user

router = APIRouter()


@router.get("/stats")
def stats(_: str = Depends(require_user)) -> dict:
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.2),
        "cpu_count": psutil.cpu_count(),
        "memory": {"total": vm.total, "used": vm.total - vm.available, "percent": vm.percent},
        "disk": {"total": disk.total, "used": disk.used, "percent": disk.percent},
        "network": {"bytes_sent": net.bytes_sent, "bytes_recv": net.bytes_recv},
        "uptime_seconds": int(time.time() - psutil.boot_time()),
        "platform": f"{platform.system()} {platform.release()}",
    }
