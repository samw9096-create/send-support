// assets/app.js

import { go, currentPath } from "./router.js";
import { initView } from "./views.js";
import { getAuthState, getProfile } from "./auth.js";
import { mountBottomNav, setBottomNavActive, setBottomNavVisible } from "./nav.js";

const app = document.querySelector("#app");

export const routes = {
  "/splash": "./views/splash.html",
  "/login": "./views/login.html",
  "/onboarding": "./views/onboarding.html",
  "/home": "./views/home.html",
  "/account": "./views/account.html",
  "/friends": "./views/friends.html",
  "/shopping-list": "./views/shopping-list.html",
  "/payments": "./views/payments.html",
  "/bill-splitting": "./views/bill-splitting.html",
  "/insights": "./views/insights.html",
  "/budget-pots": "./views/budget-pots.html",
  "/pot-house": "./views/pot-house.html",
  "/pot-car": "./views/pot-car.html",
  "/pot-savings": "./views/pot-savings.html",
  "/deal-dash": "./views/deal-dash.html",
  "/money-minutes": "./views/money-minutes.html",
  "/settings": "./views/settings.html"
};

async function loadView(path) {
  const htmlPath = routes[path];

  if (!htmlPath) {
    console.warn("Unknown route:", path, "redirecting to /home");
    go("/home");
    return;
  }

  const viewUrl = `${htmlPath}?v=20260207`;
  const res = await fetch(viewUrl, { cache: "no-store" });
  if (!res.ok) {
    console.error("Failed to fetch view:", htmlPath, res.status);
    go("/home");
    return;
  }

  const html = await res.text();
  app.innerHTML = html;

  app.classList.remove("view-enter");
  void app.offsetWidth;
  app.classList.add("view-enter");

  await initView(path);
}

function mapNavPath(path) {
  if (path === "/budget-pots") return "/home";
  if (path === "/pot-house" || path === "/pot-car" || path === "/pot-savings") return "/home";
  if (path === "/bill-splitting" || path === "/insights") return "/payments";
  if (path === "/deal-dash") return "/deal-dash";
  return path;
}

async function render() {
  const path = currentPath();

  mountBottomNav();

  const navRoutes = new Set([
    "/home",
    "/account",
    "/friends",
    "/shopping-list",
    "/payments",
    "/bill-splitting",
    "/insights",
    "/budget-pots",
    "/pot-house",
    "/pot-car",
    "/pot-savings",
    "/deal-dash",
    "/money-minutes",
    "/settings"
  ]);
  setBottomNavVisible(navRoutes.has(path));
  setBottomNavActive(mapNavPath(path));

  const publicRoutes = new Set(["/login", "/splash"]);
  const auth = await getAuthState();
  if (!auth?.signedIn && !publicRoutes.has(path)) {
    go("/login");
    return;
  }

  if (auth?.signedIn && path !== "/login") {
    const profile = await getProfile();
    if (!profile?.onboardingDone && path !== "/onboarding") {
      go("/onboarding");
      return;
    }
  }

  await loadView(path);
}

window.addEventListener("popstate", render);
window.addEventListener("hashchange", render);
window.addEventListener("routechange", render);

mountBottomNav();
render();
