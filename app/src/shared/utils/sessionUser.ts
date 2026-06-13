const STORAGE_KEY = "session_user_v1";

export type SessionUser = {
  id: string | number;
  role?: string;
  [key: string]: any;
} | null;

let cachedUser: SessionUser = null;
let hasLoaded = false;

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const readFromStorage = (): SessionUser => {
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
};

const writeToStorage = (user: SessionUser) => {
  const storage = getSessionStorage();
  if (!storage) return;
  if (!user) {
    storage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage write errors
  }
};

export const getSessionUser = (): SessionUser => {
  if (!hasLoaded) {
    cachedUser = readFromStorage();
    hasLoaded = true;
  }
  return cachedUser;
};

export const setSessionUser = (user: SessionUser) => {
  cachedUser = user ?? null;
  hasLoaded = true;
  writeToStorage(cachedUser);
};

export const clearSessionUser = () => {
  cachedUser = null;
  hasLoaded = true;
  writeToStorage(null);
};
