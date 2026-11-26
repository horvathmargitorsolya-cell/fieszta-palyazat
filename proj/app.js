/* ==========================================================================
   Spera – Nőgyógyászati-Endokrinológiai Ciklus- és Egészségdashboard
   FIESZTA 2026 Pályázat – 100% offline Vanilla JS (file:// kompatibilis)
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.SPERA_DATA;
  const STORAGE_KEY = "spera_fieszta_2026_v1";

  const DAY_LABELS = [
    { val: 1, short: "H" },
    { val: 2, short: "K" },
    { val: 3, short: "Sze" },
    { val: 4, short: "Cs" },
    { val: 5, short: "P" },
    { val: 6, short: "Szo" },
    { val: 0, short: "V" }
  ];

  const PHASE_INFO = {
    menstruation: {
      name: "Menstruációs fázis",
      color: "#C86D51",
      desc: "A méhnyálkahártya leválása, alacsony ösztrogén- és progeszteronszint. A pihenés, vas- és magnéziumpótlás időszaka."
    },
    follicular: {
      name: "Follikuláris fázis",
      color: "#7DA690",
      desc: "Tüszőérés és fokozatosan emelkedő ösztrogénszint. Általában növekvő energia; PCOS/IR esetén fontos a stabil vércukorszint."
    },
    ovulation: {
      name: "Ovulációs ablak",
      color: "#C99A74",
      desc: "LH-csúcs és peteérés (termékeny ablak). Az alaphőmérséklet (BBT) az ovuláció után ~0,3 °C-kal megemelkedik."
    },
    luteal: {
      name: "Luteális fázis",
      color: "#A48473",
      desc: "A sárgatest progeszteront termel. Pajzsmirigy- és ösztrogéndominancia-tünetek ilyenkor gyakrabban felerősödhetnek."
    }
  };

  const COND_PHASE_META = {
    stable: { label: "Krónikus – stabil", cls: "phase-stable" },
    early: { label: "Korai szakasz", cls: "phase-early" },
    progressive: { label: "Aktív kezelés / stádium", cls: "phase-progressive" },
    acute: { label: "Akut fellángolás", cls: "phase-acute" },
    remission: { label: "Remisszió", cls: "phase-remission" },
    monitoring: { label: "Kivizsgálás alatt", cls: "phase-monitoring" }
  };

  const MODE_LABELS = {
    cycle: "Cikluskövetés",
    ttc: "Baba tervezése",
    pregnancy: "Várandósság követése"
  };

  const SEVERITY_LABELS = {
    high: "Súlyos",
    medium: "Közepes",
    low: "Enyhe"
  };

  // ------------------------------------------------------------------------
  // Állapotkezelés
  // ------------------------------------------------------------------------
  let state = createEmptyState();
  let currentTab = "dashboard";
  let calendarViewDate = new Date();
  let selectedBiomarker = "tsh";
  let selectedNutritionPhase = null; // null => automatikusan aktuális fázis
  let selectedJourneyStep = 1;
  let selectedSymptomSet = new Set();
  let showAllBiomarkers = false;
  let checkinDraft = createDefaultCheckinDraft();
  let editingMedTimes = [];
  let activeAlert = null;
  const alertedKeys = new Set();
  const snoozedQueue = new Map();

  function createDefaultCheckinDraft() {
    return {
      medRule: "yes",
      energy: 3,
      brainFog: false,
      sleepHours: 7.5,
      sleepQuality: "restful",
      mood: 4,
      moodTags: [],
      bleeding: "none",
      cervicalMucus: "",
      pelvicPain: "none",
      metabolicLogged: false,
      reactiveHypo: false,
      bloatingConstipation: false,
      coldEdema: false,
      skinHairTrend: "unchanged"
    };
  }

  function createEmptyState() {
    return {
      onboarded: false,
      isDemo: false,
      mode: "cycle",
      journeyStep: 1,
      profile: {
        name: "",
        age: "",
        bloodType: "",
        cycleLength: 28,
        periodLength: 5,
        lastPeriodStart: getTodayKey(),
        pregnancyLmp: DATA.shiftDate(-56),
        selectedEndocrine: [],
        allergies: [],
        medicalHistory: "",
        doctorNotes: "",
        emergencyName: "",
        emergencyRelation: "",
        emergencyPhone: ""
      },
      visitPrep: {
        nextVisitDate: "",
        visitType: "Endokrinológiai és nőgyógyászati kontroll",
        missedDosesChoice: "none",
        missedDosesCount: 0,
        weightChangeType: "none",
        weightChangeKg: 0,
        currentWeightKg: "",
        consultationQuestions: "",
        lastUpdated: ""
      },
      conditions: [],
      medications: [],
      intakeLogs: {},
      cycleHistory: [],
      smartAlertDismissedForAvg: null,
      labResults: [],
      symptomLogs: [],
      settings: {
        largeText: false,
        soundEnabled: true,
        notificationsEnabled: false,
        showMedicalWhy: true
      }
    };
  }

  function loadSavedFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (_) {
      return null;
    }
  }

  function normalizeState(raw) {
    const base = createEmptyState();
    return {
      ...base,
      ...raw,
      profile: {
        ...base.profile,
        ...(raw.profile || {}),
        selectedEndocrine: Array.isArray(raw.profile?.selectedEndocrine) ? raw.profile.selectedEndocrine : [],
        allergies: Array.isArray(raw.profile?.allergies) ? raw.profile.allergies : []
      },
      visitPrep: {
        ...base.visitPrep,
        ...(raw.visitPrep || {})
      },
      conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
      medications: Array.isArray(raw.medications) ? raw.medications : [],
      intakeLogs: raw.intakeLogs && typeof raw.intakeLogs === "object" ? raw.intakeLogs : {},
      cycleHistory: Array.isArray(raw.cycleHistory) ? raw.cycleHistory : [],
      labResults: Array.isArray(raw.labResults) ? raw.labResults : [],
      symptomLogs: Array.isArray(raw.symptomLogs) ? raw.symptomLogs : [],
      settings: { ...base.settings, ...(raw.settings || {}) }
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      showToast("Hiba az adatok helyi mentésekor.", true);
    }
  }

  // ------------------------------------------------------------------------
  // Dátum & Ciklus / Várandósság számítások
  // ------------------------------------------------------------------------
  function getTodayKey() {
    return DATA.shiftDate(0);
  }

  function parseDateLocal(isoStr) {
    if (!isoStr) return new Date();
    const [y, m, d] = isoStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }

  function toIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function diffDays(fromIso, toIso) {
    const a = parseDateLocal(fromIso);
    const b = parseDateLocal(toIso);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function formatHuDate(isoStr) {
    if (!isoStr) return "—";
    const parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    return `${parts[0]}. ${parts[1]}. ${parts[2]}.`;
  }

  function getCurrentTimeHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function getCycleStatusForDate(targetIso) {
    const cycleLen = Math.max(20, Number(state.profile.cycleLength) || 28);
    const periodLen = Math.max(2, Math.min(12, Number(state.profile.periodLength) || 5));
    const lmp = state.profile.lastPeriodStart || getTodayKey();
    const rawDiff = diffDays(lmp, targetIso);
    const cycleDay = (((rawDiff % cycleLen) + cycleLen) % cycleLen) + 1;

    const ovulationDay = Math.max(periodLen + 2, cycleLen - 14);
    const fertileStart = Math.max(periodLen + 1, ovulationDay - 4);
    const fertileEnd = Math.min(cycleLen, ovulationDay + 1);
    const progLabDay = Math.min(cycleLen - 1, ovulationDay + 7);

    let phase = "luteal";
    if (cycleDay <= periodLen) {
      phase = "menstruation";
    } else if (cycleDay < fertileStart) {
      phase = "follicular";
    } else if (cycleDay <= fertileEnd) {
      phase = "ovulation";
    } else {
      phase = "luteal";
    }

    const isHormonePanelDay = cycleDay >= 3 && cycleDay <= 5;
    const isProgLabDay = cycleDay === progLabDay;

    // Következő menstruáció dátuma targetIso-hoz képest
    const daysUntilNextPeriod = cycleLen - cycleDay + 1;
    const nextPeriodDate = new Date(parseDateLocal(targetIso));
    nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntilNextPeriod);

    return {
      cycleDay,
      cycleLen,
      periodLen,
      ovulationDay,
      fertileStart,
      fertileEnd,
      progLabDay,
      phase,
      phaseInfo: PHASE_INFO[phase],
      isPeriod: cycleDay <= periodLen,
      isFertile: cycleDay >= fertileStart && cycleDay <= fertileEnd,
      isOvulationPeak: cycleDay === ovulationDay,
      isHormonePanelDay,
      isProgLabDay,
      daysUntilNextPeriod,
      nextPeriodIso: toIsoDate(nextPeriodDate)
    };
  }

  function getPregnancyStatus() {
    const lmp = state.profile.pregnancyLmp || state.profile.lastPeriodStart || DATA.shiftDate(-60);
    const days = Math.max(7, Math.min(287, diffDays(lmp, getTodayKey())));
    const week = Math.floor(days / 7);
    const extraDays = days % 7;
    const trimester = week <= 12 ? 1 : week <= 27 ? 2 : 3;
    const edd = new Date(parseDateLocal(lmp));
    edd.setDate(edd.getDate() + 280);
    const daysRemaining = Math.max(0, 280 - days);
    const progressPct = Math.min(100, Math.round((days / 280) * 100));

    return {
      week,
      extraDays,
      trimester,
      eddIso: toIsoDate(edd),
      daysRemaining,
      progressPct
    };
  }

  // Okos ciklushossz-módosító javaslat (Smart Alert)
  function getSmartCycleAlert() {
    const hist = state.cycleHistory || [];
    if (hist.length < 3) return null;
    const recent = hist.slice(-3);
    const avg = Math.round(recent.reduce((sum, x) => sum + Number(x.length), 0) / recent.length);
    const configured = Number(state.profile.cycleLength) || 28;
    if (Math.abs(avg - configured) < 3) return null;
    if (state.smartAlertDismissedForAvg === avg) return null;
    return {
      configured,
      suggested: avg,
      recentLengths: recent.map((r) => r.length)
    };
  }

  // ------------------------------------------------------------------------
  // Toast & Web Audio hangjelzés
  // ------------------------------------------------------------------------
  function showToast(msg, isError = false) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = `toast${isError ? " toast-error" : ""}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s ease";
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  function playReminderChime() {
    if (!state.settings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.38);
      });
    } catch (_) {}
  }

  // ------------------------------------------------------------------------
  // Gyógyszer-emlékeztető motor
  // ------------------------------------------------------------------------
  function getTodayDoses() {
    const todayDow = new Date().getDay();
    const todayKey = getTodayKey();
    const todayLogs = state.intakeLogs[todayKey] || {};
    const nowHHMM = getCurrentTimeHHMM();
    const list = [];

    for (const med of state.medications) {
      if (!med.active) continue;
      if (!Array.isArray(med.days) || !med.days.includes(todayDow)) continue;
      const times = Array.isArray(med.times) ? [...med.times].sort() : [];
      for (const time of times) {
        const key = `${med.id}@${time}`;
        const log = todayLogs[key] || null;
        list.push({
          key,
          med,
          time,
          log,
          isOverdue: !log && time < nowHHMM
        });
      }
    }
    list.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name, "hu"));
    return list;
  }

  function setDoseStatus(doseKey, status) {
    const todayKey = getTodayKey();
    if (!state.intakeLogs[todayKey]) state.intakeLogs[todayKey] = {};
    if (status === null) {
      delete state.intakeLogs[todayKey][doseKey];
    } else {
      state.intakeLogs[todayKey][doseKey] = { status, timestamp: getCurrentTimeHHMM() };
    }
    saveState();
    renderAll();
  }

  function showAlertBanner(payload) {
    activeAlert = payload;
    document.getElementById("alertBannerTitle").textContent = `${payload.medName} – ${payload.dosage}`;
    document.getElementById("alertBannerMeta").textContent =
      `Időpont: ${payload.time} • ${payload.mealRelation || "Étkezéstől függetlenül"}${payload.isTest ? " (Teszt)" : ""}`;
    document.getElementById("activeAlertBanner").classList.remove("hidden");
    playReminderChime();

    if ("Notification" in window && Notification.permission === "granted" && state.settings.notificationsEnabled) {
      try {
        new Notification(`Spera gyógyszer-emlékeztető (${payload.time})`, {
          body: `${payload.medName} – ${payload.dosage}\n${payload.mealRelation || ""}`
        });
      } catch (_) {}
    }
  }

  function hideAlertBanner() {
    activeAlert = null;
    document.getElementById("activeAlertBanner").classList.add("hidden");
  }

  function checkDueReminders() {
    if (!state.onboarded) return;
    const now = Date.now();
    const todayKey = getTodayKey();
    const nowHHMM = getCurrentTimeHHMM();

    for (const [key, item] of snoozedQueue.entries()) {
      if (now >= item.triggerAt) {
        snoozedQueue.delete(key);
        if (!(state.intakeLogs[todayKey] || {})[key]) {
          showAlertBanner(item.payload);
          return;
        }
      }
    }

    for (const dose of getTodayDoses()) {
      if (dose.log) continue;
      const stamp = `${todayKey}|${dose.key}`;
      if (dose.time === nowHHMM && !alertedKeys.has(stamp)) {
        alertedKeys.add(stamp);
        showAlertBanner({
          key: dose.key,
          medName: dose.med.name,
          dosage: dose.med.dosage,
          time: dose.time,
          mealRelation: dose.med.mealRelation,
          isTest: false
        });
        renderMedsAndConditions();
        break;
      }
    }
  }

  function getActiveInteractions() {
    const activeMeds = state.medications.filter((m) => m.active);
    const textBlob = activeMeds
      .map((m) => `${m.name} ${m.activeIngredient || ""}`.toLowerCase())
      .join(" | ");
    return DATA.INTERACTION_RULES.filter((rule) =>
      rule.triggerKeywords.some((kw) => textBlob.includes(kw))
    );
  }

  // ------------------------------------------------------------------------
  // Onboarding indítása és átmenet
  // ------------------------------------------------------------------------
  function showOnboarding() {
    document.getElementById("onboardingScreen").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    // Üres kezdő űrlap minden megnyitáskor (jegyzet.md §2.2)
    document.getElementById("onboardingForm").reset();
    const saved = loadSavedFromStorage();
    const resumeBtn = document.getElementById("btnResumeSaved");
    if (saved && saved.onboarded && saved.profile?.name) {
      resumeBtn.classList.remove("hidden");
      resumeBtn.textContent = `Mentett profil folytatása (${saved.profile.name})`;
    } else {
      resumeBtn.classList.add("hidden");
    }
  }

  function enterDashboard() {
    document.getElementById("onboardingScreen").classList.add("hidden");
    document.getElementById("appShell").classList.remove("hidden");
    selectedJourneyStep = state.journeyStep || 1;
    selectedNutritionPhase = null;
    showAllBiomarkers = false;
    const symDateEl = document.getElementById("symDate");
    if (symDateEl) {
      symDateEl.value = getTodayKey();
      delete symDateEl.dataset.loadedDate;
    }
    renderAll();
  }

  // ------------------------------------------------------------------------
  // Összesített Renderelés
  // ------------------------------------------------------------------------
  function renderAll() {
    applySettingsAndHeader();
    renderDashboard();
    renderMedsAndConditions();
    renderSymptomLogger();
    renderAnalytics();
    renderNutrition();
    renderJourneyMap();
    renderMedicalSummary();
  }

  function applySettingsAndHeader() {
    const isLarge = Boolean(state.settings.largeText);
    document.documentElement.classList.toggle("large-text", isLarge);
    const btnFont = document.getElementById("btnToggleFont");
    btnFont.setAttribute("aria-pressed", String(isLarge));
    btnFont.textContent = isLarge ? "A-" : "A+";

    const endoTags = (state.profile.selectedEndocrine || [])
      .map((k) => DATA.ENDOCRINE_PROFILES[k]?.shortName.split(" / ")[0])
      .filter(Boolean);
    document.getElementById("headerPatientSubtitle").textContent =
      `${state.profile.name || "Páciens"} • ${endoTags.length ? endoTags.join(" + ") : "Általános cikluskövetés"}`;

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === state.mode);
    });

    const pendingMeds = getTodayDoses().filter((d) => !d.log).length;
    document.getElementById("badgePendingMeds").textContent = String(pendingMeds);

    // Napi 30 mp gyorsteszt jelvény
    const todayLog = (state.symptomLogs || []).find((l) => l.date === getTodayKey() && l.dailyCheckin);
    const badgeDaily = document.getElementById("badgeDailyCheckin");
    if (badgeDaily) {
      badgeDaily.classList.remove("hidden");
      if (todayLog) {
        badgeDaily.textContent = "✓";
        badgeDaily.title = "Mai 30 mp-es gyorsteszt rögzítve";
      } else {
        badgeDaily.textContent = "30 mp";
        badgeDaily.title = "Mai 30 mp-es gyorsteszt még hátravan";
      }
    }

    // Orvosi háttér-magyarázatok láthatósága
    const showWhy = state.settings.showMedicalWhy !== false;
    const chkWhy = document.getElementById("chkShowMedicalWhy");
    if (chkWhy) chkWhy.checked = showWhy;
    const symPanel = document.getElementById("panel-symptoms");
    if (symPanel) symPanel.classList.toggle("hide-medical-why", !showWhy);

    // Értesítési UI
    const chkSound = document.getElementById("chkSoundEnabled");
    if (chkSound) chkSound.checked = Boolean(state.settings.soundEnabled);
    const btnNotif = document.getElementById("btnEnableBrowserNotif");
    const noteEl = document.getElementById("notifStatusNote");
    if (btnNotif && noteEl) {
      if (!("Notification" in window)) {
        btnNotif.disabled = true;
        noteEl.textContent = "Alkalmazáson belüli emlékeztető és hangjelzés aktív.";
      } else if (Notification.permission === "granted" && state.settings.notificationsEnabled) {
        btnNotif.textContent = "Értesítés: Be";
        noteEl.textContent = "Böngészős és alkalmazáson belüli emlékeztetők is aktívak.";
      } else {
        btnNotif.textContent = "Értesítés bekapcs.";
        noteEl.textContent = "Az alkalmazáson belüli figyelmeztető sáv és hangjelzés aktív.";
      }
    }
  }

  // ------------------------------------------------------------------------
  // Önmenedzsment 30 napos összesítő statisztikák & adherence számítás
  // ------------------------------------------------------------------------
  function computeSelfManagementStats() {
    const todayKey = getTodayKey();
    const logs = (state.symptomLogs || []).filter((l) => {
      const age = diffDays(l.date, todayKey);
      return age >= 0 && age <= 30;
    });

    const dailyLogs = logs.filter((l) => l.dailyCheckin);
    const totalDaysLogged = dailyLogs.length;

    let sumEnergy = 0, cntEnergy = 0;
    let sumMood = 0, cntMood = 0;
    let sumSleep = 0, cntSleep = 0;
    let restfulCount = 0;
    let brainFogCount = 0;
    let medYesDays = 0, medNoDays = 0, medLaterDays = 0;

    dailyLogs.forEach((l) => {
      const d = l.dailyCheckin;
      if (d.energy) { sumEnergy += Number(d.energy); cntEnergy++; }
      if (d.mood) { sumMood += Number(d.mood); cntMood++; }
      if (d.sleepHours) { sumSleep += Number(d.sleepHours); cntSleep++; }
      if (d.sleepQuality === "restful") restfulCount++;
      if (d.brainFog) brainFogCount++;
      if (d.medRule === "yes") medYesDays++;
      else if (d.medRule === "no") medNoDays++;
      else if (d.medRule === "later") medLaterDays++;
    });

    const vp = state.visitPrep || {};
    const reportedMissed = Number(vp.missedDosesCount) || 0;
    const effectiveMissed = Math.max(medNoDays, reportedMissed);
    const adherencePct = Math.max(0, Math.min(100, Math.round(((30 - effectiveMissed) / 30) * 100)));

    // Heti metabolikus & hormonális mikrotünetek
    const metaLogs = logs.filter((l) => l.metabolicLogged && l.metabolic).sort((a, b) => b.date.localeCompare(a.date));
    const lastMetabolicDate = metaLogs[0]?.date || null;
    const daysSinceMetabolic = lastMetabolicDate ? diffDays(lastMetabolicDate, todayKey) : null;
    const reactiveHypoCount = metaLogs.filter((l) => l.metabolic.reactiveHypo).length;
    const bloatingCount = metaLogs.filter((l) => l.metabolic.bloatingConstipation).length;
    const coldEdemaCount = metaLogs.filter((l) => l.metabolic.coldEdema).length;
    const latestSkinHair = metaLogs[0]?.metabolic?.skinHairTrend || "";

    // Ciklus- és termékenységi biomarkerek
    const eggWhiteDays = logs.filter((l) => l.cervicalMucus === "eggwhite").length;
    const spottingDays = logs.filter((l) => l.bleeding === "spotting").length;
    const clotDays = logs.filter((l) => l.bleeding === "clots").length;
    const sharpPainDays = logs.filter((l) => l.pelvicPain === "sharp_one_side").length;
    const strongCrampsDays = logs.filter((l) => l.pelvicPain === "strong_cramps").length;

    // Kontroll dátum
    const daysUntilVisit = vp.nextVisitDate ? diffDays(todayKey, vp.nextVisitDate) : null;
    const isVisitSoon = daysUntilVisit !== null && daysUntilVisit >= 0 && daysUntilVisit <= 7;

    return {
      totalDaysLogged,
      avgEnergy: cntEnergy ? (sumEnergy / cntEnergy).toFixed(1) : null,
      avgMood: cntMood ? (sumMood / cntMood).toFixed(1) : null,
      avgSleep: cntSleep ? (sumSleep / cntSleep).toFixed(1) : null,
      restfulPct: totalDaysLogged ? Math.round((restfulCount / totalDaysLogged) * 100) : null,
      brainFogCount,
      medYesDays,
      medNoDays,
      medLaterDays,
      reportedMissed,
      effectiveMissed,
      adherencePct,
      metabolicChecksCount: metaLogs.length,
      lastMetabolicDate,
      daysSinceMetabolic,
      reactiveHypoCount,
      bloatingCount,
      coldEdemaCount,
      latestSkinHair,
      eggWhiteDays,
      spottingDays,
      clotDays,
      sharpPainDays,
      strongCrampsDays,
      daysUntilVisit,
      isVisitSoon
    };
  }

  // ------------------------------------------------------------------------
  // 1. Áttekintő & Interaktív Naptár (+ Várandósság mód)
  // ------------------------------------------------------------------------
  function renderDashboard() {
    const todayKey = getTodayKey();
    const cyc = getCycleStatusForDate(todayKey);
    const endo = state.profile.selectedEndocrine || [];
    const smStats = computeSelfManagementStats();

    // 1) Smart Alert (Okos ciklushossz-módosító javaslat)
    const smartEl = document.getElementById("smartAlertContainer");
    const smart = state.mode !== "pregnancy" ? getSmartCycleAlert() : null;
    if (smart) {
      smartEl.innerHTML = `
        <div class="smart-alert">
          <div class="smart-alert-body">
            <strong>Okos ciklushossz-javaslat: az utolsó 3 ciklusod átlaga ${smart.suggested} nap!</strong>
            <p>
              A beállított ciklushosszad jelenleg <strong>${smart.configured} nap</strong>, de az utolsó három hónap tényleges adatai
              (${smart.recentLengths.join(", ")} nap) alapján <strong>${smart.suggested} napos</strong> ciklus jellemző rád.
              Frissítsük az alapértelmezett ciklushosszt a pontosabb ovulációs és progeszteron-labor előrejelzésért?
            </p>
          </div>
          <div class="smart-alert-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btnAcceptSmartCycle">
              Frissítés ${smart.suggested} napra &amp; újraszámolás
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="btnDismissSmartCycle">Később</button>
          </div>
        </div>
      `;
      document.getElementById("btnAcceptSmartCycle").addEventListener("click", () => {
        state.profile.cycleLength = smart.suggested;
        state.smartAlertDismissedForAvg = null;
        saveState();
        renderAll();
        showToast(`Ciklushossz frissítve ${smart.suggested} napra – a naptár és a labor-időzítés újraszámolva!`);
      });
      document.getElementById("btnDismissSmartCycle").addEventListener("click", () => {
        state.smartAlertDismissedForAvg = smart.suggested;
        saveState();
        renderDashboard();
      });
    } else {
      smartEl.innerHTML = "";
    }

    // 2) Hero kártya (Várandósság mód vs Cikluskövetés / Babatervezés)
    const heroEl = document.getElementById("dashboardHero");
    if (state.mode === "pregnancy") {
      const preg = getPregnancyStatus();
      const circum = 2 * Math.PI * 50;
      const dashOffset = circum * (1 - preg.progressPct / 100);
      heroEl.innerHTML = `
        <div class="hero-card pregnancy-mode">
          <div class="cycle-ring-wrap">
            <svg viewBox="0 0 120 120" width="122" height="122">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#DCECE3" stroke-width="10"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#64957D" stroke-width="10"
                stroke-linecap="round" stroke-dasharray="${circum}" stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="cycle-ring-center">
              <span class="cycle-ring-num">${preg.week}+${preg.extraDays}</span>
              <span class="cycle-ring-label">hét</span>
            </div>
          </div>
          <div class="hero-main">
            <span class="pill pill-sage">Várandósság követése • ${preg.trimester}. trimeszter</span>
            <h2>${preg.week}. terhességi hét (${preg.progressPct}%)</h2>
            <p>
              Várható szülés időpontja (EDD): <strong>${escapeHtml(formatHuDate(preg.eddIso))}</strong> (${preg.daysRemaining} nap múlva).
              Az endokrin profilod alapján kiemelt pajzsmirigy-, vércukor- és trimeszter-vitamin ajánlások aktívak.
            </p>
            <div class="hero-pills">
              <span class="pill pill-sage">Aktív folát (5-MTHF)</span>
              <span class="pill pill-sage">DHA / Omega-3</span>
              <span class="pill pill-peach">D3 + Kolin + Vas (orvosi kontrollal)</span>
            </div>
          </div>
          <div class="hero-metrics">
            <div class="hero-metric-row"><span>Trimeszter:</span><strong>${preg.trimester}. trimeszter</strong></div>
            <div class="hero-metric-row"><span>Várható szülés:</span><strong>${escapeHtml(formatHuDate(preg.eddIso))}</strong></div>
            <div class="hero-metric-row"><span>Endokrin profil:</span><strong>${endo.length || 0} aktív kórkép</strong></div>
            <button type="button" class="btn btn-sage btn-sm" data-jump-tab="nutrition" style="margin-top:0.25rem;">
              Trimeszter-vitaminok &rarr;
            </button>
          </div>
        </div>
      `;
    } else {
      const pct = Math.min(100, Math.round((cyc.cycleDay / cyc.cycleLen) * 100));
      const circum = 2 * Math.PI * 50;
      const dashOffset = circum * (1 - pct / 100);
      heroEl.innerHTML = `
        <div class="hero-card">
          <div class="cycle-ring-wrap">
            <svg viewBox="0 0 120 120" width="122" height="122">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#F0E5DE" stroke-width="10"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="${cyc.phaseInfo.color}" stroke-width="10"
                stroke-linecap="round" stroke-dasharray="${circum}" stroke-dashoffset="${dashOffset}"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="cycle-ring-center">
              <span class="cycle-ring-num">${cyc.cycleDay}.</span>
              <span class="cycle-ring-label">ciklusnap</span>
            </div>
          </div>
          <div class="hero-main">
            <span class="pill">${escapeHtml(MODE_LABELS[state.mode])} • ${escapeHtml(cyc.phaseInfo.name)}</span>
            <h2>${escapeHtml(cyc.phaseInfo.name)}</h2>
            <p>${escapeHtml(cyc.phaseInfo.desc)}</p>
            <div class="hero-pills">
              <span class="pill pill-neutral">Ciklushossz: ${cyc.cycleLen} nap</span>
              <span class="pill pill-sage">Termékeny ablak: ${cyc.fertileStart}–${cyc.fertileEnd}. nap</span>
              <span class="pill pill-peach">Várható ovuláció: ${cyc.ovulationDay}. nap</span>
            </div>
          </div>
          <div class="hero-metrics">
            <div class="hero-metric-row"><span>Következő menstruáció:</span><strong>${escapeHtml(formatHuDate(cyc.nextPeriodIso))}</strong></div>
            <div class="hero-metric-row"><span>3–5. napi hormonpanel:</span><strong>3–5. ciklusnap</strong></div>
            <div class="hero-metric-row"><span>Progeszteron labor:</span><strong>${cyc.progLabDay}. nap (ovul. +7)</strong></div>
            <button type="button" class="btn btn-primary btn-sm" data-jump-tab="symptoms" style="margin-top:0.25rem;">
              Mai tünetek naplózása &rarr;
            </button>
          </div>
        </div>
      `;
    }

    // 3) Klinikai figyelmeztetések
    const alerts = [];
    if (state.mode === "pregnancy") {
      if (endo.includes("hashimoto")) {
        alerts.push({
          tone: "tone-coral",
          eyebrow: "Hashimoto • Várandóssági prioritás",
          title: "Azonnali TSH és fT4 kontroll szükséges!",
          text: "Pozitív terhességi teszt után a pajzsmirigyhormon-igény 25–50%-kal emelkedhet. Egyeztesd endokrinológusoddal az L-tiroxin dózisát és a biztonságos jódbevitelt."
        });
      }
      if (endo.includes("pcos")) {
        alerts.push({
          tone: "tone-peach",
          eyebrow: "PCOS / IR • Terhességi diabétesz megelőzés",
          title: "Korai vércukor-ellenőrzés és OGTT időzítés",
          text: "PCOS/IR esetén a terhességi diabétesz kockázata magasabb: korai éhgyomri vércukor és 24–28. heti (szükség esetén korábbi) OGTT szűrés javasolt."
        });
      }
      alerts.push({
        tone: "tone-sage",
        eyebrow: "Várandósgondozás",
        title: "Progeszteron-támogatás és kontrollvizsgálatok",
        text: "Endometriózis vagy korábbi luteális elégtelenség esetén az I. trimeszterben orvosi felügyelet melletti progeszteron-kontroll és rendszeres nőgyógyászati vizit ajánlott."
      });
    } else {
      alerts.push({
        tone: "tone-sage",
        eyebrow: "Ciklusnap-függő laboridőzítés",
        title: `Progeszteron-vérvétel a ${cyc.progLabDay}. ciklusnapon`,
        text: `Mivel a ciklushosszad ${cyc.cycleLen} nap (várható ovuláció: ${cyc.ovulationDay}. nap), a progeszteron-szintet az ovuláció + 7. napon (${cyc.progLabDay}. nap) érdemes mérni a fix 21. nap helyett.`
      });
      if (state.mode === "ttc") {
        alerts.push({
          tone: "tone-coral",
          eyebrow: "Baba tervezése • Célérték-figyelő",
          title: "Optimális pajzsmirigy- és mikrotápanyag-felkészülés",
          text: "Babatervezésnél a TSH optimális célja 0,8–2,0 mIU/l (ATA irányelv), a D-vitamin >100 nmol/l, valamint legalább 3 hónappal fogantatás előtt érdemes aktív folátot (5-MTHF) kezdeni."
        });
      }
      if (cyc.cycleLen > 35 || (state.cycleHistory.some((c) => c.length > 35))) {
        alerts.push({
          tone: "tone-peach",
          eyebrow: "Prevenciós javaslat",
          title: "Elhúzódó ciklus észlelhető – érdemes endokrin kontroll",
          text: "A 35 napnál hosszabb ciklusok esetén vidd magaddal az Orvosi összefoglalót nőgyógyászati / endokrinológiai vizitre!"
        });
      }
    }

    // 7 napon belüli kontrollra felkészítő figyelmeztetés
    if (smStats.isVisitSoon) {
      const vp = state.visitPrep;
      const dayTxt = smStats.daysUntilVisit === 0 ? "ma" : `${smStats.daysUntilVisit} nap múlva`;
      alerts.unshift({
        tone: "tone-coral",
        eyebrow: "Orvosi kontrollra felkészítő • Vizit előtt 7 napon belül",
        title: `${vp.visitType || "Szakorvosi kontroll"} ${dayTxt} (${formatHuDate(vp.nextVisitDate)})`,
        text: `30 napos gyógyszer-adherence: ${smStats.adherencePct}%. Nézd át a kontroll-előkészítő kérdéseidet az Önmenedzsment fülön – közvetlenül az Orvosi PDF tetejére kerülnek!`
      });
    }

    document.getElementById("clinicalAlertsGrid").innerHTML = alerts
      .map(
        (a) => `
        <div class="clinical-alert-card ${a.tone}">
          <span class="clinical-alert-eyebrow">${escapeHtml(a.eyebrow)}</span>
          <strong>${escapeHtml(a.title)}</strong>
          <p>${escapeHtml(a.text)}</p>
        </div>
      `
      )
      .join("");

    // 4) Interaktív Naptár
    renderCalendar();

    // 5) Mai 30 másodperces Napi gyorsteszt gyors-kártya
    const todayEntry = (state.symptomLogs || []).find((l) => l.date === todayKey && l.dailyCheckin);
    const miniCheckinEl = document.getElementById("dashboardCheckinCard");
    if (miniCheckinEl) {
      miniCheckinEl.classList.toggle("is-done", Boolean(todayEntry));
      if (todayEntry) {
        const dc = todayEntry.dailyCheckin;
        miniCheckinEl.innerHTML = `
          <div class="card-header-inline">
            <div>
              <h3 class="card-title">Mai gyorsteszt kész &#10003;</h3>
              <p class="card-subtitle">30 másodperces Daily Check-in rögzítve</p>
            </div>
            <span class="pill pill-sage">Kész</span>
          </div>
          <div class="checkin-mini-stats">
            <span class="pill pill-sage">Gyógyszerszabály: ${escapeHtml(DATA.SELF_MANAGEMENT_META.medRule[dc.medRule] || "—")}</span>
            <span class="pill pill-neutral">Energia: ${dc.energy}/5</span>
            <span class="pill pill-neutral">Hangulat: ${dc.mood}/5</span>
            <span class="pill pill-neutral">Alvás: ${String(dc.sleepHours).replace(".", ",")} ó (${escapeHtml(DATA.SELF_MANAGEMENT_META.sleepQuality[dc.sleepQuality] || "")})</span>
            ${dc.brainFog ? `<span class="pill">Agyköd: Igen</span>` : `<span class="pill pill-sage">Agyköd: Nem</span>`}
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-jump-tab="symptoms">Szerkesztés / Heti mikrotünetek &rarr;</button>
        `;
      } else {
        miniCheckinEl.innerHTML = `
          <div class="card-header-inline">
            <div>
              <h3 class="card-title">Napi gyorsteszt (30 mp)</h3>
              <p class="card-subtitle">5 egykattintásos orvosi paraméter mára</p>
            </div>
            <span class="pill">Esedékes</span>
          </div>
          <p class="form-help" style="margin:0.4rem 0 0.75rem;">
            Gyógyszerszabály, energiaszint, agyköd, alvásminőség és hangulat – túlterhelés nélkül.
          </p>
          <button type="button" class="btn btn-primary btn-sm" data-jump-tab="symptoms">30 mp-es check-in indítása &rarr;</button>
        `;
      }
    }

    // 5) Mini gyógyszerek & aktív betegségek oldalsáv
    const doses = getTodayDoses();
    const taken = doses.filter((d) => d.log?.status === "taken").length;
    document.getElementById("miniMedProgress").textContent = `${taken} / ${doses.length} mai adag bevéve`;
    const miniMedsEl = document.getElementById("dashboardMiniMeds");
    if (doses.length === 0) {
      miniMedsEl.innerHTML = `<p class="form-help">Még nincs beállított gyógyszer-emlékeztető.</p>`;
    } else {
      miniMedsEl.innerHTML = doses
        .map((d) => {
          const isTaken = d.log?.status === "taken";
          return `
            <div class="mini-med-item ${isTaken ? "taken" : ""}">
              <div>
                <strong>${escapeHtml(d.time)} – ${escapeHtml(d.med.name)}</strong>
                <div class="entity-subtitle">${escapeHtml(d.med.dosage)}</div>
              </div>
              ${
                isTaken
                  ? `<span class="pill pill-sage">&#10003; Bevéve</span>`
                  : `<button type="button" class="btn btn-sage btn-sm" data-quick-take="${escapeHtml(d.key)}">Bevettem</button>`
              }
            </div>
          `;
        })
        .join("");
    }

    const activeConds = state.conditions.filter((c) => c.active);
    const miniCondsEl = document.getElementById("dashboardConditionsMini");
    if (activeConds.length === 0) {
      miniCondsEl.innerHTML = `<p class="form-help">Nincs részletes betegség rögzítve. Adj hozzá állapotot a Gyógyszerek &amp; Betegségek fülön!</p>`;
    } else {
      miniCondsEl.innerHTML = activeConds
        .map(
          (c) => `
          <div class="mini-cond-item">
            <strong>${escapeHtml(c.name)}</strong>
            <span>Fázis: ${escapeHtml(c.phase)}</span>
          </div>
        `
        )
        .join("");
    }
  }

  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const monthName = new Date(year, month, 1).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long"
    });
    document.getElementById("calendarMonthLabel").textContent = monthName;
    document.getElementById("calendarHeading").textContent =
      state.mode === "pregnancy" ? "Várandóssági & tünetnaptár" : "Interaktív ciklusnaptár";

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Hétfő = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = getTodayKey();
    const logDates = new Set((state.symptomLogs || []).map((l) => l.date));

    let html = "";
    for (let i = 0; i < startOffset; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = iso === todayKey;
      const hasSymptom = logDates.has(iso);
      let cls = "cal-day";
      let dots = "";
      let tooltip = formatHuDate(iso);

      if (state.mode !== "pregnancy") {
        const info = getCycleStatusForDate(iso);
        tooltip = `${formatHuDate(iso)} • ${info.cycleDay}. ciklusnap (${info.phaseInfo.name})`;
        if (info.isPeriod) cls += " phase-period";
        else if (info.isOvulationPeak) cls += " phase-ovulation";
        else if (info.isFertile) cls += " phase-fertile";

        if (info.isOvulationPeak) dots += `<i class="dot dot-ovulation" title="Várható ovuláció"></i>`;
        if (info.isHormonePanelDay || info.isProgLabDay) {
          dots += `<i class="dot dot-lab" title="Ajánlott hormonlabor nap"></i>`;
        }
      }
      if (hasSymptom) dots += `<i class="dot dot-symptom" title="Naplózott tünet"></i>`;
      if (isToday) cls += " is-today";

      html += `
        <button type="button" class="${cls}" data-cal-date="${iso}" title="${escapeHtml(tooltip)}">
          <span class="cal-day-num">${day}</span>
          <span class="cal-dots">${dots}</span>
        </button>
      `;
    }
    document.getElementById("calendarGrid").innerHTML = html;
  }

  // ------------------------------------------------------------------------
  // 2. Gyógyszerek, Emlékeztetők & Betegség-adattár
  // ------------------------------------------------------------------------
  function renderMedsAndConditions() {
    const doses = getTodayDoses();
    const total = doses.length;
    const takenCount = doses.filter((d) => d.log?.status === "taken").length;
    const pct = total > 0 ? Math.round((takenCount / total) * 100) : 0;

    document.getElementById("statTakenRatio").textContent = `${takenCount} / ${total}`;
    document.getElementById("statPercent").textContent = `${pct}%`;
    document.getElementById("todayProgressFill").style.width = `${pct}%`;

    const pending = doses.filter((d) => !d.log);
    const nextEl = document.getElementById("nextDoseText");
    const nextSub = document.getElementById("nextDoseSub");
    if (total === 0) {
      nextEl.textContent = "Nincs mai gyógyszer";
      nextSub.textContent = "Adj hozzá rendszeres gyógyszert vagy vitamint.";
    } else if (pending.length === 0) {
      nextEl.textContent = "Minden mai adag kész!";
      nextSub.textContent = "Ma nincs több esedékes bevétel.";
    } else {
      const n = pending[0];
      nextEl.textContent = `${n.time} – ${n.med.name}`;
      nextSub.textContent = `${n.med.dosage} • ${n.med.mealRelation}`;
    }

    // Kölcsönhatás-figyelő
    const interactions = getActiveInteractions();
    document.getElementById("interactionAlertsContainer").innerHTML = interactions
      .map(
        (rule) => `
        <div class="interaction-banner sev-${rule.severity}">
          <strong>&#9888; ${escapeHtml(rule.title)}</strong>
          <span>${escapeHtml(rule.message)}</span>
        </div>
      `
      )
      .join("");

    // Mai időrendi lista
    const schedEl = document.getElementById("todayScheduleList");
    if (doses.length === 0) {
      schedEl.innerHTML = `<div class="empty-state">Még nincs mára ütemezett gyógyszer. Kattints a „+ Új gyógyszer / vitamin” gombra!</div>`;
    } else {
      schedEl.innerHTML = doses
        .map((d) => {
          const cond = state.conditions.find((c) => c.id === d.med.conditionId);
          const statusCls = d.log
            ? d.log.status === "taken"
              ? "status-taken"
              : "status-skipped"
            : d.isOverdue
            ? "status-overdue"
            : "";
          let btns = "";
          if (d.log?.status === "taken") {
            btns = `<span class="pill pill-sage">&#10003; Bevéve (${escapeHtml(d.log.timestamp)})</span>
                    <button type="button" class="btn btn-ghost btn-sm" data-dose-action="undo" data-dose-key="${escapeHtml(d.key)}">Visszavon</button>`;
          } else if (d.log?.status === "skipped") {
            btns = `<span class="pill pill-neutral">Kihagyva</span>
                    <button type="button" class="btn btn-ghost btn-sm" data-dose-action="undo" data-dose-key="${escapeHtml(d.key)}">Visszavon</button>`;
          } else {
            btns = `${d.isOverdue ? '<span class="pill pill-peach">Esedékes</span>' : ""}
                    <button type="button" class="btn btn-sage btn-sm" data-dose-action="take" data-dose-key="${escapeHtml(d.key)}">Bevettem</button>
                    <button type="button" class="btn btn-ghost btn-sm" data-dose-action="skip" data-dose-key="${escapeHtml(d.key)}">Kihagyva</button>`;
          }
          return `
            <div class="dose-row ${statusCls}">
              <div class="dose-time-box">${escapeHtml(d.time)}</div>
              <div class="dose-info">
                <div class="dose-med-name">${escapeHtml(d.med.name)} <span class="pill pill-neutral">${escapeHtml(d.med.dosage)}</span></div>
                <div class="dose-sub">
                  ${escapeHtml(d.med.mealRelation || "")}
                  ${cond ? ` • Betegség: <strong>${escapeHtml(cond.name)}</strong>` : ""}
                </div>
              </div>
              <div class="dose-actions">${btns}</div>
            </div>
          `;
        })
        .join("");
    }

    // Tárolt gyógyszerek kártyái
    const medsListEl = document.getElementById("medicationsList");
    if (state.medications.length === 0) {
      medsListEl.innerHTML = `<div class="empty-state">Nincs rögzített gyógyszer.</div>`;
    } else {
      medsListEl.innerHTML = state.medications
        .map((m) => {
          const cond = state.conditions.find((c) => c.id === m.conditionId);
          return `
            <article class="entity-card ${m.active ? "" : "inactive-entity"}">
              <div class="entity-header">
                <div>
                  <h4 class="entity-title">${escapeHtml(m.name)}</h4>
                  <div class="entity-subtitle">${m.activeIngredient ? `${escapeHtml(m.activeIngredient)} • ` : ""}<strong>${escapeHtml(m.dosage)}</strong></div>
                </div>
                <span class="pill ${m.active ? "pill-sage" : "pill-neutral"}">${m.active ? "Aktív" : "Szünet"}</span>
              </div>
              <div class="chips-row">
                ${(m.times || []).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("")}
                <span class="pill pill-neutral">${escapeHtml(formatDaysSummary(m.days))}</span>
              </div>
              <div class="entity-meta-list">
                <div><strong>Bevétel:</strong> ${escapeHtml(m.mealRelation || "—")}</div>
                ${cond ? `<div><strong>Betegség:</strong> ${escapeHtml(cond.name)}</div>` : ""}
                ${m.notes ? `<div><strong>Megjegyzés:</strong> ${escapeHtml(m.notes)}</div>` : ""}
              </div>
              <div class="entity-footer">
                <button type="button" class="btn btn-ghost btn-sm" data-toggle-med="${escapeHtml(m.id)}">${m.active ? "Szüneteltet" : "Aktivál"}</button>
                <div class="header-actions">
                  <button type="button" class="btn btn-secondary btn-sm" data-edit-med="${escapeHtml(m.id)}">Szerkesztés</button>
                  <button type="button" class="btn btn-danger-outline btn-sm" data-delete-med="${escapeHtml(m.id)}">Törlés</button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    // Betegségek & fázisok kártyái
    const condsEl = document.getElementById("conditionsList");
    if (state.conditions.length === 0) {
      condsEl.innerHTML = `<div class="empty-state">Még nincs rögzített betegség és fázisleírás. Kattints a „+ Új betegség / állapot” gombra!</div>`;
    } else {
      condsEl.innerHTML = state.conditions
        .map((c) => {
          const meta = COND_PHASE_META[c.phaseCategory] || COND_PHASE_META.stable;
          return `
            <article class="entity-card ${c.active ? "" : "inactive-entity"}">
              <div class="entity-header">
                <div>
                  <h4 class="entity-title">
                    ${escapeHtml(c.name)}
                    ${c.icdCode ? `<span class="code-chip">BNO: ${escapeHtml(c.icdCode)}</span>` : ""}
                  </h4>
                  ${c.diagnosedDate ? `<div class="entity-subtitle">Diagnózis: ${escapeHtml(formatHuDate(c.diagnosedDate))}</div>` : ""}
                </div>
                <span class="pill ${c.active ? "pill-sage" : "pill-neutral"}">${c.active ? "Aktív" : "Korábbi"}</span>
              </div>
              <div class="phase-box ${meta.cls}">
                <span class="phase-box-label">Fázis / stádium (${escapeHtml(meta.label)})</span>
                <strong>${escapeHtml(c.phase)}</strong>
              </div>
              <p style="margin:0; font-size:0.9rem;">${escapeHtml(c.description)}</p>
              <div class="entity-meta-list">
                ${c.symptoms ? `<div><strong>Tünetek:</strong> ${escapeHtml(c.symptoms)}</div>` : ""}
                ${c.doctor ? `<div><strong>Szakorvos:</strong> ${escapeHtml(c.doctor)}</div>` : ""}
              </div>
              <div class="entity-footer">
                <span class="entity-subtitle">Orvosi összefoglalóban szerepel</span>
                <div class="header-actions">
                  <button type="button" class="btn btn-secondary btn-sm" data-edit-cond="${escapeHtml(c.id)}">Szerkesztés</button>
                  <button type="button" class="btn btn-danger-outline btn-sm" data-delete-cond="${escapeHtml(c.id)}">Törlés</button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    // Allergiák + Profil jegyzetek
    renderAllergiesList();
    document.getElementById("profBloodType").value = state.profile.bloodType || "";
    document.getElementById("profEmergencyPhone").value =
      [state.profile.emergencyName, state.profile.emergencyPhone].filter(Boolean).join(" • ");
    document.getElementById("profMedicalHistory").value = state.profile.medicalHistory || "";
    document.getElementById("profDoctorNotes").value = state.profile.doctorNotes || "";
  }

  function renderAllergiesList() {
    const el = document.getElementById("allergiesEditorList");
    const allergies = state.profile.allergies || [];
    if (allergies.length === 0) {
      el.innerHTML = `<span class="form-help">Nincs rögzített allergia.</span>`;
      return;
    }
    el.innerHTML = allergies
      .map(
        (a) => `
        <span class="allergy-chip sev-${escapeHtml(a.severity || "medium")}">
          <span><strong>${escapeHtml(a.name)}</strong>${a.reaction ? ` – ${escapeHtml(a.reaction)}` : ""} (${escapeHtml(SEVERITY_LABELS[a.severity] || "Közepes")})</span>
          <button type="button" data-remove-allergy="${escapeHtml(a.id)}" aria-label="Eltávolítás">&times;</button>
        </span>
      `
      )
      .join("");
  }

  function formatDaysSummary(days) {
    if (!Array.isArray(days) || days.length === 0) return "—";
    if (days.length === 7) return "Minden nap";
    const map = Object.fromEntries(DAY_LABELS.map((d) => [d.val, d.short]));
    return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => map[d]).join(", ");
  }

  // ------------------------------------------------------------------------
  // 3. Spera 4-szintű Önmenedzsment & Tünetnaplózó
  // ------------------------------------------------------------------------
  function hydrateDraftFromEntry(existing) {
    const def = createDefaultCheckinDraft();
    if (!existing) {
      checkinDraft = def;
      return;
    }
    const dc = existing.dailyCheckin || {};
    const meta = existing.metabolic || {};
    checkinDraft = {
      medRule: dc.medRule || def.medRule,
      energy: Number(dc.energy) || def.energy,
      brainFog: Boolean(dc.brainFog),
      sleepHours: Number(dc.sleepHours) || def.sleepHours,
      sleepQuality: dc.sleepQuality || def.sleepQuality,
      mood: Number(dc.mood) || def.mood,
      moodTags: Array.isArray(dc.moodTags) ? [...dc.moodTags] : [],
      bleeding: existing.bleeding || "none",
      cervicalMucus: existing.cervicalMucus || "",
      pelvicPain: existing.pelvicPain || "none",
      metabolicLogged: Boolean(existing.metabolicLogged),
      reactiveHypo: Boolean(meta.reactiveHypo),
      bloatingConstipation: Boolean(meta.bloatingConstipation),
      coldEdema: Boolean(meta.coldEdema),
      skinHairTrend: meta.skinHairTrend || "unchanged"
    };
  }

  function syncCheckinControlsToDom() {
    // 1) 1–5 skála ikonok (Energia és Hangulat – finom vonalas SVG ikonok)
    const energyEl = document.getElementById("energyScaleRow");
    if (energyEl) {
      energyEl.innerHTML = DATA.SELF_MANAGEMENT_META.energyLevels
        .map(
          (lvl) => `
          <button type="button" class="icon-scale-btn ${Number(checkinDraft.energy) === lvl.value ? "active" : ""}" data-scale-field="energy" data-scale-val="${lvl.value}">
            <span class="scale-emoji" aria-hidden="true">${lvl.iconSvg}</span>
            <span class="scale-num">${lvl.value}/5</span>
            <span class="scale-lbl">${escapeHtml(lvl.label)}</span>
          </button>
        `
        )
        .join("");
    }

    const moodEl = document.getElementById("moodScaleRow");
    if (moodEl) {
      moodEl.innerHTML = DATA.SELF_MANAGEMENT_META.moodLevels
        .map(
          (lvl) => `
          <button type="button" class="icon-scale-btn ${Number(checkinDraft.mood) === lvl.value ? "active" : ""}" data-scale-field="mood" data-scale-val="${lvl.value}">
            <span class="scale-emoji" aria-hidden="true">${lvl.iconSvg}</span>
            <span class="scale-num">${lvl.value}/5</span>
            <span class="scale-lbl">${escapeHtml(lvl.label)}</span>
          </button>
        `
        )
        .join("");
    }

    // Hangulat címkék
    const moodTagsEl = document.getElementById("moodTagsRow");
    if (moodTagsEl) {
      moodTagsEl.innerHTML = DATA.SELF_MANAGEMENT_META.moodTags
        .map(
          (tag) => `
          <button type="button" class="sym-chip-btn ${checkinDraft.moodTags.includes(tag) ? "selected" : ""}" data-mood-tag="${escapeHtml(tag)}">
            ${escapeHtml(tag)}
          </button>
        `
        )
        .join("");
    }

    // Alvás csúszka
    const sleepSlider = document.getElementById("symSleepHours");
    const sleepDisp = document.getElementById("sleepHoursDisplay");
    if (sleepSlider && sleepDisp) {
      sleepSlider.value = String(checkinDraft.sleepHours);
      sleepDisp.textContent = `${String(checkinDraft.sleepHours).replace(".", ",")} óra`;
    }

    // Szegmentált gombok szinkronizálása
    const mapVals = {
      medRule: checkinDraft.medRule,
      brainFog: checkinDraft.brainFog ? "yes" : "no",
      sleepQuality: checkinDraft.sleepQuality,
      bleeding: checkinDraft.bleeding,
      cervicalMucus: checkinDraft.cervicalMucus,
      pelvicPain: checkinDraft.pelvicPain,
      reactiveHypo: checkinDraft.reactiveHypo ? "yes" : "no",
      bloatingConstipation: checkinDraft.bloatingConstipation ? "yes" : "no",
      coldEdema: checkinDraft.coldEdema ? "yes" : "no",
      skinHairTrend: checkinDraft.skinHairTrend
    };

    document.querySelectorAll("[data-radio-group]").forEach((group) => {
      const key = group.dataset.radioGroup;
      const cur = mapVals[key];
      group.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.value === cur);
      });
    });

    // Heti metabolikus szekció nyitása / zárása
    const chkMeta = document.getElementById("chkLogMetabolic");
    const metaWrap = document.getElementById("metabolicFieldsWrap");
    if (chkMeta && metaWrap) {
      chkMeta.checked = Boolean(checkinDraft.metabolicLogged);
      metaWrap.classList.toggle("hidden", !checkinDraft.metabolicLogged);
    }

    // Kiegészítő tünet számláló
    const extraPill = document.getElementById("extraSymCountPill");
    if (extraPill) {
      extraPill.textContent = `${selectedSymptomSet.size} kijelölve`;
    }
  }

  function renderSymptomLogger(prefillDate = null) {
    const dateInput = document.getElementById("symDate");
    const targetDate = prefillDate || dateInput.value || getTodayKey();
    dateInput.value = targetDate;

    const cyc = getCycleStatusForDate(targetDate);
    const endo = state.profile.selectedEndocrine || [];
    const lib = DATA.SYMPTOM_LIBRARY[cyc.phase] || DATA.SYMPTOM_LIBRARY.follicular;

    // Ciklus kontextus jelvény
    const ctxPill = document.getElementById("symCycleContextPill");
    if (ctxPill) {
      ctxPill.textContent =
        state.mode === "pregnancy"
          ? `Várandósság • ${getPregnancyStatus().week}. hét`
          : `${cyc.cycleDay}. ciklusnap • ${cyc.phaseInfo.name}`;
    }

    // Ha dátumot váltottunk vagy első betöltés: töltsük be a meglévő napot
    const existing = state.symptomLogs.find((l) => l.date === targetDate);
    if (prefillDate !== null || !dateInput.dataset.loadedDate || dateInput.dataset.loadedDate !== targetDate) {
      dateInput.dataset.loadedDate = targetDate;
      hydrateDraftFromEntry(existing);
      selectedSymptomSet = new Set(existing?.symptoms || []);
      document.getElementById("symBbt").value = existing?.bbt ?? "";
      document.getElementById("symIntensity").value = String(existing?.intensity || 2);
      document.getElementById("symNote").value = existing?.note || "";
      document.getElementById("symCustom").value = "";
    }

    const dailyPill = document.getElementById("dailyCompletionPill");
    if (dailyPill) {
      if (existing?.dailyCheckin) {
        dailyPill.className = "pill pill-sage";
        dailyPill.textContent = "✓ Ehhez a naphoz már mentve";
      } else {
        dailyPill.className = "pill pill-neutral";
        dailyPill.textContent = "Egykattintásos rögzítés (~30 mp)";
      }
    }

    // 2. Ciklus- és termékenységi biomarkerek fázis-specifikus láthatósága
    const isTTC = state.mode === "ttc";
    const isPreMenstrualOrPeriod = cyc.phase === "menstruation" || (cyc.phase === "luteal" && cyc.daysUntilNextPeriod <= 5);
    const isFertileOrFollicular = cyc.phase === "follicular" || cyc.phase === "ovulation";

    const showBleeding = showAllBiomarkers || isTTC || isPreMenstrualOrPeriod || (checkinDraft.bleeding && checkinDraft.bleeding !== "none");
    const showMucus = showAllBiomarkers || isTTC || isFertileOrFollicular || Boolean(checkinDraft.cervicalMucus);
    const showPain = showAllBiomarkers || isTTC || cyc.phase === "menstruation" || cyc.phase === "ovulation" || cyc.phase === "luteal" || (checkinDraft.pelvicPain && checkinDraft.pelvicPain !== "none");

    document.getElementById("qBleedingWrap")?.classList.toggle("hidden", !showBleeding);
    document.getElementById("qMucusWrap")?.classList.toggle("hidden", !showMucus);
    document.getElementById("qPelvicPainWrap")?.classList.toggle("hidden", !showPain);

    const bioBanner = document.getElementById("biomarkerContextBanner");
    if (bioBanner) {
      bioBanner.classList.toggle("is-ttc", isTTC);
      if (isTTC) {
        bioBanner.innerHTML = `<strong>Babatervező mód aktív:</strong> mindhárom termékenységi biomarker (vérzés/pecsételés, méhnyaknyák, kismedencei diszkomfort) megjelenik a pontos ovuláció- és sárgatest-követésért.`;
      } else if (showAllBiomarkers) {
        bioBanner.innerHTML = `<strong>Összes biomarker megjelenítve</strong> (aktuális fázis: ${escapeHtml(cyc.phaseInfo.name)}, ${cyc.cycleDay}. ciklusnap).`;
      } else {
        const activeNames = [];
        if (showBleeding) activeNames.push("vérzés/pecsételés");
        if (showMucus) activeNames.push("méhnyaknyák");
        if (showPain) activeNames.push("alhasi fájdalom/feszülés");
        bioBanner.innerHTML = `<strong>Fázis-specifikus szűrés (${escapeHtml(cyc.phaseInfo.name)}, ${cyc.cycleDay}. nap):</strong> jelenleg a <em>${activeNames.join(", ")}</em> kérdés(ek) aktívak. Babatervező módban vagy az „Összes mutatása” gombbal minden kérdés látható.`;
      }
    }

    const btnToggleAllBio = document.getElementById("btnToggleAllBiomarkers");
    if (btnToggleAllBio) {
      btnToggleAllBio.textContent = showAllBiomarkers ? "Csak fázis-specifikusak" : "Összes mutatása";
    }

    // 3. Heti metabolikus esedékességi jelvény
    const stats = computeSelfManagementStats();
    const metaDueEl = document.getElementById("metabolicDueBadge");
    if (metaDueEl) {
      if (stats.daysSinceMetabolic === null) {
        metaDueEl.className = "pill pill-peach";
        metaDueEl.textContent = "Még nem rögzítve – ajánlott";
      } else if (stats.daysSinceMetabolic >= 4) {
        metaDueEl.className = "pill";
        metaDueEl.textContent = `Heti ellenőrzés ajánlott (${stats.daysSinceMetabolic} napja)`;
      } else {
        metaDueEl.className = "pill pill-sage";
        metaDueEl.textContent = stats.daysSinceMetabolic === 0 ? "Ma rögzítve ✓" : `Friss (${stats.daysSinceMetabolic} napja rögzítve)`;
      }
    }

    // Kiegészítő fázis + betegségspecifikus chipek
    const priorityList = [];
    endo.forEach((k) => {
      (lib[k] || []).forEach((s) => {
        if (!priorityList.includes(s)) priorityList.push(s);
      });
    });
    const generalList = (lib.general || []).filter((s) => !priorityList.includes(s));

    const endoNames = endo.map((k) => DATA.ENDOCRINE_PROFILES[k]?.shortName.split(" / ")[0]).filter(Boolean);
    document.getElementById("prioritySymptomLabel").textContent =
      `Kiemelt tünetek: ${cyc.phaseInfo.name} (${cyc.cycleDay}. nap)` +
      (endoNames.length ? ` + ${endoNames.join(", ")}` : "");

    const renderChips = (items) =>
      items
        .map(
          (sym) => `
          <button type="button" class="sym-chip-btn ${selectedSymptomSet.has(sym) ? "selected" : ""}" data-sym-toggle="${escapeHtml(sym)}">
            ${escapeHtml(sym)}
          </button>
        `
        )
        .join("");

    document.getElementById("prioritySymptomChips").innerHTML =
      priorityList.length > 0
        ? renderChips(priorityList)
        : `<span class="form-help">Válassz a fázisra jellemző általános tünetek közül alább.</span>`;
    document.getElementById("generalSymptomChips").innerHTML = renderChips(generalList);

    syncCheckinControlsToDom();
    renderVisitPrep();

    // Naplótörténet (gazdag önmenedzsment-címkékkel)
    const histEl = document.getElementById("symptomHistoryList");
    const sortedLogs = [...state.symptomLogs].sort((a, b) => b.date.localeCompare(a.date));
    if (sortedLogs.length === 0) {
      histEl.innerHTML = `<div class="empty-state">Még nincs naplózott gyorsteszt vagy tünet.</div>`;
    } else {
      const M = DATA.SELF_MANAGEMENT_META;
      histEl.innerHTML = sortedLogs
        .map((l) => {
          const pInfo = PHASE_INFO[l.phase] || PHASE_INFO.follicular;
          const dc = l.dailyCheckin;
          const pills = [];
          if (dc) {
            pills.push(`<span class="pill ${dc.medRule === "yes" ? "pill-sage" : dc.medRule === "no" ? "" : "pill-peach"}">Gyógyszer: ${escapeHtml(dc.medRule === "yes" ? "OK" : dc.medRule === "no" ? "Kimaradt" : "Később")}</span>`);
            pills.push(`<span class="pill pill-neutral">Energia: ${dc.energy}/5</span>`);
            pills.push(`<span class="pill pill-neutral">Hangulat: ${dc.mood}/5</span>`);
            pills.push(`<span class="pill pill-neutral">Alvás: ${String(dc.sleepHours).replace(".", ",")}ó (${escapeHtml(M.sleepQuality[dc.sleepQuality] || "")})</span>`);
            if (dc.brainFog) pills.push(`<span class="pill">Agyköd</span>`);
          }
          if (l.bleeding && l.bleeding !== "none") pills.push(`<span class="pill">Vérzés: ${escapeHtml(M.bleeding[l.bleeding] || l.bleeding)}</span>`);
          if (l.cervicalMucus) pills.push(`<span class="pill pill-sage">Nyák: ${escapeHtml(M.cervicalMucus[l.cervicalMucus] || l.cervicalMucus)}</span>`);
          if (l.pelvicPain && l.pelvicPain !== "none") pills.push(`<span class="pill pill-peach">Fájdalom: ${escapeHtml(M.pelvicPain[l.pelvicPain] || l.pelvicPain)}</span>`);
          if (l.metabolicLogged && l.metabolic) {
            const flags = [];
            if (l.metabolic.reactiveHypo) flags.push("Hipoglikémia/cukoréhség");
            if (l.metabolic.bloatingConstipation) flags.push("Puffadás/székrekedés");
            if (l.metabolic.coldEdema) flags.push("Fázékonyság/ödéma");
            if (l.metabolic.skinHairTrend === "increased") flags.push("Erősödő bőr/hajtünet");
            pills.push(`<span class="pill ${flags.length ? "" : "pill-sage"}">Heti szűrés: ${flags.length ? escapeHtml(flags.join(", ")) : "Rendben"}</span>`);
          }
          if (l.bbt) pills.push(`<span class="pill pill-sage">BBT: ${Number(l.bbt).toFixed(2)} °C</span>`);
          return `
            <div class="symptom-log-card" data-load-sym-date="${escapeHtml(l.date)}">
              <div class="symptom-log-top">
                <strong>${escapeHtml(formatHuDate(l.date))} (${l.cycleDay || "—"}. nap)</strong>
                <span class="pill pill-neutral">${escapeHtml(pInfo.name)}</span>
              </div>
              <div class="chips-row" style="margin-bottom:0.3rem;">
                ${pills.join("")}
              </div>
              ${l.note ? `<div class="entity-subtitle">${escapeHtml(l.note)}</div>` : ""}
            </div>
          `;
        })
        .join("");
    }
  }

  function renderVisitPrep() {
    const vp = state.visitPrep || {};
    const stats = computeSelfManagementStats();

    const dateEl = document.getElementById("vpVisitDate");
    if (dateEl) dateEl.value = vp.nextVisitDate || "";
    const typeEl = document.getElementById("vpVisitType");
    if (typeEl) typeEl.value = vp.visitType || "Endokrinológiai és nőgyógyászati kontroll";
    const missedSel = document.getElementById("vpMissedChoice");
    if (missedSel) missedSel.value = vp.missedDosesChoice || "none";
    const missedCnt = document.getElementById("vpMissedCount");
    if (missedCnt) missedCnt.value = String(vp.missedDosesCount ?? 0);
    const wType = document.getElementById("vpWeightType");
    if (wType) wType.value = vp.weightChangeType || "none";
    const wDelta = document.getElementById("vpWeightDelta");
    if (wDelta) wDelta.value = vp.weightChangeKg ? String(vp.weightChangeKg) : "";
    const wCurr = document.getElementById("vpCurrentWeight");
    if (wCurr) wCurr.value = vp.currentWeightKg ? String(vp.currentWeightKg) : "";
    const qEl = document.getElementById("vpQuestions");
    if (qEl) qEl.value = vp.consultationQuestions || "";

    // Visszaszámláló sáv (egy héttel a kontroll előtt aktív összegzés)
    const banner = document.getElementById("visitCountdownBanner");
    if (banner) {
      banner.classList.toggle("is-soon", stats.isVisitSoon);
      if (stats.isVisitSoon) {
        const dayStr = stats.daysUntilVisit === 0 ? "MA esedékes" : `${stats.daysUntilVisit} nap múlva`;
        banner.innerHTML = `<strong><svg class="inline-ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Vizit előtti 7 napos felkészítő aktív!</strong> A következő <strong>${escapeHtml(vp.visitType || "kontroll")}</strong> időpontja: <strong>${escapeHtml(formatHuDate(vp.nextVisitDate))}</strong> (${dayStr}). A kitöltött válaszok közvetlenül az Orvosi PDF tetejére kerülnek.`;
      } else if (vp.nextVisitDate && stats.daysUntilVisit > 7) {
        banner.innerHTML = `Következő beállított kontroll: <strong>${escapeHtml(formatHuDate(vp.nextVisitDate))}</strong> (${stats.daysUntilVisit} nap múlva). A vizit előtt 7 nappal a Spera kiemelt felkészítő értesítést ad.`;
      } else {
        banner.innerHTML = `Állítsd be a következő endokrinológiai vagy nőgyógyászati kontroll dátumát, hogy az app egy héttel előtte automatikusan összefoglalja az elmúlt 30 nap adatait.`;
      }
    }

    // 30 napos gyógyszer-adherence mutató doboz
    const adhBox = document.getElementById("adherenceSummaryBox");
    if (adhBox) {
      adhBox.innerHTML = `
        <div class="adherence-top">
          <span class="stat-label" style="margin:0;">Összesített 30 napos gyógyszer-adherence</span>
          <strong>${stats.adherencePct}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${stats.adherencePct}%"></div>
        </div>
        <div class="adherence-sub">
          Napi gyorstesztek (elmúlt 30 nap): <strong>${stats.medYesDays} szabályos</strong>, ${stats.medLaterDays} későbbi/eltérő, ${stats.medNoDays} kihagyott • 30 napos önbevallás: <strong>${stats.reportedMissed} kihagyás</strong>.
        </div>
      `;
    }
  }

  // ------------------------------------------------------------------------
  // 4. Elemzések & 100% Offline Interaktív SVG Grafikonok
  // ------------------------------------------------------------------------
  function renderAnalytics() {
    renderSelfManagementAnalytics();
    renderBiomarkerFilterBar();
    renderLabChart();
    renderCycleTrendChart();
    renderBbtSymptomChart();
  }

  function renderSelfManagementAnalytics() {
    const el = document.getElementById("selfMgmtAnalyticsCard");
    if (!el) return;
    const stats = computeSelfManagementStats();
    const M = DATA.SELF_MANAGEMENT_META;
    const microFlags = [];
    if (stats.reactiveHypoCount > 0) microFlags.push(`Reaktív hipoglikémia/cukoréhség: ${stats.reactiveHypoCount}×`);
    if (stats.bloatingCount > 0) microFlags.push(`Puffadás/székrekedés: ${stats.bloatingCount}×`);
    if (stats.coldEdemaCount > 0) microFlags.push(`Fázékonyság/ödéma: ${stats.coldEdemaCount}×`);
    if (stats.latestSkinHair) microFlags.push(`Bőr/haj trend: ${M.skinHairTrend[stats.latestSkinHair]}`);

    el.innerHTML = `
      <div class="chart-header" style="margin-bottom:0.25rem;">
        <div>
          <h3 class="card-title">Önmenedzsment mintázatok (elmúlt 30 nap)</h3>
          <p class="card-subtitle">A 30 másodperces Napi gyorstesztek és a heti metabolikus szűrések összesített orvosi indikátorai.</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-jump-tab="symptoms">Új napi check-in &rarr;</button>
      </div>
      <div class="self-mgmt-kpi-grid">
        <div class="self-mgmt-kpi">
          <div class="self-mgmt-kpi-label">Gyógyszer-adherence (30 nap)</div>
          <div class="self-mgmt-kpi-val" style="color:var(--sage-dark);">${stats.adherencePct}%</div>
          <div class="self-mgmt-kpi-sub">${stats.effectiveMissed} becsült kihagyás / 30 nap</div>
        </div>
        <div class="self-mgmt-kpi">
          <div class="self-mgmt-kpi-label">Átlagos energiaszint</div>
          <div class="self-mgmt-kpi-val">${stats.avgEnergy ? `${stats.avgEnergy} / 5` : "—"}</div>
          <div class="self-mgmt-kpi-sub">${stats.totalDaysLogged} naplózott check-in alapján</div>
        </div>
        <div class="self-mgmt-kpi">
          <div class="self-mgmt-kpi-label">„Agyköd” előfordulás</div>
          <div class="self-mgmt-kpi-val" style="color:${stats.brainFogCount >= 3 ? "var(--coral-hover)" : "var(--text-main)"};">${stats.brainFogCount} nap</div>
          <div class="self-mgmt-kpi-sub">Pajzsmirigy / IR korrelációs jelző</div>
        </div>
        <div class="self-mgmt-kpi">
          <div class="self-mgmt-kpi-label">Alvás &amp; kortizolritmus</div>
          <div class="self-mgmt-kpi-val">${stats.avgSleep ? `${String(stats.avgSleep).replace(".", ",")} óra` : "—"}</div>
          <div class="self-mgmt-kpi-sub">${stats.restfulPct !== null ? `${stats.restfulPct}% pihentető ébredés` : "Nincs adat"}</div>
        </div>
        <div class="self-mgmt-kpi">
          <div class="self-mgmt-kpi-label">Átlagos hangulat</div>
          <div class="self-mgmt-kpi-val">${stats.avgMood ? `${stats.avgMood} / 5` : "—"}</div>
          <div class="self-mgmt-kpi-sub">Hormonális / PMS stabilitás</div>
        </div>
      </div>
      <div class="form-help" style="margin-top:0.75rem;">
        <strong>Heti metabolikus &amp; hormonális mikrotünetek (${stats.metabolicChecksCount} szűrés):</strong>
        ${microFlags.length ? escapeHtml(microFlags.join(" • ")) : "Még nincs rögzített metabolikus/hormonális jelzés."}
      </div>
    `;
  }

  function renderBiomarkerFilterBar() {
    const bar = document.getElementById("biomarkerFilterBar");
    bar.innerHTML = Object.values(DATA.BIOMARKERS)
      .map(
        (b) => `
        <button type="button" class="pill-btn ${b.key === selectedBiomarker ? "active" : ""}" data-select-bio="${b.key}">
          ${escapeHtml(b.name)}
        </button>
      `
      )
      .join("");
  }

  function renderLabChart() {
    const bio = DATA.BIOMARKERS[selectedBiomarker] || DATA.BIOMARKERS.tsh;
    document.getElementById("labChartHint").textContent =
      `${bio.fullName} (${bio.unit}) • ${bio.cycleHint}`;

    const rows = state.labResults
      .filter((r) => r.biomarker === bio.key)
      .sort((a, b) => a.date.localeCompare(b.date));

    const wrap = document.getElementById("labChartContainer");
    if (rows.length === 0) {
      wrap.innerHTML = `<div class="empty-state">Ehhez a biomarkerhez (${escapeHtml(bio.name)}) még nincs rögzített mérés. Kattints a „+ Új laboreredmény” gombra!</div>`;
    } else {
      const W = 740, H = 260, padL = 56, padR = 26, padT = 26, padB = 42;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const vals = rows.map((r) => Number(r.value));
      const minY = Math.max(0, Math.min(...vals, bio.normalMin, bio.optimalMin) * 0.8);
      const maxY = Math.max(...vals, bio.normalMax, bio.optimalMax) * 1.15;
      const yPos = (v) => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;
      const xPos = (idx) => (rows.length === 1 ? padL + plotW / 2 : padL + (idx / (rows.length - 1)) * plotW);

      const normTop = yPos(Math.min(maxY, bio.normalMax));
      const normBot = yPos(Math.max(minY, bio.normalMin));
      const optTop = yPos(Math.min(maxY, bio.optimalMax));
      const optBot = yPos(Math.max(minY, bio.optimalMin));

      const polyPoints = rows.map((r, i) => `${xPos(i).toFixed(1)},${yPos(r.value).toFixed(1)}`).join(" ");

      const yTicks = 4;
      let gridSvg = "";
      for (let i = 0; i <= yTicks; i++) {
        const v = minY + ((maxY - minY) * i) / yTicks;
        const y = yPos(v);
        gridSvg += `
          <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EAE0D9" stroke-dasharray="3,3"/>
          <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#8C7C75">${v.toFixed(v < 10 ? 1 : 0)}</text>
        `;
      }

      const dotsSvg = rows
        .map((r, i) => {
          const cx = xPos(i);
          const cy = yPos(r.value);
          const inOpt = r.value >= bio.optimalMin && r.value <= bio.optimalMax;
          const fill = inOpt ? "#5E8A73" : "#C86D51";
          return `
            <g>
              <circle cx="${cx}" cy="${cy}" r="6.5" fill="${fill}" stroke="#FFFFFF" stroke-width="2.5">
                <title>${escapeHtml(formatHuDate(r.date))}: ${r.value} ${escapeHtml(bio.unit)} ${r.note ? `(${escapeHtml(r.note)})` : ""}</title>
              </circle>
              <text x="${cx}" y="${cy - 11}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#2F2925">${r.value}</text>
              <text x="${cx}" y="${H - 16}" text-anchor="middle" font-size="10.5" fill="#6B6059">${escapeHtml(r.date.slice(2))}</text>
            </g>
          `;
        })
        .join("");

      wrap.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(bio.name)} laboreredmény grafikon">
          <!-- Normál referencia sáv -->
          <rect x="${padL}" y="${normTop}" width="${plotW}" height="${Math.max(2, normBot - normTop)}" fill="#E8C3A3" opacity="0.24"/>
          <!-- Optimális / babatervezési célsáv -->
          <rect x="${padL}" y="${optTop}" width="${plotW}" height="${Math.max(2, optBot - optTop)}" fill="#7DA690" opacity="0.30"/>
          ${gridSvg}
          <polyline fill="none" stroke="#C86D51" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyPoints}"/>
          ${dotsSvg}
          <!-- Jelmagyarázat -->
          <g transform="translate(${padL}, 12)">
            <rect x="0" y="-8" width="12" height="10" rx="2" fill="#E8C3A3" opacity="0.55"/>
            <text x="17" y="1" font-size="10.5" fill="#6B6059">Normál sáv (${bio.normalMin}–${bio.normalMax} ${escapeHtml(bio.unit)})</text>
            <rect x="195" y="-8" width="12" height="10" rx="2" fill="#7DA690" opacity="0.6"/>
            <text x="212" y="1" font-size="10.5" fill="#345646" font-weight="700">${escapeHtml(bio.optimalLabel)}</text>
          </g>
        </svg>
      `;
    }

    // Legutóbbi értékek összefoglaló mini táblázat
    const latestRows = Object.values(DATA.BIOMARKERS)
      .map((b) => {
        const list = state.labResults.filter((r) => r.biomarker === b.key).sort((a, b2) => b2.date.localeCompare(a.date));
        return { bio: b, latest: list[0] || null };
      })
      .filter((x) => x.latest);

    document.getElementById("labLatestTable").innerHTML =
      latestRows.length === 0
        ? ""
        : `
          <table class="data-table">
            <thead>
              <tr><th>Biomarker</th><th>Legutóbbi érték</th><th>Dátum</th><th>Státusz</th><th>Megjegyzés</th></tr>
            </thead>
            <tbody>
              ${latestRows
                .map(({ bio: b, latest }) => {
                  const inOpt = latest.value >= b.optimalMin && latest.value <= b.optimalMax;
                  const inNorm = latest.value >= b.normalMin && latest.value <= b.normalMax;
                  const badge = inOpt
                    ? `<span class="pill pill-sage">Optimális célon belül</span>`
                    : inNorm
                    ? `<span class="pill pill-peach">Normál, nem optimális</span>`
                    : `<span class="pill">Eltérés – kontroll javasolt</span>`;
                  return `
                    <tr>
                      <td><strong>${escapeHtml(b.name)}</strong></td>
                      <td><strong>${latest.value} ${escapeHtml(b.unit)}</strong></td>
                      <td>${escapeHtml(formatHuDate(latest.date))}</td>
                      <td>${badge}</td>
                      <td>${escapeHtml(latest.note || "—")}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        `;
  }

  function renderCycleTrendChart() {
    const hist = state.cycleHistory || [];
    const wrap = document.getElementById("cycleChartContainer");
    const summaryEl = document.getElementById("cycleTrendSummary");

    if (hist.length === 0) {
      summaryEl.textContent = "Még nincs rögzített korábbi ciklus.";
      wrap.innerHTML = `<div class="empty-state">Rögzíts ciklushosszokat a trendelemzéshez és az okos ciklushossz-javaslathoz!</div>`;
      return;
    }

    const avg = (hist.reduce((s, x) => s + Number(x.length), 0) / hist.length).toFixed(1);
    summaryEl.textContent = `Átlagos ciklushossz: ${avg} nap • Normál referencia-tartomány: 21–35 nap`;

    const W = 480, H = 246, padL = 42, padR = 18, padT = 30, padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const minY = 18;
    const maxY = Math.max(42, ...hist.map((h) => Number(h.length) + 4));
    const yPos = (v) => padT + plotH - ((v - minY) / (maxY - minY)) * plotH;

    const refTop = yPos(35);
    const refBot = yPos(21);
    const avgY = yPos(Number(avg));
    const slotW = plotW / hist.length;
    const barW = Math.min(38, slotW * 0.56);

    const barsSvg = hist
      .map((item, idx) => {
        const cx = padL + slotW * idx + slotW / 2;
        const top = yPos(item.length);
        const h = padT + plotH - top;
        const isLong = item.length > 35 || item.length < 21;
        const color = isLong ? "#C86D51" : item.length >= 33 ? "#D9A87E" : "#7DA690";
        return `
          <g>
            <rect x="${(cx - barW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(4, h).toFixed(1)}" rx="6" fill="${color}"/>
            <text x="${cx}" y="${top - 6}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#2F2925">${item.length}</text>
            <text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="10.5" fill="#6B6059">${escapeHtml(item.label)}</text>
          </g>
        `;
      })
      .join("");

    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Havi ciklushossz trend">
        <g transform="translate(${padL}, 13)">
          <rect x="0" y="-8" width="12" height="10" rx="2" fill="#7DA690" opacity="0.35"/>
          <text x="17" y="1" font-size="10.5" fill="#345646" font-weight="700">Normál tartomány (21–35 nap)</text>
          <line x1="205" y1="-3" x2="225" y2="-3" stroke="#C86D51" stroke-width="2" stroke-dasharray="4,3"/>
          <text x="231" y="1" font-size="10.5" fill="#AE573D" font-weight="700">Átlag: ${avg} nap</text>
        </g>
        <rect x="${padL}" y="${refTop}" width="${plotW}" height="${refBot - refTop}" fill="#7DA690" opacity="0.18"/>
        <line x1="${padL}" y1="${avgY}" x2="${W - padR}" y2="${avgY}" stroke="#C86D51" stroke-width="1.8" stroke-dasharray="5,4"/>
        ${barsSvg}
      </svg>
    `;
  }

  function renderBbtSymptomChart() {
    const wrap = document.getElementById("bbtChartContainer");
    const logs = [...state.symptomLogs]
      .filter((l) => l.bbt || l.intensity)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    if (logs.length < 2) {
      wrap.innerHTML = `<div class="empty-state">Legalább 2 napi tünet- vagy alaphőmérséklet (BBT) bejegyzés szükséges a korrelációs görbéhez.</div>`;
      return;
    }

    const W = 480, H = 240, padL = 46, padR = 24, padT = 24, padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const minT = 36.0, maxT = 36.8;
    const yTemp = (t) => padT + plotH - ((Math.min(maxT, Math.max(minT, t)) - minT) / (maxT - minT)) * plotH;
    const xPos = (i) => padL + (i / (logs.length - 1)) * plotW;

    // Tünetintenzitás oszlopok (alulról fel, fázisszínnel)
    const bars = logs
      .map((l, i) => {
        const x = xPos(i);
        const h = ((Number(l.intensity) || 0) / 3) * (plotH * 0.42);
        const pColor = (PHASE_INFO[l.phase] || PHASE_INFO.follicular).color;
        return `<rect x="${(x - 8).toFixed(1)}" y="${(padT + plotH - h).toFixed(1)}" width="16" height="${h.toFixed(1)}" rx="4" fill="${pColor}" opacity="0.32"/>`;
      })
      .join("");

    // BBT vonal
    const bbtPts = logs
      .map((l, i) => (l.bbt ? { x: xPos(i), y: yTemp(Number(l.bbt)), val: Number(l.bbt), day: l.cycleDay || i + 1 } : null))
      .filter(Boolean);

    const lineStr = bbtPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const dots = bbtPts
      .map(
        (p) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#C86D51" stroke="#FFFFFF" stroke-width="2">
          <title>${p.day}. nap – BBT: ${p.val.toFixed(2)} °C</title>
        </circle>
      `
      )
      .join("");

    const xLabels = logs
      .map((l, i) => `<text x="${xPos(i)}" y="${H - 14}" text-anchor="middle" font-size="10" fill="#6B6059">${l.cycleDay || i + 1}.n</text>`)
      .join("");

    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="BBT és tünetintenzitás görbe">
        <line x1="${padL}" y1="${yTemp(36.2)}" x2="${W - padR}" y2="${yTemp(36.2)}" stroke="#E8DFD7" stroke-dasharray="3,3"/>
        <text x="${padL - 6}" y="${yTemp(36.2) + 4}" text-anchor="end" font-size="10" fill="#8D8179">36.2°</text>
        <line x1="${padL}" y1="${yTemp(36.5)}" x2="${W - padR}" y2="${yTemp(36.5)}" stroke="#E8DFD7" stroke-dasharray="3,3"/>
        <text x="${padL - 6}" y="${yTemp(36.5) + 4}" text-anchor="end" font-size="10" fill="#8D8179">36.5°</text>
        ${bars}
        ${bbtPts.length >= 2 ? `<polyline fill="none" stroke="#C86D51" stroke-width="2.6" points="${lineStr}"/>` : ""}
        ${dots}
        ${xLabels}
        <g transform="translate(${padL}, 12)">
          <circle cx="5" cy="-3" r="4" fill="#C86D51"/>
          <text x="14" y="1" font-size="10.5" fill="#2F2925" font-weight="700">Alaphőmérséklet (BBT °C)</text>
          <rect x="175" y="-8" width="11" height="10" rx="2" fill="#7DA690" opacity="0.45"/>
          <text x="191" y="1" font-size="10.5" fill="#6B6059">Tünetintenzitás (fázis szerint)</text>
        </g>
      </svg>
    `;
  }

  // ------------------------------------------------------------------------
  // 5. Étrend- és Vitaminajánló
  // ------------------------------------------------------------------------
  function renderNutrition() {
    const cyc = getCycleStatusForDate(getTodayKey());
    const activePhase = selectedNutritionPhase || (state.mode === "pregnancy" ? "pregnancy" : cyc.phase);

    document.querySelectorAll("[data-nutr-phase]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nutrPhase === activePhase);
    });

    const guide = DATA.NUTRITION_GUIDE[activePhase] || DATA.NUTRITION_GUIDE.follicular;
    document.getElementById("nutritionContent").innerHTML = `
      <div class="nutrition-banner">
        <h3>${escapeHtml(guide.title)}</h3>
        <p>${escapeHtml(guide.focus)}</p>
      </div>
      <div class="cards-grid">
        ${guide.items
          .map(
            (item) => `
            <article class="entity-card">
              <h4 class="entity-title">${escapeHtml(item.name)}</h4>
              <div class="chips-row">
                ${item.tags.map((t) => `<span class="pill pill-sage">${escapeHtml(t)}</span>`).join("")}
              </div>
              <p style="margin:0; font-size:0.9rem;">${escapeHtml(item.why)}</p>
              <div class="entity-meta-list">
                <div><strong>Ajánlott időzítés:</strong> ${escapeHtml(item.timing)}</div>
              </div>
            </article>
          `
          )
          .join("")}
      </div>
      <div class="card" style="margin-top:1rem;">
        <h4 class="card-title">Gyakorlati étrendi tippek erre az időszakra</h4>
        <ul style="margin:0.5rem 0 0; padding-left:1.25rem; color:var(--text-muted);">
          ${guide.dietTips.map((t) => `<li style="margin-bottom:0.3rem;">${escapeHtml(t)}</li>`).join("")}
        </ul>
      </div>
    `;

    const activeIds = new Set(getActiveInteractions().map((r) => r.id));
    document.getElementById("nutritionInteractionsList").innerHTML = DATA.INTERACTION_RULES.map((rule) => {
      const matched = activeIds.has(rule.id);
      return `
        <div class="interaction-banner ${matched ? "sev-high" : ""}">
          <strong>${matched ? "&#9888; Aktív a gyógyszereid alapján: " : ""}${escapeHtml(rule.title)}</strong>
          <span>${escapeHtml(rule.message)}</span>
        </div>
      `;
    }).join("");
  }

  // ------------------------------------------------------------------------
  // 6. Interaktív Betegúttérkép (Patient Journey Map)
  // ------------------------------------------------------------------------
  function renderJourneyMap() {
    const stepper = document.getElementById("journeyStepper");
    stepper.innerHTML = DATA.PATIENT_JOURNEY.map((j) => {
      const isActive = j.step === selectedJourneyStep;
      const isUser = j.step === (state.journeyStep || 1);
      return `
        <button type="button" class="journey-step-btn ${isActive ? "active" : ""} ${isUser ? "is-current-user" : ""}" data-journey-step="${j.step}">
          <span class="journey-num">${j.step}</span>
          <span class="journey-step-title">${escapeHtml(j.title)}</span>
          <span class="journey-step-sub">${escapeHtml(j.subtitle)}</span>
        </button>
      `;
    }).join("");

    const item = DATA.PATIENT_JOURNEY.find((j) => j.step === selectedJourneyStep) || DATA.PATIENT_JOURNEY[0];
    document.getElementById("journeyDetailBox").innerHTML = `
      <div class="card-header-inline">
        <div>
          <span class="pill">Betegút ${item.step}. állomás</span>
          <h3 class="card-title" style="margin-top:0.35rem; font-size:1.22rem;">${escapeHtml(item.title)}</h3>
          <p class="card-subtitle" style="margin-bottom:0;">${escapeHtml(item.subtitle)}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline btn-sm" id="btnMarkJourneyHere">
            ${state.journeyStep === item.step ? "&#10003; Jelenleg itt tartok" : "Jelölés: jelenleg itt tartok"}
          </button>
          <button type="button" class="btn btn-primary btn-sm" data-jump-tab="${item.actionTab}">
            ${escapeHtml(item.actionLabel)} &rarr;
          </button>
        </div>
      </div>
      <div class="journey-detail-grid">
        <div class="journey-pillar pillar-decision">
          <h4>Betegdöntési pont</h4>
          <p>${escapeHtml(item.decisionPoint)}</p>
        </div>
        <div class="journey-pillar pillar-bottleneck">
          <h4>Tipikus elakadás a rendszerben</h4>
          <p>${escapeHtml(item.bottleneck)}</p>
        </div>
        <div class="journey-pillar pillar-support">
          <h4>Spera prevenciós támogatása</h4>
          <p>${escapeHtml(item.speraSupport)}</p>
        </div>
      </div>
    `;

    document.getElementById("btnMarkJourneyHere").addEventListener("click", () => {
      state.journeyStep = item.step;
      saveState();
      renderJourneyMap();
      showToast(`Betegút pozíció frissítve: ${item.step}. állomás.`);
    });
  }

  // ------------------------------------------------------------------------
  // 7. Egykattintásos Orvosi Összefoglaló (Állapotlap + Kontroll-konzultáció)
  // ------------------------------------------------------------------------
  function renderMedicalSummary() {
    const p = state.profile;
    const vp = state.visitPrep || {};
    const stats = computeSelfManagementStats();
    const M = DATA.SELF_MANAGEMENT_META;
    const cyc = getCycleStatusForDate(getTodayKey());
    const preg = getPregnancyStatus();
    const allergies = p.allergies || [];
    const activeConds = state.conditions.filter((c) => c.active);
    const activeMeds = state.medications.filter((m) => m.active);
    const todayDoses = getTodayDoses();
    const takenToday = todayDoses.filter((d) => d.log?.status === "taken").length;

    const latestLabs = Object.values(DATA.BIOMARKERS)
      .map((b) => {
        const list = state.labResults.filter((r) => r.biomarker === b.key).sort((a, b2) => b2.date.localeCompare(a.date));
        return list[0] ? { bio: b, item: list[0] } : null;
      })
      .filter(Boolean);

    const recentSyms = [...state.symptomLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

    // Testsúlyváltozás formázása
    let weightStr = "Nincs váratlan változás";
    if (vp.weightChangeType === "gain" && vp.weightChangeKg) {
      weightStr = `+${String(vp.weightChangeKg).replace(".", ",")} kg`;
    } else if (vp.weightChangeType === "loss" && vp.weightChangeKg) {
      weightStr = `−${String(vp.weightChangeKg).replace(".", ",")} kg`;
    }
    if (vp.currentWeightKg) {
      weightStr += ` (aktuális: ${String(vp.currentWeightKg).replace(".", ",")} kg)`;
    }

    // 30 napos önmenedzsment mintázatok összefoglalása az orvosnak
    const patternParts = [];
    if (stats.avgEnergy) patternParts.push(`Átlag energia: ${stats.avgEnergy}/5`);
    if (stats.avgMood) patternParts.push(`Hangulat: ${stats.avgMood}/5`);
    if (stats.avgSleep) patternParts.push(`Alvás: ${String(stats.avgSleep).replace(".", ",")} óra (${stats.restfulPct}% pihentető)`);
    patternParts.push(`Agyköd: ${stats.brainFogCount} nap`);
    if (stats.reactiveHypoCount) patternParts.push(`Reaktív hipoglikémia/cukoréhség: ${stats.reactiveHypoCount}×`);
    if (stats.bloatingCount) patternParts.push(`Haspuffadás/székrekedés: ${stats.bloatingCount}×`);
    if (stats.coldEdemaCount) patternParts.push(`Fázékonyság/ödéma: ${stats.coldEdemaCount}×`);
    if (stats.latestSkinHair) patternParts.push(`Bőr/hajtünet: ${M.skinHairTrend[stats.latestSkinHair]}`);
    if (stats.eggWhiteDays) patternParts.push(`Tojásfehérje nyák: ${stats.eggWhiteDays} nap`);
    if (stats.sharpPainDays) patternParts.push(`Egyoldali ovulációs szúrás: ${stats.sharpPainDays} nap`);
    if (stats.spottingDays) patternParts.push(`Pecsételés: ${stats.spottingDays} nap`);
    if (stats.clotDays) patternParts.push(`Rögös vérzés: ${stats.clotDays} nap`);

    const consultText = (vp.consultationQuestions || p.doctorNotes || "").trim();

    document.getElementById("medicalSummarySheet").innerHTML = `
      <header class="sheet-header">
        <div>
          <div class="sheet-brand-row">
            <span class="sheet-brand-emblem" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="22" height="22" fill="none">
                <path d="M11.5 17.5C14.5 7.5 29.5 6.5 36.2 14.8C41.2 21 39.5 30.8 32.8 35.8" stroke="#C86D51" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M36.5 30.5C33.5 40.5 18.5 41.5 11.8 33.2C6.8 27 8.5 17.2 15.2 12.2" stroke="#7DA690" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M23.8 32.4C18.6 31.8 18.2 25.4 22.6 20.4C24.2 18.5 25.8 16.8 27.6 15.2C28.6 18.6 28.8 24.2 27 28.4C25.8 31 24.2 32.4 22.8 32.4C21.8 32.4 22.2 29.5 23.8 27.2" stroke="#456B58" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="23.8" cy="25.8" r="2.2" fill="#C86D51"/>
              </svg>
            </span>
            <div class="sheet-eyebrow">Spera • Nőgyógyászati-Endokrinológiai Orvosi Állapotlap</div>
          </div>
          <h3 class="sheet-patient-name">${escapeHtml(p.name || "Páciens neve nincs megadva")}</h3>
          <div class="sheet-patient-meta">
            <span><strong>Életkor:</strong> ${escapeHtml(p.age || "—")} év</span>
            <span><strong>Vércsoport:</strong> ${escapeHtml(p.bloodType || "Ismeretlen")}</span>
            <span><strong>Élethelyzet:</strong> ${escapeHtml(MODE_LABELS[state.mode])}</span>
            ${
              state.mode === "pregnancy"
                ? `<span><strong>Terhesség:</strong> ${preg.week}+${preg.extraDays} hét (EDD: ${escapeHtml(formatHuDate(preg.eddIso))})</span>`
                : `<span><strong>Ciklus:</strong> ${cyc.cycleDay}. nap (${escapeHtml(cyc.phaseInfo.name)}) • Átl. ${cyc.cycleLen} nap • LMP: ${escapeHtml(formatHuDate(p.lastPeriodStart))}</span>`
            }
          </div>
          ${
            p.emergencyPhone || p.emergencyName
              ? `<div class="sheet-patient-meta" style="margin-top:0.25rem;"><span><strong>Vészhelyzeti kapcsolat:</strong> ${escapeHtml(
                  [p.emergencyName, p.emergencyRelation ? `(${p.emergencyRelation})` : "", p.emergencyPhone].filter(Boolean).join(" ")
                )}</span></div>`
              : ""
          }
        </div>
        <div style="text-align:right; font-size:0.84rem; color:var(--text-muted);">
          <div><strong>Kiállítva:</strong> ${escapeHtml(new Date().toLocaleString("hu-HU"))}</div>
          <div>30 napos gyógyszer-adherence: <strong>${stats.adherencePct}%</strong></div>
          <div>Mai gyógyszerbevétel: <strong>${takenToday} / ${todayDoses.length}</strong></div>
        </div>
      </header>

      <section class="sheet-allergy-alert ${allergies.length === 0 ? "no-allergy" : ""}">
        <strong>${allergies.length > 0 ? "&#9888; ISMERT ALLERGIÁK ÉS ÉRZÉKENYSÉGEK:" : "&#10003; ALLERGIÁK:"}</strong>
        ${
          allergies.length === 0
            ? " Nincs ismert gyógyszer- vagy egyéb allergia."
            : `<ul style="margin:0.4rem 0 0; padding-left:1.25rem;">
                ${allergies
                  .map((a) => `<li><strong>${escapeHtml(a.name)}</strong> (${escapeHtml(SEVERITY_LABELS[a.severity] || "Közepes")})${a.reaction ? ` – ${escapeHtml(a.reaction)}` : ""}</li>`)
                  .join("")}
               </ul>`
        }
      </section>

      <!-- KIEMELT KONZULTÁCIÓS PONTOK A PDF TETEJÉN (4. Orvosi kontrollra felkészítőből) -->
      <section class="sheet-consultation-box">
        <div class="sheet-consultation-head">
          <h4><svg class="inline-ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>Konzultációs pontok és kontroll-előkészítő (elmúlt 30 nap)</h4>
          ${
            vp.nextVisitDate
              ? `<span class="pill pill-sage">${escapeHtml(vp.visitType || "Kontroll")}: ${escapeHtml(formatHuDate(vp.nextVisitDate))}</span>`
              : ""
          }
        </div>
        <div class="sheet-consultation-metrics">
          <span class="pill pill-sage"><strong>30 napos adherence:</strong> ${stats.adherencePct}% (${stats.effectiveMissed} kihagyás)</span>
          <span class="pill pill-peach"><strong>Havi testsúlyváltozás:</strong> ${escapeHtml(weightStr)}</span>
          <span class="pill pill-neutral"><strong>Naplózott napok:</strong> ${stats.totalDaysLogged} nap</span>
        </div>
        <div class="sheet-consultation-questions">
          <strong style="display:block; margin-bottom:0.25rem; color:var(--sage-dark);">Páciens kiemelt panaszai és kérdései a kezelőorvoshoz:</strong>
          ${escapeHtml(consultText || "Nincs rögzített konzultációs kérdés.")}
        </div>
        <div class="sheet-consultation-patterns">
          <strong>30 napos önmenedzsment mintázatok:</strong> ${escapeHtml(patternParts.join(" • "))}
        </div>
      </section>

      <section class="sheet-section">
        <h4 class="sheet-section-title">1. Aktív betegségek pontos neve, fázisa és részletes állapotleírása (${activeConds.length})</h4>
        ${
          activeConds.length === 0
            ? `<p class="entity-subtitle">Nincs rögzített aktív betegség.</p>`
            : activeConds
                .map((c) => {
                  const meta = COND_PHASE_META[c.phaseCategory] || COND_PHASE_META.stable;
                  return `
                    <div class="sheet-condition-item">
                      <div style="display:flex; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                        <div><strong>${escapeHtml(c.name)}</strong> ${c.icdCode ? `<span class="code-chip">BNO: ${escapeHtml(c.icdCode)}</span>` : ""}</div>
                        <span class="pill ${meta.cls}">Fázis: ${escapeHtml(c.phase)}</span>
                      </div>
                      <p style="margin:0 0 0.35rem; font-size:0.91rem;">${escapeHtml(c.description)}</p>
                      <div class="entity-subtitle">
                        ${c.symptoms ? `<strong>Tünetek:</strong> ${escapeHtml(c.symptoms)} • ` : ""}
                        ${c.diagnosedDate ? `<strong>Diagnózis:</strong> ${escapeHtml(formatHuDate(c.diagnosedDate))} • ` : ""}
                        ${c.doctor ? `<strong>Szakorvos:</strong> ${escapeHtml(c.doctor)}` : ""}
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </section>

      <section class="sheet-section">
        <h4 class="sheet-section-title">2. Jelenleg rendszeresen szedett gyógyszerek és mikrotápanyagok (${activeMeds.length})</h4>
        ${
          activeMeds.length === 0
            ? `<p class="entity-subtitle">Nincs rögzített aktív gyógyszer.</p>`
            : `
              <table class="data-table">
                <thead><tr><th>Készítmény &amp; hatóanyag</th><th>Adagolás</th><th>Időpontok</th><th>Indikáció &amp; bevétel</th></tr></thead>
                <tbody>
                  ${activeMeds
                    .map((m) => {
                      const cond = state.conditions.find((c) => c.id === m.conditionId);
                      return `
                        <tr>
                          <td><strong>${escapeHtml(m.name)}</strong>${m.activeIngredient ? `<div class="entity-subtitle">${escapeHtml(m.activeIngredient)}</div>` : ""}</td>
                          <td><strong>${escapeHtml(m.dosage)}</strong></td>
                          <td><strong>${escapeHtml((m.times || []).join(", "))}</strong><div class="entity-subtitle">${escapeHtml(formatDaysSummary(m.days))}</div></td>
                          <td>${cond ? `<div><strong>${escapeHtml(cond.name)}</strong></div>` : ""}<div class="entity-subtitle">${escapeHtml(m.mealRelation || "")}${m.notes ? ` • ${escapeHtml(m.notes)}` : ""}</div></td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            `
        }
      </section>

      ${
        latestLabs.length > 0
          ? `
            <section class="sheet-section">
              <h4 class="sheet-section-title">3. Legutóbbi endokrin laboreredmények</h4>
              <table class="data-table">
                <thead><tr><th>Paraméter</th><th>Érték</th><th>Dátum</th><th>Optimális cél</th><th>Megjegyzés</th></tr></thead>
                <tbody>
                  ${latestLabs
                    .map(
                      ({ bio, item }) => `
                      <tr>
                        <td><strong>${escapeHtml(bio.name)}</strong></td>
                        <td><strong>${item.value} ${escapeHtml(bio.unit)}</strong></td>
                        <td>${escapeHtml(formatHuDate(item.date))}</td>
                        <td>${bio.optimalMin}–${bio.optimalMax} ${escapeHtml(bio.unit)}</td>
                        <td>${escapeHtml(item.note || "—")}</td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
              </table>
            </section>
          `
          : ""
      }

      <section class="sheet-section">
        <h4 class="sheet-section-title">4. Kórelőzmény, legutóbbi tünetek és kérdések a vizitre</h4>
        <div class="sheet-notes-grid">
          <div class="sheet-note-box">
            <h4>Korábbi kórelőzmény / vizsgálatok</h4>
            <p>${escapeHtml(p.medicalHistory || "Nincs rögzítve.")}</p>
          </div>
          <div class="sheet-note-box">
            <h4>Aktuális megjegyzések, kérdések az orvosnak</h4>
            <p>${escapeHtml(p.doctorNotes || "Nincs rögzítve.")}</p>
          </div>
        </div>
        ${
          recentSyms.length > 0
            ? `<p class="form-help" style="margin-top:0.65rem;"><strong>Legutóbbi naplózott tünetek:</strong> ${recentSyms
                .map((s) => `${formatHuDate(s.date)} (${s.cycleDay || "—"}. nap): ${(s.symptoms || []).join(", ")}${s.bbt ? ` [BBT ${s.bbt}°C]` : ""}`)
                .join(" | ")}</p>`
            : ""
        }
      </section>
    `;
  }

  function buildPlainTextSummary() {
    const p = state.profile;
    const vp = state.visitPrep || {};
    const stats = computeSelfManagementStats();
    const cyc = getCycleStatusForDate(getTodayKey());
    const lines = [
      "SPERA – NŐGYÓGYÁSZATI-ENDOKRINOLÓGIAI ORVOSI ÖSSZEFOGLALÓ",
      `Kiállítva: ${new Date().toLocaleString("hu-HU")}`,
      "========================================================",
      `Páciens: ${p.name || "—"} (${p.age || "—"} év) | Vércsoport: ${p.bloodType || "Ismeretlen"} | Élethelyzet: ${MODE_LABELS[state.mode]}`,
      `Ciklus: ${cyc.cycleDay}. nap (${cyc.phaseInfo.name}) | Átlagos ciklushossz: ${cyc.cycleLen} nap | LMP: ${formatHuDate(p.lastPeriodStart)}`,
      "",
      "KONZULTÁCIÓS PONTOK & 30 NAPOS KONTROLL-ELŐKÉSZÍTŐ:",
      `- 30 napos gyógyszer-adherence: ${stats.adherencePct}% (${stats.effectiveMissed} kihagyás)`,
      `- Havi testsúlyváltozás: ${
        vp.weightChangeType === "gain" && vp.weightChangeKg
          ? `+${vp.weightChangeKg} kg`
          : vp.weightChangeType === "loss" && vp.weightChangeKg
          ? `-${vp.weightChangeKg} kg`
          : "Nincs váratlan változás"
      }${vp.currentWeightKg ? ` (aktuális: ${vp.currentWeightKg} kg)` : ""}`,
      `- Átlag energia: ${stats.avgEnergy || "—"}/5 | Hangulat: ${stats.avgMood || "—"}/5 | Alvás: ${stats.avgSleep || "—"} óra | Agyköd: ${stats.brainFogCount} nap`,
      ...(vp.consultationQuestions ? ["", "KIEMELT KÉRDÉSEK A KEZELŐORVOSHOZ:", vp.consultationQuestions] : []),
      "",
      "ALLERGIÁK:"
    ];
    if (!p.allergies?.length) lines.push("- Nincs ismert allergia.");
    else p.allergies.forEach((a) => lines.push(`- ${a.name} (${SEVERITY_LABELS[a.severity] || "Közepes"}): ${a.reaction || ""}`));

    lines.push("", "AKTÍV BETEGSÉGEK ÉS FÁZISOK:");
    state.conditions
      .filter((c) => c.active)
      .forEach((c, i) => {
        lines.push(`${i + 1}. ${c.name}${c.icdCode ? ` (BNO: ${c.icdCode})` : ""}`);
        lines.push(`   Fázis / stádium: ${c.phase}`);
        lines.push(`   Állapotleírás: ${c.description}`);
        if (c.symptoms) lines.push(`   Tünetek: ${c.symptoms}`);
      });

    lines.push("", "RENDSZERESEN SZEDETT GYÓGYSZEREK:");
    state.medications
      .filter((m) => m.active)
      .forEach((m, i) => {
        lines.push(`${i + 1}. ${m.name} – ${m.dosage} | Időpontok: ${(m.times || []).join(", ")} | ${m.mealRelation || ""}`);
      });

    if (p.doctorNotes) lines.push("", "KÉRDÉSEK / MEGJEGYZÉSEK AZ ORVOSNAK:", p.doctorNotes);
    return lines.join("\n");
  }

  // ------------------------------------------------------------------------
  // Navigáció & Modalok
  // ------------------------------------------------------------------------
  function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      const act = btn.dataset.tab === tabName;
      btn.classList.toggle("active", act);
      btn.setAttribute("aria-selected", String(act));
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `panel-${tabName}`);
    });
    if (tabName === "summary") renderMedicalSummary();
    if (tabName === "analytics") renderAnalytics();
    window.scrollTo(0, 0);
  }

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  function openConditionModal(condId = null) {
    document.getElementById("conditionForm").reset();
    if (condId) {
      const c = state.conditions.find((x) => x.id === condId);
      if (!c) return;
      document.getElementById("conditionModalTitle").textContent = "Betegség és fázis szerkesztése";
      document.getElementById("condId").value = c.id;
      document.getElementById("condName").value = c.name || "";
      document.getElementById("condIcd").value = c.icdCode || "";
      document.getElementById("condPhaseCategory").value = c.phaseCategory || "stable";
      document.getElementById("condPhase").value = c.phase || "";
      document.getElementById("condDate").value = c.diagnosedDate || "";
      document.getElementById("condDoctor").value = c.doctor || "";
      document.getElementById("condDescription").value = c.description || "";
      document.getElementById("condSymptoms").value = c.symptoms || "";
      document.getElementById("condActive").checked = Boolean(c.active);
    } else {
      document.getElementById("conditionModalTitle").textContent = "Új betegség / állapot rögzítése";
      document.getElementById("condId").value = "";
      document.getElementById("condActive").checked = true;
    }
    openModal("conditionModal");
  }

  function renderEditingMedTimes() {
    editingMedTimes.sort();
    document.getElementById("medTimesList").innerHTML =
      editingMedTimes.length === 0
        ? `<span class="form-help">Adj meg legalább egy időpontot.</span>`
        : editingMedTimes
            .map(
              (t) => `<span class="time-chip">${escapeHtml(t)} <button type="button" data-remove-med-time="${escapeHtml(t)}">&times;</button></span>`
            )
            .join("");
  }

  function openMedicationModal(medId = null) {
    document.getElementById("medicationForm").reset();
    const sel = document.getElementById("medCondition");
    sel.innerHTML =
      `<option value="">— Nincs konkrét betegséghez kötve —</option>` +
      state.conditions.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");

    const cbs = document.querySelectorAll("#medDaysSelector input[type=checkbox]");
    if (medId) {
      const m = state.medications.find((x) => x.id === medId);
      if (!m) return;
      document.getElementById("medicationModalTitle").textContent = "Gyógyszer szerkesztése";
      document.getElementById("medId").value = m.id;
      document.getElementById("medName").value = m.name || "";
      document.getElementById("medIngredient").value = m.activeIngredient || "";
      document.getElementById("medDosage").value = m.dosage || "";
      sel.value = m.conditionId || "";
      document.getElementById("medMeal").value = m.mealRelation || "Étkezéstől függetlenül";
      document.getElementById("medNotes").value = m.notes || "";
      document.getElementById("medActive").checked = Boolean(m.active);
      editingMedTimes = Array.isArray(m.times) ? [...m.times] : ["08:00"];
      cbs.forEach((cb) => (cb.checked = Array.isArray(m.days) && m.days.includes(Number(cb.value))));
    } else {
      document.getElementById("medicationModalTitle").textContent = "Új gyógyszer / vitamin rögzítése";
      document.getElementById("medId").value = "";
      document.getElementById("medActive").checked = true;
      editingMedTimes = ["08:00"];
      cbs.forEach((cb) => (cb.checked = true));
    }
    renderEditingMedTimes();
    openModal("medicationModal");
  }

  function openLabModal() {
    const sel = document.getElementById("labBiomarker");
    sel.innerHTML = Object.values(DATA.BIOMARKERS)
      .map((b) => `<option value="${b.key}" ${b.key === selectedBiomarker ? "selected" : ""}>${escapeHtml(b.name)} – ${escapeHtml(b.fullName)} (${escapeHtml(b.unit)})</option>`)
      .join("");
    document.getElementById("labForm").reset();
    sel.value = selectedBiomarker;
    document.getElementById("labDate").value = getTodayKey();
    openModal("labModal");
  }

  // ------------------------------------------------------------------------
  // Eseménykezelők bekötése
  // ------------------------------------------------------------------------
  function bindEvents() {
    // Onboarding űrlap beküldése (saját profil)
    document.getElementById("onboardingForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedEndo = Array.from(document.querySelectorAll('input[name="obEndocrine"]:checked')).map((el) => el.value);
      const mode = document.querySelector('input[name="obMode"]:checked')?.value || "cycle";
      const fresh = createEmptyState();
      fresh.onboarded = true;
      fresh.mode = mode;
      fresh.profile.name = document.getElementById("obName").value.trim();
      fresh.profile.age = Number(document.getElementById("obAge").value) || 28;
      fresh.profile.cycleLength = Number(document.getElementById("obCycleLen").value) || 28;
      fresh.profile.periodLength = Number(document.getElementById("obPeriodLen").value) || 5;
      fresh.profile.lastPeriodStart = document.getElementById("obLastPeriod").value || getTodayKey();
      fresh.profile.pregnancyLmp = fresh.profile.lastPeriodStart;
      fresh.profile.selectedEndocrine = selectedEndo;

      // Automatikusan létrehozunk alap betegség-kártyákat a bejelölt endokrin profilokhoz
      fresh.conditions = selectedEndo.map((key) => {
        const meta = DATA.ENDOCRINE_PROFILES[key];
        return {
          id: generateId("cond"),
          endocrineKey: key,
          name: meta.shortName,
          icdCode: meta.icdCode,
          phaseCategory: meta.defaultCategory,
          phase: meta.defaultPhase,
          diagnosedDate: "",
          doctor: "",
          description: "Kezdő kérdőívből hozzáadott profil – kattints a Szerkesztés gombra a részletes fázis és leletadatok pontosításához.",
          symptoms: "",
          active: true
        };
      });

      state = fresh;
      saveState();
      enterDashboard();
      showToast(`Üdvözöllek, ${state.profile.name}! Személyes profilod elkészült.`);
    });

    // Zsűri Demó profil automatikus betöltése
    document.getElementById("btnFillDemo").addEventListener("click", () => {
      state = DATA.createDemoState();
      saveState();
      enterDashboard();
      showToast("Szintetikus demó profil betöltve (PCOS + Hashimoto, laborok, gyógyszerek, ciklushossz-trendek).");
    });

    // Korábban mentett profil folytatása
    document.getElementById("btnResumeSaved").addEventListener("click", () => {
      const saved = loadSavedFromStorage();
      if (saved) {
        state = saved;
        enterDashboard();
        showToast("Korábban mentett profil betöltve.");
      }
    });

    // Fejléc vezérlők
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        selectedNutritionPhase = null;
        saveState();
        renderAll();
        showToast(`Élethelyzet mód: ${MODE_LABELS[state.mode]}`);
      });
    });

    document.getElementById("btnToggleFont").addEventListener("click", () => {
      state.settings.largeText = !state.settings.largeText;
      saveState();
      applySettingsAndHeader();
    });

    document.getElementById("btnOpenOnboarding").addEventListener("click", showOnboarding);
    document.getElementById("btnQuickSummary").addEventListener("click", () => switchTab("summary"));

    // Navigációs fülek
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Globális delegált gyors-ugrások és kattintások
    document.addEventListener("click", (e) => {
      const jumpBtn = e.target.closest("[data-jump-tab]");
      if (jumpBtn) {
        switchTab(jumpBtn.dataset.jumpTab);
        return;
      }
      const quickTake = e.target.closest("[data-quick-take]");
      if (quickTake) {
        setDoseStatus(quickTake.dataset.quickTake, "taken");
        showToast("Gyógyszer bevéve.");
        return;
      }
      const calBtn = e.target.closest("[data-cal-date]");
      if (calBtn) {
        switchTab("symptoms");
        renderSymptomLogger(calBtn.dataset.calDate);
        return;
      }
      const symToggle = e.target.closest("[data-sym-toggle]");
      if (symToggle) {
        const s = symToggle.dataset.symToggle;
        if (selectedSymptomSet.has(s)) selectedSymptomSet.delete(s);
        else selectedSymptomSet.add(s);
        symToggle.classList.toggle("selected", selectedSymptomSet.has(s));
        const extraPill = document.getElementById("extraSymCountPill");
        if (extraPill) extraPill.textContent = `${selectedSymptomSet.size} kijelölve`;
        return;
      }
      const scaleBtn = e.target.closest("[data-scale-field]");
      if (scaleBtn) {
        const field = scaleBtn.dataset.scaleField;
        const val = Number(scaleBtn.dataset.scaleVal);
        if (field === "energy" || field === "mood") {
          checkinDraft[field] = val;
          syncCheckinControlsToDom();
        }
        return;
      }
      const moodTagBtn = e.target.closest("[data-mood-tag]");
      if (moodTagBtn) {
        const tag = moodTagBtn.dataset.moodTag;
        if (checkinDraft.moodTags.includes(tag)) {
          checkinDraft.moodTags = checkinDraft.moodTags.filter((t) => t !== tag);
        } else {
          checkinDraft.moodTags.push(tag);
        }
        syncCheckinControlsToDom();
        return;
      }
      const segBtn = e.target.closest("[data-radio-group] .seg-btn");
      if (segBtn) {
        const group = segBtn.closest("[data-radio-group]").dataset.radioGroup;
        const val = segBtn.dataset.value;
        if (group === "brainFog" || group === "reactiveHypo" || group === "bloatingConstipation" || group === "coldEdema") {
          checkinDraft[group] = val === "yes";
        } else {
          checkinDraft[group] = val;
        }
        syncCheckinControlsToDom();
        return;
      }
      const loadSym = e.target.closest("[data-load-sym-date]");
      if (loadSym) {
        renderSymptomLogger(loadSym.dataset.loadSymDate);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const bioBtn = e.target.closest("[data-select-bio]");
      if (bioBtn) {
        selectedBiomarker = bioBtn.dataset.selectBio;
        renderBiomarkerFilterBar();
        renderLabChart();
        return;
      }
      const nutrBtn = e.target.closest("[data-nutr-phase]");
      if (nutrBtn) {
        selectedNutritionPhase = nutrBtn.dataset.nutrPhase;
        renderNutrition();
        return;
      }
      const journeyBtn = e.target.closest("[data-journey-step]");
      if (journeyBtn) {
        selectedJourneyStep = Number(journeyBtn.dataset.journeyStep);
        renderJourneyMap();
        return;
      }
    });

    // Naptár hónap léptetés
    document.getElementById("btnPrevMonth").addEventListener("click", () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCalendar();
    });
    document.getElementById("btnNextMonth").addEventListener("click", () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCalendar();
    });

    // Aktív gyógyszer-riasztási sáv
    document.getElementById("btnAlertTake").addEventListener("click", () => {
      if (activeAlert && !activeAlert.isTest && activeAlert.key) setDoseStatus(activeAlert.key, "taken");
      hideAlertBanner();
      showToast("Gyógyszer bevétele rögzítve.");
    });
    document.getElementById("btnAlertSnooze").addEventListener("click", () => {
      if (!activeAlert) return;
      snoozedQueue.set(activeAlert.key || `snz_${Date.now()}`, {
        triggerAt: Date.now() + 10 * 60 * 1000,
        payload: { ...activeAlert }
      });
      hideAlertBanner();
      showToast("Emlékeztető halasztva 10 perccel.");
    });
    document.getElementById("btnAlertDismiss").addEventListener("click", hideAlertBanner);

    // Emlékeztető vezérlők
    document.getElementById("chkSoundEnabled").addEventListener("change", (e) => {
      state.settings.soundEnabled = e.target.checked;
      saveState();
    });
    document.getElementById("btnEnableBrowserNotif").addEventListener("click", async () => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") {
        state.settings.notificationsEnabled = !state.settings.notificationsEnabled;
        saveState();
        applySettingsAndHeader();
        return;
      }
      try {
        const res = await Notification.requestPermission();
        state.settings.notificationsEnabled = res === "granted";
        saveState();
        applySettingsAndHeader();
        showToast(res === "granted" ? "Böngészős értesítések bekapcsolva." : "Böngészős értesítés elutasítva.", res !== "granted");
      } catch (_) {}
    });
    document.getElementById("btnTestReminder").addEventListener("click", () => {
      const doses = getTodayDoses();
      const target = doses.find((d) => !d.log) || doses[0];
      showAlertBanner(
        target
          ? { key: target.key, medName: target.med.name, dosage: target.med.dosage, time: target.time, mealRelation: target.med.mealRelation, isTest: true }
          : { key: "test", medName: "Letrox 50 µg (Minta)", dosage: "1 tabletta", time: getCurrentTimeHHMM(), mealRelation: "Éhgyomorra, kávé előtt 45 perccel", isTest: true }
      );
    });

    // Gyógyszer & Betegség műveletek
    document.getElementById("btnAddMedicationTop").addEventListener("click", () => openMedicationModal());
    document.getElementById("btnAddCondition").addEventListener("click", () => openConditionModal());

    document.getElementById("todayScheduleList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-dose-action]");
      if (!btn) return;
      const act = btn.dataset.doseAction;
      setDoseStatus(btn.dataset.doseKey, act === "take" ? "taken" : act === "skip" ? "skipped" : null);
      showToast(act === "take" ? "Gyógyszer bevéve." : act === "skip" ? "Kihagyva." : "Visszavonva.");
    });

    document.getElementById("medicationsList").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-med]");
      if (edit) return openMedicationModal(edit.dataset.editMed);
      const toggle = e.target.closest("[data-toggle-med]");
      if (toggle) {
        const m = state.medications.find((x) => x.id === toggle.dataset.toggleMed);
        if (m) {
          m.active = !m.active;
          saveState();
          renderAll();
        }
        return;
      }
      const del = e.target.closest("[data-delete-med]");
      if (del) {
        if (!confirm("Biztosan törlöd ezt a gyógyszert?")) return;
        state.medications = state.medications.filter((x) => x.id !== del.dataset.deleteMed);
        saveState();
        renderAll();
        showToast("Gyógyszer törölve.");
      }
    });

    document.getElementById("conditionsList").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-cond]");
      if (edit) return openConditionModal(edit.dataset.editCond);
      const del = e.target.closest("[data-delete-cond]");
      if (del) {
        if (!confirm("Biztosan törlöd ezt a betegséget?")) return;
        const id = del.dataset.deleteCond;
        state.conditions = state.conditions.filter((x) => x.id !== id);
        state.medications.forEach((m) => { if (m.conditionId === id) m.conditionId = ""; });
        saveState();
        renderAll();
        showToast("Betegség törölve.");
      }
    });

    // Betegség modal mentés
    document.getElementById("conditionForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("condId").value;
      const payload = {
        id: id || generateId("cond"),
        name: document.getElementById("condName").value.trim(),
        icdCode: document.getElementById("condIcd").value.trim(),
        phaseCategory: document.getElementById("condPhaseCategory").value,
        phase: document.getElementById("condPhase").value.trim(),
        diagnosedDate: document.getElementById("condDate").value,
        doctor: document.getElementById("condDoctor").value.trim(),
        description: document.getElementById("condDescription").value.trim(),
        symptoms: document.getElementById("condSymptoms").value.trim(),
        active: document.getElementById("condActive").checked
      };
      if (id) {
        const idx = state.conditions.findIndex((x) => x.id === id);
        if (idx !== -1) state.conditions[idx] = payload;
      } else {
        state.conditions.unshift(payload);
      }
      saveState();
      closeModal("conditionModal");
      renderAll();
      showToast("Betegség és fázis elmentve.");
    });

    // Gyógyszer modal időpontok + mentés
    document.getElementById("btnAddMedTime").addEventListener("click", () => {
      const t = document.getElementById("medNewTime").value;
      if (t && !editingMedTimes.includes(t)) {
        editingMedTimes.push(t);
        renderEditingMedTimes();
      }
    });
    document.getElementById("medTimesList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-med-time]");
      if (btn) {
        editingMedTimes = editingMedTimes.filter((x) => x !== btn.dataset.removeMedTime);
        renderEditingMedTimes();
      }
    });
    document.getElementById("medicationForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (editingMedTimes.length === 0) return showToast("Legalább egy időpont kötelező!", true);
      const days = Array.from(document.querySelectorAll("#medDaysSelector input:checked")).map((c) => Number(c.value));
      if (days.length === 0) return showToast("Legalább egy hétköznap kötelező!", true);
      const id = document.getElementById("medId").value;
      const payload = {
        id: id || generateId("med"),
        name: document.getElementById("medName").value.trim(),
        activeIngredient: document.getElementById("medIngredient").value.trim(),
        dosage: document.getElementById("medDosage").value.trim(),
        conditionId: document.getElementById("medCondition").value,
        times: [...editingMedTimes].sort(),
        days,
        mealRelation: document.getElementById("medMeal").value,
        notes: document.getElementById("medNotes").value.trim(),
        active: document.getElementById("medActive").checked
      };
      if (id) {
        const idx = state.medications.findIndex((x) => x.id === id);
        if (idx !== -1) state.medications[idx] = payload;
      } else {
        state.medications.unshift(payload);
      }
      saveState();
      closeModal("medicationModal");
      renderAll();
      showToast("Gyógyszer mentve az emlékeztetőbe.");
    });

    // Allergiák + Extra profil jegyzetek + JSON Export/Import
    document.getElementById("btnAddAllergy").addEventListener("click", () => {
      const name = document.getElementById("allergyNameInput").value.trim();
      if (!name) return showToast("Add meg az allergén nevét!", true);
      state.profile.allergies.push({
        id: generateId("alg"),
        name,
        reaction: document.getElementById("allergyReactionInput").value.trim(),
        severity: document.getElementById("allergySeverityInput").value
      });
      document.getElementById("allergyNameInput").value = "";
      document.getElementById("allergyReactionInput").value = "";
      saveState();
      renderAllergiesList();
      renderMedicalSummary();
      showToast("Allergia rögzítve.");
    });

    document.getElementById("allergiesEditorList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-allergy]");
      if (!btn) return;
      state.profile.allergies = state.profile.allergies.filter((a) => a.id !== btn.dataset.removeAllergy);
      saveState();
      renderAllergiesList();
      renderMedicalSummary();
    });

    document.getElementById("profileExtraForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.profile.bloodType = document.getElementById("profBloodType").value;
      const emerg = document.getElementById("profEmergencyPhone").value.trim();
      state.profile.emergencyName = emerg;
      state.profile.emergencyRelation = "";
      state.profile.emergencyPhone = "";
      state.profile.medicalHistory = document.getElementById("profMedicalHistory").value.trim();
      state.profile.doctorNotes = document.getElementById("profDoctorNotes").value.trim();
      saveState();
      renderMedicalSummary();
      showToast("Alapadatok és orvosi jegyzetek mentve.");
    });

    document.getElementById("btnExportJson").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spera-adatlap-${getTodayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Adatlap exportálva JSON fájlba.");
    });

    document.getElementById("inputImportJson").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          state = normalizeState(JSON.parse(String(reader.result)));
          state.onboarded = true;
          saveState();
          renderAll();
          showToast("Mentett adatlap sikeresen importálva.");
        } catch (_) {
          showToast("Érvénytelen JSON fájl.", true);
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });

    // Önmenedzsment & Tünetnapló események
    document.getElementById("symDate").addEventListener("change", (e) => {
      renderSymptomLogger(e.target.value);
    });

    document.getElementById("symSleepHours").addEventListener("input", (e) => {
      checkinDraft.sleepHours = Number(e.target.value) || 7.5;
      const disp = document.getElementById("sleepHoursDisplay");
      if (disp) disp.textContent = `${String(checkinDraft.sleepHours).replace(".", ",")} óra`;
    });

    document.getElementById("chkShowMedicalWhy").addEventListener("change", (e) => {
      state.settings.showMedicalWhy = e.target.checked;
      saveState();
      applySettingsAndHeader();
    });

    document.getElementById("btnToggleAllBiomarkers").addEventListener("click", () => {
      showAllBiomarkers = !showAllBiomarkers;
      renderSymptomLogger();
    });

    document.getElementById("chkLogMetabolic").addEventListener("change", (e) => {
      checkinDraft.metabolicLogged = e.target.checked;
      syncCheckinControlsToDom();
    });

    document.getElementById("symptomForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("symDate").value;
      const cyc = getCycleStatusForDate(date);
      const customRaw = document.getElementById("symCustom").value.trim();
      const symptoms = Array.from(selectedSymptomSet);
      if (customRaw) {
        customRaw.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => {
          if (!symptoms.includes(s)) symptoms.push(s);
        });
      }
      const bbtVal = document.getElementById("symBbt").value;
      const entry = {
        date,
        cycleDay: cyc.cycleDay,
        phase: cyc.phase,
        dailyCheckin: {
          medRule: checkinDraft.medRule,
          energy: Number(checkinDraft.energy) || 3,
          brainFog: Boolean(checkinDraft.brainFog),
          sleepHours: Number(checkinDraft.sleepHours) || 7.5,
          sleepQuality: checkinDraft.sleepQuality || "restful",
          mood: Number(checkinDraft.mood) || 3,
          moodTags: [...checkinDraft.moodTags]
        },
        bbt: bbtVal ? Number(bbtVal) : null,
        bleeding: checkinDraft.bleeding || "none",
        cervicalMucus: checkinDraft.cervicalMucus || "",
        pelvicPain: checkinDraft.pelvicPain || "none",
        metabolicLogged: Boolean(checkinDraft.metabolicLogged),
        metabolic: checkinDraft.metabolicLogged
          ? {
              reactiveHypo: Boolean(checkinDraft.reactiveHypo),
              bloatingConstipation: Boolean(checkinDraft.bloatingConstipation),
              coldEdema: Boolean(checkinDraft.coldEdema),
              skinHairTrend: checkinDraft.skinHairTrend || "unchanged"
            }
          : null,
        intensity: Number(document.getElementById("symIntensity").value) || 2,
        symptoms,
        note: document.getElementById("symNote").value.trim()
      };
      const idx = state.symptomLogs.findIndex((l) => l.date === date);
      if (idx !== -1) state.symptomLogs[idx] = entry;
      else state.symptomLogs.push(entry);

      saveState();
      renderAll();
      showToast("Napi gyorsteszt és önmenedzsment bejegyzés mentve!");
    });

    // 4. Orvosi kontrollra felkészítő események
    document.getElementById("vpMissedChoice").addEventListener("change", (e) => {
      const defaults = { none: 0, "1-2": 2, "3-5": 4, more: 7 };
      const cntEl = document.getElementById("vpMissedCount");
      if (cntEl && defaults[e.target.value] !== undefined) {
        cntEl.value = String(defaults[e.target.value]);
      }
    });

    document.getElementById("visitPrepForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.visitPrep = {
        nextVisitDate: document.getElementById("vpVisitDate").value,
        visitType: document.getElementById("vpVisitType").value,
        missedDosesChoice: document.getElementById("vpMissedChoice").value,
        missedDosesCount: Math.max(0, Math.min(30, Number(document.getElementById("vpMissedCount").value) || 0)),
        weightChangeType: document.getElementById("vpWeightType").value,
        weightChangeKg: Math.max(0, Number(document.getElementById("vpWeightDelta").value) || 0),
        currentWeightKg: document.getElementById("vpCurrentWeight").value ? Number(document.getElementById("vpCurrentWeight").value) : "",
        consultationQuestions: document.getElementById("vpQuestions").value.trim(),
        lastUpdated: getTodayKey()
      };
      saveState();
      renderAll();
      showToast("Kontroll-előkészítő mentve – bekerült az Orvosi PDF tetejére!");
    });

    // Labor & Ciklus modalok
    document.getElementById("btnAddLab").addEventListener("click", openLabModal);
    document.getElementById("labForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const biomarker = document.getElementById("labBiomarker").value;
      state.labResults.push({
        id: generateId("lab"),
        biomarker,
        date: document.getElementById("labDate").value,
        value: Number(document.getElementById("labValue").value),
        note: document.getElementById("labNote").value.trim()
      });
      selectedBiomarker = biomarker;
      saveState();
      closeModal("labModal");
      renderAll();
      showToast("Új laboreredmény rögzítve.");
    });

    document.getElementById("btnAddCycle").addEventListener("click", () => {
      document.getElementById("cycleForm").reset();
      openModal("cycleModal");
    });
    document.getElementById("cycleForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.cycleHistory.push({
        id: generateId("cyc"),
        label: document.getElementById("cycMonthLabel").value.trim(),
        length: Number(document.getElementById("cycLength").value),
        startDate: getTodayKey()
      });
      state.smartAlertDismissedForAvg = null;
      saveState();
      closeModal("cycleModal");
      renderAll();
      showToast("Ciklushossz rögzítve – trend frissítve.");
    });

    // Orvosi összefoglaló nyomtatás & másolás
    document.getElementById("btnPrintSummary").addEventListener("click", () => {
      renderMedicalSummary();
      window.print();
    });
    document.getElementById("btnCopySummary").addEventListener("click", async () => {
      const txt = buildPlainTextSummary();
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(txt);
        else throw new Error("fallback");
        showToast("Orvosi összefoglaló a vágólapra másolva!");
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        showToast("Orvosi összefoglaló a vágólapra másolva!");
      }
    });

    // Modal bezárások
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-backdrop").forEach((bd) => {
      bd.addEventListener("click", (e) => { if (e.target === bd) bd.classList.add("hidden"); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((m) => m.classList.add("hidden"));
      }
    });
  }

  function updateClock() {
    const el = document.getElementById("liveClock");
    if (el) {
      el.textContent = new Date().toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
  }

  function init() {
    bindEvents();
    showOnboarding();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkDueReminders, 10000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
