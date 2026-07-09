// The Attention Tollbooth — content script
// Injects the glassmorphism popup and the "time is up" overlay.

(() => {
  // Only inject on top-level http(s) pages
  if (window.top !== window.self) return;
  if (!/^https?:/.test(location.protocol)) return;

  const OPTIONS = [1, 5, 15, 30, 60];

  let root;
  let countdownInterval;
  let selected = null;

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    if (props.style) node.setAttribute("style", props.style);
    children.forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function mountRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "attention-tollbooth-root";
    document.documentElement.appendChild(root);
    return root;
  }

  function showPopup() {
    mountRoot();
    root.innerHTML = "";

    const card = document.createElement("div");
    card.className = "att-card att-fade-in";

    card.innerHTML = `
      <div class="att-header">
        <span class="att-emoji">🌊</span>
        <span class="att-title">Attention Tollbooth</span>
      </div>
      <div class="att-question">How much attention is this tab worth?</div>
      <div class="att-options">
        ${OPTIONS.map(
          (m) => `<button class="att-opt" data-min="${m}">${m}<span>min</span></button>`
        ).join("")}
      </div>
      <div class="att-footer">
        <div class="att-count">Deciding in <b id="att-count-num">3</b>s…</div>
        <button class="att-skip" id="att-skip">skip</button>
      </div>
    `;

    root.appendChild(card);

    let secs = 3;
    const numEl = card.querySelector("#att-count-num");
    countdownInterval = setInterval(() => {
      secs -= 1;
      if (numEl) numEl.textContent = String(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(countdownInterval);
        // Auto-commit to the currently selected (or default 5 min)
        commit(selected ?? 5);
      }
    }, 1000);

    card.querySelectorAll(".att-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".att-opt").forEach((b) => b.classList.remove("att-selected"));
        btn.classList.add("att-selected");
        selected = parseInt(btn.dataset.min, 10);
        // Commit immediately on click for snappier feel
        clearInterval(countdownInterval);
        commit(selected);
      });
    });

    card.querySelector("#att-skip").addEventListener("click", () => {
      clearInterval(countdownInterval);
      dismiss();
    });
  }

  function commit(minutes) {
    chrome.runtime.sendMessage({ type: "COMMIT_TIME", minutes }, () => {
      dismiss();
    });
  }

  function dismiss() {
    if (root) {
      root.innerHTML = "";
    }
  }

  function showTimeUp() {
    document.documentElement.classList.add("att-grayscale");
    mountRoot();
    root.innerHTML = "";

    const card = document.createElement("div");
    card.className = "att-card att-timeup att-fade-in";
    card.innerHTML = `
      <div class="att-header">
        <span class="att-emoji">⏳</span>
        <span class="att-title">Your time is up</span>
      </div>
      <div class="att-question">Gentle nudge — was it worth it?</div>
      <div class="att-actions">
        <button class="att-btn att-btn-primary" id="att-close">Close Tab</button>
        <button class="att-btn att-btn-ghost" id="att-add">+5 minutes</button>
      </div>
    `;
    root.appendChild(card);

    card.querySelector("#att-close").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "CLOSE_TAB" });
    });
    card.querySelector("#att-add").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "ADD_FIVE" }, () => {
        document.documentElement.classList.remove("att-grayscale");
        dismiss();
      });
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TIME_UP") showTimeUp();
  });

  // Ask background for current state — if none, show the popup
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (!resp || !resp.state) {
      showPopup();
    } else if (resp.state.expired) {
      showTimeUp();
    }
  });
})();
