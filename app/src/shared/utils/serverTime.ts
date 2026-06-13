let serverOffsetMs = 0;
let lastSyncAtMs = 0;

const getNow = () => Date.now();

export const clearServerTimeOffset = () => {
  serverOffsetMs = 0;
  lastSyncAtMs = 0;
};

export const setServerTimeOffset = (serverTimeIso?: string | null) => {
  if (!serverTimeIso) {
    clearServerTimeOffset();
    return;
  }

  const parsed = Date.parse(serverTimeIso);
  if (!Number.isFinite(parsed)) {
    clearServerTimeOffset();
    return;
  }

  const now = getNow();
  serverOffsetMs = parsed - now;
  lastSyncAtMs = now;
};

export const getServerOffsetMs = () => serverOffsetMs;

export const getApproximateServerNow = () => getNow() + serverOffsetMs;

export const getApproximateServerDate = () => new Date(getApproximateServerNow());

export const getApproximateServerIsoString = () =>
  getApproximateServerDate().toISOString();

export const getLastServerSyncAt = () => (lastSyncAtMs ? new Date(lastSyncAtMs) : null);

export const getApproximateServerDateString = () =>
  getApproximateServerIsoString().split("T")[0];
