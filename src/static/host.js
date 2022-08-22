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
  roomCode = null;
  players = {};
  onroomcode;
  onplayers;
  #origin = null;
  x = null;
  y = null;
  #pingInterval = null;

  /**
   * @param {onRoomCodeCallback} onroomcode
   * @param {onPlayersCallback} onplayers
   */
  constructor(onroomcode, onplayers) {
    this.onplayers = onplayers;
    this.onroomcode = onroomcode;
    this.socket = new WebSocket(`${hostConfig.websocket}/create-room`);
    this.socket.onopen = () => {
      this.#pingInterval = setInterval(() => {
        this.sendMessage({ type: "ping" });
      }, 1000);
    };
    this.socket.onclose = () => {
      console.log(`room ${this.roomCode} websocket closed`);
      this.socket = null;
    };
    this.socket.onmessage = this.#onSocketMessage.bind(this);
  }
  /**
   * This callback is displayed as part of the Requester class.
   * @callback GameHost~onRoomCodeCallback
   * @param {string} roomCode
   */

  async #onSocketMessage({ data }) {
    const msg = JSON.parse(data);

    console.log(msg.type);
    switch (msg.type) {
      case "room-code":
        this.roomCode = msg.value;
        this.onroomcode(this.roomCode);
        break;
      case "connect-player": {
        const { offer, playerId } = msg.value;
        await this.webRTC(playerId, offer, (answer) => {
          this.sendMessage({ type: "answer", value: { answer, playerId } });
          this.onplayers();
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

        this.onplayers();
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.onplayers();
      };

      channel.onmessage = async (message) => {
        player.onMessage(message);
        this.onplayers();
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
}
