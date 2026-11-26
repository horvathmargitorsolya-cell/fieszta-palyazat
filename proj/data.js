/* ==========================================================================
   Spera – Szintetikus (fiktív) adatok és orvosszakmai tudásbázis (100% offline)
   FIESZTA 2026 Pályázat – Nincs fetch(), file:// protokolon azonnal működik
   ========================================================================== */

window.SPERA_DATA = (function () {
  "use strict";

  // Segédfüggvény relatív dátumok előállításához a mai naphoz képest,
  // így a bemutató bármikor megnyitva friss és életszerű marad.
  function shiftDate(daysOffset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + daysOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shiftMonthLabel(monthsAgo) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toLocaleDateString("hu-HU", { year: "2-digit", month: "short" });
  }

  // ------------------------------------------------------------------------
  // 1. Moduláris endokrin kórképek katalógusa
  // ------------------------------------------------------------------------
  const ENDOCRINE_PROFILES = {
    pcos: {
      id: "pcos",
      shortName: "PCOS / Inzulinrezisztencia (IR)",
      icdCode: "E28.2 / E11.9",
      defaultPhase: "II. fázis – életmód-terápiával és metforminnal stabilizálódó",
      defaultCategory: "stable",
      color: "#C86D51"
    },
    hashimoto: {
      id: "hashimoto",
      shortName: "Hashimoto-thyreoiditis / Pajzsmirigy-alulműködés",
      icdCode: "E06.3 / E03.9",
      defaultPhase: "Krónikus, L-tiroxin pótlás mellett egyensúlyban (euthyreosis)",
      defaultCategory: "stable",
      color: "#7DA690"
    },
    endometriosis: {
      id: "endometriosis",
      shortName: "Endometriózis / Ösztrogéndominancia",
      icdCode: "N80",
      defaultPhase: "II. stádium (rASRM) – konzervatív kezeléssel kontrollált",
      defaultCategory: "progressive",
      color: "#C99A74"
    }
  };

  // ------------------------------------------------------------------------
  // 1B. Önmenedzsment 4-szintű kérdésrendszer metaadatai és címkéi
  // ------------------------------------------------------------------------
  const SELF_MANAGEMENT_META = {
    medRule: {
      yes: "Igen (szabályosan)",
      no: "Nem (kimaradt)",
      later: "Később / eltéréssel"
    },
    energyLevels: [
      {
        value: 1,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4"/><path d="M7 10v4" stroke="#B24C43"/></svg>`,
        label: "Kimerült"
      },
      {
        value: 2,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4"/><path d="M7 10v4M10 10v4" stroke="#C86D51"/></svg>`,
        label: "Fáradt"
      },
      {
        value: 3,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4"/><path d="M7 10v4M10 10v4M13 10v4"/></svg>`,
        label: "Közepes"
      },
      {
        value: 4,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/></svg>`,
        label: "Jó"
      },
      {
        value: 5,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/></svg>`,
        label: "Energikus"
      }
    ],
    moodLevels: [
      {
        value: 1,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 16c1-1.3 2-1.3 3.5 0s2.5 1.3 3.5 0"/></svg>`,
        label: "Szorongó"
      },
      {
        value: 2,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 16.2c.9-1.2 2.1-1.7 3-1.7s2.1.5 3 1.7"/></svg>`,
        label: "Levert"
      },
      {
        value: 3,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15h6"/></svg>`,
        label: "Ingadozó"
      },
      {
        value: 4,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 14.5c.8 1.2 1.9 1.7 3 1.7s2.2-.5 3-1.7"/></svg>`,
        label: "Nyugodt"
      },
      {
        value: 5,
        iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 10.2c.5-.6 1.1-.6 1.6 0M13.9 10.2c.5-.6 1.1-.6 1.6 0"/><path d="M8.5 14c1 1.7 2.2 2.4 3.5 2.4s2.5-.7 3.5-2.4"/></svg>`,
        label: "Kiegyensúlyozott"
      }
    ],
    moodTags: [
      "Kiegyensúlyozott",
      "Szorongás",
      "Ingerlékenység",
      "Levertség",
      "PMS / feszültség",
      "Túlterheltség"
    ],
    sleepQuality: {
      restful: "Pihentető",
      restless: "Zaklatott"
    },
    bleeding: {
      none: "Nincs vérzés",
      spotting: "Pecsételő",
      light: "Enyhe",
      medium: "Közepes",
      heavy: "Erős",
      clots: "Rögös darabokkal kísért"
    },
    cervicalMucus: {
      "": "Nem rögzítve",
      dry: "Száraz",
      creamy: "Krémes",
      watery: "Vizes",
      eggwhite: "Nyúlós, tojásfehérje jellegű"
    },
    pelvicPain: {
      none: "Nincs",
      dull_tension: "Tompa feszülés",
      sharp_one_side: "Éles egyoldali szúrás",
      strong_cramps: "Erős görcsök"
    },
    skinHairTrend: {
      "": "Nem értékelve",
      decreased: "Csökkent",
      unchanged: "Változatlan",
      increased: "Erősödött"
    },
    missedDosesChoice: {
      none: "Nem, minden adag megvolt (0 kihagyás)",
      "1-2": "1–2 alkalommal kimaradt",
      "3-5": "3–5 alkalommal kimaradt",
      more: "Többször (6+ alkalommal) kimaradt"
    },
    weightChangeType: {
      none: "Nem történt váratlan változás",
      gain: "Váratlan súlygyarapodás (+)",
      loss: "Váratlan súlycsökkenés (−)"
    }
  };

  // ------------------------------------------------------------------------
  // 2. Fázis- és betegségspecifikus tünetajánló tudásbázis
  // ------------------------------------------------------------------------
  const SYMPTOM_LIBRARY = {
    menstruation: {
      general: [
        "Alhasi görcsök",
        "Derékfájás",
        "Fáradtság / kimerültség",
        "Fejfájás",
        "Puffadás",
        "Hányinger"
      ],
      endometriosis: [
        "Erős kismedencei görcsök",
        "Erős / alvadékos vérzés",
        "Puffadás („endo-belly”)",
        "Derékba sugárzó fájdalom",
        "Vashiányos fáradtság",
        "Székelési / vizelési fájdalom"
      ],
      pcos: [
        "Elhúzódó vagy darabos vérzés",
        "Édesség utáni sóvárgás",
        "Ingadozó energiaszint"
      ],
      hashimoto: [
        "Fokozott fázékonyság",
        "Ólmos fáradtság vérzés alatt",
        "Szemhéj- / arcpuffadás"
      ]
    },
    follicular: {
      general: [
        "Növekvő energiaszint",
        "Tiszta bőr",
        "Enyhe fejfájás",
        "Jó hangulat"
      ],
      pcos: [
        "Étkezés utáni álmosság",
        "Édesség / szénhidrát sóvárgás",
        "Akne (állvonalon)",
        "Hirtelen vércukoresés / remegés",
        "Fokozott szőrnövekedés"
      ],
      hashimoto: [
        "Reggeli indítási nehézség",
        "Száraz bőr",
        "Koncentrációs nehézség („agyköd”)"
      ],
      endometriosis: [
        "Enyhe kismedencei húzódás",
        "Emésztési érzékenység"
      ]
    },
    ovulation: {
      general: [
        "Tojásfehérje-szerű nyák",
        "Enyhe féloldali szúrás",
        "Megnövekedett libidó",
        "Enyhe mellérzékenység"
      ],
      pcos: [
        "Ovulációs szúrás",
        "Elhúzódó nyákváltozás",
        "Étkezés utáni álmosság",
        "Édesség utáni sóvárgás",
        "Akne fellángolás"
      ],
      endometriosis: [
        "Erősebb ovulációs fájdalom",
        "Kismedencei nyomásérzés",
        "Puffadás („endo-belly”)"
      ],
      hashimoto: [
        "Enyhe szívdobogásérzés",
        "Fáradékonyság délután"
      ]
    },
    luteal: {
      general: [
        "Mellfeszülés",
        "PMS / hangulatingadozás",
        "Vízvisszatartás / puffadás",
        "Alvászavar",
        "Fejfájás"
      ],
      hashimoto: [
        "Reggeli ólmos fáradtság",
        "Hideg végtagok (kéz/láb)",
        "Hajhullás fokozódása",
        "Vízvisszatartás",
        "Lassult emésztés / székrekedés"
      ],
      endometriosis: [
        "Mellfeszülés (ösztrogéndominancia)",
        "PMS / ingerlékenység",
        "Vízvisszatartás",
        "Barnázás menstruáció előtt",
        "Kismedencei feszülés"
      ],
      pcos: [
        "Erős szénhidrát-sóvárgás",
        "Akne / zsírosodó bőr",
        "Hangulatingadozás"
      ]
    }
  };

  // ------------------------------------------------------------------------
  // 3. Endokrin biomarkerek referencia- és optimális (babatervezési) sávjai
  // ------------------------------------------------------------------------
  const BIOMARKERS = {
    tsh: {
      key: "tsh",
      name: "TSH",
      fullName: "Pajzsmirigy-stimuláló hormon (TSH)",
      unit: "mIU/l",
      normalMin: 0.4,
      normalMax: 4.2,
      optimalMin: 0.8,
      optimalMax: 2.0,
      optimalLabel: "Optimális / Babatervezési cél (0,8–2,0)",
      cycleHint: "Bármely ciklusnapon, reggel éhgyomorra, L-tiroxin bevétele ELŐTT.",
      conditions: ["hashimoto", "pcos"]
    },
    ft4: {
      key: "ft4",
      name: "fT4",
      fullName: "Szabad tiroxin (fT4)",
      unit: "pmol/l",
      normalMin: 12.0,
      normalMax: 22.0,
      optimalMin: 15.0,
      optimalMax: 19.5,
      optimalLabel: "Optimális felső-közép tartomány (15–19,5)",
      cycleHint: "TSH-val együtt, gyógyszerbevétel előtt.",
      conditions: ["hashimoto"]
    },
    homa: {
      key: "homa",
      name: "HOMA-IR",
      fullName: "Inzulinrezisztencia index (HOMA-IR)",
      unit: "index",
      normalMin: 0.5,
      normalMax: 2.5,
      optimalMin: 0.5,
      optimalMax: 1.8,
      optimalLabel: "Optimális inzulinérzékenység (< 1,8)",
      cycleHint: "Reggel 7–8 órakor, 10–12 óra éhezés után (OGTT részeként).",
      conditions: ["pcos"]
    },
    progesterone: {
      key: "progesterone",
      name: "Progeszteron",
      fullName: "Luteális progeszteron",
      unit: "nmol/l",
      normalMin: 15.0,
      normalMax: 85.0,
      optimalMin: 35.0,
      optimalMax: 75.0,
      optimalLabel: "Megfelelő ovuláció & luteális támogatás (> 35)",
      cycleHint: "Ovuláció + 7. napon (nem fixen 21. napon, ha hosszabb a ciklus!).",
      conditions: ["pcos", "endometriosis"]
    },
    estradiol: {
      key: "estradiol",
      name: "Ösztradiol (E2)",
      fullName: "Follikuláris ösztradiol (3–5. ciklusnap)",
      unit: "pmol/l",
      normalMin: 70,
      normalMax: 320,
      optimalMin: 100,
      optimalMax: 210,
      optimalLabel: "Kiegyensúlyozott 3–5. napi tartomány (100–210)",
      cycleHint: "Menstruáció 3–5. napján érdemes mérni.",
      conditions: ["endometriosis", "pcos"]
    },
    vitd: {
      key: "vitd",
      name: "D-vitamin",
      fullName: "25(OH) D-vitamin",
      unit: "nmol/l",
      normalMin: 75,
      normalMax: 150,
      optimalMin: 100,
      optimalMax: 135,
      optimalLabel: "Endokrin & immunológiai cél (100–135)",
      cycleHint: "Bármely napon; autoimmun (Hashimoto) és PCOS esetén kulcsfontosságú.",
      conditions: ["hashimoto", "pcos", "endometriosis"]
    },
    ferritin: {
      key: "ferritin",
      name: "Ferritin / Vas",
      fullName: "Ferritin (vasraktár)",
      unit: "µg/l",
      normalMin: 15,
      normalMax: 150,
      optimalMin: 50,
      optimalMax: 110,
      optimalLabel: "Optimális raktárszint hajhoz & pajzsmirigyhez (50–110)",
      cycleHint: "Erős vérzés (endometriózis) és Hashimoto esetén kiemelten fontos.",
      conditions: ["endometriosis", "hashimoto"]
    }
  };

  // ------------------------------------------------------------------------
  // 4. Étrend- és vitaminajánló (ciklusfázis + trimeszter + kórkép)
  // ------------------------------------------------------------------------
  const NUTRITION_GUIDE = {
    menstruation: {
      title: "Menstruációs fázis – Regeneráció és gyulladáscsökkentés",
      focus: "Vas- és ásványianyag-pótlás, meleg, könnyen emészthető gyulladáscsökkentő ételek.",
      items: [
        {
          name: "Vas + C-vitamin (pl. vas-biszglicinát)",
          why: "Pótolja a vérveszteséget és mérsékli a fáradtságot; a C-vitamin segíti a felszívódást.",
          tags: ["Mindenkinek", "Endometriózis"],
          timing: "Étkezéssel vagy C-vitaminnal; L-tiroxintól min. 4 órára!"
        },
        {
          name: "Magnézium-biszglicinát (300–400 mg)",
          why: "Lazítja a méh simaizmait, enyhíti a kismedencei görcsöket és javítja az alvást.",
          tags: ["Mindenkinek", "Endometriózis"],
          timing: "Este, vacsora után vagy lefekvés előtt."
        },
        {
          name: "Omega-3 (EPA/DHA, 1000–2000 mg)",
          why: "Csökkenti a gyulladásos prosztaglandinok termelődését, mérsékli a menstruációs fájdalmat.",
          tags: ["Endometriózis", "PCOS / IR", "Hashimoto"],
          timing: "Főétkezés közben, zsiradékkal együtt."
        }
      ],
      dietTips: [
        "Gyulladáscsökkentő ételek: lazac, dió, lenmag, gyömbér, kurkuma, párolt spenót, cékla.",
        "Kerüld a finomított cukrot és a túl sok koffeint, mert fokozhatják a görcsöket."
      ]
    },
    follicular: {
      title: "Follikuláris fázis – Tüszőérés és inzulinérzékenység támogatása",
      focus: "Friss zöldségek, minőségi fehérjék, tüszőérést és pajzsmirigyet támogató nyomelemek.",
      items: [
        {
          name: "Mio-inozitol (+ D-kiro-inozitol 40:1 arányban)",
          why: "Javítja az inzulinérzékenységet és támogatja az egészséges tüszőérést, ovulációt.",
          tags: ["PCOS / IR"],
          timing: "Reggel és este, vízben feloldva."
        },
        {
          name: "Szelén (100–200 µg szelenometionin) + Cink",
          why: "Támogatja a T4 → T3 pajzsmirigyhormon-átalakulást és csökkentheti az anti-TPO gyulladást.",
          tags: ["Hashimoto", "PCOS / IR"],
          timing: "Ebédhez; L-tiroxintól külön időpontban."
        },
        {
          name: "D3 + K2-vitamin (2000–4000 NE)",
          why: "Immunmoduláló hatású Hashimoto esetén, és javítja a petesejt-minőséget PCOS-ben.",
          tags: ["Mindenkinek", "Hashimoto", "PCOS / IR"],
          timing: "Ebéd közben, zsiradékot tartalmazó étellel."
        }
      ],
      dietTips: [
        "Lassú felszívódású szénhidrátok (quinoa, zab, hajdina) + bőséges rost minden főétkezéshez.",
        "Fermentált ételek (savanyú káposzta, natúr kefir – laktózmentesen is) a bélflóra támogatására."
      ]
    },
    ovulation: {
      title: "Ovulációs ablak – Petesejt-minőség és máj-ösztrogén támogatás",
      focus: "Antioxidánsok, cink, B-komplex és bőséges folyadékbevitel a termékeny nyákért.",
      items: [
        {
          name: "B-komplex (aktív B6, B9 folát, B12)",
          why: "Támogatja a sejtosztódást, a hormonlebontást és az ovuláció utáni sárgatest-működést.",
          tags: ["Mindenkinek", "PCOS / IR", "Baba tervezése"],
          timing: "Reggeli vagy ebéd közben."
        },
        {
          name: "Cink (15–25 mg) + Antioxidánsok (C-, E-vitamin)",
          why: "Védi a petesejtet az oxidatív stressztől és csökkenti a bőrgyulladást (akne).",
          tags: ["PCOS / IR", "Endometriózis"],
          timing: "Étkezés után (éhgyomorra hányingert okozhat)."
        },
        {
          name: "Mio-inozitol + D3-vitamin",
          why: "Folyamatos támogatás a rendszeres ovuláció fenntartásához.",
          tags: ["PCOS / IR", "Hashimoto"],
          timing: "Napi megszokott rend szerint."
        }
      ],
      dietTips: [
        "Bogyós gyümölcsök, brokkoli, tökmag, avokádó és napi 2–2,5 liter víz.",
        "PCOS/IR esetén ne hagyj ki étkezést: a stabil vércukorszint segíti az LH-csúcs létrejöttét."
      ]
    },
    luteal: {
      title: "Luteális fázis – Progeszteron-támogatás és PMS-csökkentés",
      focus: "Stabil vércukor, ösztrogénlebontást segítő keresztesvirágúak, B6-vitamin és magnézium.",
      items: [
        {
          name: "B6-vitamin (P-5-P) + Magnézium",
          why: "Támogatja a sárgatest progeszterontermelését, csökkenti a PMS-t és a vízvisszatartást.",
          tags: ["Mindenkinek", "Endometriózis", "Hashimoto"],
          timing: "Délután vagy este."
        },
        {
          name: "Króm + Rostdús, lassú szénhidrátok",
          why: "Mérsékli a luteális fázisban felerősödő inzulinrezisztenciát és édességvágyat.",
          tags: ["PCOS / IR"],
          timing: "Főétkezések mellé."
        },
        {
          name: "Keresztesvirágú zöldségek / Rostkiegészítés",
          why: "Segíti a máj és a bélrendszer felesleges ösztrogén-eltávolítását (ösztrogéndominancia ellen).",
          tags: ["Endometriózis"],
          timing: "Napi rendszerességgel (brokkoli, kelbimbó, karfiol, chiamag)."
        }
      ],
      dietTips: [
        "Luteális fázisban természetesen nő az anyagcsere-igény: válassz fehérje + egészséges zsír kombinációt uzsonnára.",
        "Csökkentsd a sós félkész ételeket a vízvisszatartás és mellfeszülés mérséklésére."
      ]
    },
    pregnancy: {
      title: "Várandósság – Trimeszter-specifikus mikrotápanyagok",
      focus: "Magzati idegrendszeri fejlődés, fokozott pajzsmirigy- és vércukor-biztonság.",
      items: [
        {
          name: "Aktív folát (5-MTHF, 400–800 µg)",
          why: "Elengedhetetlen a velőcső-záródáshoz és a sejtosztódáshoz (különösen az I. trimeszterben).",
          tags: ["I–III. trimeszter"],
          timing: "Naponta egyszer, étkezéssel."
        },
        {
          name: "DHA / Omega-3 (min. 200–300 mg DHA)",
          why: "A magzat agy- és látásfejlődésének kulcsfontosságú építőköve (II–III. trimeszterben kiemelt).",
          tags: ["II–III. trimeszter", "Endometriózis"],
          timing: "Főétkezés közben."
        },
        {
          name: "Kolin (450 mg) + D3-vitamin + Vas (labor alapján)",
          why: "Támogatja a méhlepény működését, az idegrendszert és megelőzi a terhességi vérszegénységet.",
          tags: ["I–III. trimeszter", "Hashimoto"],
          timing: "Vasat L-tiroxintól szigorúan legalább 4 óra eltéréssel!"
        }
      ],
      dietTips: [
        "Hashimoto esetén a jódpótlás mértékét minden esetben egyeztesd endokrinológussal!",
        "PCOS/IR esetén tartsd a napi 5–6 kisebb, lassú felszívódású szénhidrátos étkezést a terhességi diabétesz megelőzésére."
      ]
    }
  };

  // ------------------------------------------------------------------------
  // 5. Gyógyszer–vitamin kölcsönhatási szabályok
  // ------------------------------------------------------------------------
  const INTERACTION_RULES = [
    {
      id: "lthyroxine_iron_calcium",
      triggerKeywords: ["letrox", "euthyrox", "tiroxin", "levotiroxin", "l-tiroxin"],
      title: "Pajzsmirigyhormon (L-tiroxin) időzítési és kölcsönhatási szabály",
      severity: "high",
      message:
        "A levotiroxint szigorúan éhgyomorra, tiszta vízzel vedd be! Legalább 30–60 percet várj a kávéval és reggelivel, valamint legalább 4 óra szünetet tarts Vas-, Kalcium- vagy Magnézium-készítmények bevétele előtt, mert ezek 40–60%-kal csökkenthetik a felszívódását."
    },
    {
      id: "metformin_b12_meal",
      triggerKeywords: ["merckformin", "metformin", "meforal", "glucophage", "adimet"],
      title: "Metformin – étkezési és B12-vitamin figyelmeztetés",
      severity: "medium",
      message:
        "A metformint mindig étkezés közben vagy közvetlenül utána vedd be a gyomor-bélrendszeri mellékhatások csökkentésére. Hosszú távú szedése csökkentheti a B12-vitamin szintjét – féléves/éves ellenőrzése javasolt!"
    },
    {
      id: "progesterone_evening",
      triggerKeywords: ["utrogestan", "progeszteron", "duphaston", "prolutex"],
      title: "Progeszteron-készítmény szedési tipp",
      severity: "low",
      message:
        "A természetes progeszteron (pl. Utrogestan) szájon át szedve álmosságot vagy enyhe szédülést okozhat, ezért jellemzően esti bevétel javasolt az orvosi előírás szerint."
    }
  ];

  // ------------------------------------------------------------------------
  // 6. Vizuális Betegúttérkép (5 kötelező ellátási állomás)
  // ------------------------------------------------------------------------
  const PATIENT_JOURNEY = [
    {
      step: 1,
      title: "Tünetek felismerése",
      subtitle: "Rendszertelen ciklus, fáradtság, fájdalom, bőrtünetek",
      decisionPoint: "Mikortól nem „normális” a menstruációs fájdalom vagy a 35+ napos ciklus?",
      bottleneck:
        "A tünetek szétszórtak (vérzés külön appban, fáradtság és akne nincs összekötve a ciklusfázissal), ezért a betegek átlagosan több évig halogatják a kivizsgálást.",
      speraSupport:
        "A 30 másodperces Napi gyorsteszt, a fázis-specifikus biomarkerek és a heti metabolikus szűrés megmutatja a visszatérő hormonális mintázatokat anélkül, hogy túlterhelné a felhasználót.",
      actionTab: "symptoms",
      actionLabel: "Önmenedzsment & Napló megnyitása"
    },
    {
      step: 2,
      title: "Első ellátási pont (Háziorvos / Nőgyógyász)",
      subtitle: "Első szakorvosi konzultáció és irányított beutalás",
      decisionPoint: "Elég-e a tüneti kezelés, vagy indokolt célzott endokrinológiai kivizsgálás?",
      bottleneck:
        "Tipikus elakadás a tünetek elbagatellizálása, kivizsgálás nélküli fogamzásgátló felírása, illetve hogy a beteg a 10 perces viziten elfelejti a pontos adatokat.",
      speraSupport:
        "Az 1 kattintásos, nyomtatható Orvosi összefoglaló tetejére automatikusan bekerülnek a vizit előtti konzultációs pontok, az adherence-arány és a 30 napos tünetmintázatok.",
      actionTab: "summary",
      actionLabel: "Orvosi összefoglaló megtekintése"
    },
    {
      step: 3,
      title: "Célzott endokrin diagnosztika",
      subtitle: "Hormonpanel, OGTT / HOMA-IR, pajzsmirigy-UH, kismedencei UH",
      decisionPoint: "Pontosan melyik ciklusnapon történjen a vérvétel az értékelhető eredményért?",
      bottleneck:
        "Gyakori hiba a rossz ciklusnapon levett hormonlabor (pl. 35 napos ciklusnál a 21. napon még nem volt ovuláció, így hamis progeszteronhiány látszik).",
      speraSupport:
        "Automatikus 3–5. napi és ovuláció + 7. napi vérvételi emlékeztető, valamint az okos ciklushossz-frissítő és labor-trend grafikonok.",
      actionTab: "analytics",
      actionLabel: "Elemzések & Laborok megnyitása"
    },
    {
      step: 4,
      title: "Diagnózis és személyre szabott terápia",
      subtitle: "Gyógyszeres terápia + életmód + mikrotápanyagok összehangolása",
      decisionPoint: "Hogyan illeszthetők össze biztonságosan a gyógyszerek, vitaminok és étkezések?",
      bottleneck:
        "A bonyolult bevételi szabályok (pl. L-tiroxin éhgyomorra, vas csak 4 órával később) és az elmaradó gyógyszerbevételek rontják a terápia eredményességét.",
      speraSupport:
        "Rendszeres gyógyszerszedési emlékeztető, pontos betegség-fázis adattár, valamint beépített gyógyszer–vitamin kölcsönhatás-figyelő és 30 napos adherence-követés.",
      actionTab: "meds",
      actionLabel: "Gyógyszerek & Betegségadatok"
    },
    {
      step: 5,
      title: "Hosszú távú gondozás, prevenció és családtervezés",
      subtitle: "Féléves kontrollok, szövődmény-megelőzés, babatervezés és várandósság",
      decisionPoint: "Hogyan változnak a célértékek (pl. TSH < 2,0) babatervezés vagy terhesség esetén?",
      bottleneck:
        "Pozitív terhességi teszt után elkésett TSH-emelés vagy elmaradó korai OGTT szűrés növelheti a szövődmények kockázatát.",
      speraSupport:
        "Egykattintásos Élethelyzet-váltó (Baba tervezése / Várandósság mód), kontroll előtti összegzés, trimeszter-specifikus ajánló és azonnali endokrin terhességi figyelmeztetések.",
      actionTab: "dashboard",
      actionLabel: "Áttekintő & Élethelyzet-váltó"
    }
  ];

  // ------------------------------------------------------------------------
  // 7. Szintetikus (fiktív) DEMÓ profil a zsűri gyors kipróbálásához
  // ------------------------------------------------------------------------
  function createDemoState() {
    const todayKey = shiftDate(0);
    // 14. ciklusnap (éppen ovulációs ablak), így a naptár és a fázisok látványosak!
    const lmpDate = shiftDate(-13);

    return {
      onboarded: true,
      isDemo: true,
      mode: "cycle", // cycle | ttc | pregnancy
      journeyStep: 4,
      profile: {
        name: "Szabó Eszter",
        age: 29,
        bloodType: "A Rh+",
        cycleLength: 28, // Szándékosan 28, miközben a valós 3 utolsó ciklus 33-35 nap → demonstrálja a Smart Alertet!
        periodLength: 5,
        lastPeriodStart: lmpDate,
        pregnancyLmp: shiftDate(-68), // ~9. terhességi hét ha átkapcsol Várandósság módra
        selectedEndocrine: ["pcos", "hashimoto"],
        allergies: [
          {
            id: "alg_1",
            name: "Penicillin",
            reaction: "Bőrkiütés, csalánkiütés",
            severity: "high"
          },
          {
            id: "alg_2",
            name: "Laktóz",
            reaction: "Puffadás, hasi görcs",
            severity: "low"
          }
        ],
        medicalHistory:
          "2022: Diagnosztikus hormonpanel és kismedencei UH – multifollikuláris petefészkek (PCOS).\n2023: Emelkedett anti-TPO (215 IU/ml) miatt Hashimoto-thyreoiditis igazolása. Műtéti előzmény nincs.",
        doctorNotes:
          "Az elmúlt 3 ciklusom 33–35 naposra nyúlt a korábbi 28 nap helyett.\nKérdés a vizitre: indokolt-e a mio-inozitol mellett a metformin adag felülvizsgálata babatervezés előtt?",
        emergencyName: "Szabó Dávid",
        emergencyRelation: "férj",
        emergencyPhone: "+36 30 555 0148"
      },
      // 4. Orvosi kontrollra felkészítő adatok (5 nap múlva esedékes → aktív vizit előtti mód!)
      visitPrep: {
        nextVisitDate: shiftDate(5),
        visitType: "Endokrinológiai és nőgyógyászati kontroll",
        missedDosesChoice: "1-2",
        missedDosesCount: 2,
        weightChangeType: "gain",
        weightChangeKg: 1.5,
        currentWeightKg: 64.5,
        consultationQuestions:
          "1. Az elmúlt 3 ciklusom 33–35 naposra nyúlt (ovuláció ~19. nap) – szükséges-e a metformin vagy mio-inozitol finomhangolása?\n2. Babatervezés előtt az 1,85 mIU/l-es TSH mellett maradhat-e az 50 µg Letrox?\n3. Ebéd után 2 alkalommal jelentkezett enyhe álmosság / cukoréhség – érdemes-e 3 pontos OGTT kontrollt kérni?",
        lastUpdated: shiftDate(-1)
      },
      // Részletes betegség- és fázis-adattár (orvosi vizithez!)
      conditions: [
        {
          id: "cond_pcos",
          endocrineKey: "pcos",
          name: "Policisztás ovárium szindróma (PCOS) és Inzulinrezisztencia",
          icdCode: "E28.2",
          phaseCategory: "stable",
          phase: "Stabilizálódó fázis – 160 g CH diéta + metformin mellett javuló HOMA-IR",
          diagnosedDate: "2022-06-14",
          doctor: "Dr. Kovács Zsófia – Endokrinológus / Diabetológus",
          description:
            "Rotterdam-kritériumok alapján igazolt (hosszabb, 33–35 napos ciklusok, UH-n policisztás szerkezet). 3 pontos OGTT-n 60 perces inzulin emelkedett volt, HOMA-IR 3,1-ről 1,9-re javult az életmódváltás hatására.",
          symptoms: "Étkezés utáni álmosság nagyobb szénhidrátnál, állvonali akne, eltolódott ovuláció (19–21. nap körül).",
          active: true
        },
        {
          id: "cond_hashimoto",
          endocrineKey: "hashimoto",
          name: "Hashimoto-thyreoiditis (autoimmun pajzsmirigy-alulműködés)",
          icdCode: "E06.3",
          phaseCategory: "stable",
          phase: "Krónikus – L-tiroxin pótlással egyensúlyban (euthyreosis)",
          diagnosedDate: "2023-03-20",
          doctor: "Dr. Kovács Zsófia – Endokrinológus",
          description:
            "Anti-TPO pozitív (215 IU/ml), TSH kezdetben 5,4 mIU/l volt. Napi 50 µg levotiroxin mellett legutóbbi TSH 1,85 mIU/l (babatervezési célértéken belül). Pajzsmirigy-UH: enyhén inhomogén szerkezet, göb nincs.",
          symptoms: "Luteális fázisban néha reggeli fáradtság és hideg kéz/láb; gyógyszerrel jelentősen javult.",
          active: true
        }
      ],
      // Rendszeres gyógyszerek és mikrotápanyagok emlékeztetővel
      medications: [
        {
          id: "med_letrox",
          name: "Letrox 50 µg",
          activeIngredient: "levotiroxin-nátrium",
          dosage: "1 tabletta (50 µg)",
          conditionId: "cond_hashimoto",
          times: ["06:30"],
          days: [1, 2, 3, 4, 5, 6, 0],
          mealRelation: "Éhgyomorra, étkezés és kávé előtt 45 perccel",
          notes: "Csak tiszta vízzel! Vasat/kalciumot legalább 4 órával később.",
          active: true
        },
        {
          id: "med_metformin",
          name: "Merckformin XR 500 mg",
          activeIngredient: "metformin-hidroklorid",
          dosage: "1 retard tabletta (500 mg)",
          conditionId: "cond_pcos",
          times: ["08:00", "20:00"],
          days: [1, 2, 3, 4, 5, 6, 0],
          mealRelation: "Étkezés közben vagy közvetlenül utána",
          notes: "Vacsora mellé szedve panaszmentes, nem szabad kettétörni.",
          active: true
        },
        {
          id: "med_inozitol",
          name: "Mio-inozitol + D3-vitamin 2000 NE",
          activeIngredient: "mio-inozitol (2000 mg) + kolekalciferol",
          dosage: "1 tasak + 1 kapszula",
          conditionId: "cond_pcos",
          times: ["13:00"],
          days: [1, 2, 3, 4, 5, 6, 0],
          mealRelation: "Ebéd közben, zsiradékkal",
          notes: "Ovuláció és D-vitamin szint támogatására (L-tiroxintól >6 órára).",
          active: true
        },
        {
          id: "med_magnesium",
          name: "Magnézium-biszglicinát 300 mg",
          activeIngredient: "magnézium-biszglicinát",
          dosage: "2 kapszula",
          conditionId: "cond_hashimoto",
          times: ["21:30"],
          days: [1, 2, 3, 4, 5, 6, 0],
          mealRelation: "Lefekvés előtt",
          notes: "Alvásminőség és PMS csökkentésére.",
          active: true
        }
      ],
      intakeLogs: {
        [todayKey]: {
          "med_letrox@06:30": { status: "taken", timestamp: "06:34" },
          "med_metformin@08:00": { status: "taken", timestamp: "08:07" }
        }
      },
      // Havi ciklushossz történet (utolsó 3 hónap 33–35 nap → kiváltja a Smart Alertet!)
      cycleHistory: [
        { id: "cyc_1", label: shiftMonthLabel(5), length: 30, startDate: shiftDate(-175) },
        { id: "cyc_2", label: shiftMonthLabel(4), length: 31, startDate: shiftDate(-145) },
        { id: "cyc_3", label: shiftMonthLabel(3), length: 34, startDate: shiftDate(-114) },
        { id: "cyc_4", label: shiftMonthLabel(2), length: 35, startDate: shiftDate(-80) },
        { id: "cyc_5", label: shiftMonthLabel(1), length: 33, startDate: shiftDate(-45) }
      ],
      smartAlertDismissedForAvg: null,
      // Endokrin laboreredmények időbeli sorozata
      labResults: [
        { id: "lab_1", biomarker: "tsh", date: shiftDate(-270), value: 5.4, note: "Kezelés előtt" },
        { id: "lab_2", biomarker: "tsh", date: shiftDate(-180), value: 3.1, note: "25 µg Letrox mellett" },
        { id: "lab_3", biomarker: "tsh", date: shiftDate(-90), value: 2.25, note: "50 µg Letrox emelés" },
        { id: "lab_4", biomarker: "tsh", date: shiftDate(-15), value: 1.85, note: "Stabil, célértéken belül" },

        { id: "lab_5", biomarker: "ft4", date: shiftDate(-270), value: 11.8, note: "Alsó határ alatt" },
        { id: "lab_6", biomarker: "ft4", date: shiftDate(-90), value: 15.6, note: "Normalizálódott" },
        { id: "lab_7", biomarker: "ft4", date: shiftDate(-15), value: 17.2, note: "Optimális sávban" },

        { id: "lab_8", biomarker: "homa", date: shiftDate(-270), value: 3.2, note: "Kezdeti IR" },
        { id: "lab_9", biomarker: "homa", date: shiftDate(-150), value: 2.5, note: "Diéta 3. hónap" },
        { id: "lab_10", biomarker: "homa", date: shiftDate(-25), value: 1.9, note: "Jelentős javulás" },

        { id: "lab_11", biomarker: "progesterone", date: shiftDate(-120), value: 18.4, note: "21. napon (korán levéve!)" },
        { id: "lab_12", biomarker: "progesterone", date: shiftDate(-50), value: 44.2, note: "Ovuláció + 7. napon mérve" },
        { id: "lab_13", biomarker: "progesterone", date: shiftDate(-18), value: 52.8, note: "Megfelelő luteális szint" },

        { id: "lab_14", biomarker: "estradiol", date: shiftDate(-160), value: 235, note: "4. ciklusnap" },
        { id: "lab_15", biomarker: "estradiol", date: shiftDate(-40), value: 178, note: "3. ciklusnap – egyensúlyban" },

        { id: "lab_16", biomarker: "vitd", date: shiftDate(-240), value: 58, note: "Téli hiány" },
        { id: "lab_17", biomarker: "vitd", date: shiftDate(-110), value: 89, note: "2000 NE pótlás" },
        { id: "lab_18", biomarker: "vitd", date: shiftDate(-15), value: 112, note: "Optimális tartomány" },

        { id: "lab_19", biomarker: "ferritin", date: shiftDate(-200), value: 31, note: "Alacsony raktár" },
        { id: "lab_20", biomarker: "ferritin", date: shiftDate(-20), value: 64, note: "Vaspótlás után rendben" }
      ],
      // Napi gyorsteszt + fázis-biomarkerek + heti metabolikus mikrotünetek + BBT
      symptomLogs: [
        {
          date: shiftDate(-13),
          cycleDay: 1,
          phase: "menstruation",
          dailyCheckin: {
            medRule: "yes",
            energy: 2,
            brainFog: true,
            sleepHours: 6.5,
            sleepQuality: "restless",
            mood: 2,
            moodTags: ["Levertség"]
          },
          bbt: 36.32,
          bleeding: "clots",
          cervicalMucus: "",
          pelvicPain: "strong_cramps",
          metabolicLogged: true,
          metabolic: {
            reactiveHypo: false,
            bloatingConstipation: true,
            coldEdema: true,
            skinHairTrend: "unchanged"
          },
          intensity: 3,
          symptoms: ["Alhasi görcsök", "Derékfájás", "Ólmos fáradtság vérzés alatt"],
          note: "Első nap erősebb görcsök, meleg párna segített."
        },
        {
          date: shiftDate(-12),
          cycleDay: 2,
          phase: "menstruation",
          dailyCheckin: {
            medRule: "yes",
            energy: 2,
            brainFog: true,
            sleepHours: 7.0,
            sleepQuality: "restless",
            mood: 3,
            moodTags: ["Túlterheltség"]
          },
          bbt: 36.28,
          bleeding: "heavy",
          cervicalMucus: "",
          pelvicPain: "strong_cramps",
          metabolicLogged: false,
          metabolic: null,
          intensity: 2,
          symptoms: ["Alhasi görcsök", "Fáradtság / kimerültség"],
          note: ""
        },
        {
          date: shiftDate(-11),
          cycleDay: 3,
          phase: "menstruation",
          dailyCheckin: {
            medRule: "later",
            energy: 3,
            brainFog: false,
            sleepHours: 7.5,
            sleepQuality: "restful",
            mood: 3,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.25,
          bleeding: "medium",
          cervicalMucus: "",
          pelvicPain: "dull_tension",
          metabolicLogged: false,
          metabolic: null,
          intensity: 2,
          symptoms: ["Puffadás", "Fokozott fázékonyság"],
          note: "3. napi hormonlabor miatt a Letroxot vérvétel után vettem be."
        },
        {
          date: shiftDate(-9),
          cycleDay: 5,
          phase: "menstruation",
          dailyCheckin: {
            medRule: "yes",
            energy: 3,
            brainFog: false,
            sleepHours: 7.5,
            sleepQuality: "restful",
            mood: 4,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.22,
          bleeding: "light",
          cervicalMucus: "dry",
          pelvicPain: "none",
          metabolicLogged: false,
          metabolic: null,
          intensity: 1,
          symptoms: ["Fáradtság / kimerültség"],
          note: "Vérzés lecsengőben."
        },
        {
          date: shiftDate(-7),
          cycleDay: 7,
          phase: "follicular",
          dailyCheckin: {
            medRule: "yes",
            energy: 4,
            brainFog: false,
            sleepHours: 8.0,
            sleepQuality: "restful",
            mood: 4,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.24,
          bleeding: "none",
          cervicalMucus: "creamy",
          pelvicPain: "none",
          metabolicLogged: true,
          metabolic: {
            reactiveHypo: true,
            bloatingConstipation: false,
            coldEdema: false,
            skinHairTrend: "unchanged"
          },
          intensity: 1,
          symptoms: ["Étkezés utáni álmosság"],
          note: "Energikusabb nap, de ebéd után enyhe álmosság jelentkezett."
        },
        {
          date: shiftDate(-5),
          cycleDay: 9,
          phase: "follicular",
          dailyCheckin: {
            medRule: "yes",
            energy: 4,
            brainFog: false,
            sleepHours: 7.5,
            sleepQuality: "restful",
            mood: 4,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.20,
          bleeding: "none",
          cervicalMucus: "creamy",
          pelvicPain: "none",
          metabolicLogged: false,
          metabolic: null,
          intensity: 1,
          symptoms: ["Akne (állvonalon)"],
          note: ""
        },
        {
          date: shiftDate(-3),
          cycleDay: 11,
          phase: "follicular",
          dailyCheckin: {
            medRule: "no",
            energy: 3,
            brainFog: true,
            sleepHours: 6.0,
            sleepQuality: "restless",
            mood: 3,
            moodTags: ["Szorongás"]
          },
          bbt: 36.18,
          bleeding: "none",
          cervicalMucus: "watery",
          pelvicPain: "none",
          metabolicLogged: true,
          metabolic: {
            reactiveHypo: true,
            bloatingConstipation: true,
            coldEdema: false,
            skinHairTrend: "increased"
          },
          intensity: 2,
          symptoms: ["Édesség / szénhidrát sóvárgás", "Étkezés utáni álmosság"],
          note: "Korai indulás miatt a reggeli adag kimaradt; délutáni lassú CH uzsonna segített."
        },
        {
          date: shiftDate(-1),
          cycleDay: 13,
          phase: "ovulation",
          dailyCheckin: {
            medRule: "yes",
            energy: 4,
            brainFog: false,
            sleepHours: 7.5,
            sleepQuality: "restful",
            mood: 5,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.15,
          bleeding: "none",
          cervicalMucus: "eggwhite",
          pelvicPain: "sharp_one_side",
          metabolicLogged: false,
          metabolic: null,
          intensity: 2,
          symptoms: ["Tojásfehérje-szerű nyák", "Ovulációs szúrás"],
          note: "Enyhe jobb oldali szúrás (Mittelschmerz)."
        },
        {
          date: shiftDate(0),
          cycleDay: 14,
          phase: "ovulation",
          dailyCheckin: {
            medRule: "yes",
            energy: 4,
            brainFog: false,
            sleepHours: 7.5,
            sleepQuality: "restful",
            mood: 4,
            moodTags: ["Kiegyensúlyozott"]
          },
          bbt: 36.48,
          bleeding: "none",
          cervicalMucus: "eggwhite",
          pelvicPain: "sharp_one_side",
          metabolicLogged: false,
          metabolic: null,
          intensity: 1,
          symptoms: ["Ovulációs szúrás", "Elhúzódó nyákváltozás"],
          note: "Reggeli hőemelkedés kezdete (+0,33 °C)."
        }
      ],
      settings: {
        largeText: false,
        soundEnabled: true,
        notificationsEnabled: false
      }
    };
  }

  return {
    ENDOCRINE_PROFILES,
    SELF_MANAGEMENT_META,
    SYMPTOM_LIBRARY,
    BIOMARKERS,
    NUTRITION_GUIDE,
    INTERACTION_RULES,
    PATIENT_JOURNEY,
    createDemoState,
    shiftDate
  };
})();
