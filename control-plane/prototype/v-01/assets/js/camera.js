export const ZOOM_LEVELS = Object.freeze([
  {
    id: "fleet",
    label: "Fleet",
    min: 0.20,
    max: 0.35,
  },
  {
    id: "cluster",
    label: "Cluster",
    min: 0.35,
    max: 0.60,
  },
  {
    id: "namespace",
    label: "Namespace",
    min: 0.60,
    max: 0.85,
  },
  {
    id: "application",
    label: "Application",
    min: 0.85,
    max: 1.10,
  },
  {
    id: "runtime",
    label: "Runtime",
    min: 1.10,
    max: 1.45,
  },
  {
    id: "debug",
    label: "Debug",
    min: 1.45,
    max: 2.40,
  },
]);

const MIN_ZOOM = ZOOM_LEVELS[0].min;
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1].max;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getSemanticLevel(zoom) {
  return (
    ZOOM_LEVELS.find(
      (level) => zoom >= level.min && zoom < level.max
    ) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  );
}

export class Camera {
  constructor({
    x = 0,
    y = 0,
    zoom = 0.95,
    focusedObjectId = null,
  } = {}) {
    this.x = x;
    this.y = y;
    this.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.targetZoom = this.zoom;
    this.focusedObjectId = focusedObjectId;
  }

  get semanticLevel() {
    return getSemanticLevel(this.zoom);
  }

  get minimumZoom() {
    return MIN_ZOOM;
  }

  get maximumZoom() {
    return MAX_ZOOM;
  }

  panBy(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setZoom(nextZoom) {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    this.zoom = clampedZoom;
    this.targetZoom = clampedZoom;
  }

  setTargetZoom(nextZoom) {
    this.targetZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  }

  zoomBy(delta) {
    this.setTargetZoom(this.targetZoom + delta);
  }

  zoomToLevel(levelId) {
    const level = ZOOM_LEVELS.find((item) => item.id === levelId);

    if (!level) {
      return;
    }

    const midpoint = (level.min + level.max) / 2;
    this.setTargetZoom(midpoint);
  }

  focusObject(objectId) {
    this.focusedObjectId = objectId;
  }

  clearFocus() {
    this.focusedObjectId = null;
  }

  update(deltaTime) {
    const easing = 1 - Math.pow(0.001, deltaTime);
    const difference = this.targetZoom - this.zoom;

    if (Math.abs(difference) < 0.0001) {
      this.zoom = this.targetZoom;
      return;
    }

    this.zoom += difference * easing;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 0.95;
    this.targetZoom = 0.95;
    this.focusedObjectId = null;
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      targetZoom: this.targetZoom,
      semanticLevel: this.semanticLevel,
      focusedObjectId: this.focusedObjectId,
    };
  }
}
