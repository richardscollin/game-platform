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
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
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
  #ready = false;
  #name;
  #status;
  #color;

  connectedCallback() {
    const root = cloneTemplate("player-template");
    this.#ready = true;
    this.update(root);
    this.innerHTML = root.outerHTML;
  }

  /** @param {HTMLElement} root */
  update(root) {
    if (!this.#ready) return;
    root.querySelector(".player-name").textContent = this.#name;
    root.querySelector(".player-connection-status").textContent = this.#status;
  }

  set name(newValue) {
    this.#name = newValue;
    this.update(this);
  }

  set color(newValue) {
    this.#color = newValue;
    this.style.setProperty("--player-color", newValue);
    this.update(this);
  }

  set status(newValue) {
    if (!["connected", "disconnected"].includes(newValue)) {
      throw `Player ${this.#name} invalid connection status ${newValue}`;
    }
    this.#status = newValue;

    this.style.setProperty(
      "--player-connection-color",
      {
        connected: "green",
        disconnected: "red",
      }[newValue]
    );
    this.update(this);
  }
}

customElements.define("player-info", Player);
