# AGENTS.md – Spera (FIESZTA 2026 Pályázat)

Ez a dokumentum az AI-kódoló ágensek belépési útmutatója a **Spera** projekthez.

- **Alkalmazás neve:** **Spera** (nőgyógyászati-endokrinológiai ciklus- és egészségdashboard)
- **Pályázat:** FIESZTA 2026 (NJSZT OBSZ Ifjúsági Csoport)
- **Pályázati jelige:** **`Manci`**
- **Határidők:**
  - **Beadás:** **2026. november 27. 18:00** (online űrlap, max. 3 beküldés ugyanazzal az e-mail-címmel és jeligével, fájlonként $\le$ 8 MB)
  - **Bemutató és eredményhirdetés:** **2026. december 3. 16:00**, Semmelweis Egyetem Digitális Egészségtudományi Intézet (5 perces élő digitális poszterséta)

---

## Könyvtárstruktúra

| Útvonal | Szerep |
|---|---|
| `proj/` | A működő, 100% offline HTML/CSS/JS webes prototípus (`index.html`, `styles.css`, `app.js`, `data.js`). |
| **`proj/NOTES.md`** | **Elsődleges technikai és domain-referencia** a prototípus további fejlesztéséhez (adatmodell, állapotkezelés, függvények, UX és tesztelési szabályok). |
| `docs/` | LaTeX dokumentáció forrása (`docs/spera_dokumentacio.tex`, max. 5 oldal). |
| `dist/` | A `pipeline.py` által generált végleges beadandó fájlok (`spera_Manci_prototipus.zip`, `spera_Manci_dokumentacio.pdf`). |
| `pipeline.py` | Szakaszolt Python build-, ellenőrző- és csomagoló szkript. |
| `fieszta2026_palyazat.html` | Mentett pályázati kiírás (csak referencia, nem része a beadandó ZIP-nek). |

---

## Kötelező szabályok (részletek: `proj/NOTES.md`)

1. **100% offline (`file://`) működés:** Tilos webszerver, build lépés, külső CDN, külső betűtípus vagy `fetch()` hívás.
2. **Szintetikus adatok és helyi tárolás:** Kizárólag fiktív betegadatok (`Szabó Eszter`) és `localStorage` használható; minden dinamikus DOM-kiíráshoz kötelező az `escapeHtml()`.
3. **Magyar nyelvű felület és dokumentáció:** Minden UI szöveg és a max. 5 oldalas PDF magyar nyelvű.
4. **Állapotszinkron:** Új `state` mező felvételekor frissítsd egyszerre a `createEmptyState()`, `normalizeState()` (`proj/app.js`) és `createDemoState()` (`proj/data.js`) függvényeket.
5. **Szemantikus, atomi commitok és push:** Minden új funkciót atomi, önállóan értelmezhető commitokban kell rögzíteni szemantikus (Conventional Commits) üzenetekkel (pl. `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), és minden commit vagy commit-csomag után push-olni kell a távoli tárolóba.

---

## Build és ellenőrző pipeline (`pipeline.py`)

```bash
# Teljes pipeline (validate -> latex -> zip -> verify)
python3 pipeline.py

# Csak prototípus-ellenőrzés, ZIP csomagolás és összegzés (LaTeX nélkül)
python3 pipeline.py --stages validate,zip,verify

# Tiszta újraépítés (docs/.build és dist törlése előtte)
python3 pipeline.py --clean
```

---

## Hátralévő pályázati teendők

- [x] **Pályázati jelige** kiválasztása (`Manci`)
- [ ] **LaTeX PDF dokumentáció** lefordítása (`python3 pipeline.py --stages latex,verify`) és ellenőrzése ($\le$ 5 oldal, $\le$ 8 MB)
- [ ] **Offline tesztelés** (`file://` protokollról, kikapcsolt internettel, Chrome/Edge/Firefox böngészőben)
- [ ] **Friss kicsomagolásos próba** a `dist/spera_Manci_prototipus.zip` fájlból
- [ ] **Beadás** az online űrlapon (2026. nov. 27. 18:00 előtt)
- [ ] **5 perces élő demó / poszterséta** forgatókönyv (2026. dec. 3.)
