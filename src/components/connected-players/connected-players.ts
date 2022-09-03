import { BaseElement } from "../component-utils.js";
import "./connected-players.css";

export class Player extends BaseElement {
  static observedAttributes = ["name", "color", "status"];
  templateId = "player-template";

  pname;
  pstatus;
  pcolor;

  rerender(root: HTMLElement) {
    root.querySelector(".player-name").textContent = this.pname;
    root.querySelector(".player-connection-status").textContent = this.pstatus;
  }

  set name(newValue) {
    this.pname = newValue;
    this.update();
  }

  set color(newValue) {
    this.pcolor = newValue;
    this.style.setProperty("--player-color", newValue);
    this.update();
  }

  set status(newValue) {
    if (!["connected", "away", "disconnected"].includes(newValue)) {
      throw `Player ${this.pname} invalid connection status ${newValue}`;
    }
    this.pstatus = newValue;

    this.style.setProperty(
      "--player-connection-color",
      {
        connected: "#24ca40",
        disconnected: "#fb6057",
        away: "#fdbb2b",
      }[newValue]
    );
    this.update();
  }
}

customElements.define("player-info", Player);
