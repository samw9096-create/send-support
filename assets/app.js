// assets/app.js

import { go, currentPath } from "./router.js";
import { getAuthState, getProfile } from "./auth.js";
import { initView } from "./views.js";
import { mountChatbot } from "./chatbot.js";
import { applySettingsToDOM } from "./theme.js";
import { mountBottomNav, setBottomNavActive, setBottomNavVisible } from "./nav.js";

const app = document.querySelector("#app");

export const routes = {
  "/login": "./views/login.html",
  "/onboarding": "./views/onboarding.html",
  "/dashboard": "./views/dashboard.html",
  "/info": "./views/info.html",
  "/tracker": "./views/tracker.html",   // Learning menu lives here
  "/settings": "./views/settings.html",
  "/quiz": "./views/quiz.html"
};

async function loadView(path) {
  const htmlPath = routes[path];

  if (!htmlPath) {
    console.warn("Unknown route:", path, "redirecting to /dashboard");
    go("/dashboard");
    return;
  }

  const res = await fetch(htmlPath);
  if (!res.ok) {
    console.error("Failed to fetch view:", htmlPath, res.status);
    // fallback: don't blank-screen
    go("/dashboard");
    return;
  }

  const html = await res.text();
  app.innerHTML = html;

  // optional: view enter animation class if you have it
  app.classList.remove("view-enter");
  void app.offsetWidth;
  app.classList.add("view-enter");

  await initView(path);
}

// Helper: determine login state using your existing auth module
async function isLoggedIn() {
  const auth = await getAuthState();
  return !!auth?.signedIn;
}

async function authGuard(path) {
  // Public routes (no login required)
  const publicRoutes = new Set(["/login"]);

  if (publicRoutes.has(path)) return true;

  // Everything else requires login
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    go("/login");
    return false;
  }

  return true;
}

async function render() {
  // Normalize route (router.js should already strip ?query)
  const path = currentPath();

  // Ensure nav exists (safe if mountBottomNav is idempotent)
  mountBottomNav();

  // Only show nav on the main tab pages
  const navRoutes = new Set(["/dashboard", "/info", "/tracker", "/settings"]);
  setBottomNavVisible(navRoutes.has(path));
  setBottomNavActive(path);

  const ok = await authGuard(path);
  if (!ok) return;

  // Apply theme/accessibility globally for logged-in routes
  // (If user sets "system", theme.js handles it)
  if (path !== "/login") {
    const profile = await getProfile();
    applySettingsToDOM(profile.settings || {});
  }

  await loadView(path);

  // Chatbot: only after logged-in views render
  if (path !== "/login") {
    mountChatbot();
  }
}

window.addEventListener("popstate", render);
window.addEventListener("hashchange", render);
window.addEventListener("routechange", render);

mountBottomNav();
render();

