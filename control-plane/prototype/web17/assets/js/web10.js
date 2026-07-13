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
  const plane = document.querySelector(".control-plane");
  const input = document.getElementById("commandInput");
  const inputWrap = document.querySelector(".command-input-wrap");
  const consoleWindow = document.getElementById("consoleWindow");
  const consoleScreen = document.getElementById("consoleScreen");
  const closeBtn = document.getElementById("consoleClose");
  const minBtn = document.getElementById("consoleMinimize");
  const maxBtn = document.getElementById("consoleMaximize");
  const dragHandle = document.getElementById("consoleDragHandle");
  const sizeSelect = document.getElementById("consoleSizeSelect");

  if (!plane || !input || !inputWrap || !consoleWindow || !consoleScreen) {
    console.warn("WEB17 console missing required elements");
    return;
  }

  let manuallyMoved = false;

  function setConsoleSize(value) {
    const nextSize = value || "100x30";
    consoleWindow.dataset.size = nextSize;
    if (consoleSizeSelect) consoleSizeSelect.value = nextSize;
  }



  function snapConsole() {
    // CSS owns console placement now.
    // The console is locked to the command dock/frame, not viewport math.
    consoleWindow.style.left = "";
    consoleWindow.style.top = "";
    consoleWindow.style.right = "";
    consoleWindow.style.bottom = "";
    consoleWindow.style.width = "";
    consoleWindow.style.height = "";
    consoleWindow.style.transform = "";
  }


  function openConsole() {
    consoleWindow.classList.add("is-open");
    consoleWindow.classList.remove("is-minimized");

    if (!manuallyMoved) {
      requestAnimationFrame(snapConsole);
    }

    mirrorInput();
  }

  function closeConsole() {
    consoleWindow.classList.remove("is-open", "is-minimized", "is-maximized");
    input.blur();
  }

  function minimizeConsole() {
    consoleWindow.classList.remove("is-maximized");
    consoleWindow.classList.add("is-open", "is-minimized");
    manuallyMoved = false;
    requestAnimationFrame(snapConsole);
  }

  function maximizeConsole() {
    consoleWindow.classList.remove("is-minimized");
    consoleWindow.classList.add("is-open");
    consoleWindow.classList.toggle("is-maximized");

    if (!consoleWindow.classList.contains("is-maximized")) {
      manuallyMoved = false;
      requestAnimationFrame(snapConsole);
    }
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
    consoleScreen.scrollTop = consoleScreen.scrollHeight;
  }

  input.addEventListener("focus", openConsole);
  input.addEventListener("click", openConsole);
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

  closeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    closeConsole();
  });

  minBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    minimizeConsole();
  });

  maxBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    maximizeConsole();
  });

  sizeSelect?.addEventListener("change", () => {
    manuallyMoved = false;
    setConsoleSize(sizeSelect.value);
  });

  setupDrag(consoleWindow, dragHandle, () => {
    manuallyMoved = true;
  });

  window.addEventListener("resize", () => {
    if (consoleWindow.classList.contains("is-open") && !manuallyMoved) {
      snapConsole();
    }
  });

  setConsoleSize(sizeSelect?.value || "120x24");
  consoleWindow.classList.remove("is-open");
}

function setupDrag(panel, handle, onDragStart) {
  if (!panel || !handle) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener("mousedown", (event) => {
    if (event.target.closest("button, select")) return;
    if (panel.classList.contains("is-maximized")) return;

    dragging = true;
    onDragStart?.();

    const rect = panel.getBoundingClientRect();
    const parentRect = panel.offsetParent.getBoundingClientRect();

    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;

    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.bottom = "auto";
    panel.style.right = "auto";
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

// --- CloudCommand console minimize toggle override ---
(() => {
  const consoleWindow =
    document.getElementById("consoleWindow") ||
    document.querySelector(".console-window");

  const minimize =
    document.getElementById("consoleMinimize") ||
    document.querySelector("[data-console-action='minimize']") ||
    document.querySelector(".console-minimize");

  const maximize =
    document.getElementById("consoleMaximize") ||
    document.querySelector("[data-console-action='maximize']") ||
    document.querySelector(".console-maximize");

  if (!consoleWindow || !minimize) return;

  minimize.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const wasMinimized = consoleWindow.classList.contains("is-minimized");

    consoleWindow.classList.add("is-open");

    if (wasMinimized) {
      // Restore to normal floating size/position.
      consoleWindow.classList.remove("is-minimized");
      consoleWindow.classList.remove("is-maximized");
    } else {
      // Minimize from normal or maximized state.
      consoleWindow.classList.remove("is-maximized");
      consoleWindow.classList.add("is-minimized");
    }
  }, true);

  if (maximize) {
    maximize.addEventListener("click", (event) => {
      consoleWindow.classList.remove("is-minimized");
    }, true);
  }
})();
