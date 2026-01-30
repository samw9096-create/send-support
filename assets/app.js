import { routes, currentPath, go } from "./router.js";
import { getAuthState, getProfile } from "./auth.js";
import { initView } from "./views.js";
import { mountChatbot } from "./chatbot.js";

const app = document.querySelector("#app");

async function loadView(path) {
  const htmlPath = routes[path];
  const res = await fetch(htmlPath);
  const html = await res.text();

  app.innerHTML = html;

  // Add a smooth view transition every time a route loads
  app.classList.remove("view-enter");
  // force reflow so animation re-triggers
  void app.offsetWidth;
  app.classList.add("view-enter");

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

  // A) Only after login (i.e., not on /login)
  if (path !== "/login") {
    mountChatbot(); // safe: it only mounts once
  }
}

window.addEventListener("popstate", render);
window.addEventListener("routechange", render);

render();
