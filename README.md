# 🌊 The Attention Tollbooth

> Turn every new tab into a tiny, conscious commitment — not a passive habit.

You open 47 tabs "to read later." You never do. They sit there, eating RAM
and giving you low-grade anxiety. **The Attention Tollbooth** puts a soft,
cute, game-like tollbooth at the entrance of every new page:

> _How much attention is this tab worth?_

Pick 1, 5, 15, 30, or 60 minutes. Close the tab early → earn **Focus Points**.
Let the timer expire → the page desaturates, glows gently, and your
**Procrastination Tax** ticks up on the extension badge.

It doesn't block anything (blocking makes you rebel). It just makes you
_notice_.

---

## ✨ Features

- Glassmorphism popup in the bottom-right of every new page
- 3-second countdown + 5 fixed attention buckets (1 / 5 / 15 / 30 / 60 min)
- Per-tab timer that **pauses when the tab isn't active**
- Refresh = fresh commitment (timer resets, popup returns)
- Grayscale + glowing pulse when time's up
- **Close Tab** or **+5 minutes** on expiry
- Focus Points, High Score, Streak, Procrastination Tax
- Simple 7-day earned-points bar chart in the popup dashboard
- Tax counter shown on the extension badge

## 🎨 Design

Calm glassmorphism. Rounded corners, soft shadows, subtle blur, gentle fades.

Palette: `#03045E` · `#0077B6` · `#00B4D8` · `#90E0EF` · `#CAF0F8`

## 🧱 Tech

Manifest V3 · HTML · CSS · Vanilla JS · `chrome.tabs` · `chrome.storage.local` · `chrome.action`.
No frameworks, no build step, no TypeScript.

## 📦 Install (unpacked)

1. Download and unzip the extension.
2. Open `chrome://extensions` in Chrome (or any Chromium browser: Edge, Brave, Arc, Opera).
3. Enable **Developer mode** (toggle in the top-right).
4. Click **Load unpacked** and select the unzipped folder.
5. Open a new tab — the tollbooth will greet you 🌊

## 🎮 Point Economy

| Time chosen | Earn (close early) | Lose (timer expires) |
| ----------- | ------------------ | -------------------- |
| 1 min       | +5                 | −2 (30% of 5)        |
| 5 min       | +8                 | −2                   |
| 15 min      | +15                | −5                   |
| 30 min      | +20                | −6                   |
| 60 min      | +25                | −8                   |

Every expiry also increments your **Procrastination Tax** — that's the badge number.

## 📁 File Layout

```
extension/
├── manifest.json     # MV3 config
├── background.js     # timers, points, badge
├── content.js        # injected popup + time-up overlay
├── content.css       # glassmorphism styles
├── popup.html        # dashboard
├── popup.css
├── popup.js
└── icons/icon.png
```

## 💡 Notes

- The extension only injects on `http(s)` pages — not `chrome://` or the New Tab page.
- Data lives in `chrome.storage.local` on your machine. Nothing is sent anywhere.

Stay mindful. ✨
