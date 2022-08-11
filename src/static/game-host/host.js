import { rtcConfig, getWebSocketsOrigin } from "../common/utils.js";

/* eslint-disable no-prototype-builtins */

class Player {
  id = null;
  pc = null;
  channel = null;
  iceCandidates = [];

  constructor(playerId) {
    this.id = playerId;
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

  addIceCandidate(candidate) {
    // in some cases the ice candidates arrive before the player connection is created
    if (this.pc) {
      this.pc.addIceCandidate(candidate);
      this.clearIceCandidates();
    } else {
      this.iceCandidates.push(candidate);
    }
  }

  clearIceCandidates() {
    if (!this.pc) return;
    this.iceCandidates.forEach((candidate) => {
      console.log("recv ice candidate");
      this.pc.addIceCandidate(candidate);
    });
    this.iceCandidates = [];
  }
}

export class GameHost {
  socket = null;
  eventListeners = {};
  roomCode = null;
  players = {};
  iceCandidates = {};

  constructor() {
    this.socket = new WebSocket(`${getWebSocketsOrigin()}/create-room`);
    this.socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "room-code":
          this.roomCode = msg.value;
          this.eventListeners["room-code"]?.forEach((cb) => cb());
          break;
        case "connect-player": {
          const { offer, playerId } = msg.value;
          const { answer } = await this.webRTC(playerId, offer);
          this.sendMessage({ type: "answer", value: { answer, playerId } });
          this.eventListeners["players"]?.forEach((cb) => cb());
          break;
        }
        case "ice": {
          const { candidate, playerId } = msg.value;
          this.getOrCreatePlayer(playerId).addIceCandidate(candidate);
          break;
        }
        default:
          console.log(`unknown message type: ${msg.type}`);
          break;
      }
    };
  }

  async webRTC(playerId, offer) {
    const pc = new RTCPeerConnection(rtcConfig);
    const player = this.getOrCreatePlayer(playerId, pc);

    const candidates = [];
    pc.onicecandidate = ({ candidate }) => {
      candidates.push(candidate);
      if (!candidate) {
        this.sendMessage({ type: "ice", value: { candidates, playerId } });
      }
    };

    pc.ondatachannel = ({ channel }) => {
      console.log("ondatachannel");
      channel.onopen = () => {
        player.channel = channel;
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
      channel.onclose = () => {
        player.channel = null;
        this.eventListeners["players"]?.forEach((cb) => cb());
      };
      channel.onmessage = ({ message }) => player.onMessage(message);
    };

    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    return { answer: pc.localDescription };
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
