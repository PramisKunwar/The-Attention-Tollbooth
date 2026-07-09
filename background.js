// The Attention Tollbooth — background service worker
// Manages per-tab timers, focus points, and the procrastination tax badge.

const DEFAULTS = {
  focusPoints: 0,
  highScore: 0,
  currentStreak: 0,
  procrastinationTax: 0,
  history: {}, // { 'YYYY-MM-DD': { earned, lost } }
};

const POINTS = {
  1: 5,
  5: 8,
  15: 15,
  30: 20,
  60: 25,
};

// tabState[tabId] = { minutes, remainingMs, lastActiveAt, expired, committed }
const tabState = {};

async function getStats() {
  const data = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...data };
}

async function setStats(patch) {
  await chrome.storage.local.set(patch);
}

async function updateBadge() {
  const { procrastinationTax } = await getStats();
  const text = procrastinationTax > 0 ? String(procrastinationTax) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#03045E" });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function recordHistory(field, amount) {
  const stats = await getStats();
  const key = todayKey();
  const history = stats.history || {};
  const day = history[key] || { earned: 0, lost: 0 };
  day[field] = (day[field] || 0) + amount;
  history[key] = day;

  // Keep only last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  Object.keys(history).forEach((k) => {
    if (new Date(k).getTime() < cutoff) delete history[k];
  });

  await setStats({ history });
}

async function awardPoints(minutes) {
  const stats = await getStats();
  const gained = POINTS[minutes] || 0;
  const focusPoints = stats.focusPoints + gained;
  const currentStreak = stats.currentStreak + 1;
  const highScore = Math.max(stats.highScore, focusPoints);
  await setStats({ focusPoints, currentStreak, highScore });
  await recordHistory("earned", gained);
  return gained;
}

async function penalize(minutes) {
  const stats = await getStats();
  const potential = POINTS[minutes] || 0;
  const loss = Math.round(potential * 0.3);
  const focusPoints = Math.max(0, stats.focusPoints - loss);
  const procrastinationTax = stats.procrastinationTax + 1;
  await setStats({
    focusPoints,
    procrastinationTax,
    currentStreak: 0,
  });
  await recordHistory("lost", loss);
  await updateBadge();
  return loss;
}

// Timer tick: only decrement active tab
setInterval(async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab) return;
  const state = tabState[activeTab.id];
  if (!state || !state.committed || state.expired) return;

  state.remainingMs -= 1000;
  if (state.remainingMs <= 0) {
    state.remainingMs = 0;
    state.expired = true;
    await penalize(state.minutes);
    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: "TIME_UP" });
    } catch (e) {
      // content script may not be loaded on this page (e.g. chrome://)
    }
  }
}, 1000);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const tabId = sender.tab?.id;

    if (msg.type === "COMMIT_TIME" && tabId != null) {
      tabState[tabId] = {
        minutes: msg.minutes,
        remainingMs: msg.minutes * 60 * 1000,
        expired: false,
        committed: true,
      };
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "ADD_FIVE" && tabId != null) {
      const state = tabState[tabId];
      if (state) {
        state.remainingMs += 5 * 60 * 1000;
        state.expired = false;
      }
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "CLOSE_TAB" && tabId != null) {
      const state = tabState[tabId];
      if (state && !state.expired && state.committed) {
        const gained = await awardPoints(state.minutes);
        sendResponse({ ok: true, gained });
      } else {
        sendResponse({ ok: true, gained: 0 });
      }
      delete tabState[tabId];
      chrome.tabs.remove(tabId);
      return;
    }

    if (msg.type === "GET_STATE" && tabId != null) {
      sendResponse({ state: tabState[tabId] || null });
      return;
    }
  })();
  return true; // async response
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = tabState[tabId];
  if (state && state.committed && !state.expired) {
    // User closed early → award points
    await awardPoints(state.minutes);
  }
  delete tabState[tabId];
});

// Refresh resets the timer: onUpdated with status 'loading' means reload/navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    delete tabState[tabId];
  }
});

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
