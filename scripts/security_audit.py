"""
Quick security / deploy smoke checks against a running instance.

Usage:
  python scripts/security_audit.py https://your-domain.up.railway.app
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass

import requests


@dataclass
class Finding:
    name: str
    ok: bool
    detail: str


def _get(base: str, path: str, **kwargs) -> tuple[int, str]:
    try:
        r = requests.get(base + path, timeout=12, **kwargs)
        return r.status_code, r.text[:300]
    except requests.RequestException as exc:
        return 0, str(exc)


def audit(base: str) -> list[Finding]:
    findings: list[Finding] = []

    code, body = _get(base, "/healthz")
    findings.append(
        Finding(
            "healthz",
            code == 200,
            f"status={code} body={body[:120]}",
        )
    )

    code, _ = _get(base, "/admin")
    findings.append(
        Finding(
            "admin_without_cookie",
            code in {302, 303, 401, 403, 503},
            f"status={code} (must not be 200 without session)",
        )
    )

    code, body = _get(base, "/api/healthz/details")
    findings.append(
        Finding(
            "healthz_details_locked",
            code in {401, 403, 503},
            f"status={code} (admin metrics must not be public)",
        )
    )

    code, _ = _get(base, "/preview-lab")
    findings.append(Finding("preview_lab", code == 200, f"status={code}"))

    code, _ = _get(
        base,
        "/api/responder",
        headers={"Origin": "https://evil.example"},
        # GET should not be blocked; POST cross-origin tested separately
    )
    findings.append(Finding("responder_get", code in {200, 405, 404, 429}, f"status={code}"))

    try:
        post = requests.post(
            base + "/api/responder",
            json={"nombre": "test", "mensaje": "audit"},
            headers={"Origin": "https://evil.example"},
            timeout=12,
        )
        findings.append(
            Finding(
                "responder_post_cross_origin",
                post.status_code in {200, 201, 400, 403, 429, 503},
                f"status={post.status_code} (403 expected if ENFORCE_SAME_ORIGIN_WRITES=1)",
            )
        )
    except requests.RequestException as exc:
        findings.append(Finding("responder_post_cross_origin", False, str(exc)))

    return findings


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Uso: python scripts/security_audit.py https://tu-dominio")
        return 2
    base = argv[1].rstrip("/")
    if not base.startswith("http"):
        base = "https://" + base
    results = audit(base)
    out = {
        "target": base,
        "ok": all(f.ok for f in results),
        "findings": [{"name": f.name, "ok": f.ok, "detail": f.detail} for f in results],
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
