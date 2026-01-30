import { go } from "./router.js";
import {
  Q1_TAGS,
  Q2_TAGS,
  Q3_SLIDER,
  loadOnboardingState,
  saveOnboardingState
} from "./onboarding.js";
import { callLocalAI } from "./ai.js";
import { passkeySignUp, passkeySignIn, pinSet, pinSignIn, signOut, resetLocalApp, resetOnboardingOnly, getProfile } from "./auth.js";


function wireBottomNav(activePath) {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.to === activePath);
    b.onclick = () => go(b.dataset.to);
  });
}

export async function initView(path) {
  if (path === "/login") return initLogin();
  if (path === "/onboarding") return initOnboarding();
  if (path === "/dashboard") return initDashboard();
  if (path === "/info") return initInfo();
  if (path === "/tracker") return initTracker();
  if (path === "/settings") return initSettings();
}

async function initLogin() {
  const err = document.querySelector("#err");
  const pin = document.querySelector("#pin");
  const showErr = (e) => (err.textContent = e?.message || String(e));

  document.querySelector("#btnPasskeyUp").onclick = async () => {
    err.textContent = "";
    try { await passkeySignUp(); go("/onboarding"); } catch (e) { showErr(e); }
  };

  document.querySelector("#btnPasskeyIn").onclick = async () => {
    err.textContent = "";
    try { await passkeySignIn(); go("/dashboard"); } catch (e) { showErr(e); }
  };

  document.querySelector("#btnPinUp").onclick = async () => {
    err.textContent = "";
    try { await pinSet(pin.value.trim()); go("/onboarding"); } catch (e) { showErr(e); }
  };

  document.querySelector("#btnPinIn").onclick = async () => {
    err.textContent = "";
    try { await pinSignIn(pin.value.trim()); go("/dashboard"); } catch (e) { showErr(e); }
  };
}

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
  let step = 1; // 1..3

  const QUESTIONS = [
    {
      step: 1,
      type: "pills",
      text: "Question 1 (placeholder): choose any that apply.",
      options: Q1_TAGS,
      get: () => state.q1Selections,
      set: (next) => (state.q1Selections = next),
      validate: () => true, // allow empty for now
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

    // Back button label/behavior
    btnBack.textContent = step === 1 ? "Back to login" : "Back";

    // Next button label
    btnNext.textContent = step === 3 ? "Finish" : "Next";

    // Toggle UI blocks
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
      // Set up slider values
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
    if (step === 1) {
      go("/login");
      return;
    }
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

    // Finish
    try {
      await saveOnboardingState(state);
      go("/dashboard");
    } catch (e) {
      err.textContent = e?.message || String(e);
    }
  };

  render();
}


async function initDashboard() {
  wireBottomNav("/dashboard");

  const q1El = document.querySelector("#dashQ1");
  const q2El = document.querySelector("#dashQ2");
  const q3El = document.querySelector("#dashQ3");
  const errEl = document.querySelector("#dashErr");

  // If the HTML didn't update or IDs differ, fail gracefully (no blank page)
  if (!q1El || !q2El || !q3El || !errEl) {
    console.error("Dashboard missing elements:", {
      dashQ1: !!q1El, dashQ2: !!q2El, dashQ3: !!q3El, dashErr: !!errEl
    });
    return;
  }

  try {
    const profile = await getProfile();

    const q1 = Array.isArray(profile.q1Selections) ? profile.q1Selections : [];
    const q2 = Array.isArray(profile.q2Selections) ? profile.q2Selections : [];
    const q3 = Number.isFinite(profile.q3Scale) ? profile.q3Scale : null;

    const q1Map = new Map(Q1_TAGS.map(t => [t.id, t.label]));
    const q2Map = new Map(Q2_TAGS.map(t => [t.id, t.label]));

    const renderChips = (wrap, ids, map) => {
      wrap.innerHTML = "";
      if (!ids.length) {
        const p = document.createElement("p");
        p.style.color = "var(--muted)";
        p.style.margin = "0";
        p.textContent = "None selected";
        wrap.appendChild(p);
        return;
      }
      for (const id of ids) {
        const chip = document.createElement("div");
        chip.className = "pill selected";
        chip.textContent = map.get(id) || "Unknown option";
        wrap.appendChild(chip);
      }
    };

    renderChips(q1El, q1, q1Map);
    renderChips(q2El, q2, q2Map);
    q3El.textContent = q3 === null ? "—" : String(q3);
    errEl.textContent = "";
  } catch (e) {
    errEl.textContent = e?.message || String(e);
  }
}



async function initInfo() {
  wireBottomNav("/info");
}

async function initTracker() {
  wireBottomNav("/tracker");
}

async function initSettings() {
  wireBottomNav("/settings");

  document.querySelector("#btnSignOut").onclick = async () => {
    await signOut();
    go("/login");
  };

  document.querySelector("#btnResetOnboarding").onclick = async () => {
    await resetOnboardingOnly();
    go("/onboarding");
  };

  document.querySelector("#btnReset").onclick = async () => {
    await resetLocalApp();
    go("/login");
  };

  document.querySelector("#btnForgetPasskey").onclick = async () => {
  await forgetLocalPasskey();
  go("/login");
};

}
