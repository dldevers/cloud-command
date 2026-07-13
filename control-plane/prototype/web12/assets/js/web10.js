function updateClock() {
  const el = document.getElementById("clock");
  const now = new Date();

  el.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function buildGauges() {
  document.querySelectorAll(".segmented-gauge").forEach((gauge) => {
    const total = Number(gauge.dataset.total || 16);
    const used = Number(gauge.dataset.used || 0);

    gauge.innerHTML = "";

    for (let i = 0; i < total; i += 1) {
      const segment = document.createElement("span");
      segment.className = "gauge-segment";
      if (i < used) segment.classList.add("is-used");
      segment.style.transform = `rotate(${(360 / total) * i}deg)`;
      gauge.appendChild(segment);
    }
  });
}

updateClock();
buildGauges();

setInterval(updateClock, 1000);
