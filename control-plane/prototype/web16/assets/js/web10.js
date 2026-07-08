function updateClock() {
  const el = document.getElementById("clock");
  if (!el) return;

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

function setupConsole() {
  const input = document.getElementById("commandInput");
  const consoleWindow = document.getElementById("consoleWindow");
  const consoleScreen = document.getElementById("consoleScreen");
  const closeBtn = document.getElementById("consoleClose");
  const minBtn = document.getElementById("consoleMinimize");
  const maxBtn = document.getElementById("consoleMaximize");
  const dragHandle = document.getElementById("consoleDragHandle");
  const state = document.querySelector(".command-state");

  if (!input || !consoleWindow || !consoleScreen) {
    console.warn("WEB16 console missing required elements", {
      input: Boolean(input),
      consoleWindow: Boolean(consoleWindow),
      consoleScreen: Boolean(consoleScreen)
    });
    return;
  }

  function ensureMirror() {
    let mirror = document.getElementById("consoleMirror");

    if (!mirror) {
      const active = document.createElement("div");
      active.className = "console-line active";
      active.innerHTML =
        '<span class="console-prefix">cloud-command</span><span id="consoleMirror"></span><span class="console-cursor"></span>';
      consoleScreen.appendChild(active);
      mirror = document.getElementById("consoleMirror");
    }

    return mirror;
  }

  function openConsole() {
    document.querySelector(".control-plane")?.classList.remove("console-dismissed");
    consoleWindow.classList.add("is-open");
    consoleWindow.classList.remove("is-minimized");
  }

  function mirrorInput() {
    const mirror = ensureMirror();
    if (mirror) mirror.textContent = input.value;
  }

  function submitCommand() {
    const commandText = input.value.trim();
    if (!commandText) return;

    const active = consoleScreen.querySelector(".console-line.active");
    if (active) active.remove();

    const commandLine = document.createElement("div");
    commandLine.className = "console-line";
    commandLine.innerHTML =
      '<span class="console-prefix">cloud-command</span>' + escapeHtml(commandText);
    consoleScreen.appendChild(commandLine);

    const output = document.createElement("div");
    output.className = "console-line muted";
    output.textContent = "intent queued locally — parser not connected yet";
    consoleScreen.appendChild(output);

    input.value = "";
    ensureMirror();
    mirrorInput();

    if (state) {
      state.textContent = "queued";
      setTimeout(() => {
        state.textContent = "ready";
      }, 900);
    }
  }

  input.addEventListener("focus", () => {
    openConsole();
    mirrorInput();
  });

  input.addEventListener("click", () => {
    openConsole();
    mirrorInput();
  });

  input.addEventListener("input", () => {
    openConsole();
    mirrorInput();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitCommand();
    }
  });

  closeBtn?.addEventListener("click", () => {
    document.querySelector(".control-plane")?.classList.add("console-dismissed");
    consoleWindow.classList.remove("is-open");
    consoleWindow.classList.remove("is-minimized");
    input.blur();
  });

  minBtn?.addEventListener("click", () => {
    document.querySelector(".control-plane")?.classList.remove("console-dismissed");
    consoleWindow.classList.add("is-open");
    consoleWindow.classList.toggle("is-minimized");
  });

  maxBtn?.addEventListener("click", () => {
    document.querySelector(".control-plane")?.classList.remove("console-dismissed");
    consoleWindow.classList.add("is-open");
    consoleWindow.classList.remove("is-minimized");
    consoleWindow.classList.toggle("is-maximized");
  });

  setupDrag(consoleWindow, dragHandle);

  console.log("WEB16 console ready");
}

function setupDrag(panel, handle) {
  if (!panel || !handle) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener("mousedown", (event) => {
    if (panel.classList.contains("is-maximized")) return;

    dragging = true;

    const rect = panel.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.bottom = "auto";
    panel.style.transform = "none";

    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;

    panel.style.left = `${startLeft + event.clientX - startX}px`;
    panel.style.top = `${startTop + event.clientY - startY}px`;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateClock();
buildGauges();
setupConsole();

setInterval(updateClock, 1000);
