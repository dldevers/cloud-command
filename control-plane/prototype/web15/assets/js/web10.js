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


function setupCommandInput() {
  const input = document.getElementById("commandInput");
  if (!input) return;

  input.addEventListener("focus", () => {
    if (!input.value.trim()) {
      input.value = "";
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      const command = `cloud-command ${input.value.trim()}`.trim();
      console.log("CloudCommand console intent:", command);

      const state = document.querySelector(".command-state");
      if (state) {
        state.textContent = "queued";
        setTimeout(() => {
          state.textContent = "ready";
        }, 900);
      }
    }
  });
}

setupCommandInput();
