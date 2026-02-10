// assets/nav.js
import { go } from "./router.js";

let mounted = false;

export function mountBottomNav() {
  if (mounted) return;
  mounted = true;

  const nav = document.createElement("div");
  nav.className = "bottom-nav";
  nav.id = "globalBottomNav";

nav.innerHTML = `
  <div class="bottom-nav-wrap">
    <button class="nav-btn" data-to="/dashboard">Dashboard</button>
    <button class="nav-btn" data-to="/info">Info</button>
    <button class="nav-btn" data-to="/tracker">Learn</button>
    <button class="nav-btn" data-to="/settings">Settings</button>
  </div>
`;


  document.body.appendChild(nav);

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.addEventListener("click", () => go(b.dataset.to));
  });
}

export function setBottomNavVisible(visible) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;
  nav.style.display = visible ? "block" : "none";
}

export function setBottomNavActive(path) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.to === path);
  });
}
