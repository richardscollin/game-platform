/**
 * @module host
 */

import { rtcConfig, hostConfig } from "../utils.js";
import { Notifier } from "../components/notifier/notifier.js";
import "../components/qr/wifi-qr.js";
import "../components/qr/room-qr.js";
import "../components/connected-players.js";

/**
 * Player state stored by the host
 */
class Player {
  /** @type {number} */ updates = 0;
  /** @type {?string} */ id = null;
  /** @type {?RTCPeerConnection} */ pc = null;
  /** @type {?RTCDataChannel} */ channel = null;
  /** @type {number} */ #rttCount = 0;
  /** @type {number} */ #avgRTT = 0;
  /** @type {number} */ x = 0;
  /** @type {number} */ y = 0;

  /**
   * @param {string} playerId
   */
  constructor(playerId) {
    this.id = playerId;
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

  onMessage({ data }) {
    this.updates++;
    const message = JSON.parse(data);
    if (message.type === "pong") {
      this.appendRTT(performance.now() - message.ping);
      return;
    }

    this.x = message.x;
    this.y = message.y;
  }

  toString() {
    return `Player ${this.id}:  (${this.x},${this.y}) ${!!this.channel} ${
      this.updates
    } ${this.localClock - this.remoteClock} ${this.latency}`;
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
  /** @type {GameHost~onRoomCodeCallback} */
  #onroomcode;
  /** @type {function} */
  #onplayers;
  #origin = null;
  #pingInterval = null;
  /** @type {Notifier} */
  #notifier;

  /**
   * Called when the roomCode is available (after ws connection)
   * @callback GameHost~onRoomCodeCallback
   * @param {string} roomCode
   */

  /**
   * @param {GameHost~onRoomCodeCallback} onroomcode
   * @param {function():void} onplayers
   */
  constructor(onroomcode, onplayers) {
    this.#notifier = new Notifier();
    this.#onplayers = onplayers;
    this.#onroomcode = onroomcode;
    this.socket = new WebSocket(`${hostConfig.websocket}/create-room`);
    this.socket.onopen = () => {
      this.#notifier.notify("Server Connected", "Joined room", 1000, "green");
      this.#pingInterval = setInterval(() => {
        this.sendMessage({ type: "ping" });
      }, 1000);
    };
    this.socket.onclose = () => {
      const message = `room ${this.roomCode} websocket closed`;
      this.#notifier.notify("Disconnected", message, 5000, "red");
      console.log(message);
      this.socket = null;
    };
    this.socket.onmessage = this.#onSocketMessage.bind(this);
  }

  async #onSocketMessage({ data }) {
    const msg = JSON.parse(data);

    console.log(msg.type);
    switch (msg.type) {
      case "room-code":
        this.roomCode = msg.value;
        this.#onroomcode(this.roomCode);
        break;
      case "connect-player": {
        const { offer, playerId } = msg.value;
        await this.webRTC(playerId, offer, (answer) => {
          this.sendMessage({ type: "answer", value: { answer, playerId } });
          this.#onplayers();
        });
        break;
      }

      default:
        console.log(`unknown message type: ${msg.type}`);
        break;
    }
  }

  async webRTC(playerId, offer, onAnswer) {
    const pc = new RTCPeerConnection(rtcConfig);
    const player = this.getOrCreatePlayer(playerId, pc);

    pc.onicegatheringstatechange = async ({ target }) => {
      if (target.iceGatheringState === "complete") {
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
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.#onplayers();
      };

      channel.onmessage = async (message) => {
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
  getOrCreatePlayer(playerId, peerConnection) {
    if (!this.players[playerId]) {
      this.players[playerId] = new Player(playerId);
    }
    const player = this.players[playerId];

    if (peerConnection) {
      player.pc = peerConnection;
    }

    return player;
  }

  sendMessage(msg) {
    if (!this.socket) {
      console.error("Attempting to send message on closed websocket");
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }
}

function main() {
  const gameHost = new GameHost(
    function onRoomCode(roomCode) {
      document.querySelector("room-qr").setAttribute("code", roomCode);
    },
    function onPlayers() {
      const playersListRef = document.querySelector(".players-list");
      playersListRef.innerHTML = "";

      for (const player of Object.values(gameHost.players)) {
        playersListRef.appendChild(
          Object.assign(document.createElement("li"), {
            textContent: player.toString(),
          })
        );
      }
    }
  );
}
main();
