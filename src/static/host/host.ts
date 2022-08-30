import { unimplemented, rtcConfig, hostConfig } from "../utils.js";
import { Notifier } from "../components/notifier/notifier.js";
import "../components/qr/wifi-qr.js";
import "../components/qr/room-qr.js";
import "../components/connected-players.js";
import { BaseElement } from "../components/component-utils.js";
import {
  ServerHostMessage,
  HostServerMessage,
  ClientHostMessage,
  ConnectPlayerMessage,
  PongMessage,
  PlayerMoveMessage,
} from "../../types.js";

/**
 * Player state stored by the host
 */
class Player {
  updates = 0;
  /** @type {?string} */ id = null;
  /** @type {?string} */ status = "active";
  /** @type {?string} */ color;
  /** @type {?RTCPeerConnection} */ pc = null;
  /** @type {?RTCDataChannel} */ channel = null;
  /** @type {number} */ #rttCount = 0;
  /** @type {number} */ #avgRTT = 0;
  /** @type {number} */ x = 0;
  /** @type {number} */ y = 0;

  constructor(playerId: string, color: string) {
    this.id = playerId;
    this.color = color;
  }

  get latency() {
    return this.#avgRTT / 2;
  }

  appendRTT(rtt) {
    // A_{n+1} = (x_{n+1} + n * A_n) / (n + 1)
    const n = this.#rttCount++;
    this.#avgRTT = (rtt + n * this.#avgRTT) / (n + 1);
  }

  sendMessage(message) {
    if (!this.channel) {
      console.error(
        `Attempting to send a message to player ${this.id} with no channel`
      );
      return;
    }

    this.channel.send(JSON.stringify(message));
  }

  onMessage(msg: ClientHostMessage) {
    this.updates++;
    switch (msg.type) {
      case "pong": {
        const value = msg.value as PongMessage;
        this.appendRTT(performance.now() - value.ping);
        return;
      }
      case "move": {
        const value = msg.value as PlayerMoveMessage;
        this.x = value.x;
        this.y = value.y;
      }
    }
  }

  toString() {
    return `Player ${this.id}:  (${this.x},${this.y}) ${!!this.channel} ${
      this.updates
    } ${this.latency}`;
  }
}

/**
 * Class managing the game on the host machine.
 */
class GameHost {
  /** @type {?WebSocket} */
  socket = null;
  /** @type {?string} */
  roomCode = null;
  players = {};

  /** @type {function} */ #onplayers;
  #origin = null;
  #pingInterval = null;
  /** @type {Notifier} */ #notifier;

  /**
   * Called when the roomCode is available (after ws connection)
   * @callback GameHost~onRoomCodeCallback
   * @param {string} roomCode
   */

  /**
   * @param {GameHost~onRoomCodeCallback} onroomcode
   * @param {function():void} onplayers
   * @param {function(Player):void} onplayerconnect
   * @param {function(Player):void} onplayerdisconnect
   */
  constructor(onplayers) {
    this.#notifier = new Notifier();
    this.#onplayers = onplayers;

    this.socket = new WebSocket(`${hostConfig.websocket}/create-room`);
    this.socket.onopen = this.#onSocketOpen.bind(this);
    this.socket.onclose = this.#onSocketClose.bind(this);
    this.socket.onmessage = this.#onSocketMessage.bind(this);
  }

  #onSocketOpen() {
    this.#notifier.notify("Server Connected", "Joined room", 1000, "green");
    this.#pingInterval = setInterval(() => {
      this.sendMessage({ type: "ping" });
    }, 1000);
  }

  #onSocketClose() {
    const message = `room ${this.roomCode} websocket closed`;
    this.#notifier.notify("Disconnected", message, 10000, "red");
    this.onServerDisconnect();
    console.log(message);
    this.socket = null;
  }

  async #onSocketMessage({ data }) {
    const msg = JSON.parse(data) as ServerHostMessage;

    console.log(msg.type);
    switch (msg.type) {
      case "room-code":
        this.roomCode = msg.value;
        this.onServerConnect();
        break;
      case "connect-player": {
        const { offer, playerId, color } = msg.value as ConnectPlayerMessage;
        await this.webRTC(playerId, offer, color, (answer) => {
          this.sendMessage({ type: "answer", value: { answer, playerId } });
          this.#onplayers();
        });
        break;
      }
      case "away-player": {
        const { playerId } = msg.value;
        const player = this.players[playerId];
        player.status = "away";
        this.onPlayerAway(player);
        break;
      }

      default:
        console.log(`unknown message type: ${msg.type}`);
        break;
    }
  }

  async webRTC(playerId, offer, color, onAnswer) {
    const pc = new RTCPeerConnection(rtcConfig);
    const player = this.getOrCreatePlayer(playerId, pc, color);

    pc.onicegatheringstatechange = async () => {
      if (pc.iceGatheringState === "complete") {
        onAnswer(pc.localDescription);
      }
    };
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());

    pc.ondatachannel = ({ channel }) => {
      console.log("ondatachannel");
      channel.onopen = () => {
        player.channel = channel;
        this.#notifier.notify(
          "Player Connected",
          `${playerId} joined room`,
          1000,
          "green"
        );

        setInterval(() => {
          channel.send(
            JSON.stringify({ type: "ping", ping: performance.now() })
          );
        }, 5000);

        this.#onplayers();
        this.onPlayerConnect(player);
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.#onplayers();
        this.onPlayerDisconnect(player);
      };

      channel.onmessage = async ({ data }) => {
        const message = JSON.parse(data) as ClientHostMessage;
        // if (player.status !== "active") {
        //   this.onPlayerRejoin();
        // }
        // player.status = "active";

        player.onMessage(message);
        this.#onplayers();
      };
    };
  }

  /**
   * @param {string} playerId
   * @param {?RTCPeerConnection} peerConnection
   * @returns {Player} the current player with that playerId or a newly create player
   */
  getOrCreatePlayer(playerId, peerConnection, color) {
    if (!this.players[playerId]) {
      this.players[playerId] = new Player(playerId, color);
    }
    const player = this.players[playerId];

    if (peerConnection) {
      player.pc = peerConnection;
    }

    return player;
  }

  sendMessage(msg: HostServerMessage) {
    if (!this.socket) {
      console.error("Attempting to send message on closed websocket");
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }

  onPlayerConnect(player: Player) {
    unimplemented();
  }
  onPlayerDisconnect(player: Player) {
    unimplemented();
  }
  onPlayerAway(player: Player) {
    unimplemented();
  }
  onPlayerRejoin(player: Player) {
    unimplemented();
  }
  onServerConnect() {
    unimplemented();
  }
  onServerDisconnect() {
    unimplemented();
  }
}

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
