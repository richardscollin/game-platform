/**
 * @module components
 */
import "./qr-code.js";
import { hostConfig } from "../../config.js";
import { css, html, cloneTemplate, BaseElement } from "../component-utils.js";

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

css`
  .room-qr {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 10px;
  }
  .room-qr .room-code {
    font-size: 20px;
    text-align: left;
  }
  .room-qr .room-code-text {
    font-weight: bold;
    font-size: 40px;
  }
  .room-qr .step-2 {
    font-weight: bold;
    font-size: 40px;
  }
`;

customElements.define(
  "room-qr",
  class extends BaseElement {
    #ready = false;
    #code;
    #status = "";
    static observedAttributes = ["status", "code"];

    connectedCallback() {
      const root = cloneTemplate("room-qr-template");
      this.#ready = true;
      this.update(root);
      this.innerHTML = root.outerHTML;
    }

    update(root) {
      if (!this.#ready) return;
      root = root || this;
      const url = hostConfig.webRoot + "/?roomCode=" + this.#code;
      root.querySelector(".room-code-text").innerText = this.#code;
      root.querySelector("qr-code").setAttribute("value", url);
      root.querySelector(".connection-state").innerText = this.#status;
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
);
