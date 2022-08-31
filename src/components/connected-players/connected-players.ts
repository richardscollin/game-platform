import { html, BaseElement } from "../component-utils.js";
import "./connected-players.css";

html`
  <template id="player-template">
    <div class="player">
      <div class="player-name">Player name</div>
      <div class="player-connection-status">disconnected</div>
    </div>
  </template>
`;

export class Player extends BaseElement {
  static observedAttributes = ["name", "color", "status"];
  templateId = "player-template";

  #name;
  #status;
  #color;

  rerender(root: HTMLElement) {
    root.querySelector(".player-name").textContent = this.#name;
    root.querySelector(".player-connection-status").textContent = this.#status;
  }


  set name(newValue) {
    this.#name = newValue;
    this.update();
  }

  set color(newValue) {
    this.#color = newValue;
    this.style.setProperty("--player-color", newValue);
    this.update();
  }

  set status(newValue) {
    if (!["connected", "away", "disconnected"].includes(newValue)) {
      throw `Player ${this.#name} invalid connection status ${newValue}`;
    }
    this.#status = newValue;

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
