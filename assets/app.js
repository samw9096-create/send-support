import { routes, currentPath, go } from "./router.js";
import { getAuthState, getProfile } from "./auth.js";
import { initView } from "./views.js";
import { mountChatbot } from "./chatbot.js";
import { applySettingsToDOM } from "./theme.js";
import { mountBottomNav, setBottomNavActive, setBottomNavVisible } from "./nav.js";


const app = document.querySelector("#app");

async function loadView(path) {
  const htmlPath = routes[path];
  const res = await fetch(htmlPath, { cache: "no-store" });
  const html = await res.text();

  console.log("Loaded view:", path, "from", htmlPath, "contains dashQ1?", html.includes('id="dashQ1"'));

  app.innerHTML = html;
  await initView(path);
}


async function authGuard(path) {
  const auth = await getAuthState();
  const isAuthed = auth?.signedIn;

  // Public route
  if (path === "/login") return true;

  // Require sign-in
  if (!isAuthed) {
    go("/login");
    return false;
  }

  // Require onboarding before main tabs
  const profile = await getProfile();
  if (!profile.onboardingComplete && path !== "/onboarding") {
    go("/onboarding");
    return false;
  }

  // Prevent returning to onboarding once completed
  if (profile.onboardingComplete && path === "/onboarding") {
    go("/dashboard");
    return false;
  }

  return true;
}

async function render() {
  const path = currentPath();
  const ok = await authGuard(path);
  if (!ok) return;

  await loadView(path);

  // Global nav always mounted (but hidden on login)
  mountBottomNav();

const navRoutes = new Set(["/dashboard", "/info", "/tracker", "/settings"]);
const showNav = navRoutes.has(path);
setBottomNavVisible(showNav);

  setBottomNavActive(path);

  if (path !== "/login") {
    mountChatbot();
  }
}



window.addEventListener("popstate", render);
window.addEventListener("routechange", render);

mountBottomNav();
render();
