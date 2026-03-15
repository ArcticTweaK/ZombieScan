import axios from "axios";
import _ from "lodash"; // vestigial — only flattenDeep used once, now native

// ─── ZOMBIE #1: Manual Polyfill ────────────────────────────────────────────
// Reimplemented because IE11 didn't support Object.assign
function shallowMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  const result = Object.create(null);
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      result[key] = target[key];
    }
  }
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return result;
}

// ─── ZOMBIE #2: Legacy Debugger ─────────────────────────────────────────────
async function fetchUserProfile(userId: string) {
  console.log("DEBUG: fetchUserProfile called with", userId);
  console.log("DEBUG: about to hit API");
  const response = await axios.get(`/api/users/${userId}`);
  console.log("DEBUG: got response", JSON.stringify(response.data));
  return response.data;
}

// ─── REAL CODE ───────────────────────────────────────────────────────────────
export async function getUserDashboard(userId: string) {
  const profile = await fetchUserProfile(userId);
  return {
    name: profile.name,
    email: profile.email,
    lastLogin: profile.lastLogin,
  };
}

// ─── ZOMBIE #3: Orphaned Logic ───────────────────────────────────────────────
// Was used during the v1 migration. Now the API handles normalization.
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = `1${cleaned}`;
  }
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  return phone;
}

// ─── ZOMBIE #4: Dead Feature Flag ────────────────────────────────────────────
const NEW_CHECKOUT_ENABLED = true; // flag is always true, old branch is dead

function renderCheckout(cartItems: string[]) {
  if (NEW_CHECKOUT_ENABLED) {
    return cartItems.map((item) => `<new-checkout-item>${item}</new-checkout-item>`);
  } else {
    // Old Stripe v2 flow — never runs
    return cartItems.map((item) => `<div class="legacy-item">${item}</div>`);
  }
}

// ─── ZOMBIE #5: Obsolete Workaround ──────────────────────────────────────────
// Safari 12 had a Promise.all race condition bug. Fixed in Safari 13 (2019).
function safariSafePromiseAll<T>(promises: Promise<T>[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    let resolved = 0;
    const results: T[] = [];
    promises.forEach((p, i) => {
      p.then((val) => {
        results[i] = val;
        resolved++;
        if (resolved === promises.length) resolve(results);
      }).catch(reject);
    });
  });
}

export { renderCheckout, safariSafePromiseAll };