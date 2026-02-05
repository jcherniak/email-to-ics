#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 - <<'PY'
import shutil
from pathlib import Path

base = Path('.').resolve()
root = base.parent.parent
dist = base / 'dist'
dist.mkdir(parents=True, exist_ok=True)

def find_path(rel):
    candidates = [base / rel, root / rel]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(rel)

copies = [
    ('node_modules/bootstrap/dist/css/bootstrap.min.css', dist / 'bootstrap.min.css'),
    ('node_modules/select2/dist/css/select2.min.css', dist / 'select2.min.css'),
    ('node_modules/select2/dist/js/select2.min.js', dist / 'select2.min.js'),
    ('src/popup.html', dist / 'popup.html'),
    ('src/popup.css', dist / 'popup.css'),
    ('src/background.js', dist / 'background.js'),
    ('manifest.json', dist / 'manifest.json'),
]

for src, dest in copies:
    shutil.copy(find_path(src), dest)

# Optional assets (skip if not present)
optional_copies = [
    'node_modules/select2/dist/css/select2.png',
    'node_modules/select2/dist/css/select2x2.png'
]

for src in optional_copies:
    try:
        shutil.copy(find_path(src), dist / Path(src).name)
    except FileNotFoundError:
        pass

icons_src = base / 'icons'
icons_dest = dist / 'icons'
shutil.copytree(icons_src, icons_dest, dirs_exist_ok=True)
PY
