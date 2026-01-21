import sys
import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Get the backend directory - when PyInstaller runs from project root, backend/ is relative to cwd
ROOT = Path(os.getcwd()) / 'backend'

datas = []
# Only include essential spaCy data files, exclude documentation
spacy_datas = collect_data_files("spacy")
en_core_datas = collect_data_files("en_core_web_sm")

# Filter out unnecessary files like README, LICENSE, documentation
datas += [d for d in spacy_datas if not any(exclude in d[0].lower() for exclude in ['readme', 'license', 'licenses', '.md', 'accuracy.json'])]
datas += [d for d in en_core_datas if not any(exclude in d[0].lower() for exclude in ['readme', 'license', 'licenses', '.md', 'accuracy.json'])]

hiddenimports = []
hiddenimports += collect_submodules("spacy")
hiddenimports += collect_submodules("en_core_web_sm")

block_cipher = None

a = Analysis(
    [str(ROOT / "app.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="cumo-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)


