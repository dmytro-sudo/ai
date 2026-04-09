// Module-level store for background generation tasks
// Survives React Router navigation within the same session

const store = {};
const listeners = {};

export function setStore(key, value) {
  store[key] = value;
  try { localStorage.setItem('bg_' + key, JSON.stringify(value)); } catch {}
  if (listeners[key]) listeners[key].forEach(fn => fn(value));
}

export function getStore(key) {
  if (store[key] !== undefined) return store[key];
  try { const v = localStorage.getItem('bg_' + key); return v ? JSON.parse(v) : undefined; } catch {}
  return undefined;
}

export function subscribeStore(key, fn) {
  if (!listeners[key]) listeners[key] = new Set();
  listeners[key].add(fn);
  return () => listeners[key].delete(fn);
}

export function clearStore(key) {
  delete store[key];
  try { localStorage.removeItem('bg_' + key); } catch {}
}