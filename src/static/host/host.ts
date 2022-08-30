/** @module host */

import "../components/qr/wifi-qr.js";
import "../components/qr/room-qr.js";
import "../components/connected-players.js";
import { type BaseElement } from "../components/component-utils.js";

import { type Player } from "./player.js";
import { GameHost } from "./game-host.js";

class BrowserGameHost extends GameHost {
  connectedPlayersRef: BaseElement;
  roomQRRef: BaseElement;

  constructor(onplayers) {
    super(onplayers);
    this.connectedPlayersRef = document.querySelector(".connected-players");
    this.roomQRRef = document.querySelector("room-qr");
  }

  onPlayerConnect(player) {
    const playerInfo = document.createElement("player-info") as BaseElement;
    playerInfo.setAttributes({
      name: player.id,
      color: player.color,
      status: "connected",
    });
    this.connectedPlayersRef.appendChild(playerInfo);
  }

  onPlayerAway(player: Player) {
    this.connectedPlayersRef
      .querySelector(`[name="${player.id}"]`)
      .setAttribute("status", "away");
  }

  onPlayerRejoin(player: Player) {
    this.connectedPlayersRef
      .querySelector(`[name="${player.id}"]`)
      .setAttribute("status", "connected");
  }

  onPlayerDisconnect(player: Player) {
    this.connectedPlayersRef
      .querySelector(`[name="${player.id}"]`)
      .setAttribute("status", "disconnected");
  }

  onServerConnect() {
    this.roomQRRef.setAttributes({ code: this.roomCode, status: "connected" });
  }

  onServerDisconnect() {
    this.roomQRRef.setAttribute("status", "disconnected");
  }
}

function main() {
  const gameHost = new BrowserGameHost(function onPlayers() {
    const playersListRef = document.querySelector(".players-list");
    playersListRef.innerHTML = "";

    for (const player of Object.values(gameHost.players)) {
      playersListRef.appendChild(
        Object.assign(document.createElement("li"), {
          textContent: player.toString(),
        })
      );
    }
  });
}
main();
