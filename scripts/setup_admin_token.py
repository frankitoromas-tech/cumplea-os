#!/usr/bin/env python3
"""Generate ADMIN_TOKEN and write .env + data/admin_token for local/testing."""
from __future__ import annotations

import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKEN = secrets.token_urlsafe(32)


def main() -> None:
    data_dir = ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "admin_token").write_text(TOKEN + "\n", encoding="utf-8")

    env_path = ROOT / ".env"
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    def upsert(key: str, value: str) -> None:
        nonlocal lines
        prefix = f"{key}="
        for i, line in enumerate(lines):
            if line.startswith(prefix):
                lines[i] = prefix + value
                return
        lines.append(prefix + value)

    upsert("ADMIN_TOKEN", TOKEN)
    upsert("ENABLE_TEST_ADMIN", "1")
    upsert("TEST_ADMIN_TOKEN", TOKEN)
    env_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    print("Admin panel configurado.")
    print(f"  Token: {TOKEN}")
    print(f"  Archivo: {data_dir / 'admin_token'}")
    print(f"  .env actualizado: {env_path}")
    print("  Login: http://127.0.0.1:5000/admin/login")
    print()
    print("Railway: pega el token en Variables -> ADMIN_TOKEN")
    print("  o ENABLE_TEST_ADMIN=1 + TEST_ADMIN_TOKEN=<token>")


if __name__ == "__main__":
    main()
