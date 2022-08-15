import { rtcConfig, hostConfig } from "./utils.js";

/* eslint-disable no-prototype-builtins */

class Player {
  updates = 0;
  id = null;
  pc = null;
  channel = null;
  #rttCount = 0;
  #avgRTT = 0;

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
}

export class GameHost {
  socket = null;
  eventListeners = {};
  roomCode = null;
  players = {};
  #origin = null;
  x = null;
  y = null;
  #pingInterval = null;

  constructor() {
    this.socket = new WebSocket(`${hostConfig.websocket}/create-room`);
    this.socket.onopen = () => {
      this.#pingInterval = setInterval(() => {
        this.sendMessage({ type: "ping" });
      }, 1000);
    };
    this.socket.onclose = () => (this.socket = null);
    this.socket.onmessage = this.#onSocketMessage.bind(this);
  }

  async #onSocketMessage({ data }) {
    const msg = JSON.parse(data);

    console.log(msg.type);
    switch (msg.type) {
      case "room-code":
        this.roomCode = msg.value;
        this.eventListeners["room-code"]?.forEach((cb) => cb());
        break;
      case "connect-player": {
        const { offer, playerId } = msg.value;
        await this.webRTC(playerId, offer, (answer) => {
          this.sendMessage({ type: "answer", value: { answer, playerId } });
          this.eventListeners["players"]?.forEach((cb) => cb());
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
        console.log("open");

        setInterval(() => {
          channel.send(
            JSON.stringify({ type: "ping", ping: performance.now() })
          );
        }, 5000);

        this.eventListeners["players"]?.forEach((cb) => cb());
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.eventListeners["players"]?.forEach((cb) => cb());
      };

      channel.onmessage = async (message) => {
        player.onMessage(message);
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
    };
  }

  getOrCreatePlayer(playerId, pc) {
    if (!this.players[playerId]) {
      this.players[playerId] = new Player(playerId);
    }
    const player = this.players[playerId];

    if (pc) {
      player.pc = pc;
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

  addEventListener(type, cb) {
    if (!this.eventListeners.hasOwnProperty(type)) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(cb);
  }
}
