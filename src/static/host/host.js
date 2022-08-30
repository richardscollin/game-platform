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
  constructor(playerId, color) {
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
  onRoomDisconnect = () => {};
  /** @type {?string} */
  roomCode = null;
  players = {};
  /** @type {GameHost~onRoomCodeCallback} */
  #onroomcode;
  /** @type {function} */ #onplayers;
  /** @type {function} */ #onplayerconnect;
  /** @type {function} */ #onplayerdisconnect;
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
   * @param {function(Player):void} onplayerconnect
   * @param {function(Player):void} onplayerdisconnect
   */
  constructor(onroomcode, onplayers, onplayerconnect, onplayerdisconnect) {
    this.#notifier = new Notifier();
    this.#onplayers = onplayers;
    this.#onroomcode = onroomcode;
    this.#onplayerconnect = onplayerconnect;
    this.#onplayerdisconnect = onplayerdisconnect;
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
    this.#notifier.notify("Disconnected", message, 5000, "red");
    this.onRoomDisconnect();
    console.log(message);
    this.socket = null;
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
        const { offer, playerId, color } = msg.value;
        await this.webRTC(playerId, offer, color, (answer) => {
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

  async webRTC(playerId, offer, color, onAnswer) {
    const pc = new RTCPeerConnection(rtcConfig);
    const player = this.getOrCreatePlayer(playerId, pc, color);

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
        this.#onplayerconnect(player);
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.#onplayers();
        this.#onplayerdisconnect(player);
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
      const roomQRRef = document.querySelector("room-qr")
      roomQRRef.setAttribute("code", roomCode);
      roomQRRef.setAttribute("status", "connected");
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
    },
    function onPlayerConnect(player) {
      const connectedPlayersRef = document.querySelector(".connected-players");
      const playerInfo = document.createElement("player-info");

      playerInfo.setAttribute("name", player.id);
      playerInfo.setAttribute("color", player.color);
      playerInfo.setAttribute("status", "connected");

      connectedPlayersRef.appendChild(playerInfo);
    },
    function onPlayerDisconnect(player) {
      const connectedPlayersRef = document.querySelector(".connected-players");
      const playerRef = connectedPlayersRef.querySelector(
        `[name="${player.id}"]`
      );
      playerRef.setAttribute("status", "disconnected");
    }
  );

  gameHost.onRoomDisconnect = () => {
    document.querySelector("room-qr").setAttribute("status", "disconnected");
  }
}
main();
