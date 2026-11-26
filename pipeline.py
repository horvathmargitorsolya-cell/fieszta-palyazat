#!/usr/bin/env python3
"""
Spera (FIESZTA 2026, Jelige: Manci) – Build, ellenőrző és csomagoló pipeline.

Szakaszok (--stages):
  validate  Offline / file:// megfelelőség és JS szintaxis ellenőrzése (proj/)
  latex     docs/spera_dokumentacio.tex fordítása PDF-be (<= 5 oldal, <= 8 MB)
  zip       dist/spera_Manci_prototipus.zip összeállítása a futtatható fájlokból
  verify    A dist/ könyvtár végleges ellenőrzése és összegzése
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

JELIGE = "Manci"
ROOT_DIR = Path(__file__).resolve().parent
PROJ_DIR = ROOT_DIR / "proj"
DOCS_DIR = ROOT_DIR / "docs"
DIST_DIR = ROOT_DIR / "dist"
BUILD_DIR = DOCS_DIR / ".build"

TEX_FILE = DOCS_DIR / "spera_dokumentacio.tex"
PDF_OUT = DIST_DIR / f"spera_{JELIGE}_dokumentacio.pdf"
ZIP_OUT = DIST_DIR / f"spera_{JELIGE}_prototipus.zip"

RUNTIME_FILES = ("index.html", "styles.css", "app.js", "data.js")
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_PDF_PAGES = 5

ALLOWED_URLS = {
    "http://www.w3.org/2000/svg",
}


def strip_comments(filename: str, text: str) -> str:
    """Eltávolítja a megjegyzéseket, hogy a dokumentáló kommentek ne okozzanak téves riasztást."""
    if filename.endswith(".html"):
        return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    if filename.endswith(".css"):
        return re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    if filename.endswith(".js"):
        no_block = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
        return re.sub(r"//[^\n]*", "", no_block)
    return text


def stage_validate() -> bool:
    print("\n=== [1/4] VALIDATE: Offline prototípus ellenőrzése (proj/) ===")
    ok = True

    for name in RUNTIME_FILES:
        path = PROJ_DIR / name
        if not path.is_file():
            print(f"[ERROR] Hiányzó kötelező fájl: {path}")
            return False

    for name in RUNTIME_FILES:
        path = PROJ_DIR / name
        raw = path.read_text(encoding="utf-8")
        cleaned = strip_comments(name, raw)

        if re.search(r"\bfetch\s*\(", cleaned):
            print(f"[ERROR] Tiltott fetch() hívás található: {path}")
            ok = False

        for match in re.finditer(r"https?://[^\s'\"<>)]+", cleaned):
            url = match.group(0).rstrip(".,;:")
            if url not in ALLOWED_URLS:
                print(f"[ERROR] Külső HTTP(S) hivatkozás ({url}) található: {path}")
                ok = False

    node_bin = shutil.which("node")
    if node_bin:
        for js_name in ("data.js", "app.js"):
            js_path = PROJ_DIR / js_name
            res = subprocess.run(
                [node_bin, "--check", str(js_path)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            if res.returncode != 0:
                print(f"[ERROR] JS szintaxishiba ({js_name}):\n{res.stderr}")
                ok = False
            else:
                print(f"[OK] node --check {js_name}")
    else:
        print("[WARN] 'node' nem található a PATH-on; a JS szintaxis-ellenőrzés kihagyva.")

    if ok:
        print("[OK] Minden futtatható fájl megfelel a 100% offline / file:// szabályoknak.")
    return ok


def get_pdf_page_count(pdf_path: Path) -> int | None:
    pdfinfo_bin = shutil.which("pdfinfo")
    if not pdfinfo_bin or not pdf_path.is_file():
        return None
    res = subprocess.run(
        [pdfinfo_bin, str(pdf_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if res.returncode != 0:
        return None
    for line in res.stdout.splitlines():
        if line.startswith("Pages:"):
            try:
                return int(line.split(":", 1)[1].strip())
            except ValueError:
                return None
    return None


def stage_latex() -> bool:
    print("\n=== [2/4] LATEX: Kísérő dokumentáció fordítása (docs/) ===")
    if not TEX_FILE.is_file():
        print(f"[ERROR] Hiányzó LaTeX forrásfájl: {TEX_FILE}")
        return False

    engine = None
    for candidate in ("latexmk", "pdflatex", "xelatex", "lualatex"):
        found = shutil.which(candidate)
        if found:
            engine = (candidate, found)
            break

    if not engine:
        print(
            "[ERROR] Nem található LaTeX fordító (latexmk / pdflatex / xelatex / lualatex).\n"
            "        Telepítés Debian/Ubuntu rendszeren:\n"
            "        sudo apt update && sudo apt install -y texlive-latex-base texlive-latex-extra texlive-lang-european"
        )
        return False

    name, bin_path = engine
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] Használt LaTeX motor: {name} ({bin_path})")
    if name == "latexmk":
        cmd = [
            bin_path,
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            f"-output-directory={BUILD_DIR}",
            str(TEX_FILE),
        ]
        runs = [cmd]
    else:
        cmd = [
            bin_path,
            "-interaction=nonstopmode",
            "-halt-on-error",
            f"-output-directory={BUILD_DIR}",
            str(TEX_FILE),
        ]
        runs = [cmd, cmd]

    for idx, cmd in enumerate(runs, start=1):
        res = subprocess.run(
            cmd,
            cwd=DOCS_DIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if res.returncode != 0:
            print(f"[ERROR] LaTeX fordítási hiba ({idx}. menet):\n{res.stdout[-2500:]}\n{res.stderr[-1000:]}")
            return False

    built_pdf = BUILD_DIR / f"{TEX_FILE.stem}.pdf"
    if not built_pdf.is_file():
        print(f"[ERROR] A fordítás lefutott, de nem jött létre PDF: {built_pdf}")
        return False

    shutil.copy2(built_pdf, PDF_OUT)
    size = PDF_OUT.stat().st_size
    pages = get_pdf_page_count(PDF_OUT)

    if size > MAX_FILE_BYTES:
        print(f"[ERROR] A PDF mérete ({size / (1024 * 1024):.2f} MB) meghaladja a 8 MB-os limitet!")
        return False

    if pages is not None:
        print(f"[OK] PDF elkészült: {PDF_OUT.relative_to(ROOT_DIR)} ({pages} oldal, {size / 1024:.1f} KB)")
        if pages > MAX_PDF_PAGES:
            print(f"[ERROR] A PDF {pages} oldalas, ami meghaladja a FIESZTA max. {MAX_PDF_PAGES} oldalas limitjét!")
            return False
    else:
        print(f"[OK] PDF elkészült: {PDF_OUT.relative_to(ROOT_DIR)} ({size / 1024:.1f} KB; oldalszám nem ellenőrizhető).")

    return True


def stage_zip() -> bool:
    print("\n=== [3/4] ZIP: Beadandó prototípus csomagolása (dist/) ===")
    for name in RUNTIME_FILES:
        if not (PROJ_DIR / name).is_file():
            print(f"[ERROR] Hiányzó fájl a csomagoláshoz: {PROJ_DIR / name}")
            return False

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for name in RUNTIME_FILES:
            zf.write(PROJ_DIR / name, arcname=name)

    with zipfile.ZipFile(ZIP_OUT, "r") as zf:
        bad = zf.testzip()
        if bad is not None:
            print(f"[ERROR] Sérült ZIP bejegyzés: {bad}")
            return False
        names = set(zf.namelist())
        if names != set(RUNTIME_FILES):
            print(f"[ERROR] Váratlan ZIP tartalom: {sorted(names)}")
            return False

    size = ZIP_OUT.stat().st_size
    if size > MAX_FILE_BYTES:
        print(f"[ERROR] A ZIP mérete ({size / (1024 * 1024):.2f} MB) meghaladja a 8 MB-os limitet!")
        return False

    print(f"[OK] ZIP elkészült: {ZIP_OUT.relative_to(ROOT_DIR)} ({size / 1024:.1f} KB, {len(RUNTIME_FILES)} fájl)")
    return True


def stage_verify() -> bool:
    print("\n=== [4/4] VERIFY: Beadandó csomagok összesítése (Jelige: Manci) ===")
    ok = True

    if ZIP_OUT.is_file():
        z_size = ZIP_OUT.stat().st_size
        print(f"  - Prototípus ZIP : {ZIP_OUT.relative_to(ROOT_DIR)} | {z_size / 1024:.1f} KB (limit: 8192 KB) [OK]")
    else:
        print(f"  - Prototípus ZIP : HIÁNYZIK ({ZIP_OUT.relative_to(ROOT_DIR)})")
        ok = False

    if PDF_OUT.is_file():
        p_size = PDF_OUT.stat().st_size
        pages = get_pdf_page_count(PDF_OUT)
        page_info = f"{pages}/{MAX_PDF_PAGES} oldal" if pages is not None else "oldalszám ismeretlen"
        status = "OK" if (pages is None or pages <= MAX_PDF_PAGES) and p_size <= MAX_FILE_BYTES else "HIBA"
        print(f"  - Dokumentáció PDF: {PDF_OUT.relative_to(ROOT_DIR)} | {p_size / 1024:.1f} KB | {page_info} [{status}]")
        if status != "OK":
            ok = False
    else:
        print(f"  - Dokumentáció PDF: MÉG NINCS LEFORDÍTVA ({PDF_OUT.relative_to(ROOT_DIR)})")

    return ok


def clean_outputs() -> None:
    for target in (BUILD_DIR, DIST_DIR):
        if target.exists():
            shutil.rmtree(target)
            print(f"[CLEAN] Törölve: {target.relative_to(ROOT_DIR)}")


STAGES = {
    "validate": stage_validate,
    "latex": stage_latex,
    "zip": stage_zip,
    "verify": stage_verify,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Spera (FIESZTA 2026) build és csomagoló pipeline")
    parser.add_argument(
        "--stages",
        default="validate,latex,zip,verify",
        help="Futtatandó szakaszok vesszővel elválasztva (alapértelmezett: validate,latex,zip,verify)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Törli a docs/.build és dist könyvtárakat futtatás előtt",
    )
    args = parser.parse_args()

    if args.clean:
        clean_outputs()

    requested = [s.strip() for s in args.stages.split(",") if s.strip()]
    unknown = [s for s in requested if s not in STAGES]
    if unknown:
        print(f"[ERROR] Ismeretlen szakasz(ok): {', '.join(unknown)}. Elérhető: {', '.join(STAGES)}")
        return 2

    all_ok = True
    for stage_name in requested:
        if not STAGES[stage_name]():
            all_ok = False

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
