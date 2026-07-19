const SVG_NAMESPACE =
  "http://www.w3.org/2000/svg";

const HEALTH_COLORS = Object.freeze({
  healthy: "#75e6da",
  warning: "#ffad42",
  critical: "#ff4d67",
  unknown: "#7f93a8",
});

const KIND_SYMBOLS = Object.freeze({
  cluster: "C",
  namespace: "N",
  application: "A",
  runtime: "R",
  debug: "D",
});

function createSvgElement(
  tagName,
  attributes = {}
) {
  const element =
    document.createElementNS(
      SVG_NAMESPACE,
      tagName
    );

  Object.entries(attributes).forEach(
    ([name, value]) => {
      element.setAttribute(
        name,
        String(value)
      );
    }
  );

  return element;
}

function getHealthColor(health) {
  return (
    HEALTH_COLORS[health] ??
    HEALTH_COLORS.unknown
  );
}

function getKindSymbol(kind) {
  return KIND_SYMBOLS[kind] ?? "?";
}

export class Renderer {
  constructor({
    viewport,
    camera,
    world,
  }) {
    if (!viewport) {
      throw new Error(
        "Renderer requires a viewport element."
      );
    }

    if (!camera) {
      throw new Error(
        "Renderer requires a camera."
      );
    }

    if (!world) {
      throw new Error(
        "Renderer requires a world."
      );
    }

    this.viewport = viewport;
    this.camera = camera;
    this.world = world;

    this.width = 0;
    this.height = 0;

    this.svg = null;
    this.backgroundLayer = null;
    this.cameraLayer = null;
    this.relationshipLayer = null;
    this.objectLayer = null;

    this.resizeObserver = null;

    this.createScene();
    this.observeViewport();
  }

  createScene() {
    this.svg = createSvgElement(
      "svg",
      {
        class: "cc-starm-svg",
        role: "img",
        "aria-label":
          "CloudCommand operational star map",
        preserveAspectRatio:
          "xMidYMid meet",
      }
    );

    this.backgroundLayer =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-background-layer",
          "pointer-events": "none",
        }
      );

    this.cameraLayer =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-camera-layer",
        }
      );

    this.relationshipLayer =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-relationship-layer",
          "pointer-events": "none",
        }
      );

    this.objectLayer =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-object-layer",
        }
      );

    this.cameraLayer.append(
      this.relationshipLayer,
      this.objectLayer
    );

    this.svg.append(
      this.backgroundLayer,
      this.cameraLayer
    );

    this.viewport.append(this.svg);
  }

  observeViewport() {
    this.resizeObserver =
      new ResizeObserver(() => {
        this.measure();
        this.renderCamera();
      });

    this.resizeObserver.observe(
      this.viewport
    );

    this.measure();
  }

  measure() {
    const bounds =
      this.viewport.getBoundingClientRect();

    this.width = Math.max(
      bounds.width,
      1
    );

    this.height = Math.max(
      bounds.height,
      1
    );

    this.svg.setAttribute(
      "viewBox",
      `0 0 ${this.width} ${this.height}`
    );

    this.svg.setAttribute(
      "width",
      this.width
    );

    this.svg.setAttribute(
      "height",
      this.height
    );
  }

  worldToScreen(x, y) {
    return {
      x:
        this.width / 2 +
        this.camera.x +
        x * this.camera.zoom,

      y:
        this.height / 2 +
        this.camera.y +
        y * this.camera.zoom,
    };
  }

  render() {
    this.renderCamera();
    this.renderRelationships();
    this.renderObjects();
  }

  renderCamera() {
    const centerX =
      this.width / 2 +
      this.camera.x;

    const centerY =
      this.height / 2 +
      this.camera.y;

    this.cameraLayer.setAttribute(
      "transform",
      `translate(${centerX} ${centerY}) scale(${this.camera.zoom})`
    );
  }

  renderRelationships() {
    this.relationshipLayer.replaceChildren();

    const showRelationships =
      this.camera.semanticLevel.id !==
      "fleet";

    if (!showRelationships) {
      return;
    }

    this.world.relationships.forEach(
      (relationship) => {
        const fromObject =
          this.world.getObject(
            relationship.fromId
          );

        const toObject =
          this.world.getObject(
            relationship.toId
          );

        if (
          !fromObject ||
          !toObject
        ) {
          return;
        }

        const line =
          createSvgElement(
            "line",
            {
              class:
                "cc-starm-relationship",

              x1: fromObject.x,
              y1: fromObject.y,
              x2: toObject.x,
              y2: toObject.y,

              "data-from":
                relationship.fromId,

              "data-to":
                relationship.toId,

              "vector-effect":
                "non-scaling-stroke",

              "pointer-events":
                "none",
            }
          );

        this.relationshipLayer.append(
          line
        );
      }
    );
  }

  renderObjects() {
    this.objectLayer.replaceChildren();

    this.world.objects.forEach(
      (object) => {
        this.objectLayer.append(
          this.createObjectNode(
            object
          )
        );
      }
    );
  }

  createObjectNode(object) {
    const healthColor =
      getHealthColor(
        object.health
      );

    const semanticLevel =
      this.camera.semanticLevel.id;

    const showLabel = [
      "namespace",
      "application",
      "runtime",
      "debug",
    ].includes(semanticLevel);

    const showKind = [
      "application",
      "runtime",
      "debug",
    ].includes(semanticLevel);

    const node =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-object",

          transform:
            `translate(${object.x} ${object.y})`,

          tabindex: "0",
          role: "button",

          "aria-label":
            `${object.kind} ${object.label}, ${object.health}`,

          "data-object-id":
            object.id,

          "data-kind":
            object.kind,

          "data-health":
            object.health,

          "pointer-events":
            "all",
        }
      );

    const pointerTarget =
      createSvgElement(
        "circle",
        {
          class:
            "cc-starm-object-pointer-target",

          cx: 0,
          cy: 0,
          r: 32,

          fill:
            "rgba(255, 255, 255, 0.001)",

          stroke: "none",

          "pointer-events":
            "all",
        }
      );

    const selectionHalo =
      createSvgElement(
        "circle",
        {
          class:
            "cc-starm-object-halo",

          cx: 0,
          cy: 0,
          r: 24,

          fill: "none",
          stroke: healthColor,

          "stroke-opacity":
            0.18,

          "stroke-width": 1,

          "vector-effect":
            "non-scaling-stroke",

          "pointer-events":
            "none",
        }
      );

    const healthRing =
      createSvgElement(
        "circle",
        {
          class:
            "cc-starm-object-health-ring",

          cx: 0,
          cy: 0,
          r: 14,

          fill:
            "rgba(4, 17, 34, 0.94)",

          stroke:
            healthColor,

          "stroke-width": 2,

          "vector-effect":
            "non-scaling-stroke",

          "pointer-events":
            "none",
        }
      );

    const core =
      createSvgElement(
        "circle",
        {
          class:
            "cc-starm-object-core",

          cx: 0,
          cy: 0,
          r: 7,

          fill:
            healthColor,

          "fill-opacity":
            0.82,

          "pointer-events":
            "none",
        }
      );

    const symbol =
      createSvgElement(
        "text",
        {
          class:
            "cc-starm-object-symbol",

          x: 0,
          y: 0.5,

          "text-anchor":
            "middle",

          "dominant-baseline":
            "middle",

          fill: "#03111f",

          "font-size": 7,
          "font-weight": 800,

          "pointer-events":
            "none",
        }
      );

    symbol.textContent =
      getKindSymbol(
        object.kind
      );

    node.append(
      pointerTarget,
      selectionHalo,
      healthRing,
      core,
      symbol
    );

    if (showLabel) {
      node.append(
        this.createObjectLabel({
          object,
          healthColor,
          showKind,
        })
      );
    }

    return node;
  }

  createObjectLabel({
    object,
    healthColor,
    showKind,
  }) {
    const labelGroup =
      createSvgElement(
        "g",
        {
          class:
            "cc-starm-object-label",

          transform:
            "translate(22 -5)",

          "pointer-events":
            "none",
        }
      );

    const leader =
      createSvgElement(
        "line",
        {
          class:
            "cc-starm-object-leader",

          x1: -8,
          y1: 5,
          x2: 0,
          y2: 5,

          stroke:
            healthColor,

          "stroke-opacity":
            0.72,

          "stroke-width": 1,

          "vector-effect":
            "non-scaling-stroke",

          "pointer-events":
            "none",
        }
      );

    const primaryLabel =
      createSvgElement(
        "text",
        {
          class:
            "cc-starm-object-label-primary",

          x: 6,
          y: 2,

          fill:
            "#d7fbff",

          "font-size": 12,
          "font-weight": 650,

          "pointer-events":
            "none",
        }
      );

    primaryLabel.textContent =
      object.label;

    labelGroup.append(
      leader,
      primaryLabel
    );

    if (showKind) {
      const secondaryLabel =
        createSvgElement(
          "text",
          {
            class:
              "cc-starm-object-label-secondary",

            x: 6,
            y: 16,

            fill:
              healthColor,

            "font-size": 8,
            "font-weight": 600,

            "letter-spacing":
              1.1,

            "pointer-events":
              "none",
          }
        );

      secondaryLabel.textContent =
        `${object.kind.toUpperCase()} · ${object.health.toUpperCase()}`;

      labelGroup.append(
        secondaryLabel
      );
    }

    return labelGroup;
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.svg?.remove();
  }
}
