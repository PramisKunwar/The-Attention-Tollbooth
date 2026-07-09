// The Attention Tollbooth — background service worker
// Manages timers, scoring, and cross-tab state.

const DEFAULT_MINUTES = 5;
const DECISION_SECONDS = 10;

// ---------- Storage helpers ----------

async function getState() {
  const { state } = await chrome.storage.local.get('state');
  return state || {
    focusPoints: 0,
    procrastinationTax: 0,
    streakDays: 0,
    lastActiveDate: null,
    dailyFP: 0,
    dailyDate: null,
    tabs: {} // tabId -> {url, allocatedMinutes, startTs, expiresAt, expired}
  };
}

async function setState(state) {
  await chrome.storage.local.set({ state });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function rollDaily(state) {
  const today = todayKey();
  if (state.dailyDate !== today) {
    // Check streak continuation
    if (state.dailyDate && state.dailyFP >= 50) {
      const prev = new Date(state.dailyDate);
      const now = new Date(today);
      const diff = Math.round((now - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        state.streakDays = (state.streakDays || 0) + 1;
      } else {
        state.streakDays = 1;
      }
    } else if (!state.dailyDate) {
      state.streakDays = 0;
    } else {
      state.streakDays = 0;
    }
    state.dailyDate = today;
    state.dailyFP = 0;
  }
  return state;
}

// ---------- Badge ----------

async function updateBadge() {
  const state = await getState();
  const tax = state.procrastinationTax || 0;
  await chrome.action.setBadgeText({ text: tax > 0 ? String(tax) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#FF4FA7' });
}

// ---------- Timers ----------

async function startTimer(tabId, minutes) {
  const state = await getState();
  const now = Date.now();
  state.tabs[tabId] = {
    url: (await chrome.tabs.get(tabId).catch(() => ({})))?.url || '',
    allocatedMinutes: minutes,
    startTs: now,
    expiresAt: now + minutes * 60 * 1000,
    expired: false
  };
  await setState(state);
  await chrome.alarms.create(`timer_${tabId}`, { when: state.tabs[tabId].expiresAt });
}

async function extendTimer(tabId, minutes = 5) {
  const state = await getState();
  const t = state.tabs[tabId];
  if (!t) return;
  const now = Date.now();
  const base = t.expired ? now : Math.max(t.expiresAt, now);
  t.expiresAt = base + minutes * 60 * 1000;
  t.allocatedMinutes = (t.allocatedMinutes || 0) + minutes;
  if (t.expired) {
    // Extending after expiration counts as tax
    state.procrastinationTax = (state.procrastinationTax || 0) + 1;
  }
  // Award small FP for re-committing
  state.dailyFP = (state.dailyFP || 0) + 2;
  state.focusPoints = (state.focusPoints || 0) + 2;
  t.expired = false;
  await setState(state);
  await chrome.alarms.create(`timer_${tabId}`, { when: t.expiresAt });
  await updateBadge();
  // Tell content script to clear expiration UI
  chrome.tabs.sendMessage(tabId, { type: 'CLEAR_EXPIRATION' }).catch(() => {});
}

// ---------- Alarm firing ----------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('timer_')) return;
  const tabId = parseInt(alarm.name.split('_')[1], 10);
  const state = await getState();
  const t = state.tabs[tabId];
  if (!t) return;
  t.expired = true;
  state.procrastinationTax = (state.procrastinationTax || 0) + 1;
  await setState(state);
  await updateBadge();
  chrome.tabs.sendMessage(tabId, { type: 'APPLY_EXPIRATION' }).catch(() => {});
});

// ---------- Tab lifecycle ----------

chrome.tabs.onCreated.addListener(async (tab) => {
  // Content script will initialize itself and request a toll.
  // Nothing to do here — the toll UI is triggered by the content script
  // once it detects it has no active timer.
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;
  const state = await rollDaily(await getState());
  const t = state.tabs[tabId];
  if (!t) return;
  const now = Date.now();
  if (!t.expired && now < t.expiresAt) {
    // Closed early — award points
    let fp = 10;
    const elapsed = now - t.startTs;
    const total = t.expiresAt - t.startTs;
    if (total > 0 && elapsed <= total * 0.1) fp += 5;
    state.focusPoints = (state.focusPoints || 0) + fp;
    state.dailyFP = (state.dailyFP || 0) + fp;
  }
  delete state.tabs[tabId];
  await chrome.alarms.clear(`timer_${tabId}`);
  await setState(state);
  await updateBadge();
});

// ---------- Message router ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const tabId = sender.tab?.id ?? msg.tabId;
    switch (msg.type) {
      case 'REQUEST_TOLL_INFO':
        sendResponse({
          decisionSeconds: DECISION_SECONDS,
          defaultMinutes: DEFAULT_MINUTES
        });
        break;
      case 'PAY_TOLL':
        await startTimer(tabId, Math.max(1, Math.min(60, msg.minutes || DEFAULT_MINUTES)));
        sendResponse({ ok: true });
        break;
      case 'CHECK_TAB':
        {
          const state = await getState();
          sendResponse({ tab: state.tabs[tabId] || null, now: Date.now() });
        }
        break;
      case 'EXTEND':
        await extendTimer(tabId, 5);
        sendResponse({ ok: true });
        break;
      case 'CLOSE_TAB':
        await chrome.tabs.remove(msg.tabId ?? tabId);
        sendResponse({ ok: true });
        break;
      case 'GET_DASHBOARD':
        {
          const state = await rollDaily(await getState());
          await setState(state);
          const tabsInfo = [];
          for (const [id, t] of Object.entries(state.tabs)) {
            try {
              const tab = await chrome.tabs.get(parseInt(id, 10));
              tabsInfo.push({
                id: parseInt(id, 10),
                title: tab.title || tab.url || 'Untitled',
                favIconUrl: tab.favIconUrl || '',
                allocatedMinutes: t.allocatedMinutes,
                expiresAt: t.expiresAt,
                expired: t.expired
              });
            } catch {}
          }
          sendResponse({
            focusPoints: state.focusPoints || 0,
            procrastinationTax: state.procrastinationTax || 0,
            streakDays: state.streakDays || 0,
            dailyFP: state.dailyFP || 0,
            tabs: tabsInfo,
            now: Date.now()
          });
        }
        break;
      case 'RESET_ALL_TIMERS':
        {
          const state = await getState();
          const now = Date.now();
          for (const [id, t] of Object.entries(state.tabs)) {
            t.expiresAt = now + t.allocatedMinutes * 60 * 1000;
            t.startTs = now;
            t.expired = false;
            await chrome.alarms.create(`timer_${id}`, { when: t.expiresAt });
          }
          await setState(state);
          sendResponse({ ok: true });
        }
        break;
      default:
        sendResponse({ ok: false });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});
