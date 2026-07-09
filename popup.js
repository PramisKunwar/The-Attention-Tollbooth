const DEFAULTS = {
  focusPoints: 0,
  highScore: 0,
  currentStreak: 0,
  procrastinationTax: 0,
  history: {},
};

function render(stats) {
  document.getElementById("focusPoints").textContent = stats.focusPoints;
  document.getElementById("highScore").textContent = stats.highScore;
  document.getElementById("currentStreak").innerHTML =
    stats.currentStreak + '<span>🔥</span>';
  document.getElementById("procrastinationTax").textContent = stats.procrastinationTax;

  // 7-day chart
  const chart = document.getElementById("chart");
  chart.innerHTML = "";
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }) });
  }
  const values = days.map((d) => (stats.history?.[d.key]?.earned) || 0);
  const max = Math.max(1, ...values);
  days.forEach((d, i) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${(values[i] / max) * 100}%`;
    bar.title = `${d.key}: +${values[i]}`;
    const label = document.createElement("div");
    label.className = "day";
    label.textContent = d.label;
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

chrome.storage.local.get(DEFAULTS, render);
