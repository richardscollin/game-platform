/**
 * @module components
 */
import "./qr-code.js";
import { hostConfig } from "../../config.js";
import { css, html, cloneTemplate, BaseElement } from "../component-utils.js";

html`<template id="room-qr-template">
<div class="room-qr">
    <div class="room-code">
        Room code
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
`;

customElements.define(
  "room-qr",
  class extends BaseElement {
    static observedAttributes = ["code"];

    constructor() {
      super();
      this.innerHTML = cloneTemplate("room-qr-template").outerHTML;
    }

    set code(newValue) {
      const url = hostConfig.webRoot + "/?roomCode=" + newValue;
      this.querySelector(".room-code-text").innerText = newValue;
      this.querySelector("qr-code").setAttribute("value", url);
    }
  }
);
