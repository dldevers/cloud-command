const INTERACTIVE_SELECTOR = [
  "button",
  "select",
  "textarea",
  "input",
  "a",
  ".cc-navigation-camera",
  ".cc-terminal-shell",
  ".cc-command-input-shell",
  ".cc-starm-object",
].join(", ");

export class InputController {
  constructor({
    viewport,
    camera,
    onInteraction = null,
  }) {
    if (!viewport) {
      throw new Error("InputController requires a viewport element.");
    }

    if (!camera) {
      throw new Error("InputController requires a camera.");
    }

    this.viewport = viewport;
    this.camera = camera;
    this.onInteraction = onInteraction;

    this.isDragging = false;
    this.pointerId = null;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.handleWheel = this.handleWheel.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);

    this.attach();
  }

  attach() {
    this.viewport.addEventListener("wheel", this.handleWheel, {
      passive: false,
    });

    this.viewport.addEventListener(
      "pointerdown",
      this.handlePointerDown
    );

    this.viewport.addEventListener(
      "pointermove",
      this.handlePointerMove
    );

    this.viewport.addEventListener(
      "pointerup",
      this.handlePointerUp
    );

    this.viewport.addEventListener(
      "pointercancel",
      this.handlePointerCancel
    );
  }

  isInteractiveTarget(target) {
    return target instanceof Element &&
      Boolean(target.closest(INTERACTIVE_SELECTOR));
  }

  handleWheel(event) {
    if (this.isInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const magnitude = Math.min(Math.abs(event.deltaY), 120);
    const zoomDelta = direction * magnitude * 0.0015;

    this.camera.zoomBy(zoomDelta);
    this.emitInteraction("zoom");
  }

  handlePointerDown(event) {
    if (
      event.button !== 0 ||
      this.isInteractiveTarget(event.target)
    ) {
      return;
    }

    this.isDragging = true;
    this.pointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    this.viewport.setPointerCapture(event.pointerId);
    this.viewport.classList.add("is-panning");

    this.emitInteraction("pan-start");
  }

  handlePointerMove(event) {
    if (
      !this.isDragging ||
      event.pointerId !== this.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;

    this.camera.panBy(deltaX, deltaY);

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    this.emitInteraction("pan");
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    this.finishDrag(event);
  }

  handlePointerCancel(event) {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    this.finishDrag(event);
  }

  finishDrag(event) {
    if (this.viewport.hasPointerCapture(event.pointerId)) {
      this.viewport.releasePointerCapture(event.pointerId);
    }

    this.isDragging = false;
    this.pointerId = null;
    this.viewport.classList.remove("is-panning");

    this.emitInteraction("pan-end");
  }

  emitInteraction(type) {
    if (typeof this.onInteraction !== "function") {
      return;
    }

    this.onInteraction({
      type,
      camera: this.camera.getState(),
    });
  }

  destroy() {
    this.viewport.removeEventListener(
      "wheel",
      this.handleWheel
    );

    this.viewport.removeEventListener(
      "pointerdown",
      this.handlePointerDown
    );

    this.viewport.removeEventListener(
      "pointermove",
      this.handlePointerMove
    );

    this.viewport.removeEventListener(
      "pointerup",
      this.handlePointerUp
    );

    this.viewport.removeEventListener(
      "pointercancel",
      this.handlePointerCancel
    );
  }
}
