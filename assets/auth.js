import { get, set, del } from "./storage.js";

const AUTH_KEY = "auth_state";
const PROFILE_KEY = "profile"; // non-identifying preferences only

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomId(prefix = "user") {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${[...a].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Local-only "account":
 * - We don't store names/emails.
 * - We store whether the device is "signed in" and a random userId.
 * - With passkeys: we store credentialId to use during auth (still not personal).
 */
export async function getAuthState() {
  return (await get(AUTH_KEY)) || { signedIn: false };
}

export async function signOut() {
  const state = await getAuthState();
  // Keep locally-stored sign-in method info (credentialId / pinHash),
  // only mark the session as signed out.
  await set(AUTH_KEY, { ...state, signedIn: false });
}


export async function ensureProfile() {
  const existing = await get(PROFILE_KEY);
  if (existing) return existing;
  const profile = {
    learningTags: [],
    createdAt: new Date().toISOString(),
    // add more non-identifying settings here
  };
  await set(PROFILE_KEY, profile);
  return profile;
}

export async function updateProfile(patch) {
  const profile = (await ensureProfile());
  const next = { ...profile, ...patch, updatedAt: new Date().toISOString() };
  await set(PROFILE_KEY, next);
  return next;
}

export async function getProfile() {
  return await ensureProfile();
}

/**
 * PASSKEYS (WebAuthn)
 * Note: a purely local HTML file may restrict WebAuthn in some browsers.
 * Best used when served via localhost (even a tiny local server).
 */
export async function passkeySignUp() {
  const userId = randomId();
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKey = {
    challenge,
    rp: { name: "Parent Support App (Prototype)" },
    user: {
      id: new TextEncoder().encode(userId),
      name: userId,           // not personal
      displayName: "Local user" // generic
    },
pubKeyCredParams: [
  { type: "public-key", alg: -7 },   // ES256
  { type: "public-key", alg: -257 }  // RS256
],
    authenticatorSelection: { userVerification: "preferred" },
    timeout: 60000,
    attestation: "none",
  };

  const cred = await navigator.credentials.create({ publicKey });
  const rawId = bufToB64url(cred.rawId);

  await set(AUTH_KEY, { signedIn: true, method: "passkey", userId, credentialId: rawId });
  await ensureProfile();
  return true;
}

export async function passkeySignIn() {
  const state = await getAuthState();
  if (!state?.credentialId) throw new Error("No local passkey found. Please sign up on this device first.");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const allowCredentials = [{
    type: "public-key",
    id: new Uint8Array(b64urlToBuf(state.credentialId)),
  }];

  const publicKey = {
    challenge,
    allowCredentials,
    userVerification: "preferred",
    timeout: 60000,
  };

  await navigator.credentials.get({ publicKey });
  await set(AUTH_KEY, { ...state, signedIn: true, method: "passkey" });
  return true;
}

/**
 * Fallback: "Device PIN"
 * - Still no personal data.
 * - PIN hash stored locally only.
 */
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufToB64url(hash);
}

export async function pinSet(pin) {
  if (!pin || pin.length < 4) throw new Error("PIN must be at least 4 digits.");
  const userId = randomId();
  const pinHash = await sha256(pin);
  await set(AUTH_KEY, { signedIn: true, method: "pin", userId, pinHash });
  await ensureProfile();
  return true;
}

export async function pinSignIn(pin) {
  const state = await getAuthState();
  if (!state?.pinHash) throw new Error("No PIN set. Please sign up first.");
  const pinHash = await sha256(pin);
  if (pinHash !== state.pinHash) throw new Error("Incorrect PIN.");
  await set(AUTH_KEY, { ...state, signedIn: true, method: "pin" });
  return true;
}

export async function resetLocalApp() {
  await del(AUTH_KEY);
  await del(PROFILE_KEY);
}

export async function forgetLocalPasskey() {
  const state = await getAuthState();
  if (!state) return;

  // Remove only passkey association; keep other settings if you want.
  const next = { ...state };
  delete next.credentialId;

  // If they were signed in via passkey, sign them out too.
  if (next.method === "passkey") next.signedIn = false;

  // If no other auth method remains, make it clean.
  if (!next.pinHash && !next.credentialId) {
    await set(AUTH_KEY, { signedIn: false });
    return;
  }

  await set(AUTH_KEY, next);
}

export async function resetOnboardingOnly() {
  const profile = await ensureProfile();

  const nextProfile = {
    ...profile,
    q1Selections: [],
    q2Selections: [],
    q3Scale: 5,
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
  };

  await set("profile", nextProfile);
  return true;
}



