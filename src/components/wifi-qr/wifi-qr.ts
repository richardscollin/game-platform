/**
 * @module components
 */
import "../qr-code/qr-code.js";
import "./wifi-qr.css"
import { BaseElement } from "../component-utils.js";

class WifiQR extends BaseElement {
  static observedAttributes = ["ssid", "password"];
  templateId = "wifi-qr-template";

  wssid = "";
  wpass = "";

  rerender(root: HTMLElement) {
    const value = `WIFI:S:${this.wssid};T:WPA;P:${this.wpass};;`;
    root.querySelector("qr-code").setAttribute("value", value);
  }

  set ssid(newValue) {
    this.wssid = newValue;
  }

  set password(newValue) {
    this.wpass = newValue;
  }
}

customElements.define("wifi-qr", WifiQR);
