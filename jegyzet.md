# FIESZTA 2026 Pályázat – Projektjegyzet és Terv

## 1. Pályázati alapadatok és követelmények

- **Kiíró:** NJSZT Orvos-biológiai Szakosztály (OBSZ) Ifjúsági Csoport
- **Benyújtási határidő:** **2026. november 27. 18:00** (online űrlapon, max. 3 beküldés/frissítés ugyanazzal az e-mail-címmel és jeligével)
- **Bemutató és eredményhirdetés:** **2026. december 3. 16:00**, Semmelweis Egyetem Digitális Egészségtudományi Intézet (1094 Budapest, Ferenc tér 15.) – 5 perces élő digitális poszterséta
- **Beadandó anyagok (magyar nyelven, fájlonként max. 8 MB):**
  1. **Működő webes prototípus (ZIP):** HTML/CSS/JS alapú, `index.html` megnyitásával futtatható.
  2. **Kísérő dokumentáció (PDF):** legfeljebb 5 oldal, üzleti-fejlesztési összefoglalóval és indítási útmutatóval.
  3. **Betegút-ábrázolás:** interaktívan a prototípusban + rövid magyarázat a PDF-ben.
- **Kritikus technikai szabályok:**
  - **100% offline működés (`file://`):** nincs webszerver, nincs adatbázis, nincs telepítés, nincs külső CDN vagy API-kulcs.
  - **Nincs `fetch()` lokális JSON-ra:** a `file://` CORS korlátozásai miatt a szintetikus adatok közvetlenül JavaScript fájlban (pl. `data.js`) legyenek tárolva.
  - **Adatvédelem:** kizárólag fiktív / szintetikus betegadatok használhatók.
  - Minden erőforrás (grafikonkönyvtár, ikonok, betűtípusok) helyben elérhető vagy beágyazott legyen.
- **Értékelési szempontok (összesen 100 pont):**
  - Betegközpontúság, valós problémára adott válasz – **20 pont**
  - Felhasználói élmény (UX), átláthatóság – **20 pont**
  - Adatvizualizáció és működő prototípus minősége – **20 pont**
  - Betegút és prevenciós szemlélet – **20 pont**
  - Mellékelt dokumentáció – **20 pont**

---

## 2. Koncepció összefoglalása

**Téma:** Menstruációs cikluskövetéssel integrált, nőgyógyászati-endokrinológiai személyes egészségügyi dashboard.

**A megoldandó probléma:** Az endokrin betegséggel élő nők egészségügyi adatai jelenleg szétszórtak (vérzésnapló külön mobilappban, hormonlaborok EESZT PDF-ekben, ultrahang papíron, gyógyszerek és vitaminok fejben, tünetek nincsenek összekötve a ciklusfázisokkal). A dashboard egyetlen, betegközpontú felületen kapcsolja össze a ciklust, az endokrin tüneteket, a laboreredményeket, a mikrotápanyagokat és a betegutat.

### Véglegesített kulcsdöntések
1. **Moduláris endokrin profil (3 választható kórkép, külön-külön vagy kombinálva is):**
   - **PCOS / Inzulinrezisztencia (IR)**
   - **Pajzsmirigy-alulműködés / Hashimoto-thyreoiditis**
   - **Endometriózis / Ösztrogéndominancia**
   - *(Általános cikluskövetéshez / kivizsgálás alatt állóknak is használható.)*
2. **Indulás (Onboarding):**
   - Minden megnyitáskor **üres kezdő kérdőívvel** indul (név/becenév, életkor, átlagos ciklushossz, menstruáció hossza, utolsó menstruáció kezdete, endokrin érintettség(ek), élethelyzet).
   - *Praktikus kiegészítés a zsűri számára:* egy diszkrét **„Demó profil automatikus kitöltése”** gomb a kérdőív alján, hogy gyorsan is kipróbálható legyen.
3. **Élethelyzet- / Állapotváltó a fejlécben:**
   - Egykattintásos váltó: **`Cikluskövetés`** ↔ **`Baba tervezése`** ↔ **`Várandósság követése`**.
4. **Arculat, színvilág és szimbolika (Spera):**
   - Földszínek, meleg terrakotta, lágy zsályazöld és púderes barack (agresszív neonszínek és babarózsaszín nélkül — nyugalom, természetesség, orvosi tisztaság):
     - Háttér: meleg homok / törtfehér (`#FAF6F2`)
     - Kiemelések: meleg terrakotta (`#C86D51`)
     - Másodlagos tónus: púderes barack (`#E8C3A3`)
     - Pozitív / egyensúly jelző: lágy zsályazöld (`#7DA690`)
   - **Logó:** két egymásba fonódó lágy ív (ciklikusság és hormonális egyensúly), középpontjában egy folytonos vonallal rajzolt, finom mag/hajtás szimbólum (petesejt/termékenység és növekedés/remény).

---

## 3. Funkcionális modulok terve

### 3.1. Áttekintő Dashboard & Interaktív Naptár
- Aktuális ciklusnap és ciklusfázis (Menstruációs, Follikuláris, Ovulációs, Luteális) vizuális megjelenítése.
- Következő menstruáció és ovulációs / termékeny ablak előrejelzése a naptárban.
- **Okos ciklushossz-módosító javaslat (Smart Alert):** ha több egymást követő hónap tényleges ciklushossza (pl. 33–35 nap) eltér a kezdetben megadott értéktől (pl. 28 nap), a rendszer figyelmeztető kártyán felajánlja az alapértelmezett ciklushossz egykattintásos frissítését és a naptár újraszámolását.
- **Érthető figyelmeztetések:**
  - Ciklusnap-függő hormonlabor időzítés (pl. 3–5. napi hormonpanel; eltolódott ovuláció esetén a progeszteron-vérvétel `ovuláció + 7. napra` igazítása).
  - Orvosi kontroll javaslata tartósan elhúzódó ciklus vagy halmozódó tünetek esetén.

### 3.2. Fázis- és betegségspecifikus Tünetnaplózó
- A napi naplózásban **első helyen az aktuális ciklusfázisra ÉS a beállított endokrin betegség(ek)re jellemző tüneteket ajánlja fel**:
  - *Menstruáció + Endometriózis / Ösztrogéndominancia:* kismedencei görcsök, derékfájás, erős/alvadékos vérzés, puffadás („endo-belly”), fejfájás, vashiányos fáradtság.
  - *Follikuláris / Ovuláció + PCOS / IR:* ovulációs szúrás, nyákváltozás, étkezés utáni álmosság, édesség utáni sóvárgás, akne.
  - *Luteális fázis + Hashimoto / Ösztrogéndominancia:* mellfeszülés, PMS / hangulatingadozás, reggeli ólmos fáradtság, hideg végtagok, hajhullás, vízvisszatartás.
- Lehetőség egyéb tünetek, alaphőmérséklet (BBT) és gyógyszer-/vitaminbevétel rögzítésére.

### 3.3. Elemzések és Adatvizualizáció
1. **Ciklushossz-trend és szabályossági elemzés:**
   - Havi ciklushosszak oszlop-/vonaldiagramon, referencia-tartomány (21–35 nap) és átlag megjelenítése, automatikus módosítási javaslattal összekötve.
2. **Endokrin laboreredmények időbeli alakulása:**
   - Interaktív, szűrhető grafikon a releváns biomarkerekhez: **TSH, fT4, HOMA-IR, Progeszteron, Ösztradiol, D-vitamin, Ferritin/Vas**.
   - Normál referencia- és optimális (pl. babatervezési) célértéksávok megjelenítése.
3. **Ciklusfázis–Tünet korreláció és Alaphőmérséklet (BBT) görbe:**
   - A tünetintenzitás és a BBT alakulása a ciklus napjai során, fázisokra bontva.
4. *(Opcionális extra)* **Orvosi vizit összefoglaló:** 1 képernyős, nyomtatható/áttekinthető összegzés a nőgyógyász/endokrinológus számára.

### 3.4. Étrend- és Vitaminajánló (Prevenció és Önmenedzsment)
- **Ciklusfázis és betegség szerinti mikrotápanyag-javaslatok:**
  - *Menstruáció:* Vas + C-vitamin, Magnézium-biszglicinát, Omega-3.
  - *Follikuláris & Ovuláció:* Mio-inozitol (PCOS/IR), Cink, Szelén (Hashimoto), D3+K2-vitamin, B-komplex.
  - *Luteális fázis:* B6-vitamin + Magnézium, Króm + lassú felszívódású szénhidrátok (IR), keresztesvirágú zöldségek / rostok / ösztrogénlebontás támogatása (Endometriózis / ösztrogéndominancia).
- **Gyógyszer–vitamin kölcsönhatás-figyelő:** pl. L-tiroxin éhgyomri bevétele és legalább 4 óra szünet vas/kalcium előtt, 30–60 perc kávé előtt.

### 3.5. Várandósságkövető mód
- Átkapcsoláskor a naptár és a fő áttekintő átáll **terhességi hetekre (1–40. hét) és trimeszterekre**, várható szülési dátummal.
- Trimeszter-specifikus vitaminajánló: aktív folát (5-MTHF), DHA/Omega-3, Vas, D-vitamin, Kolin.
- **Speciális endokrin terhességi figyelmeztetések:**
  - Hashimoto/pajzsmirigy esetén: pozitív teszt után azonnali TSH-kontroll (gyakori L-tiroxin dózisemelési igény), jódbevitel orvosi egyeztetése.
  - PCOS/IR esetén: korai vércukor-kontroll és terhességi diabétesz (OGTT) szűrés időzítése.
  - Progeszteron-támogatás és kontrollvizsgálatok nyomon követése.

### 3.6. Vizuális, interaktív Betegúttérkép (2. kötelező pályázati elem)
- Főbb ellátási állomások, betegdöntési pontok, tipikus elakadások és a dashboard támogatási pontjai:
  1. **Tünetek felismerése** *(rendszertelen ciklus, fáradtság, fájdalom, bőrtünetek)* → Tünetnapló és korrelációs elemzés segíti a mintázat felismerését.
  2. **Első ellátási pont (Háziorvos / Nőgyógyász)** *(Elakadás: tünetek elbagatellizálása, kivizsgálás nélküli tüneti kezelés)* → Strukturált orvosi vizit összefoglaló.
  3. **Célzott endokrin diagnosztika** *(Elakadás: rossz ciklusnapon levett hormonlabor!)* → Automatikus 3–5. és 21. napi (ovuláció + 7 nap) vérvételi emlékeztető.
  4. **Diagnózis és személyre szabott terápia** *(gyógyszer + diéta + mikrotápanyagok)* → Vitamin- és gyógyszeridőzítő, kölcsönhatás-figyelmeztetések.
  5. **Hosszú távú gondozás, prevenció és családtervezés** *(szövődmények megelőzése, féléves kontrollok, várandósság alatti fokozott követés)* → Kontrollnaptár, trendelemzés, Várandós mód.

---

## 4. Kísérő dokumentáció (PDF, max. 5 oldal) vázlata

1. **Bevezetés, választott kórképek és fiktív célfelhasználó (persona)**
2. **A megoldandó probléma és a dashboard célja**
3. **A prototípus fő funkciói, technológiai felépítése és indítási útmutató** (+ ismert technikai korlátozások)
4. **Szintetikus adatok és orvosszakmai források** (pl. ESHRE/nemzetközi PCOS, ATA pajzsmirigy, ESHRE endometriózis irányelvek)
5. **Betegút-ábrázolás magyarázata**
6. **Üzleti, megvalósíthatósági és továbbfejlesztési koncepció** (célcsoport, EESZT / HL7 FHIR integráció, okosóra/BBT-szenzor csatlakozás, GDPR különleges egészségügyi adatvédelem, B2C freemium / B2B2C magánklinikai modell)

---

## 5. Nyitott kérdések és teendők (Következő lépések)

### Még tisztázandó:
- [x] **Alkalmazás végleges neve:** **Spera**
- [ ] **Pályázati jelige** kiválasztása a beadáshoz

### Megvalósítási checklist (Határidő: 2026. nov. 27. 18:00!):
- [ ] Fájlstruktúra kialakítása (`index.html`, `styles.css`, `data.js`, `app.js`, helyi grafikonmegoldás)
- [ ] Kezdő kérdőív (Onboarding) + 1 kattintásos demó betöltés implementálása
- [ ] Interaktív naptár, ciklusfázis-számítás és okos ciklushossz-módosító logika
- [ ] Fázis- és betegségspecifikus tünetnaplózó
- [ ] Elemzések nézet (Ciklushossz-trend, Endokrin labor grafikonok, BBT/tünet görbe)
- [ ] Étrend- és vitaminajánló + kölcsönhatás-figyelő
- [ ] Fejlécből kapcsolható Baba tervezése & Várandósság követése mód
- [ ] Interaktív Betegúttérkép képernyő
- [ ] **Offline tesztelés** (`file://` protokollról, kikapcsolt internettel, Chrome/Edge/Firefox böngészőben)
- [ ] Max. 5 oldalas PDF dokumentáció elkészítése és átnézése
- [ ] Végső ZIP csomag elkészítése (≤ 8 MB) és friss kicsomagolásos próba
- [ ] Beadás az online űrlapon (nov. 27. 18:00 előtt)
- [ ] 5 perces élő demó / poszterséta forgatókönyv (dec. 3.)
