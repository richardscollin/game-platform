/**
 * @module components
 */
import "./qr-code.js";
import { html, BaseElement } from "../component-utils.js";

html`<template id="wifi-qr-template">
 <div class="wifi-qr">
    <qr-code></qr-code>
    <img class="wifi-logo" src="../components/qr/wifi.svg">
 <div>
 </template>`;

class WifiQR extends BaseElement {
  static observedAttributes = ["ssid", "password"];
  templateId = "wifi-qr-template";

  #ssid = "";
  #password = "";

  rerender(root: HTMLElement) {
    const value = `WIFI:S:${this.#ssid};T:WPA;P:${this.#password};;`;
    root.querySelector("qr-code").setAttribute("value", value);
  }

  set ssid(newValue) {
    this.#ssid = newValue;
  }

  set password(newValue) {
    this.#password = newValue;
  }
}

customElements.define("wifi-qr", WifiQR);
