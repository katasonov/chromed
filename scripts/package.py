#!/usr/bin/env python3
import os, json, zipfile, fnmatch, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"
STAGE_DIR = DIST_DIR / "pack"
IGNORE_FILE = ROOT / ".crxignore"
#EXT_DIR = Path(os.environ.get("EXT_DIR", ROOT))
EXT_DIR = ROOT / "src" / "app"
print(f"Using EXT_DIR: {EXT_DIR}")

def load_manifest():
    manifest_path = EXT_DIR / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest.json not found at {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    if "key" in manifest:
        print("• Stripping 'key' from manifest.json for store build")
        del manifest["key"]
    return manifest

def load_ignore_patterns():
    if not IGNORE_FILE.exists():
        return []
    lines = IGNORE_FILE.read_text(encoding="utf-8").splitlines()
    return [l.strip() for l in lines if l.strip() and not l.startswith("#")]

def should_ignore(path, patterns):
    rel = str(path.relative_to(EXT_DIR))
    return any(fnmatch.fnmatch(rel, pat) for pat in patterns)

def stage_files(manifest, ignore_patterns):
    if STAGE_DIR.exists():
        shutil.rmtree(STAGE_DIR)
    STAGE_DIR.mkdir(parents=True)
    for src in EXT_DIR.rglob("*"):
        if src.is_file() and not should_ignore(src, ignore_patterns):
            dst = STAGE_DIR / src.relative_to(EXT_DIR)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    # overwrite manifest.json (stripped)
    with open(STAGE_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def make_zip(manifest):
    name = "".join(c for c in manifest["name"] if c.isalnum() or c in "-_. ")
    version = manifest.get("version", "0.0.0")
    zip_name = f"{name.replace(' ', '')}-{version}.zip"
    DIST_DIR.mkdir(exist_ok=True)
    zip_path = DIST_DIR / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in STAGE_DIR.rglob("*"):
            zf.write(file, file.relative_to(STAGE_DIR))
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"✔ Created {zip_name} ({size_mb:.2f} MB)")
    return zip_path

def main():
    print("ChromEd — Python Packager\n")
    manifest = load_manifest()
    ignore_patterns = load_ignore_patterns()
    stage_files(manifest, ignore_patterns)
    zip_path = make_zip(manifest)
    print("\nUpload this file to Chrome Web Store dashboard:\n", zip_path)

if __name__ == "__main__":
    main()
