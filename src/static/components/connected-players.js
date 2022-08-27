import { css, html, cloneTemplate, BaseElement } from "./component-utils.js";

css`
  .player {
    // --player-color: ;
    // --player-connection-color: ;
    height: 55px;
    width: 250px;
    background-color: white;
    border-top: 8px solid var(--player-color);
    box-shadow: var(--default-box-shadow);
    border-radius: var(--default-border-radius);
    padding: 0.8em 1em;

    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .player-name {
    font-weight: bold;
    font-size: 20px;
  }

  .player-connection-status {
    text-transform: capitalize;
  }
  .player-connection-status::after {
    content: "";
    width: 10px;
    height: 10px;
    margin-left: 5px;
    background-color: var(--player-connection-color);
    display: inline-block;
    border-radius: 50%;
  }
`;

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
  #name;
  #color;

  constructor() {
    super();
    this.innerHTML = cloneTemplate("player-template").outerHTML;
  }

  set name(newValue) {
    this.#name = newValue;
    this.querySelector(".player-name").textContent = newValue;
  }

  set color(newValue) {
    this.#color = newValue;
    this.style.setProperty("--player-color", newValue);
  }

  set status(newValue) {
    if (!["connected", "disconnected"].includes(newValue)) {
      throw `Player ${this.#name} invalid connection status ${newValue}`;
    }

    this.querySelector(".player-connection-status").textContent = newValue;
    this.style.setProperty(
      "--player-connection-color",
      {
        connected: "green",
        disconnected: "red",
      }[newValue]
    );
  }
}

customElements.define("player-info", Player);
