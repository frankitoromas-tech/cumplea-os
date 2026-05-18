"""
Deployment audit helper.

Usage:
  python scripts/deploy_audit.py https://your-domain

Checks:
  - DNS resolution
  - TCP 443 reachability
  - HTTPS health endpoints
  - Build metadata endpoint
"""
from __future__ import annotations

import json
import socket
import sys
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import requests


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def _normalize_base(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        raise ValueError("URL vacia")
    if "://" not in raw:
        raw = "https://" + raw
    parsed = urlparse(raw)
    if not parsed.netloc:
        raise ValueError(f"URL invalida: {raw}")
    return f"{parsed.scheme}://{parsed.netloc}"


def _check_dns(host: str) -> CheckResult:
    try:
        ip = socket.gethostbyname(host)
        return CheckResult("dns", True, f"{host} -> {ip}")
    except OSError as exc:
        return CheckResult("dns", False, f"error DNS: {exc}")


def _check_tcp(host: str, port: int, timeout: float = 5.0) -> CheckResult:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        return CheckResult("tcp", True, f"{host}:{port} reachable")
    except OSError as exc:
        return CheckResult("tcp", False, f"{host}:{port} unreachable ({exc})")
    finally:
        sock.close()


def _http_get(url: str, timeout: float = 10.0) -> tuple[bool, str, Any]:
    try:
        response = requests.get(url, timeout=timeout)
        status = response.status_code
        text = response.text[:220].replace("\n", " ")
        return True, f"{status} {text}", response
    except requests.RequestException as exc:
        return False, str(exc), None


def audit(base_url: str) -> list[CheckResult]:
    parsed = urlparse(base_url)
    host = parsed.hostname or ""
    scheme = (parsed.scheme or "https").lower()
    port = parsed.port
    if port is None:
        port = 443 if scheme == "https" else 80
    results: list[CheckResult] = []

    dns = _check_dns(host)
    results.append(dns)
    tcp = _check_tcp(host, port)
    results.append(tcp)

    for path in ("/healthz", "/api/healthz", "/api/build_info", "/preview-lab"):
        ok, detail, response = _http_get(base_url + path)
        label = f"http {path}"
        if ok:
            status_code = response.status_code if response is not None else 0
            if response is not None and path == "/api/build_info":
                try:
                    payload = response.json()
                    rev = payload.get("preview_lab_rev", "-")
                    detail = f"{status_code} rev={rev}"
                except Exception:
                    pass
            results.append(CheckResult(label, status_code < 400, detail))
        else:
            results.append(CheckResult(label, False, detail))

    return results


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Uso: python scripts/deploy_audit.py https://tu-dominio")
        return 2

    try:
        base = _normalize_base(argv[1])
    except ValueError as exc:
        print(str(exc))
        return 2

    results = audit(base)
    output = {
        "target": base,
        "ok": all(r.ok for r in results),
        "checks": [
            {"name": r.name, "ok": r.ok, "detail": r.detail}
            for r in results
        ],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
