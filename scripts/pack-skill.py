"""Pack skills/bybit into the installable bybit.skill (a ZIP archive).

All files sit under the top directory ``bybit/``: ``unzip bybit.skill -d <dir>`` gives
``<dir>/bybit/``. Only the runtime goes in: SKILL.md, the bundle and references/.
The archive is deterministic (fixed timestamp, sorted entries): unchanged content
gives identical bytes, so the committed package changes only with real edits.

Usage: ``uv run scripts/pack-skill.py [output]`` (default: bybit.skill in the repo root).
"""

import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = REPO_ROOT / "skills" / "bybit"
SKILL_NAME = "bybit"

# Explicit list, not a directory walk: stray files never reach the package.
CONTENTS = [
    "SKILL.md",
    "references/commands.md",
    "scripts/bybit.cjs",
]

FIXED_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


def build(output: Path) -> None:
    """Write the package to ``output``; fail with the missing file names if any."""
    missing = [rel for rel in CONTENTS if not (SKILL_DIR / rel).is_file()]
    if missing:
        raise SystemExit(f"Не найдены файлы скилла: {', '.join(missing)}. Бандл собирается командой npm run build.")

    output.unlink(missing_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel in sorted(CONTENTS):
            info = zipfile.ZipInfo(f"{SKILL_NAME}/{rel}", date_time=FIXED_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, (SKILL_DIR / rel).read_bytes())

    print(f"{output.name}: {len(CONTENTS)} файла, {output.stat().st_size / 1024:.1f} КБ")


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "bybit.skill")
