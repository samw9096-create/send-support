import { callLocalAI } from "./ai.js";

/**
 * Floating chatbot:
 * - No personal data required.
 * - Uses local placeholder AI now.
 * - Later: swap callLocalAI() to call your Google Cloud endpoint.
 */

let mounted = false;

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) n.appendChild(c);
  return n;
}

function addMsg(body, who) {
  const wrap = document.querySelector("#chatBody");
  const msg = el("div", { class: `chat-msg ${who}` });
  msg.textContent = body;
  wrap.appendChild(msg);
  wrap.scrollTop = wrap.scrollHeight;
}

async function sendMessage() {
  const input = document.querySelector("#chatInput");
  const btn = document.querySelector("#chatSend");
  const text = (input.value || "").trim();
  if (!text) return;

  input.value = "";
  btn.disabled = true;

  addMsg(text, "user");
  addMsg("…", "bot");

  // Replace the last bot "…" message when response arrives
  const wrap = document.querySelector("#chatBody");
  const placeholder = wrap.lastElementChild;

  try {
    // IMPORTANT: do not send personal data. Keep prompts generic.
    const res = await callLocalAI(text);
    placeholder.textContent = res?.text || "No response.";
  } catch (e) {
    placeholder.textContent = `Error: ${e?.message || String(e)}`;
  } finally {
    btn.disabled = false;
  }
}

function toggle(open) {
  const panel = document.querySelector("#chatPanel");
  if (!panel) return;
  panel.classList.toggle("open", open ?? !panel.classList.contains("open"));
}

export function mountChatbot() {
  if (mounted) return;
  mounted = true;

  // Floating button
  const fab = el("button", { class: "chat-fab", id: "chatFab", title: "Open chat" });
  fab.textContent = "AI";

  // Panel
  const panel = el("div", { class: "chat-panel", id: "chatPanel" });

  const header = el("div", { class: "chat-header" }, [
    el("div", { class: "title", text: "AI Chat (Prototype)" }),
    el("button", { class: "secondary", id: "chatClose", type: "button" }, [])
  ]);
  header.querySelector("#chatClose").textContent = "Close";

  const body = el("div", { class: "chat-body", id: "chatBody" });
  const muted = el("div", {
    class: "chat-muted",
    text: "Avoid entering names, contact details, or anything personally identifying. This prototype can be wired to Google Cloud later."
  });

  const footer = el("div", { class: "chat-footer" }, [
    el("input", {
      class: "input",
      id: "chatInput",
      placeholder: "Type a question (no personal info)…",
      autocomplete: "off"
    }),
    el("button", { id: "chatSend", type: "button" }, [])
  ]);
  footer.querySelector("#chatSend").textContent = "Send";

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  panel.appendChild(muted);

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // Events
  fab.onclick = () => toggle(true);
  header.querySelector("#chatClose").onclick = () => toggle(false);

  const input = footer.querySelector("#chatInput");
  footer.querySelector("#chatSend").onclick = sendMessage;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
    if (e.key === "Escape") toggle(false);
  });

  // Initial message
  addMsg("Hi — ask a question and I’ll respond (currently placeholder AI).", "bot");
}
