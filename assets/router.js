export const routes = {
  "/login": "./views/login.html",
  "/onboarding": "./views/onboarding.html",
  "/dashboard": "./views/dashboard.html",
  "/info": "./views/info.html",
  "/tracker": "./views/tracker.html",
  "/settings": "./views/settings.html",
};

export function go(path) {
  history.pushState({}, "", `#${path}`);
  window.dispatchEvent(new Event("routechange"));
}

export function currentPath() {
  const hash = location.hash || "#/login";
  const path = hash.replace("#", "");
  return routes[path] ? path : "/login";
}
