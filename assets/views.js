// assets/views.js
import { go } from "./router.js";
import { passkeySignUp, passkeySignIn, getProfile, updateProfile, signOut, resetLocalApp } from "./auth.js";

const STORAGE_KEYS = {
  helper: "chosenHelper",
  interests: "chosenInterests",
  mode: "appMode",
  theme: "appTheme"
};

function showConfirmation(message = "Done") {
  let overlay = document.querySelector("#confirmOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "confirmOverlay";
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-tick" aria-hidden="true"></div>
        <div class="confirm-message"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const msgEl = overlay.querySelector(".confirm-message");
  if (msgEl) msgEl.textContent = message;

  overlay.classList.add("show");

  setTimeout(() => {
    overlay.classList.remove("show");
    go("/home");
  }, 1000);
}

const SETTINGS_DEFAULTS = {
  textSize: "medium",
  highContrast: false,
  reduceMotion: false,
  largeTargets: false,
  appLock: false,
  autoLock: "5m",
  hideBalances: false,
  notifications: true,
  paymentAlerts: true,
  billReminders: true,
  weeklySummary: true,
  sounds: true,
  haptics: true,
  dataSaver: false,
  location: false,
  marketing: false,
  statements: "pdf"
};

function applySettingsToDOM(settings) {
  const html = document.documentElement;
  const sizeMap = {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px"
  };
  html.style.setProperty("--base-font", sizeMap[settings.textSize] || "16px");
  html.setAttribute("data-contrast", settings.highContrast ? "high" : "normal");
  html.setAttribute("data-motion", settings.reduceMotion ? "reduce" : "normal");
  html.setAttribute("data-tap", settings.largeTargets ? "large" : "normal");
}

function setMode(mode) {
  document.documentElement.setAttribute("data-mode", mode);
  localStorage.setItem(STORAGE_KEYS.mode, mode);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function hydrateTheme() {
  const mode = localStorage.getItem(STORAGE_KEYS.mode) || "light";
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || "stars";
  setMode(mode);
  setTheme(theme);
}

export async function initView(path) {
  hydrateTheme();
  const profile = await getProfile();
  applySettingsToDOM({ ...SETTINGS_DEFAULTS, ...(profile.settings || {}) });
  const brand = document.querySelector(".brand");
  const avatar = document.querySelector(".avatar-btn");
  if (brand) brand.onclick = () => go("/home");
  if (avatar) avatar.onclick = () => go("/account");

  if (path === "/login") return initLogin();
  if (path === "/splash") return initSplash();
  if (path === "/onboarding") return initOnboarding();
  if (path === "/home") return initHome();
  if (path === "/account") return initAccount();
  if (path === "/friends") return initFriends();
  if (path === "/shopping-list") return initShoppingList();
  if (path === "/payments") return initPayments();
  if (path === "/bill-splitting") return initBillSplitting();
  if (path === "/insights") return initInsights();
  if (path === "/budget-pots") return initBudgetPots();
  if (path === "/deal-dash") return initDealDash();
  if (path === "/money-minutes") return initMoneyMinutes();
  if (path === "/settings") return initSettings();
}

function initAccount() {
  const nameEl = document.querySelector("#accountName");
  const avatarEl = document.querySelector("#accountAvatar");
  const confidenceEl = document.querySelector("#accountConfidence");
  const interestsWrap = document.querySelector("#accountInterests");
  const createdEl = document.querySelector("#accountCreated");
  const editBtn = document.querySelector("#editAvatarBtn");
  const removeBtn = document.querySelector("#removeAvatarBtn");
  const fileInput = document.querySelector("#avatarInput");
  const accountSignOut = document.querySelector("#accountSignOutBtn");
  const accountReset = document.querySelector("#accountResetBtn");
  const accountDelete = document.querySelector("#accountDeleteBtn");
  const openFriendsBtn = document.querySelector("#openFriendsBtn");

  const interestLabels = {
    films: "🎬 Films/TV",
    music: "🎵 Music",
    days: "☀️ Days out",
    food: "🍴 Food",
    clothing: "👕 Clothing",
    coffee: "☕ Coffee",
    concerts: "🎤 Concerts",
    tech: "💻 Tech",
    gaming: "🎮 Gaming",
    travel: "✈️ Travel"
  };

  const confidenceLabels = {
    beginner: "Beginner with finance",
    comfortable: "Comfortable with finance",
    confident: "Confident with finance",
    expert: "Expert with finance"
  };

  getProfile().then((profile) => {
    if (nameEl) nameEl.textContent = profile.name || "Your name";
    if (confidenceEl) confidenceEl.textContent = confidenceLabels[profile.financeCompetency] || "Finance confidence not set";

    if (avatarEl) {
      if (profile.avatarDataUrl) {
        avatarEl.style.backgroundImage = `url(${profile.avatarDataUrl})`;
        avatarEl.textContent = "";
        avatarEl.classList.add("has-photo");
      } else {
        avatarEl.style.backgroundImage = "";
        avatarEl.textContent = (profile.name || "?").charAt(0).toUpperCase() || "?";
        avatarEl.classList.remove("has-photo");
      }
    }

    if (interestsWrap) {
      const raw = localStorage.getItem(STORAGE_KEYS.interests) || "";
      const ids = raw.split(",").filter(Boolean);
      interestsWrap.innerHTML = "";
      if (!ids.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No interests saved yet.";
        interestsWrap.appendChild(empty);
      } else {
        ids.forEach((id) => {
          const card = document.createElement("div");
          card.className = "interest-card selected";
          card.textContent = interestLabels[id] || id;
          interestsWrap.appendChild(card);
        });
      }
    }

    if (createdEl) {
      const date = profile.createdAt ? new Date(profile.createdAt) : null;
      createdEl.textContent = date ? date.toLocaleDateString() : "—";
    }
  });

  if (editBtn && fileInput) {
    editBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || "");
        await updateProfile({ avatarDataUrl: dataUrl });
        if (avatarEl) {
          avatarEl.style.backgroundImage = `url(${dataUrl})`;
          avatarEl.textContent = "";
          avatarEl.classList.add("has-photo");
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = "";
    };
  }

  if (removeBtn) {
    removeBtn.onclick = async () => {
      await updateProfile({ avatarDataUrl: "" });
      if (avatarEl) {
        avatarEl.style.backgroundImage = "";
        avatarEl.classList.remove("has-photo");
      }
      const profile = await getProfile();
      if (avatarEl) avatarEl.textContent = (profile.name || "?").charAt(0).toUpperCase() || "?";
    };
  }

  if (accountSignOut) {
    accountSignOut.onclick = () => {
      signOut().then(() => go("/login"));
    };
  }

  if (accountReset) {
    accountReset.onclick = () => {
      resetLocalApp().then(() => go("/splash"));
    };
  }

  if (accountDelete) {
    accountDelete.onclick = () => {
      const ok = window.confirm("Delete this account and all local data? This cannot be undone.");
      if (!ok) return;
      resetLocalApp().then(() => go("/splash"));
    };
  }

  if (openFriendsBtn) {
    openFriendsBtn.onclick = () => go("/friends");
  }
}

function initSplash() {
  const enterBtn = document.querySelector("#splashEnterBtn");
  if (enterBtn) {
    enterBtn.onclick = async () => {
      go("/login");
    };
  }

  setTimeout(async () => {
    const auth = await getAuthState();
    if (auth?.signedIn) {
      const profile = await getProfile();
      if (!profile?.onboardingDone) {
        go("/onboarding");
        return;
      }
      go("/home");
      return;
    }
    go("/login");
  }, 1000);
}

async function initLogin() {
  const err = document.querySelector("#loginErr");
  const btnUp = document.querySelector("#btnPasskeyUp");
  const btnIn = document.querySelector("#btnPasskeyIn");

  if (btnUp) {
    btnUp.onclick = async () => {
      if (err) err.textContent = "";
      try {
        await passkeySignUp();
        go("/onboarding");
      } catch (e) {
        if (err) err.textContent = e?.message || String(e);
      }
    };
  }

  if (btnIn) {
    btnIn.onclick = async () => {
      if (err) err.textContent = "";
      try {
        await passkeySignIn();
        const profile = await getProfile();
        if (!profile?.onboardingDone) go("/onboarding");
        else go("/home");
      } catch (e) {
        if (err) err.textContent = e?.message || String(e);
      }
    };
  }
}

function initHome() {
  const filterBtns = document.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll("[data-transaction]");
  const sendBtn = document.querySelector("#homeSendMoney");
  const potsBtn = document.querySelector("#homeBudgetPots");
  const viewAllPots = document.querySelector("#viewAllPots");
  const potLinks = document.querySelectorAll(".pot-link");
  const openShoppingList = document.querySelector("#openShoppingList");

  if (sendBtn) sendBtn.onclick = () => go("/payments");
  if (potsBtn) potsBtn.onclick = () => go("/budget-pots");
  if (viewAllPots) viewAllPots.onclick = () => go("/budget-pots");
  potLinks.forEach((btn) => {
    btn.onclick = () => go(btn.dataset.to);
  });
  if (openShoppingList) openShoppingList.onclick = () => go("/shopping-list");

  getProfile().then((profile) => {
    const settings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}) };
    document.body.classList.toggle("balance-hidden", !!settings.hideBalances);
    const nameEl = document.querySelector("#homeName");
    if (nameEl) nameEl.textContent = profile.name || "there";
  });

  filterBtns.forEach((btn) => {
    btn.onclick = () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
      items.forEach((item) => {
        if (filter === "all") {
          item.classList.remove("hidden");
          return;
        }
        item.classList.toggle("hidden", item.dataset.transaction !== filter);
      });
    };
  });
}

function initShoppingList() {
  const input = document.querySelector("#shoppingInput");
  const addBtn = document.querySelector("#shoppingAddBtn");
  const listEl = document.querySelector("#shoppingList");

  const render = async () => {
    const profile = await getProfile();
    const items = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No items yet.";
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "shopping-item";

      const name = document.createElement("div");
      name.textContent = item;
      name.className = "shopping-name";

      const actions = document.createElement("div");
      actions.className = "shopping-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "action-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = async () => {
        const next = window.prompt("Edit item", item);
        if (!next || !next.trim()) return;
        const profileNow = await getProfile();
        const list = Array.isArray(profileNow.shoppingList) ? profileNow.shoppingList : [];
        list[index] = next.trim();
        await updateProfile({ shoppingList: list });
        render();
      };

      const removeBtn = document.createElement("button");
      removeBtn.className = "action-btn";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = async () => {
        const profileNow = await getProfile();
        const list = Array.isArray(profileNow.shoppingList) ? profileNow.shoppingList : [];
        list.splice(index, 1);
        await updateProfile({ shoppingList: list });
        render();
      };

      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      row.appendChild(name);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  };

  const addItem = async () => {
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    const profile = await getProfile();
    const list = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    list.push(val);
    await updateProfile({ shoppingList: list });
    input.value = "";
    render();
  };

  if (addBtn) addBtn.onclick = addItem;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === "Enter") addItem();
    };
  }

  render();
}

function initPayments() {
  const splitLink = document.querySelector("#goSplitBill");
  const insightsLink = document.querySelector("#goInsights");
  const sendBtn = document.querySelector("#sendMoneyBtn");
  const sendToSelect = document.querySelector("#sendToSelect");
  if (splitLink) splitLink.onclick = () => go("/bill-splitting");
  if (insightsLink) insightsLink.onclick = () => go("/insights");
  if (sendBtn) sendBtn.onclick = () => showConfirmation("Money sent");

  if (sendToSelect) {
    getProfile().then((profile) => {
      const friends = Array.isArray(profile.friends) ? profile.friends : [];
      sendToSelect.innerHTML = '<option value="">Select recipient</option>';
      if (!friends.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No friends yet";
        sendToSelect.appendChild(opt);
        return;
      }
      friends.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.name;
        sendToSelect.appendChild(opt);
      });
    });
  }
}

function initBillSplitting() {
  const sendLink = document.querySelector("#goSendMoney");
  const insightsLink = document.querySelector("#goInsights");
  const splitBtn = document.querySelector("#splitBillBtn");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (insightsLink) insightsLink.onclick = () => go("/insights");
  if (splitBtn) splitBtn.onclick = () => showConfirmation("Bill split");
}

function initInsights() {
  const sendLink = document.querySelector("#goSendMoney");
  const splitLink = document.querySelector("#goSplitBill");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (splitLink) splitLink.onclick = () => go("/bill-splitting");
}

function initBudgetPots() {
  const moveBtn = document.querySelector("#moveMoneyBtn");
  const potLinks = document.querySelectorAll(".pot-link");
  if (moveBtn) moveBtn.onclick = () => go("/payments");
  potLinks.forEach((btn) => {
    btn.onclick = () => go(btn.dataset.to);
  });
}

function initDealDash() {
  const search = document.querySelector("#dealSearch");
  const chips = document.querySelectorAll("[data-sort]");
  const label = document.querySelector("#dealSortLabel");

  if (!chips.length) return;
  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      if (label) label.textContent = chip.dataset.sort;
    };
  });

  if (search) {
    search.oninput = () => {
      const val = search.value.trim();
      search.dataset.hasValue = val ? "true" : "false";
    };
  }
}

function initFriends() {
  const input = document.querySelector("#friendSearchInput");
  const results = document.querySelector("#friendSearchResults");
  const requestsWrap = document.querySelector("#friendRequests");
  const listWrap = document.querySelector("#friendList");

  const render = (profile) => {
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];

    if (requestsWrap) {
      requestsWrap.innerHTML = "";
      if (!requests.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No pending requests.";
        requestsWrap.appendChild(empty);
      } else {
        requests.forEach((req) => {
          const row = document.createElement("div");
          row.className = "settings-item";
          row.innerHTML = `<span>${req.name}</span>`;
          const actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "8px";
          const accept = document.createElement("button");
          accept.className = "action-btn";
          accept.textContent = "Accept";
          const decline = document.createElement("button");
          decline.className = "action-btn";
          decline.textContent = "Decline";
          accept.onclick = async () => {
            const nextFriends = [...friends, req];
            const nextRequests = requests.filter((r) => r.id !== req.id);
            await updateProfile({ friends: nextFriends, friendRequests: nextRequests });
            const updated = await getProfile();
            render(updated);
          };
          decline.onclick = async () => {
            const nextRequests = requests.filter((r) => r.id !== req.id);
            await updateProfile({ friendRequests: nextRequests });
            const updated = await getProfile();
            render(updated);
          };
          actions.appendChild(accept);
          actions.appendChild(decline);
          row.appendChild(actions);
          requestsWrap.appendChild(row);
        });
      }
    }

    if (listWrap) {
      listWrap.innerHTML = "";
      if (!friends.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No friends added yet.";
        listWrap.appendChild(empty);
      } else {
        friends.forEach((f) => {
          const row = document.createElement("div");
          row.className = "settings-item";
          row.innerHTML = `<span>${f.name}</span><span class=\"muted\">${f.handle || ""}</span>`;
          listWrap.appendChild(row);
        });
      }
    }
  };

  const search = async (query) => {
    const profile = await getProfile();
    const directory = Array.isArray(profile.friendDirectory) ? profile.friendDirectory : [];
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];
    const q = query.trim().toLowerCase();
    if (!results) return;
    results.innerHTML = "";
    if (!q) return;

    const matches = directory.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.handle || "").toLowerCase().includes(q)
    );

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No matches found.";
      results.appendChild(empty);
      return;
    }

    matches.forEach((person) => {
      const row = document.createElement("div");
      row.className = "friend-result";
      const name = document.createElement("div");
      name.innerHTML = `<strong>${person.name}</strong> <span class=\"muted\">${person.handle || ""}</span>`;
      const btn = document.createElement("button");
      btn.className = "action-btn";
      const alreadyFriend = friends.some((f) => f.id === person.id);
      const alreadyRequested = requests.some((r) => r.id === person.id);
      btn.disabled = alreadyFriend || alreadyRequested;
      btn.textContent = alreadyFriend ? "Friends" : alreadyRequested ? "Requested" : "Add";
      btn.onclick = async () => {
        if (alreadyFriend || alreadyRequested) return;
        const nextRequests = [...requests, person];
        await updateProfile({ friendRequests: nextRequests });
        const updated = await getProfile();
        render(updated);
        search(query);
      };
      row.appendChild(name);
      row.appendChild(btn);
      results.appendChild(row);
    });
  };

  getProfile().then((profile) => render(profile));

  if (input) {
    input.oninput = () => search(input.value);
  }
}

function initMoneyMinutes() {
  const reels = document.querySelectorAll(".reel-card");
  reels.forEach((reel) => {
    const video = reel.querySelector("video");
    const btn = reel.querySelector(".reel-sound");
    if (!video || !btn) return;

    const updateIcon = () => {
      btn.textContent = video.muted ? "🔇" : "🔊";
    };

    btn.onclick = async () => {
      video.muted = !video.muted;
      try {
        await video.play();
      } catch {
        // ignore autoplay restrictions
      }
      updateIcon();
    };

    updateIcon();
  });
}

function initSettings() {
  const lightBtn = document.querySelector("#modeLight");
  const darkBtn = document.querySelector("#modeDark");
  const themeCards = document.querySelectorAll("[data-theme-card]");
  const faceToggle = document.querySelector("#faceToggle");
  const simulateBtn = document.querySelector("#simulateOnboardingBtn");
  const signOutBtn = document.querySelector("#signOutBtn");
  const resetAccountBtn = document.querySelector("#resetAccountBtn");
  const deleteAccountBtn = document.querySelector("#deleteAccountBtn");
  const setTextSize = document.querySelector("#setTextSize");
  const setContrast = document.querySelector("#setContrast");
  const setMotion = document.querySelector("#setMotion");
  const setLargeTargets = document.querySelector("#setLargeTargets");
  const setAppLock = document.querySelector("#setAppLock");
  const setAutoLock = document.querySelector("#setAutoLock");
  const setBalancePrivacy = document.querySelector("#setBalancePrivacy");
  const setNotifications = document.querySelector("#setNotifications");
  const setPaymentAlerts = document.querySelector("#setPaymentAlerts");
  const setBillReminders = document.querySelector("#setBillReminders");
  const setWeeklySummary = document.querySelector("#setWeeklySummary");
  const setSounds = document.querySelector("#setSounds");
  const setHaptics = document.querySelector("#setHaptics");
  const setDataSaver = document.querySelector("#setDataSaver");
  const setLocation = document.querySelector("#setLocation");
  const setMarketing = document.querySelector("#setMarketing");
  const setStatements = document.querySelector("#setStatements");

  const currentMode = localStorage.getItem(STORAGE_KEYS.mode) || "light";
  const currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || "stars";

  if (lightBtn && darkBtn) {
    const setActiveMode = (mode) => {
      lightBtn.classList.toggle("active", mode === "light");
      darkBtn.classList.toggle("active", mode === "dark");
      setMode(mode);
    };

    lightBtn.onclick = () => setActiveMode("light");
    darkBtn.onclick = () => setActiveMode("dark");
    setActiveMode(currentMode);
  }

  themeCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.themeCard === currentTheme);
    card.onclick = () => {
      themeCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      setTheme(card.dataset.themeCard);
    };
  });

  if (faceToggle) {
    const saved = localStorage.getItem("faceIdEnabled") === "true";
    faceToggle.checked = saved;
    faceToggle.onchange = () => localStorage.setItem("faceIdEnabled", String(faceToggle.checked));
  }

  getProfile().then((profile) => {
    const settings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}) };
    if (setTextSize) setTextSize.value = settings.textSize;
    if (setContrast) setContrast.checked = !!settings.highContrast;
    if (setMotion) setMotion.checked = !!settings.reduceMotion;
    if (setLargeTargets) setLargeTargets.checked = !!settings.largeTargets;
    if (setAppLock) setAppLock.checked = !!settings.appLock;
    if (setAutoLock) setAutoLock.value = settings.autoLock;
    if (setBalancePrivacy) setBalancePrivacy.checked = !!settings.hideBalances;
    if (setNotifications) setNotifications.checked = !!settings.notifications;
    if (setPaymentAlerts) setPaymentAlerts.checked = !!settings.paymentAlerts;
    if (setBillReminders) setBillReminders.checked = !!settings.billReminders;
    if (setWeeklySummary) setWeeklySummary.checked = !!settings.weeklySummary;
    if (setSounds) setSounds.checked = !!settings.sounds;
    if (setHaptics) setHaptics.checked = !!settings.haptics;
    if (setDataSaver) setDataSaver.checked = !!settings.dataSaver;
    if (setLocation) setLocation.checked = !!settings.location;
    if (setMarketing) setMarketing.checked = !!settings.marketing;
    if (setStatements) setStatements.value = settings.statements;
  });

  const persist = async (patch) => {
    const profile = await getProfile();
    const nextSettings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}), ...patch };
    await updateProfile({ settings: nextSettings });
    applySettingsToDOM(nextSettings);
    document.body.classList.toggle("balance-hidden", !!nextSettings.hideBalances);
  };

  if (setTextSize) setTextSize.onchange = () => persist({ textSize: setTextSize.value });
  if (setContrast) setContrast.onchange = () => persist({ highContrast: setContrast.checked });
  if (setMotion) setMotion.onchange = () => persist({ reduceMotion: setMotion.checked });
  if (setLargeTargets) setLargeTargets.onchange = () => persist({ largeTargets: setLargeTargets.checked });
  if (setAppLock) setAppLock.onchange = () => persist({ appLock: setAppLock.checked });
  if (setAutoLock) setAutoLock.onchange = () => persist({ autoLock: setAutoLock.value });
  if (setBalancePrivacy) setBalancePrivacy.onchange = () => persist({ hideBalances: setBalancePrivacy.checked });
  if (setNotifications) setNotifications.onchange = () => persist({ notifications: setNotifications.checked });
  if (setPaymentAlerts) setPaymentAlerts.onchange = () => persist({ paymentAlerts: setPaymentAlerts.checked });
  if (setBillReminders) setBillReminders.onchange = () => persist({ billReminders: setBillReminders.checked });
  if (setWeeklySummary) setWeeklySummary.onchange = () => persist({ weeklySummary: setWeeklySummary.checked });
  if (setSounds) setSounds.onchange = () => persist({ sounds: setSounds.checked });
  if (setHaptics) setHaptics.onchange = () => persist({ haptics: setHaptics.checked });
  if (setDataSaver) setDataSaver.onchange = () => persist({ dataSaver: setDataSaver.checked });
  if (setLocation) setLocation.onchange = () => persist({ location: setLocation.checked });
  if (setMarketing) setMarketing.onchange = () => persist({ marketing: setMarketing.checked });
  if (setStatements) setStatements.onchange = () => persist({ statements: setStatements.value });

  if (simulateBtn) {
    simulateBtn.onclick = () => {
      updateProfile({ onboardingDone: false, name: "", financeCompetency: "" }).then(() => go("/splash"));
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = () => {
      signOut().then(() => go("/login"));
    };
  }

  if (resetAccountBtn) {
    resetAccountBtn.onclick = () => {
      resetLocalApp().then(() => go("/splash"));
    };
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.onclick = () => {
      const ok = window.confirm("Delete this account and all local data? This cannot be undone.");
      if (!ok) return;
      resetLocalApp().then(() => go("/splash"));
    };
  }
}

function initOnboarding() {
  const step1 = document.querySelector("#onboardStep1");
  const step2 = document.querySelector("#onboardStep2");
  const nextBtn = document.querySelector("#onboardNext");
  const finishBtn = document.querySelector("#onboardFinish");
  const skipBtn = document.querySelector("#onboardSkip");
  const helperCards = document.querySelectorAll("[data-helper]");
  const interestCards = document.querySelectorAll("[data-interest]");
  const interestErr = document.querySelector("#interestErr");
  const nameInput = document.querySelector("#onboardName");
  const competencySelect = document.querySelector("#onboardCompetency");

  let currentStep = 1;
  let chosenHelper = localStorage.getItem(STORAGE_KEYS.helper) || "";
  let chosenInterests = new Set(
    (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean)
  );

  const renderStep = () => {
    if (step1) {
      const show = currentStep === 1;
      step1.classList.toggle("hidden", !show);
      step1.style.display = show ? "block" : "none";
      if (show) step1.removeAttribute("hidden");
      else step1.setAttribute("hidden", "hidden");
      step1.setAttribute("aria-hidden", show ? "false" : "true");
    }
    if (step2) {
      const show = currentStep === 2;
      step2.classList.toggle("hidden", !show);
      step2.style.display = show ? "block" : "none";
      if (show) step2.removeAttribute("hidden");
      else step2.setAttribute("hidden", "hidden");
      step2.setAttribute("aria-hidden", show ? "false" : "true");
      if (show && nameInput) nameInput.focus();
    }
    if (nextBtn) nextBtn.textContent = currentStep === 1 ? "Next" : "Next";
    if (finishBtn) finishBtn.disabled = currentStep !== 2;
  };

  helperCards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.helper === chosenHelper);
    card.onclick = () => {
      chosenHelper = card.dataset.helper;
      helperCards.forEach((c) => c.classList.toggle("selected", c === card));
    };
  });

  interestCards.forEach((card) => {
    const id = card.dataset.interest;
    card.classList.toggle("selected", chosenInterests.has(id));
    card.onclick = () => {
      if (chosenInterests.has(id)) {
        chosenInterests.delete(id);
        card.classList.remove("selected");
      } else {
        chosenInterests.add(id);
        card.classList.add("selected");
      }
    };
  });

  if (skipBtn) {
    skipBtn.onclick = () => {
      updateProfile({ onboardingDone: true }).then(() => go("/home"));
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentStep === 1) {
        if (chosenHelper) {
          localStorage.setItem(STORAGE_KEYS.helper, chosenHelper);
        }
        currentStep = 2;
        renderStep();
        return;
      }
    };
  }

  if (finishBtn) {
    finishBtn.onclick = () => {
      if (currentStep !== 2) return;
      if (step2?.classList.contains("hidden")) return;

      if (interestErr) interestErr.textContent = "";
      if (nameInput && !nameInput.value.trim()) {
        if (interestErr) interestErr.textContent = "Please enter your name.";
        return;
      }
      if (competencySelect && !competencySelect.value) {
        if (interestErr) interestErr.textContent = "Please select your finance confidence.";
        return;
      }
      if (chosenInterests.size < 2 || chosenInterests.size > 3) {
        if (interestErr) interestErr.textContent = "Pick 2 or 3 interests to continue.";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.interests, [...chosenInterests].join(","));
      updateProfile({
        onboardingDone: true,
        name: nameInput.value.trim(),
        financeCompetency: competencySelect.value
      }).then(() => go("/home"));
    };
  }

  getProfile().then((profile) => {
    if (nameInput) nameInput.value = profile?.name || "";
    if (competencySelect) competencySelect.value = profile?.financeCompetency || "";
  });

  renderStep();
}
