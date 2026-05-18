"""
services/base_service.py - Base class for JSON persistence services.

Hardened:
- Per-path threading + advisory file locking (cross-platform).
- Atomic writes with fsync on both the temp file and parent directory
  (best-effort on Windows).
- Structured error logging instead of swallowing exceptions silently.
- Transparent support for the encrypted envelope written by `guardar_datos`.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from services.crypto_service import get_data_cipher

logger = logging.getLogger(__name__)

# One threading.Lock per resolved file path. Combined with the advisory
# OS-level lock acquired in `_locked`, this protects against both intra-process
# (multiple Flask threads) and inter-process (multiple Gunicorn workers)
# read-modify-write races.
_PATH_LOCKS: dict[str, threading.Lock] = {}
_LOCKS_GUARD = threading.Lock()


def _path_lock(key: str) -> threading.Lock:
    with _LOCKS_GUARD:
        lock = _PATH_LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _PATH_LOCKS[key] = lock
        return lock


@contextmanager
def _file_lock(lockfile: Path) -> Iterator[None]:
    """
    Best-effort cross-platform advisory file lock.

    Uses fcntl on POSIX and msvcrt on Windows. Silently degrades to a no-op
    if the OS-level lock cannot be acquired so that read-mostly workloads
    on quirky filesystems (e.g. some container volumes) still function.
    """
    lockfile.parent.mkdir(parents=True, exist_ok=True)
    handle = open(lockfile, "a+b")
    locked = False
    try:
        if sys.platform == "win32":
            try:
                import msvcrt

                msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
                locked = True
            except OSError:
                logger.debug("Advisory lock unavailable on %s", lockfile)
        else:
            try:
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
                locked = True
            except OSError:
                logger.debug("Advisory lock unavailable on %s", lockfile)
        yield
    finally:
        if locked:
            try:
                if sys.platform == "win32":
                    import msvcrt

                    handle.seek(0)
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl

                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            except OSError:
                pass
        handle.close()


def _fsync_parent(path: Path) -> None:
    if sys.platform == "win32":
        return
    try:
        fd = os.open(str(path.parent), os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


class ServicioBase:
    """
    Base class for services that persist data in JSON files.
    """

    def __init__(self, ruta_archivo: str):
        ruta = Path(ruta_archivo)
        if ruta.is_absolute():
            self.ruta = ruta
        else:
            base_data_dir = Path(os.getenv("APP_DATA_DIR", "."))
            self.ruta = base_data_dir / ruta
        self._cipher = get_data_cipher()
        self._lock_key = str(self.ruta.resolve())
        self._lockfile = self.ruta.with_name(f".{self.ruta.name}.lock")

    def _decode_payload(self, payload: object) -> list:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict) and payload.get("encrypted") is True:
            if not self._cipher.enabled:
                logger.warning(
                    "Encrypted payload at %s but APP_ENCRYPTION_KEY is missing.",
                    self.ruta,
                )
                return []
            token = payload.get("data")
            if not isinstance(token, str):
                logger.error("Malformed encrypted envelope at %s.", self.ruta)
                return []
            try:
                clear = self._cipher.decrypt_json(token)
            except Exception:
                logger.exception("Failed to decrypt %s.", self.ruta)
                return []
            if isinstance(clear, list):
                return clear
            logger.error(
                "Decrypted payload at %s is not a list (got %s).",
                self.ruta,
                type(clear).__name__,
            )
            return []
        logger.warning(
            "Unexpected JSON shape at %s (got %s).",
            self.ruta,
            type(payload).__name__,
        )
        return []

    def leer_datos(self) -> list:
        """
        Read persisted data and return a list.
        Supports plaintext list and encrypted envelope formats.
        Returns [] on missing file or unrecoverable error (logged).
        """
        with _path_lock(self._lock_key), _file_lock(self._lockfile):
            try:
                if not self.ruta.exists():
                    return []
                raw = self.ruta.read_text(encoding="utf-8")
            except OSError:
                logger.exception("Cannot read %s.", self.ruta)
                return []

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                logger.exception("Corrupt JSON at %s.", self.ruta)
                return []

            return self._decode_payload(payload)

    def guardar_datos(self, datos: list) -> bool:
        """
        Persist list data atomically.
        Returns True on success, False on filesystem or encryption errors
        (which are logged for operators to investigate).
        """
        if not isinstance(datos, list):
            logger.error(
                "Refusing to save non-list data to %s (got %s).",
                self.ruta,
                type(datos).__name__,
            )
            return False

        with _path_lock(self._lock_key), _file_lock(self._lockfile):
            try:
                self.ruta.parent.mkdir(parents=True, exist_ok=True)

                if self._cipher.enabled:
                    try:
                        token = self._cipher.encrypt_json(datos)
                    except Exception:
                        logger.exception("Encryption failed for %s.", self.ruta)
                        return False
                    payload_data: object = {
                        "encrypted": True,
                        "alg": "fernet",
                        "v": 1,
                        "data": token,
                    }
                else:
                    payload_data = datos

                payload = json.dumps(payload_data, ensure_ascii=False, indent=4)
                temporal = self.ruta.with_name(f".{self.ruta.name}.tmp")
                with open(temporal, "wb") as handle:
                    handle.write(payload.encode("utf-8"))
                    handle.flush()
                    try:
                        os.fsync(handle.fileno())
                    except OSError:
                        pass
                os.replace(temporal, self.ruta)
                _fsync_parent(self.ruta)
                return True
            except OSError:
                logger.exception("Cannot write %s.", self.ruta)
                return False
