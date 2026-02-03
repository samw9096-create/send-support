// assets/router.js

// If you deploy to GitHub Pages, BASE_PATH should be "/REPO_NAME".
// If you're on localhost, it should be "".
// We'll auto-detect it from the first path segment so you don't have to hardcode.
function detectBasePath() {
  // Example:
  //  - localhost: /dashboard  => base ""
  //  - github pages: /myrepo/dashboard => base "/myrepo"
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (!parts.length) return "";
  // Heuristic: if it's GitHub Pages, the first segment is usually the repo name
  // and your app routes are the next segment.
  // If you *do* have a real route at the first segment, this would be wrong,
  // but your app routes start with /login, /dashboard etc, not /<repo>.
  return "/" + parts[0];
}

export const BASE_PATH = detectBasePath();

export function normalizePath(path) {
  // Ensure it starts with /
  if (!path.startsWith("/")) path = "/" + path;
  // Strip query string if present ("/quiz?id=1" -> "/quiz")
  return path.split("?")[0];
}

export function currentPath() {
  // Start with pathname and remove base path if present
  let p = window.location.pathname || "/";
  if (BASE_PATH && p.startsWith(BASE_PATH)) {
    p = p.slice(BASE_PATH.length) || "/";
  }

  // If someone uses hash routing accidentally, support it too:
  // e.g. #/dashboard or #/quiz?id=1
  if (window.location.hash && window.location.hash.startsWith("#/")) {
    p = window.location.hash.slice(1); // "/dashboard"
  }

  p = normalizePath(p);

  // Default route
  if (p === "/") return "/dashboard";
  return p;
}

export function go(path) {
  // Allow query strings in go("/quiz?id=quiz-1")
  const target = path.startsWith("/") ? path : "/" + path;

  // Use BASE_PATH for GitHub Pages
  const full = (BASE_PATH || "") + target;

  history.pushState({}, "", full);
  window.dispatchEvent(new Event("popstate"));
}
