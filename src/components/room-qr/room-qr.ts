/**
 * @module components
 */
import "./room-qr.css";
import "../qr-code/qr-code.js";
import { hostConfig } from "../../config.js";
import { BaseElement } from "../component-utils.js";

class RoomQR extends BaseElement {
  static observedAttributes = ["status", "code"];
  templateId = "room-qr-template";

  roomCode;
  connectionStatus = "";

  rerender(root: HTMLElement) {
    const url = hostConfig.webRoot + "/?roomCode=" + this.roomCode;
    root.querySelector<HTMLElement>(".room-code-text").innerText =
      this.roomCode;
    root.querySelector("qr-code").setAttribute("value", url);
    root.querySelector<HTMLElement>(".connection-state").innerText =
      this.connectionStatus;
  }

  set code(newValue) {
    this.roomCode = newValue;
    this.update();
  }

  set status(newValue) {
    this.connectionStatus = newValue;
    this.update();
  }
}
customElements.define("room-qr", RoomQR);
