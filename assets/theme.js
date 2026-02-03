export function applySettingsToDOM(settings) {
  const html = document.documentElement;

  const s = settings || {};
  const mode = s.mode || "system";

  // If mode is "system", follow OS preference
  if (mode === "system") {
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    html.setAttribute("data-mode", prefersLight ? "light" : "dark");
  } else {
    html.setAttribute("data-mode", mode); // "light" or "dark"
  }

  html.setAttribute("data-accent", s.accent || "blue");
  html.setAttribute("data-text", s.textSize || "normal");
  html.setAttribute("data-motion", s.reduceMotion ? "reduce" : "normal");
  html.setAttribute("data-contrast", s.highContrast ? "high" : "normal");
}
