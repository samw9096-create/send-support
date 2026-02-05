// assets/views.js
import { go } from "./router.js";
import { applySettingsToDOM } from "./theme.js";

import {
  passkeySignUp,
  passkeySignIn,
  pinSet,
  pinSignIn,
  signOut,
  resetLocalApp,
  resetOnboardingOnly,
  getProfile,
  updateProfile,
} from "./auth.js";

import {
  Q1_TAGS,
  Q2_TAGS,
  Q3_SLIDER,
  loadOnboardingState,
  saveOnboardingState,
} from "./onboarding.js";

import { callLocalAI } from "./ai.js";

/* ---------------------------
   Shared helpers
--------------------------- */
function showSuccessOverlay({ title = "Success!", subtitle = "Completed" } = {}) {
  // Remove any existing overlay
  const existing = document.querySelector("#successOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.id = "successOverlay";

  overlay.innerHTML = `
    <div class="success-panel" role="dialog" aria-modal="true" aria-label="Success">
      <div class="success-top">
        <div class="success-ring"></div>
        <div class="success-confetti"></div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="success-bottom">
        <button id="successCloseBtn" type="button">Continue</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // show after attached
  requestAnimationFrame(() => overlay.classList.add("show"));

  const close = () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 180);
    document.removeEventListener("keydown", onKey);
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector("#successCloseBtn").onclick = close;
  document.addEventListener("keydown", onKey);

  // auto-close after a short time (feels app-like)
  setTimeout(close, 1600);

  return close;
}

function wireBottomNav(activePath) {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.to === activePath);
    b.onclick = () => go(b.dataset.to);
  });
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) n.appendChild(c);
  return n;
}

// ---------------------------
// Learning (shared data)
// ---------------------------

// 6 quizzes = 6 dots on Dashboard + Learning menu
const LEARNING_QUIZZES = [
  { id: "quiz-1", type: "quiz", title: "Quiz 1", meta: "Multiple choice • 3 questions" },
  { id: "quiz-2", type: "quiz", title: "Quiz 2", meta: "Multiple choice • 3 questions" },
  { id: "quiz-3", type: "quiz", title: "Quiz 3", meta: "Multiple choice • 3 questions" },
  { id: "quiz-4", type: "quiz", title: "Quiz 4", meta: "Multiple choice • 3 questions" },
  { id: "quiz-5", type: "quiz", title: "Quiz 5", meta: "Multiple choice • 3 questions" },
  { id: "quiz-6", type: "quiz", title: "Quiz 6", meta: "Multiple choice • 3 questions" }
];

function getLearningCompletion(profile) {
  const completed = Array.isArray(profile.learningCompleted) ? profile.learningCompleted : [];
  const doneCount = LEARNING_QUIZZES.filter(q => completed.includes(q.id)).length;
  const total = LEARNING_QUIZZES.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  return { completed, doneCount, total, pct };
}

function renderProgressDots(trackEl, doneCount, total) {
  trackEl.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.className = "progress-dot" + (i < doneCount ? " filled" : "");
    trackEl.appendChild(dot);
  }
}

/* ---------------------------
   View entry
--------------------------- */
export async function initView(path) {
  if (path !== "/login") {
    const profile = await getProfile();
    applySettingsToDOM(profile.settings || {});
  }

  if (path === "/login") return initLogin();
  if (path === "/onboarding") return initOnboarding();
  if (path === "/dashboard") return initDashboard();
  if (path === "/info") return initInfo();
  if (path === "/tracker") return initTracker();  // now Learning menu
  if (path === "/settings") return initSettings();
  if (path === "/quiz") return initQuiz();
}


/* ---------------------------
   LOGIN
--------------------------- */

async function initLogin() {
  const err = document.querySelector("#err");
  const pin = document.querySelector("#pin");
  const showErr = (e) => (err.textContent = e?.message || String(e));

  const btnPasskeyUp = document.querySelector("#btnPasskeyUp");
  const btnPasskeyIn = document.querySelector("#btnPasskeyIn");
  const btnPinUp = document.querySelector("#btnPinUp");
  const btnPinIn = document.querySelector("#btnPinIn");

  if (!btnPasskeyUp || !btnPasskeyIn || !btnPinUp || !btnPinIn) return;

  btnPasskeyUp.onclick = async () => {
    err.textContent = "";
    try {
      await passkeySignUp();
      go("/onboarding");
    } catch (e) {
      showErr(e);
    }
  };

  btnPasskeyIn.onclick = async () => {
    err.textContent = "";
    try {
      await passkeySignIn();
      // go to chosen home tab if set
      const profile = await getProfile();
      const home = profile?.settings?.homeTab || "/dashboard";
      go(home);
    } catch (e) {
      showErr(e);
    }
  };

  btnPinUp.onclick = async () => {
    err.textContent = "";
    try {
      await pinSet(pin.value.trim());
      go("/onboarding");
    } catch (e) {
      showErr(e);
    }
  };

  btnPinIn.onclick = async () => {
    err.textContent = "";
    try {
      await pinSignIn(pin.value.trim());
      const profile = await getProfile();
      const home = profile?.settings?.homeTab || "/dashboard";
      go(home);
    } catch (e) {
      showErr(e);
    }
  };
}

/* ---------------------------
   ONBOARDING (3 steps: pills, pills, slider)
--------------------------- */

async function initOnboarding() {
  const err = document.querySelector("#err");

  const stepLabel = document.querySelector("#stepLabel");
  const questionText = document.querySelector("#questionText");

  const pillWrap = document.querySelector("#pillWrap");
  const sliderWrap = document.querySelector("#sliderWrap");
  const slider = document.querySelector("#slider");
  const sliderValue = document.querySelector("#sliderValue");

  const btnBack = document.querySelector("#btnBack");
  const btnNext = document.querySelector("#btnNext");

  if (!btnBack || !btnNext) {
    throw new Error("Onboarding view missing #btnBack or #btnNext. Check views/onboarding.html IDs.");
  }

  const state = await loadOnboardingState();
  let step = 1;

  const QUESTIONS = [
    {
      step: 1,
      type: "pills",
      text: "Question 1 (placeholder): choose any that apply.",
      options: Q1_TAGS,
      get: () => state.q1Selections,
      set: (next) => (state.q1Selections = next),
      validate: () => true, // allow empty
    },
    {
      step: 2,
      type: "pills",
      text: "Question 2 (placeholder): select preferences.",
      options: Q2_TAGS,
      get: () => state.q2Selections,
      set: (next) => (state.q2Selections = next),
      validate: () => true,
    },
    {
      step: 3,
      type: "slider",
      text: "Question 3 (placeholder): set a scale value.",
      validate: () => true,
    },
  ];

  function renderPills(options, selected, onToggle) {
    pillWrap.innerHTML = "";
    for (const opt of options) {
      const div = document.createElement("div");
      div.className = "pill" + (selected.includes(opt.id) ? " selected" : "");
      div.textContent = opt.label;
      div.onclick = () => onToggle(opt.id);
      pillWrap.appendChild(div);
    }
  }

  function render() {
    err.textContent = "";
    stepLabel.textContent = `Step ${step} of 3`;

    const q = QUESTIONS.find((x) => x.step === step);
    questionText.textContent = q.text;

    btnBack.textContent = step === 1 ? "Back to login" : "Back";
    btnNext.textContent = step === 3 ? "Finish" : "Next";

    const isPills = q.type === "pills";
    pillWrap.style.display = isPills ? "flex" : "none";
    sliderWrap.style.display = q.type === "slider" ? "block" : "none";

    if (isPills) {
      const selected = q.get();
      renderPills(q.options, selected, (id) => {
        const cur = q.get();
        const i = cur.indexOf(id);
        const next = [...cur];
        if (i >= 0) next.splice(i, 1);
        else next.push(id);
        q.set(next);
        render();
      });
    }

    if (q.type === "slider") {
      slider.min = String(Q3_SLIDER.min);
      slider.max = String(Q3_SLIDER.max);
      slider.step = String(Q3_SLIDER.step);
      slider.value = String(state.q3Scale);
      sliderValue.textContent = String(state.q3Scale);

      slider.oninput = () => {
        state.q3Scale = Number(slider.value);
        sliderValue.textContent = String(state.q3Scale);
      };
    }
  }

  btnBack.onclick = () => {
    if (step === 1) return go("/login");
    step -= 1;
    render();
  };

  btnNext.onclick = async () => {
    const q = QUESTIONS.find((x) => x.step === step);
    if (q?.validate && !q.validate()) {
      err.textContent = "Please complete this step.";
      return;
    }

    if (step < 3) {
      step += 1;
      render();
      return;
    }

    try {
      await saveOnboardingState(state);
      // go to chosen home tab if set
      const profile = await getProfile();
      const home = profile?.settings?.homeTab || "/dashboard";
      go(home);
    } catch (e) {
      err.textContent = e?.message || String(e);
    }
  };

  render();
}

/* ---------------------------
   DASHBOARD (shows onboarding results)
--------------------------- */

async function initDashboard() {
  const q1El = document.querySelector("#dashQ1");
  const q2El = document.querySelector("#dashQ2");
  const q3El = document.querySelector("#dashQ3");
  const errEl = document.querySelector("#dashErr");

  const trackEl = document.querySelector("#dashProgressTrack");
  const pctEl = document.querySelector("#dashProgressPct");
  const cardEl = document.querySelector("#dashProgressCard");

  const missing = {
    dashQ1: !!q1El,
    dashQ2: !!q2El,
    dashQ3: !!q3El,
    dashErr: !!errEl,
    dashProgressTrack: !!trackEl,
    dashProgressPct: !!pctEl,
    dashProgressCard: !!cardEl
  };

  if (Object.values(missing).some(v => !v)) {
    console.error("Dashboard missing elements. Check views/dashboard.html IDs.", missing);
    return;
  }

  // Click + keyboard open learning
  cardEl.onclick = () => go("/tracker");
  cardEl.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") go("/tracker");
  };

  try {
    const profile = await getProfile();

    // Onboarding placeholders
    const q1 = Array.isArray(profile.q1Selections) ? profile.q1Selections : [];
    const q2 = Array.isArray(profile.q2Selections) ? profile.q2Selections : [];
    const q3 = Number.isFinite(profile.q3Scale) ? profile.q3Scale : null;

    const q1Map = new Map(Q1_TAGS.map((t) => [t.id, t.label]));
    const q2Map = new Map(Q2_TAGS.map((t) => [t.id, t.label]));

    q1El.textContent = q1.length ? (q1Map.get(q1[0]) || "Option 1") : "Option 1";
    q2El.textContent = q2.length ? (q2Map.get(q2[0]) || "Option 2") : "Option 2";
    q3El.textContent = q3 === null ? "Slider 3" : `Slider ${q3}`;

    // Learning progress
    const { doneCount, total, pct } = getLearningCompletion(profile);

    pctEl.textContent = `${pct}%`;
    renderProgressDots(trackEl, doneCount, total);

    errEl.textContent = "";
  } catch (e) {
    errEl.textContent = e?.message || String(e);
  }
}




/* ---------------------------
   INFO / TRACKER
--------------------------- */

async function initInfo() {
  wireBottomNav("/info");
}

async function initTracker() {
  const errEl = document.querySelector("#learnErr");
  const recEl = document.querySelector("#learnRecommended");
  const allEl = document.querySelector("#learnAll");

  const pctEl = document.querySelector("#learnProgressPct");
  const fillEl = document.querySelector("#learnProgressFill");
  const textEl = document.querySelector("#learnProgressText");

  if (!recEl || !allEl || !fillEl || !pctEl || !textEl) {
    console.error("Learning menu missing elements. Check views/tracker.html.");
    return;
  }

  errEl.textContent = "";

  try {
    const profile = await getProfile();
    const { completed, doneCount, total, pct } = getLearningCompletion(profile);

    textEl.textContent = `${doneCount} / ${total}`;
    pctEl.textContent = `${pct}%`;
    fillEl.style.width = `${pct}%`;

    const isDone = (id) => completed.includes(id);

    function renderCard(activity, targetEl) {
      const wrapper = document.createElement("div");
      wrapper.className = "learn-card";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = activity.title;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = activity.meta;

      const badge = document.createElement("div");
      badge.className = "badge" + (isDone(activity.id) ? " done" : "");
      badge.textContent = isDone(activity.id) ? "Completed" : "Not done";

      left.appendChild(title);
      left.appendChild(meta);
      left.appendChild(document.createElement("div")).style.height = "6px";
      left.appendChild(badge);

      const btn = document.createElement("button");
      btn.className = isDone(activity.id) ? "secondary" : "";
      btn.textContent = isDone(activity.id) ? "Review" : "Start";

      btn.onclick = () => {
        go(`/quiz?id=${encodeURIComponent(activity.id)}`);
      };

      wrapper.appendChild(left);
      wrapper.appendChild(btn);
      targetEl.appendChild(wrapper);
    }

    // Recommended next = first 2 incomplete quizzes
    recEl.innerHTML = "";
    const recommended = LEARNING_QUIZZES.filter(a => !isDone(a.id)).slice(0, 2);

    if (!recommended.length) {
      const doneMsg = document.createElement("div");
      doneMsg.className = "dash-card";
      doneMsg.textContent = "All quizzes completed (placeholders).";
      recEl.appendChild(doneMsg);

      // full completion overlay (if you already added it)
      if (total > 0 && doneCount === total) {
        showSuccessOverlay({ title: "Success!", subtitle: "All quizzes completed" });
      }
    } else {
      recommended.forEach(a => renderCard(a, recEl));
    }

    // All quizzes list
    allEl.innerHTML = "";
    LEARNING_QUIZZES.forEach(a => renderCard(a, allEl));

  } catch (e) {
    errEl.textContent = e?.message || String(e);
  }
}



/* ---------------------------
   SETTINGS (accessibility + app settings + export/import + account)
--------------------------- */

async function initSettings() {
  wireBottomNav("/settings");

  const errEl = document.querySelector("#err");
  const outEl = document.querySelector("#out");

  const setMode = document.querySelector("#setMode");
  const setAccent = document.querySelector("#setAccent");
  const setText = document.querySelector("#setText");
  const setMotion = document.querySelector("#setMotion");
  const setContrast = document.querySelector("#setContrast");

  const setHomeTab = document.querySelector("#setHomeTab");
  const setTips = document.querySelector("#setTips");
  const setSounds = document.querySelector("#setSounds");

  const btnExport = document.querySelector("#btnExport");
  const btnImport = document.querySelector("#btnImport");
  const importFile = document.querySelector("#importFile");

  const btnSignOut = document.querySelector("#btnSignOut");
  const btnResetOnboarding = document.querySelector("#btnResetOnboarding");
  const btnReset = document.querySelector("#btnReset");

  // If you haven't replaced settings.html yet, avoid crashing
  const required = [
    setMode, setAccent, setText, setMotion, setContrast,
    setHomeTab, setTips, setSounds,
    btnExport, btnImport, importFile,
    btnSignOut, btnResetOnboarding, btnReset,
    errEl, outEl
  ];
  if (required.some((x) => !x)) {
    console.error("Settings view is missing expected elements. Replace views/settings.html with the updated version.");
    return;
  }

  const defaultSettings = {
    mode: "light",         // system/dark/light
    accent: "blue",         // blue/purple/green/orange
    textSize: "normal",     // normal/large/xlarge
    reduceMotion: false,
    highContrast: false,
    homeTab: "/dashboard",  // /dashboard /info /tracker
    showTips: true,
    uiSounds: false,
  };

  const profile = await getProfile();
  const settings = { ...defaultSettings, ...(profile.settings || {}) };

  // hydrate UI controls
  setMode.value = settings.mode;
  setAccent.value = settings.accent;
  setText.value = settings.textSize;
  setMotion.checked = !!settings.reduceMotion;
  setContrast.checked = !!settings.highContrast;

  setHomeTab.value = settings.homeTab;
  setTips.checked = !!settings.showTips;
  setSounds.checked = !!settings.uiSounds;

  // apply immediately
  applySettingsToDOM(settings);

  async function save(partial) {
    errEl.textContent = "";
    const next = { ...settings, ...partial };

    // mutate local settings object
    settings.mode = next.mode;
    settings.accent = next.accent;
    settings.textSize = next.textSize;
    settings.reduceMotion = next.reduceMotion;
    settings.highContrast = next.highContrast;
    settings.homeTab = next.homeTab;
    settings.showTips = next.showTips;
    settings.uiSounds = next.uiSounds;

    applySettingsToDOM(settings);
    await updateProfile({ settings });

    outEl.textContent = "Saved.";
    setTimeout(() => (outEl.textContent = ""), 900);
  }

  // listeners
  setMode.onchange = () => save({ mode: setMode.value });
  setAccent.onchange = () => save({ accent: setAccent.value });
  setText.onchange = () => save({ textSize: setText.value });
  setMotion.onchange = () => save({ reduceMotion: setMotion.checked });
  setContrast.onchange = () => save({ highContrast: setContrast.checked });

  setHomeTab.onchange = () => save({ homeTab: setHomeTab.value });
  setTips.onchange = () => save({ showTips: setTips.checked });
  setSounds.onchange = () => save({ uiSounds: setSounds.checked });

  // export/import local profile (helps testing)
  btnExport.onclick = async () => {
    const p = await getProfile();
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "parent-support-local-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  btnImport.onclick = () => importFile.click();

  importFile.onchange = async () => {
    errEl.textContent = "";
    const file = importFile.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // only accept expected fields
      const patch = {};

      if (data?.settings && typeof data.settings === "object") {
        patch.settings = { ...defaultSettings, ...data.settings };
      }

      if (Array.isArray(data.q1Selections)) patch.q1Selections = data.q1Selections;
      if (Array.isArray(data.q2Selections)) patch.q2Selections = data.q2Selections;
      if (Number.isFinite(data.q3Scale)) patch.q3Scale = data.q3Scale;
      if (typeof data.onboardingComplete === "boolean") patch.onboardingComplete = data.onboardingComplete;

      await updateProfile(patch);

      const p2 = await getProfile();
      const s2 = { ...defaultSettings, ...(p2.settings || {}) };
      applySettingsToDOM(s2);

      outEl.textContent = "Imported.";
      setTimeout(() => (outEl.textContent = ""), 900);
    } catch (e) {
      errEl.textContent = e?.message || String(e);
    } finally {
      importFile.value = "";
    }
  };

  // account controls
  btnSignOut.onclick = async () => {
    await signOut();
    go("/login");
  };

  btnResetOnboarding.onclick = async () => {
    await resetOnboardingOnly();
    go("/onboarding");
  };

  btnReset.onclick = async () => {
    await resetLocalApp();
    go("/login");
  };
}

async function initQuiz() {
  const errEl = document.querySelector("#quizErr");
  const titleEl = document.querySelector("#quizTitle");
  const metaEl = document.querySelector("#quizMeta");
  const qEl = document.querySelector("#quizQuestion");
  const choicesEl = document.querySelector("#quizChoices");
  const pillEl = document.querySelector("#quizPillStatus");

  const btnBack = document.querySelector("#quizBack");
  const btnNext = document.querySelector("#quizNext");

  // Panels
  const quizPanel = document.querySelector("#quizPanel");
  const resultsPanel = document.querySelector("#quizResults");

  // Results elements
  const gradePill = document.querySelector("#quizGradePill");
  const resultMsg = document.querySelector("#quizResultMsg");
  const scoreFill = document.querySelector("#quizScoreFill");
  const scoreText = document.querySelector("#quizScoreText");
  const btnReturn = document.querySelector("#quizReturnBtn");
  const btnReview = document.querySelector("#quizReviewBtn");

  if (!titleEl || !metaEl || !qEl || !choicesEl || !btnBack || !btnNext || !pillEl) {
    console.error("Quiz view missing elements. Check views/quiz.html.");
    return;
  }

  errEl.textContent = "";

const hash = window.location.hash || "";
const query = hash.includes("?") ? hash.split("?")[1] : "";
const params = new URLSearchParams(query);
  const activityId = params.get("id") || "quiz-1";

  // Placeholder quiz bank
  const QUIZZES = {
    "quiz-1": {
      title: "Quiz 1",
      questions: [
        { q: "Placeholder question 1?", choices: ["Answer A", "Answer B", "Answer C", "Answer D"], correct: 0 },
        { q: "Placeholder question 2?", choices: ["Option 1", "Option 2", "Option 3", "Option 4"], correct: 1 },
        { q: "Placeholder question 3?", choices: ["Choice 1", "Choice 2", "Choice 3", "Choice 4"], correct: 2 }
      ]
    },
    "quiz-2": {
      title: "Quiz 2",
      questions: [
        { q: "Placeholder question 1?", choices: ["A", "B", "C", "D"], correct: 0 },
        { q: "Placeholder question 2?", choices: ["A", "B", "C", "D"], correct: 1 },
        { q: "Placeholder question 3?", choices: ["A", "B", "C", "D"], correct: 2 }
      ]
    },
    "quiz-3": {
      title: "Quiz 3",
      questions: [
        { q: "Placeholder question 1?", choices: ["A", "B", "C", "D"], correct: 0 },
        { q: "Placeholder question 2?", choices: ["A", "B", "C", "D"], correct: 1 },
        { q: "Placeholder question 3?", choices: ["A", "B", "C", "D"], correct: 2 }
      ]
    },
    "quiz-4": {
      title: "Quiz 4",
      questions: [
        { q: "Placeholder question 1?", choices: ["A", "B", "C", "D"], correct: 0 },
        { q: "Placeholder question 2?", choices: ["A", "B", "C", "D"], correct: 1 },
        { q: "Placeholder question 3?", choices: ["A", "B", "C", "D"], correct: 2 }
      ]
    },
    "quiz-5": {
  title: "Quiz 5",
  questions: [
    { q: "Placeholder question 1?", choices: ["A", "B", "C", "D"], correct: 0 },
    { q: "Placeholder question 2?", choices: ["A", "B", "C", "D"], correct: 1 },
    { q: "Placeholder question 3?", choices: ["A", "B", "C", "D"], correct: 2 }
  ]
},
"quiz-6": {
  title: "Quiz 6",
  questions: [
    { q: "Placeholder question 1?", choices: ["A", "B", "C", "D"], correct: 0 },
    { q: "Placeholder question 2?", choices: ["A", "B", "C", "D"], correct: 1 },
    { q: "Placeholder question 3?", choices: ["A", "B", "C", "D"], correct: 2 }
  ]
},

    // exercises temporarily mapped
    "ex-1": {
      title: "Exercise 1",
      questions: [
        { q: "Exercise step 1 (placeholder). Choose one.", choices: ["Step A", "Step B", "Step C"], correct: 0 },
        { q: "Exercise step 2 (placeholder). Choose one.", choices: ["Step 1", "Step 2", "Step 3"], correct: 1 }
      ]
    },
    "ex-2": {
      title: "Exercise 2",
      questions: [
        { q: "Exercise step 1 (placeholder). Choose one.", choices: ["A", "B", "C"], correct: 0 },
        { q: "Exercise step 2 (placeholder). Choose one.", choices: ["A", "B", "C"], correct: 1 }
      ]
    }
  };

  const quiz = QUIZZES[activityId] || QUIZZES["quiz-1"];
  titleEl.textContent = quiz.title;

  let index = 0;
  let selectedIndex = null;
  let score = 0;
  const answers = []; // store selected choices for review

  function showQuizPanel() {
    if (quizPanel) quizPanel.style.display = "block";
    if (resultsPanel) resultsPanel.style.display = "none";
  }

  function showResultsPanel() {
    if (quizPanel) quizPanel.style.display = "none";
    if (resultsPanel) resultsPanel.style.display = "block";
  }

  function renderQuestion() {
    errEl.textContent = "";
    selectedIndex = null;

    const total = quiz.questions.length;
    metaEl.textContent = `Question ${index + 1} of ${total}`;
    const current = quiz.questions[index];
    qEl.textContent = current.q;

    pillEl.textContent = "In progress";

    choicesEl.innerHTML = "";
    current.choices.forEach((label, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-choice";
      b.textContent = label;
      b.onclick = () => {
        selectedIndex = i;
        [...choicesEl.querySelectorAll(".quiz-choice")].forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
      };
      choicesEl.appendChild(b);
    });

    btnNext.textContent = index === total - 1 ? "Finish" : "Next";
  }

  async function finishQuiz() {
    // Save completion locally (no personal data)
    try {
      const profile = await getProfile();
      const completed = Array.isArray(profile.learningCompleted) ? profile.learningCompleted : [];
      if (!completed.includes(activityId)) completed.push(activityId);

      await updateProfile({
        learningCompleted: completed,
        learningLastCompletedAt: new Date().toISOString()
      });
    } catch (e) {
      // even if saving fails, still show results
      errEl.textContent = e?.message || String(e);
    }

    // Render results UI
    const total = quiz.questions.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    if (pct === 100) {
  showSuccessOverlay({
    title: "Success!",
    subtitle: "Perfect score"
  });
}


    if (gradePill) gradePill.textContent = `${score} / ${total}`;
    if (scoreFill) scoreFill.style.width = `${pct}%`;
    if (scoreText) scoreText.textContent = `${pct}%`;

    if (resultMsg) {
      // Placeholder messaging
      let msg = "Nice work (placeholder).";
      if (pct >= 80) msg = "Excellent (placeholder).";
      else if (pct >= 50) msg = "Good progress (placeholder).";
      else msg = "Keep going (placeholder).";
      resultMsg.textContent = `${msg} Your score: ${score} / ${total}.`;
    }

    if (pillEl) pillEl.textContent = "Completed";

    showResultsPanel();
  }

  btnBack.onclick = () => {
    go("/tracker");
  };

  btnNext.onclick = async () => {
    const current = quiz.questions[index];

    if (selectedIndex === null) {
      errEl.textContent = "Please select an answer (placeholder).";
      return;
    }

    answers[index] = selectedIndex;
    if (selectedIndex === current.correct) score += 1;

    index += 1;

    if (index < quiz.questions.length) {
      renderQuestion();
      return;
    }

    await finishQuiz();
  };

  if (btnReturn) {
    btnReturn.onclick = () => {
      go("/tracker");
    };
  }

  if (btnReview) {
    btnReview.onclick = () => {
      // Placeholder “review” = restart quiz (easy + works)
      index = 0;
      score = 0;
      answers.length = 0;
      showQuizPanel();
      renderQuestion();
    };
  }

  // Start
  showQuizPanel();
  renderQuestion();
}


