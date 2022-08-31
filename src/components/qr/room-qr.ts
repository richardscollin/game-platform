/**
 * @module components
 */
import "./qr-code.js";
import { hostConfig } from "../../config.js";
import { html, BaseElement } from "../component-utils.js";

html`<template id="room-qr-template">
  <div class="room-qr">
    <div class="room-code">
      <div class="step-2">STEP 2</div>
      <div class="connection-state">X</div>
      Room Code
      <div class="room-code-text"></div>
    </div>
    <qr-code></qr-code>
  </div>
</template>`;

class RoomQR extends BaseElement {
  static observedAttributes = ["status", "code"];
  templateId = "room-qr-template";

  #code;
  #status = "";

  rerender(root: HTMLElement) {
    const url = hostConfig.webRoot + "/?roomCode=" + this.#code;
    root.querySelector<HTMLElement>(".room-code-text").innerText = this.#code;
    root.querySelector("qr-code").setAttribute("value", url);
    root.querySelector<HTMLElement>(".connection-state").innerText =
      this.#status;
  }

  set code(newValue) {
    this.#code = newValue;
    this.update();
  }

  set status(newValue) {
    this.#status = newValue;
    this.update();
  }
}
customElements.define("room-qr", RoomQR);
