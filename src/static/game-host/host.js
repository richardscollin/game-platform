import { rtcConfig, getWebSocketsOrigin } from "../common/utils.js";

/* eslint-disable no-prototype-builtins */

class Player {
  updates = 0;
  id = null;
  pc = null;
  channel = null;
  iceCandidates = [];
  localClock = null;
  remoteClock = null;
  #latenciesCount = 0;
  #avgLatency = 0;

  constructor(playerId) {
    this.id = playerId;
  }

  get latency() {
    return this.#avgLatency;
  }

  appendLatency(remoteNow) {
    // const l = performance.now() - this.localClock;
    // const r = remoteNow - this.remoteClock;
    // const latency = r - l;
    // todo the calculation needs to be rethought
    const latency = (performance.now() - remoteNow) - (this.localClock - this.remoteClock);

    // A_{n+1} = (x_{n+1} + n * A_n) / (n + 1)
    const n = this.#latenciesCount++;
    this.#avgLatency = (latency + n * this.#avgLatency) / (n + 1);
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

  onMessage(message) {
    console.log(`player ${this.id} on message ${message}`);
  }
}

export class GameHost {
  socket = null;
  eventListeners = {};
  roomCode = null;
  players = {};
  iceCandidates = {};
  #origin = null;
  x = null;
  y = null;

  constructor() {
    this.socket = new WebSocket(`${getWebSocketsOrigin()}/create-room`);
    this.socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

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
    };
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
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
      player.onMessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.type === "ping") {
          player.remoteClock = message.clock;
          player.localClock = performance.now();
          return;
        }

        player.appendLatency(message.clock);

        player.x = message.x;
        player.y = message.y;
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
      channel.onmessage = async (message) => {
        player.updates++;
        player.onMessage(message);
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
    this.socket.send(JSON.stringify(msg));
  }

  addEventListener(type, cb) {
    if (!this.eventListeners.hasOwnProperty(type)) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(cb);
  }
}
