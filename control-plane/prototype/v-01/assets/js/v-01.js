import "./top-plane.js";
import { Camera, ZOOM_LEVELS } from "./camera.js";
import { World } from "./world.js";
import { Renderer } from "./renderer.js";
import { InputController } from "./input.js";

const viewport = document.querySelector(
  ".cc-dashboard-content-space"
);

const terminalShell = document.querySelector(
  ".cc-terminal-shell"
);

const terminalCollapseButton = document.querySelector(
  ".cc-terminal-collapse"
);

const terminalCloseButton = document.querySelector(
  ".cc-terminal-close"
);

const commandInputShell = document.querySelector(
  ".cc-command-input-shell"
);

const commandLogoButton = document.querySelector(
  ".cc-command-logo"
);

const commandInput = document.querySelector(
  ".cc-command-input"
);

if (!viewport) {
  throw new Error(
    "CloudCommand viewport was not found."
  );
}

if (
  !terminalShell ||
  !terminalCollapseButton ||
  !terminalCloseButton ||
  !commandInputShell ||
  !commandLogoButton ||
  !commandInput
) {
  throw new Error(
    "CloudCommand terminal interface was not found."
  );
}

viewport.classList.add("cc-starm-viewport");

const camera = new Camera({
  x: 0,
  y: 0,
  zoom: 0.95,
});

const world = new World();

world.seedDemoObjects();

const renderer = new Renderer({
  viewport,
  camera,
  world,
});

const navigationCamera =
  createNavigationCamera();

const inspectionPane =
  createInspectionPane();

const input = new InputController({
  viewport,
  camera,
});

const DIAGNOSTIC_DATA = Object.freeze({
  "cluster-1": {
    summary:
      "Primary Kubernetes cluster. Control plane is responding normally.",
    cpu: "42%",
    memory: "61%",
    restarts: "0",
    traffic: "1.8k req/s",
    latency: "24 ms",
    errors: "0.02%",
    scope: "cluster/production",
    runtime: "kubernetes v1.36.2",
    node: "3 ready / 3 total",
    declared: "Matched",
    event:
      "Node health reconciliation completed 18 seconds ago.",
    dependencies: [
      "kube-apiserver",
      "etcd",
      "calico",
      "coredns",
    ],
  },

  "ns-cloudcommand": {
    summary:
      "CloudCommand control and coordination workloads.",
    cpu: "18%",
    memory: "38%",
    restarts: "1",
    traffic: "420 req/s",
    latency: "31 ms",
    errors: "0.06%",
    scope: "namespace/cloudcommand",
    runtime: "12 pods / 12 ready",
    node: "worker1, worker2",
    declared: "Matched",
    event:
      "Agent deployment completed a rolling update 4 minutes ago.",
    dependencies: [
      "cluster-1",
      "api",
      "metrics",
      "registry",
    ],
  },

  "ns-production": {
    summary:
      "Production namespace is operational with elevated memory pressure.",
    cpu: "64%",
    memory: "82%",
    restarts: "3",
    traffic: "2.4k req/s",
    latency: "89 ms",
    errors: "1.4%",
    scope: "namespace/production",
    runtime: "18 pods / 17 ready",
    node: "worker1, worker2",
    declared: "Drift detected",
    event:
      "One pod exceeded its memory request 2 minutes ago.",
    dependencies: [
      "cluster-1",
      "payments",
      "ingress",
      "postgres",
    ],
  },

  "app-payments": {
    summary:
      "Payments application is degraded. Error rate and restart activity are elevated.",
    cpu: "77%",
    memory: "74%",
    restarts: "7",
    traffic: "860 req/s",
    latency: "247 ms",
    errors: "6.8%",
    scope: "application/payments",
    runtime: "3 pods / 2 ready",
    node: "worker2",
    declared: "Drift detected",
    event:
      "Readiness probe failed repeatedly during the last 90 seconds.",
    dependencies: [
      "production",
      "postgres",
      "payment-gateway",
      "event-bus",
    ],
  },

  "app-api": {
    summary:
      "CloudCommand API is healthy and responding within its target latency.",
    cpu: "29%",
    memory: "46%",
    restarts: "0",
    traffic: "540 req/s",
    latency: "37 ms",
    errors: "0.04%",
    scope: "application/api",
    runtime: "3 pods / 3 ready",
    node: "worker1",
    declared: "Matched",
    event:
      "Configuration reconciliation completed 44 seconds ago.",
    dependencies: [
      "cloudcommand",
      "cluster-agent",
      "metrics",
      "state-store",
    ],
  },
});

let previousFrameTime =
  performance.now();

let animationFrameId = null;

let renderedSemanticLevelId =
  camera.semanticLevel.id;

function createNavigationCamera() {
  const panel =
    document.createElement("section");

  panel.className =
    "cc-navigation-camera";

  panel.setAttribute(
    "aria-label",
    "Navigation camera"
  );

  const header =
    document.createElement("div");

  header.className =
    "cc-navigation-camera-header";

  const eyebrow =
    document.createElement("span");

  eyebrow.className =
    "cc-navigation-camera-eyebrow";

  eyebrow.textContent =
    "NAVIGATION CAMERA";

  const levelSelect =
    document.createElement("select");

  levelSelect.className =
    "cc-navigation-camera-level";

  levelSelect.setAttribute(
    "aria-label",
    "Operational zoom level"
  );

  ZOOM_LEVELS.forEach((level) => {
    const option =
      document.createElement("option");

    option.value = level.id;
    option.textContent = level.label;

    levelSelect.append(option);
  });

  header.append(
    eyebrow,
    levelSelect
  );

  const controls =
    document.createElement("div");

  controls.className =
    "cc-navigation-camera-controls";

  const zoomOutButton =
    createCameraButton({
      label: "−",
      accessibleLabel: "Zoom out",
    });

  const resetButton =
    createCameraButton({
      label: "RESET",
      accessibleLabel: "Reset camera",
      modifierClass:
        "cc-navigation-camera-reset",
    });

  const zoomInButton =
    createCameraButton({
      label: "+",
      accessibleLabel: "Zoom in",
    });

  controls.append(
    zoomOutButton,
    resetButton,
    zoomInButton
  );

  const readout =
    document.createElement("div");

  readout.className =
    "cc-navigation-camera-readout";

  const zoomReadout =
    createReadoutRow("ZOOM");

  const positionReadout =
    createReadoutRow("POSITION");

  const focusReadout =
    createReadoutRow("FOCUS");

  readout.append(
    zoomReadout.row,
    positionReadout.row,
    focusReadout.row
  );

  panel.append(
    header,
    controls,
    readout
  );

  viewport.append(panel);

  levelSelect.addEventListener(
    "change",
    () => {
      camera.zoomToLevel(
        levelSelect.value
      );
    }
  );

  zoomOutButton.addEventListener(
    "click",
    () => {
      camera.zoomBy(-0.18);
    }
  );

  zoomInButton.addEventListener(
    "click",
    () => {
      camera.zoomBy(0.18);
    }
  );

  resetButton.addEventListener(
    "click",
    () => {
      camera.reset();
      closeInspectionPane();
      updateFocusedObjectClass();
    }
  );

  return {
    panel,
    levelSelect,
    zoomValue: zoomReadout.value,
    positionValue:
      positionReadout.value,
    focusValue: focusReadout.value,
  };
}

function createCameraButton({
  label,
  accessibleLabel,
  modifierClass = "",
}) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className = [
    "cc-navigation-camera-button",
    modifierClass,
  ]
    .filter(Boolean)
    .join(" ");

  button.textContent = label;

  button.setAttribute(
    "aria-label",
    accessibleLabel
  );

  button.title = accessibleLabel;

  return button;
}

function createReadoutRow(label) {
  const row =
    document.createElement("div");

  row.className =
    "cc-navigation-camera-readout-row";

  const key =
    document.createElement("span");

  key.className =
    "cc-navigation-camera-readout-key";

  key.textContent = label;

  const value =
    document.createElement("span");

  value.className =
    "cc-navigation-camera-readout-value";

  row.append(
    key,
    value
  );

  return {
    row,
    value,
  };
}

function createInspectionPane() {
  const pane =
    document.createElement("aside");

  pane.className =
    "cc-inspection-pane";

  pane.setAttribute(
    "aria-label",
    "Object diagnostic inspection"
  );

  pane.setAttribute(
    "aria-hidden",
    "true"
  );

  pane.innerHTML = `
    <header class="cc-inspection-header">
      <div class="cc-inspection-heading">
        <span class="cc-inspection-eyebrow">
          DIAGNOSTIC INSPECTION
        </span>

        <h2 class="cc-inspection-title">
          No object selected
        </h2>

        <span class="cc-inspection-kind">
          WAITING
        </span>

        <span class="cc-inspection-compact-health">
          <span class="cc-inspection-compact-status">
            UNKNOWN
          </span>

          <span
            class="cc-inspection-health-gauge"
            aria-label="Health gauge"
          >
            <i></i>
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
        </span>
      </div>

      <div class="cc-inspection-controls">
        <button
          class="cc-inspection-collapse"
          type="button"
          aria-label="Collapse diagnostic inspection"
          aria-expanded="true"
          title="Collapse diagnostic inspection"
        ></button>

        <button
          class="cc-inspection-close"
          type="button"
          aria-label="Close diagnostic inspection"
          title="Close diagnostic inspection"
        ></button>
      </div>
    </header>

    <div class="cc-inspection-body">
      <section class="cc-inspection-status">
        <span class="cc-inspection-status-light"></span>
        <span class="cc-inspection-status-value">
          UNKNOWN
        </span>
      </section>

      <p class="cc-inspection-summary"></p>

      <section class="cc-inspection-section">
        <h3 class="cc-inspection-section-title">
          LIVE SIGNALS
        </h3>

        <div class="cc-inspection-metrics">
          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">CPU</span>
            <strong class="cc-inspection-metric-value" data-metric="cpu">—</strong>
          </div>

          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">MEMORY</span>
            <strong class="cc-inspection-metric-value" data-metric="memory">—</strong>
          </div>

          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">RESTARTS</span>
            <strong class="cc-inspection-metric-value" data-metric="restarts">—</strong>
          </div>

          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">TRAFFIC</span>
            <strong class="cc-inspection-metric-value" data-metric="traffic">—</strong>
          </div>

          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">LATENCY</span>
            <strong class="cc-inspection-metric-value" data-metric="latency">—</strong>
          </div>

          <div class="cc-inspection-metric">
            <span class="cc-inspection-metric-key">ERRORS</span>
            <strong class="cc-inspection-metric-value" data-metric="errors">—</strong>
          </div>
        </div>
      </section>

      <section class="cc-inspection-section">
        <h3 class="cc-inspection-section-title">
          OPERATIONAL PROFILE
        </h3>

        <dl class="cc-inspection-profile">
          <div>
            <dt>SCOPE</dt>
            <dd data-profile="scope">—</dd>
          </div>

          <div>
            <dt>RUNTIME</dt>
            <dd data-profile="runtime">—</dd>
          </div>

          <div>
            <dt>PLACEMENT</dt>
            <dd data-profile="node">—</dd>
          </div>

          <div>
            <dt>DECLARED STATE</dt>
            <dd data-profile="declared">—</dd>
          </div>
        </dl>
      </section>

      <section class="cc-inspection-section">
        <h3 class="cc-inspection-section-title">
          RECENT EVIDENCE
        </h3>

        <p class="cc-inspection-event"></p>
      </section>

      <section class="cc-inspection-section">
        <h3 class="cc-inspection-section-title">
          DEPENDENCIES
        </h3>

        <div class="cc-inspection-dependencies"></div>
      </section>
    </div>

    <footer class="cc-inspection-actions">
      <button
        type="button"
        data-inspection-action="inspect"
      >
        INSPECT
      </button>

      <button
        type="button"
        data-inspection-action="logs"
      >
        LOGS
      </button>

      <button
        type="button"
        data-inspection-action="yaml"
      >
        YAML
      </button>

      <button
        type="button"
        data-inspection-action="dependencies"
      >
        DEPENDENCIES
      </button>
    </footer>
  `;

  viewport.append(pane);

  const closeButton =
    pane.querySelector(
      ".cc-inspection-close"
    );

  const collapseButton =
    pane.querySelector(
      ".cc-inspection-collapse"
    );

  closeButton.addEventListener(
    "click",
    closeInspectionPane
  );

  collapseButton.addEventListener(
    "click",
    toggleInspectionPaneCollapse
  );

  pane.addEventListener(
    "click",
    handleInspectionAction
  );

  return {
    pane,

    title:
      pane.querySelector(
        ".cc-inspection-title"
      ),

    kind:
      pane.querySelector(
        ".cc-inspection-kind"
      ),

    statusValue:
      pane.querySelector(
        ".cc-inspection-status-value"
      ),

    compactStatus:
      pane.querySelector(
        ".cc-inspection-compact-status"
      ),

    collapseButton,

    summary:
      pane.querySelector(
        ".cc-inspection-summary"
      ),

    event:
      pane.querySelector(
        ".cc-inspection-event"
      ),

    dependencies:
      pane.querySelector(
        ".cc-inspection-dependencies"
      ),
  };
}

function updateNavigationCamera() {
  const state = camera.getState();

  navigationCamera.levelSelect.value =
    state.semanticLevel.id;

  navigationCamera.zoomValue.textContent =
    state.zoom.toFixed(2);

  navigationCamera.positionValue.textContent =
    `${Math.round(state.x)}, ${Math.round(state.y)}`;

  navigationCamera.focusValue.textContent =
    state.focusedObjectId ?? "NONE";

  viewport.dataset.operationalLevel =
    state.semanticLevel.id;
}

function getStarMapObjectNode(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest(
    ".cc-starm-object"
  );
}

function updateFocusedObjectClass() {
  const focusedObjectId =
    camera.focusedObjectId;

  viewport
    .querySelectorAll(
      ".cc-starm-object"
    )
    .forEach((node) => {
      node.classList.toggle(
        "is-focused",
        node.dataset.objectId ===
          focusedObjectId
      );
    });
}

function focusStarMapObject(objectId) {
  const object =
    world.getObject(objectId);

  if (!object) {
    return;
  }

  const targetZoom = Math.max(
    camera.targetZoom,
    1.18
  );

  camera.setZoom(targetZoom);

  const targetScreenX =
    renderer.width * 0.42;

  const targetScreenY =
    renderer.height * 0.44;

  camera.setPosition(
    targetScreenX -
      renderer.width / 2 -
      object.x * targetZoom,

    targetScreenY -
      renderer.height / 2 -
      object.y * targetZoom
  );

  camera.focusObject(object.id);

  updateFocusedObjectClass();
  updateNavigationCamera();
  openInspectionPane(object);

  commandInput.value =
    `inspect ${object.id}`;
}

function openInspectionPane(object) {
  const diagnostics =
    DIAGNOSTIC_DATA[object.id] ??
    createFallbackDiagnostics(object);

  inspectionPane.pane.dataset.health =
    object.health;

  inspectionPane.pane.dataset.objectId =
    object.id;

  inspectionPane.title.textContent =
    object.label;

  inspectionPane.kind.textContent =
    `${object.kind.toUpperCase()} · ${object.id}`;

  inspectionPane.statusValue.textContent =
    object.health.toUpperCase();

  inspectionPane.compactStatus.textContent =
    object.health.toUpperCase();

  inspectionPane.summary.textContent =
    diagnostics.summary;

  inspectionPane.event.textContent =
    diagnostics.event;

  const metrics = [
    "cpu",
    "memory",
    "restarts",
    "traffic",
    "latency",
    "errors",
  ];

  metrics.forEach((name) => {
    const element =
      inspectionPane.pane.querySelector(
        `[data-metric="${name}"]`
      );

    element.textContent =
      diagnostics[name];
  });

  const profileFields = [
    "scope",
    "runtime",
    "node",
    "declared",
  ];

  profileFields.forEach((name) => {
    const element =
      inspectionPane.pane.querySelector(
        `[data-profile="${name}"]`
      );

    element.textContent =
      diagnostics[name];
  });

  inspectionPane.dependencies.replaceChildren();

  diagnostics.dependencies.forEach(
    (dependency) => {
      const badge =
        document.createElement("span");

      badge.className =
        "cc-inspection-dependency";

      badge.textContent = dependency;

      inspectionPane.dependencies.append(
        badge
      );
    }
  );

  inspectionPane.pane.classList.add(
    "is-open"
  );

  setInspectionPaneCollapsed(false);

  inspectionPane.pane.setAttribute(
    "aria-hidden",
    "false"
  );
}

function setInspectionPaneCollapsed(isCollapsed) {
  inspectionPane.pane.classList.toggle(
    "is-collapsed",
    isCollapsed
  );

  const expanded = !isCollapsed;
  const label = expanded
    ? "Collapse diagnostic inspection"
    : "Expand diagnostic inspection";

  inspectionPane.collapseButton.setAttribute(
    "aria-expanded",
    String(expanded)
  );

  inspectionPane.collapseButton.setAttribute(
    "aria-label",
    label
  );

  inspectionPane.collapseButton.title =
    label;
}

function toggleInspectionPaneCollapse(event) {
  event.preventDefault();
  event.stopPropagation();

  setInspectionPaneCollapsed(
    !inspectionPane.pane.classList.contains(
      "is-collapsed"
    )
  );
}

function closeInspectionPane() {
  inspectionPane.pane.classList.remove(
    "is-open"
  );

  inspectionPane.pane.setAttribute(
    "aria-hidden",
    "true"
  );

  inspectionPane.pane.dataset.objectId =
    "";

  setInspectionPaneCollapsed(false);

  camera.clearFocus();

  updateFocusedObjectClass();
  updateNavigationCamera();
}

function createFallbackDiagnostics(object) {
  return {
    summary:
      `${object.label} is available for operational inspection.`,
    cpu: "—",
    memory: "—",
    restarts: "—",
    traffic: "—",
    latency: "—",
    errors: "—",
    scope:
      `${object.kind}/${object.label}`,
    runtime: "Unknown",
    node: "Unknown",
    declared: "Unknown",
    event:
      "No recent evidence has been collected.",
    dependencies: [],
  };
}

function handleInspectionAction(event) {
  const button =
    event.target.closest(
      "[data-inspection-action]"
    );

  if (!button) {
    return;
  }

  const objectId =
    inspectionPane.pane.dataset.objectId;

  if (!objectId) {
    return;
  }

  const action =
    button.dataset.inspectionAction;

  const commands = {
    inspect:
      `inspect ${objectId}`,

    logs:
      `inspect ${objectId} --logs`,

    yaml:
      `inspect ${objectId} --declared-yaml`,

    dependencies:
      `inspect ${objectId} --dependencies`,
  };

  commandInput.value =
    commands[action] ??
    `inspect ${objectId}`;

  commandInput.focus();
}

function handleStarMapObjectClick(event) {
  const objectNode =
    getStarMapObjectNode(
      event.target
    );

  if (!objectNode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  focusStarMapObject(
    objectNode.dataset.objectId
  );
}

function handleStarMapObjectKeyDown(event) {
  if (
    event.key !== "Enter" &&
    event.key !== " "
  ) {
    return;
  }

  const objectNode =
    getStarMapObjectNode(
      event.target
    );

  if (!objectNode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  focusStarMapObject(
    objectNode.dataset.objectId
  );
}

function setTerminalState(nextState) {
  const allowedStates = [
    "open",
    "collapsed",
    "closed",
  ];

  const state =
    allowedStates.includes(nextState)
      ? nextState
      : "open";

  terminalShell.dataset.terminalState =
    state;

  commandInputShell.dataset.terminalState =
    state;

  terminalShell.classList.toggle(
    "is-collapsed",
    state === "collapsed"
  );

  terminalShell.classList.toggle(
    "is-closed",
    state === "closed"
  );

  commandInputShell.classList.toggle(
    "is-collapsed",
    state === "collapsed"
  );

  commandInputShell.classList.toggle(
    "is-closed",
    state === "closed"
  );

  const isOpen =
    state === "open";

  terminalCollapseButton.setAttribute(
    "aria-label",
    isOpen
      ? "Collapse terminal"
      : "Expand terminal"
  );

  terminalCollapseButton.title =
    isOpen
      ? "Collapse terminal"
      : "Expand terminal";

  commandLogoButton.setAttribute(
    "aria-expanded",
    String(state !== "closed")
  );

  if (state === "open") {
    requestAnimationFrame(() => {
      commandInput.focus();
    });
  }
}

terminalCollapseButton.addEventListener(
  "click",
  () => {
    const currentState =
      terminalShell.dataset
        .terminalState;

    setTerminalState(
      currentState === "open"
        ? "collapsed"
        : "open"
    );
  }
);

terminalCloseButton.addEventListener(
  "click",
  () => {
    setTerminalState("closed");
  }
);

commandLogoButton.addEventListener(
  "click",
  () => {
    const currentState =
      terminalShell.dataset
        .terminalState;

    if (
      currentState === "closed" ||
      currentState === "collapsed"
    ) {
      setTerminalState("open");
      return;
    }

    commandInput.focus();
  }
);

commandInputShell.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
  }
);

commandInput.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      setTerminalState("collapsed");
      commandInput.blur();
    }
  }
);

viewport.addEventListener(
  "click",
  handleStarMapObjectClick
);

viewport.addEventListener(
  "keydown",
  handleStarMapObjectKeyDown
);

function reopenTerminalFromInput() {
  const currentState =
    terminalShell.dataset
      .terminalState;

  if (currentState === "collapsed") {
    setTerminalState("open");
  }
}

commandInput.addEventListener(
  "focus",
  reopenTerminalFromInput
);

commandInputShell.addEventListener(
  "pointerdown",
  () => {
    reopenTerminalFromInput();

    requestAnimationFrame(() => {
      commandInput.focus();
    });
  }
);

function animate(currentFrameTime) {
  const elapsedMilliseconds =
    currentFrameTime -
    previousFrameTime;

  const deltaTime = Math.min(
    elapsedMilliseconds / 1000,
    0.1
  );

  previousFrameTime =
    currentFrameTime;

  camera.update(deltaTime);

  const semanticLevelId =
    camera.semanticLevel.id;

  if (
    semanticLevelId !==
    renderedSemanticLevelId
  ) {
    renderer.render();

    renderedSemanticLevelId =
      semanticLevelId;
  } else {
    renderer.renderCamera();
  }

  updateFocusedObjectClass();
  updateNavigationCamera();

  animationFrameId =
    requestAnimationFrame(animate);
}

function destroy() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(
      animationFrameId
    );
  }

  viewport.removeEventListener(
    "click",
    handleStarMapObjectClick
  );

  viewport.removeEventListener(
    "keydown",
    handleStarMapObjectKeyDown
  );

  input.destroy();
  renderer.destroy();
  navigationCamera.panel.remove();
  inspectionPane.pane.remove();
}

window.addEventListener(
  "beforeunload",
  destroy
);

setTerminalState("open");

renderer.render();

updateFocusedObjectClass();
updateNavigationCamera();

animationFrameId =
  requestAnimationFrame(animate);

window.cloudCommandPrototype = {
  camera,
  world,
  renderer,
  input,
  setTerminalState,
  focusStarMapObject,
  closeInspectionPane,
};
