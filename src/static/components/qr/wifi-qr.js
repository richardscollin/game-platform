/**
 * @module components
 */
import "./qr-code.js";
import { css, html, cloneTemplate, BaseElement } from "../component-utils.js";

html`<template id="wifi-qr-template">
 <div class="wifi-qr">
    <qr-code></qr-code>
    <img class="wifi-logo" src="../components/qr/wifi.svg">
 <div>
 </template>`;

css`
  .wifi-qr {
    position: relative;
  }

  .wifi-logo {
    position: absolute;
    top: 45px;
    left: 45px;
    width: 45px;
    height: 45px;
    background: white;
    padding: 2px;
    border-radius: 20%;
  }

`;

customElements.define(
  "wifi-qr",
  class extends BaseElement {
    static observedAttributes = ["ssid", "password"];
    #ssid = "";
    #password = "";

    constructor() {
      super();
      this.innerHTML = cloneTemplate("wifi-qr-template").outerHTML;
    }

    set ssid(newValue) {
      this.#ssid = newValue;
      this.updateQR();
    }

    set password(newValue) {
      this.#password = newValue;
      this.updateQR();
    }

    updateQR() {
      const value = `WIFI:S:${this.#ssid};T:WPA;P:${this.#password};;`;
      this.querySelector("qr-code").setAttribute("value", value);
    }
  }
);
