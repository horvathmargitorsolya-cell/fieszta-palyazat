# Spera – Fejlesztői jegyzetek és technikai referencia (`proj/NOTES.md`)

Ez a dokumentum a **Spera** (FIESZTA 2026, jelige: **Manci**) webes prototípusának belső technikai és domain-útmutatója a további fejlesztéshez, hibajavításhoz és karbantartáshoz.

> **Fontos:** Ez a fájl fejlesztői referencia; a végleges beadandó ZIP (`dist/spera_Manci_prototipus.zip`) kizárólag a 4 futtatható fájlt (`index.html`, `styles.css`, `app.js`, `data.js`) tartalmazza.

---

## 1. Kötelező technikai korlátozások (Hard Constraints)

1. **100% offline működés (`file://` protokoll):**
   - Tilos webszervert, adatbázist, build lépést, csomagkezelőt (`npm`, `pip`), külső CDN-t, külső betűtípust vagy API-kulcsot igényelni.
   - Az `index.html` dupla kattintással (`file:///.../index.html`) hibátlanul kell működjön Chrome, Edge és Firefox böngészőben.
2. **Tilos `fetch()` / XHR lokális JSON fájlokra:**
   - A `file://` CORS korlátozásai miatt minden szintetikus adat és tudásbázis közvetlenül JavaScriptben (`data.js`) található.
3. **Adatvédelem és szintetikus adatok:**
   - Kizárólag fiktív / szintetikus betegadatok használhatók (`Szabó Eszter`).
   - A felhasználói adatok kizárólag helyben, a böngészőben (`localStorage`, kulcs: `spera_fieszta_2026_v1`) tárolódnak.
4. **Beágyazott erőforrások és nyelv:**
   - Minden vizuális erőforrás (SVG grafikonok, ikonok, `data:image/svg+xml` favicon) inline beágyazott.
   - A teljes UI, tartalom és üzenetrendszer **magyar nyelvű**.
5. **XSS-védelem:**
   - Minden dinamikus vagy felhasználó által megadott szöveg DOM-ba írásakor kötelező az `escapeHtml()` (`app.js`) használata.

---

## 2. Fájlarchitektúra (`proj/`)

| Fájl | Sorok | Felelősségi kör |
|---|---|---|
| `index.html` | ~1192 | SPA váz: üresen induló `#onboardingScreen` (+ zsűri demóbetöltő gomb), fejléc-élethelyzetváltó, 7 nézet szekciói, modális ablakok. |
| `styles.css` | ~2499 | Design rendszer (`:root` CSS változók), reszponzív rácsok, kártyák, nyomtatásbarát `.no-print` szabályok. |
| `data.js` | ~1049 | `window.SPERA_DATA` IIFE: szintetikus adatok és orvosszakmai tudásbázis. |
| `app.js` | ~3036 | Állapotkezelés, domain számítások, inline SVG grafikonok, nézet-renderelők és eseménykezelés. |

---

## 3. Adatmodul (`window.SPERA_DATA` – `data.js`)

Exportált objektumok és függvények:
- `ENDOCRINE_PROFILES`: `pcos` (`E28.2 / E11.9`), `hashimoto` (`E06.3 / E03.9`), `endometriosis` (`N80`).
- `SELF_MANAGEMENT_META`: 4-szintű önmenedzsment-rendszer címkéi és SVG ikonjai (gyógyszerszabály, energia 1–5, hangulat 1–5, hangulatcímkék, alvásminőség, vérzés, méhnyaknyák, kismedencei fájdalom, `headache`, `glucoseReaction`, `giDetail`, `thermoDetail`, bőr/haj trend, `missedDosesChoice`, `weightChangeType`).
- `SYMPTOM_LIBRARY`: fázis- és kórképspecifikus tünetlisták.
- `BIOMARKERS`: `tsh`, `ft4`, `homa`, `progesterone`, `estradiol`, `vitd`, `ferritin` referencia- és optimális tartományokkal.
- `NUTRITION_GUIDE`: 3 élethelyzetre (`cycle`, `ttc`, `pregnancy`) bontott fázis-, prekoncepciós és I–III. trimeszter-specifikus étrendi és mikrotápanyag-protokollok.
- `INTERACTION_RULES`: gyógyszer–vitamin–étkezés kölcsönhatási szabályok (pl. L-tiroxin vs. vas/kalcium $\ge 4$ óra, kávé $\ge 45$ perc).
- `PATIENT_JOURNEY`: 5 állomásos betegúttérkép (döntési pont, tipikus elakadás, Spera támogatási pont, cél-tab).
- `PREGNANCY_MILESTONES`, `PRENATAL_CHECKLIST`, `TTC_CHECKLIST`: 4–40. heti magzati fejlődési mérföldkövek (gyümölcs/zöldség méret-összehasonlítással), kötelező várandóssági szűrések és prekoncepciós orvosi ellenőrzőlista.
- `createDemoState()`: **Szabó Eszter (29 éves)** teljes szintetikus profilja. Szándékosan `cycleLength: 28` értékkel indul, miközben a `cycleHistory` utolsó 3 eleme 33–35 napos – ezzel demonstrálja a Smart Alertet.
- `shiftDate(daysOffset)`: relatív ISO dátumok generálása a mai naphoz képest, hogy a demó bármikor megnyitva naprakész maradjon.

---

## 4. Állapotkezelés és szinkronizációs szabály (`app.js`)

- **Tárolókulcs:** `STORAGE_KEY = "spera_fieszta_2026_v1"`
- **Életciklus:** `createEmptyState()` $\rightarrow$ `loadSavedFromStorage()` / `normalizeState(raw)` $\rightarrow$ `saveState()`.
- **Felső szintű `state` mezők:** `onboarded`, `isDemo`, `mode`, `journeyStep`, `profile`, `visitPrep`, `conditions`, `medications`, `intakeLogs`, `cycleHistory`, `smartAlertDismissedForAvg`, `prenatalChecklist`, `ttcChecklist`, `labResults`, `symptomLogs`, `settings`. A `settings` objektum tartalmazza a `largeText`, `soundEnabled`, `notificationsEnabled` és `showMedicalWhy` kapcsolókat.
- **Kötelező szinkron:** Ha új mezőt adsz a `state` struktúrához, **mindhárom helyen** frissíteni kell:
  1. `createEmptyState()` (`app.js`)
  2. `normalizeState(raw)` (`app.js`)
  3. `createDemoState()` (`data.js`)

---

## 5. Főbb domain-függvények (`app.js`)

- `getCycleStatusForDate(targetIso)` – kiszámítja az adott dátumhoz tartozó ciklusnapot, fázist (`menstruation`, `follicular`, `ovulation`, `luteal`), következő menstruációt és termékeny ablakot.
- `getPregnancyStatus()` – várandósság módban (`mode === "pregnancy"`) kiszámítja a terhességi hetet (1–40), trimesztert és a várható szülési dátumot.
- `getSmartCycleAlert()` – összeveti a beállított `cycleLength`-et az utolsó ciklusok átlagával; eltérés esetén egykattintásos frissítési javaslatot ad.
- `getActiveInteractions()` – a rögzített gyógyszerek és kórképek alapján kigyűjti az aktív időzítési/kölcsönhatási figyelmeztetéseket.
- `checkDueReminders()` – az aktuális időpont és `intakeLogs` alapján kezeli az esedékes gyógyszerbevételi értesítéseket és szundi (`snoozedQueue`) állapotokat.
- `computeSelfManagementStats()` – összesíti a 30 napos gyógyszerhűséget, alvás/energia/hangulat átlagokat és vizit-előkészítő mutatókat.

---

## 6. Nézetek (4 tab, csúszka nélkül) és arculat

- **Tabok (`data-tab`):** `dashboard` (*Áttekintő*), `symptoms` (*Gyorsteszt & Napló*), `analytics` (*Elemzések & Laborok*), `journey` (*Betegút & Orvosi adatok*). Mobilon (`<= 720px`) fix alsó navigációs sávként jelenik meg.
- **Áttekintő:** 6 hetes (1,5 hónapos) gördülő ciklusnaptár mind a 4 fázis színkódolásával és napra pontos menstruáció-előrejelzéssel, Mai gyógyszerek gyors-pipálás, főoldali Étrend & Vitamin ajánló, valamint Babatervező / Várandósság orvosi fókuszblokk.
- **Betegút & Orvosi adatok:** 5 állomásos Betegúttérkép, alatta közvetlen funkcióként a kinyitható/nyomtatható **Orvosi összefoglaló (Állapotlap)**, majd a betegségek, gyógyszer-törzsadatok, emlékeztető-vezérlés, allergiák, kórelőzmény és helyi JSON export/import.
- **Élethelyzet-váltó (`MODE_LABELS`):** `cycle` (*Cikluskövetés*) $\leftrightarrow$ `ttc` (*Baba tervezése*) $\leftrightarrow$ `pregnancy` (*Várandósság követése*).
- **Modális ablakok (`index.html`):** `conditionModal` (betegség/fázis), `medicationModal` (gyógyszer/emlékeztető), `labModal` (új laboreredmény), `cycleModal` (tényleges ciklushossz).
- **Színpaletta (`styles.css` – északi téli, sötét tónusú arculat, piros dominancia és vakító fehér nélkül):**
  - Oldalháttér: `#111822` (mély éjkék-palaszürke)
  - Kártyák / felületek: `#1A2432` (téli pala), `#1F2B3B` / `#233042` (belső palaszürke felületek), `#141D29` (beviteli mezők)
  - Fejléc sáv: `#0C141F` – `#132030` (mély éjkék), alatta `#162130` navigációs sáv
  - Kiemelés (fő akcentus): `#2E7D96` (gleccser-türkizkék, világos jégkék szövegszín: `#7FD1E8`)
  - Másodlagos: `#D6A146` (téli gyertyafény-arany)
  - Egyensúly / pozitív: `#368A6B` (örökzöld fenyőzöld)
  - Menstruációs / figyelmeztető tónus: `#C95B6B` / `#C96B8C` (visszafogott téli szilva)
- **Logó:** két egymásba fonódó lágy ív (ciklikusság és hormonális egyensúly), középpontjában folytonos vonallal rajzolt mag/hajtás szimbólum.

---

## 7. Ellenőrzési és tesztelési lista módosítások után

1. Szinkronizáld a kísérő dokumentációt (`docs/spera_dokumentacio.tex`) és ezt a fejlesztői jegyzetet (`proj/NOTES.md`) a projekt módosításaival.
2. Futtasd a gyökérben lévő teljes ellenőrző és csomagoló pipeline-t (beleértve a LaTeX fordítást is, hogy a `dist/spera_Manci_dokumentacio.pdf` és a `dist/spera_Manci_prototipus.zip` naprakész maradjon):
   ```bash
   python3 pipeline.py
   ```
3. Ha van telepített `node`, ellenőrizd a JS szintaxist: `node --check proj/data.js && node --check proj/app.js`.
4. Nyisd meg a kicsomagolt `index.html`-t `file://` protokollon, kikapcsolt hálózattal (Chrome / Edge / Firefox):
   - Teszteld az üres onboardingot és a *„Demó profil automatikus kitöltése”* gombot.
   - Ellenőrizd a Smart Alertet, az Élethelyzet-váltót (beleértve a Várandósság módot), a 7 tabot, az SVG grafikonokat és a nyomtatási előnézetet (`Orvosi összefoglaló`).
