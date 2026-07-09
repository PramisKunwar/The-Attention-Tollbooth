# The Attention Tollbooth

**Pay your attention toll before you enter.**

A playful Chrome extension that turns tab-hoarding into a game. Every new tab must "pay a toll" — a chosen amount of minutes of your attention — before it opens. When the timer runs out, the page dims and gently nags you to close it (or bribe the tollbooth for five more minutes). Close a tab before its timer expires and you earn Focus Points. Let it expire and you rack up Procrastination Tax.

No blocking. No shaming. Just a soft, mindful pause between you and your 47th tab.

---

## Features

- **The Tollgate** — every new tab greets you with a floating, glass-morphism toll window. Pick 1–60 minutes on a custom slider and click *Pay Toll & Enter*. The page behind it is dimmed and blurred while you decide.
- **10-second decision countdown** — a subtle progress bar counts down while you decide. Ignore it and a default 5-minute toll is applied automatically.
- **Live timers** — every tab you've paid for has its own timer running in the background.
- **Expiration ritual** — when the timer hits zero the page fades to grayscale over 1.5s, a pink pulsing border wraps the viewport, and a small toast offers to *Evict Tab* or *Bribe +5m*.
- **Focus Points & Procrastination Tax** — a scoring system that rewards early tab closure and taxes procrastination. Streaks count consecutive days at 50+ points.
- **Dashboard popup** — click the toolbar icon to see your score, current streak, and every tab currently on the clock, with per-tab progress bars and a one-click close.

## Design

Strict five-color palette, no emoji, no clutter:

| Hex | Role |
|---|---|
| `#225782` | Primary Dark — backgrounds, badges |
| `#41BEDD` | Primary Blue — buttons, sliders, progress |
| `#53E5DE` | Teal Accent — hover states, highlights |
| `#5CF4F4` | Bright Cyan — active states, glows |
| `#FF4FA7` | Hot Pink — tax alerts, expiration pulse |

The tone is whimsical and slightly cheeky, never punitive. Tabs "loiter," they don't "waste your time." You "evict" them, you don't "close" them. You "bribe the tollbooth," you don't "extend the timer."

## Install (unpacked)

1. Download `attention-tollbooth.zip` and unzip it.
2. Open `chrome://extensions` in Chrome, Edge, Brave, Arc, or any Chromium browser.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the tollbooth icon to your toolbar so you can see your score.

Open a new tab to meet the tollbooth.

## How it works

- `manifest.json` — Manifest V3 declaration. Requests `tabs`, `storage`, `alarms`, and `scripting`.
- `background.js` — service worker that owns all state: per-tab timers via `chrome.alarms`, focus points and tax counters in `chrome.storage.local`, badge updates.
- `content.js` — injected into every http/https page. Renders the tollgate UI, the expiration overlay, and the toast — all inside a closed Shadow DOM so host page CSS can't leak in.
- `popup.html` / `popup.css` / `popup.js` — the toolbar dashboard.
- `icons/` — 16 / 48 / 128 px extension icons.

All UI is vanilla JS + CSS, no external libraries.

## Scoring rules

| Action | Change |
|---|---|
| Close a tab before its timer expires | **+10 FP** |
| Close within the first 10% of allocated time | **+5 FP bonus** |
| Bribe the tollbooth (+5m) after expiration | **+2 FP, +1 Tax** |
| Let a tab expire | **+1 Tax** |
| Earn 50 FP in a day | Streak day counted |

Streaks reset if you miss a day.

## Edge cases

- **Session restore after crash** — timers do not persist across browser restarts by design; new tabs from a restored session are treated as new and offered a fresh toll.
- **Rapid opens** — each new tab gets its own independent toll window; they do not stack.
- **Non-http pages** — the content script is a no-op on `chrome://`, extension pages, and the new tab page itself. Tolls only apply to real web pages.

## License

MIT.
