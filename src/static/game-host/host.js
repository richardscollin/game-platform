import { logPeerConnection, rtcConfig } from "../common/utils.js";

/* eslint-disable no-prototype-builtins */

class GameHost {
  addEventListener(type, cb) {
    if (!this.eventListeners.hasOwnProperty(type)) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(cb);
  }

  constructor() {
    this.roomCode = null;
    this.players = {};
    this.eventListeners = {};
    this.iceCandidates = {};

    this.socket = new WebSocket("ws://localhost:3000/create-room");
    this.socket.addEventListener("message", async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "room-code":
          this.roomCode = msg.value;
          this.eventListeners["room-code"]?.forEach((cb) => cb());
          break;
        case "connect-player": {
          console.log("host recieve connect-player");
          const { offer, playerId } = msg.value;
          const { answer, pc } = await this.webRTC(
            playerId,
            offer,
            this.socket
          );

          if (this.iceCandidates.hasOwnProperty(playerId)) {
            this.iceCandidates[playerId].forEach((candidate) => {
              pc.addIceCandidate(candidate);
            });
            delete this.iceCandidates[playerId];
          }

          this.players[playerId] = pc; // peerConnection
          console.log("sending reply");
          this.socket.send(
            JSON.stringify({ type: "answer", value: { answer, playerId } })
          );
          break;
        }
        case "ice": {
          const { candidate, playerId } = msg.value;
          const pc = this.players[playerId];
          if (pc) {
            pc.addIceCandidate(candidate);
          } else {
            if (!this.iceCandidates.hasOwnProperty(playerId)) {
              this.iceCandidates[playerId] = [];
            }
            this.iceCandidates[playerId].push(candidate);
          }
          break;
        }
        default:
          console.log(`unknown message type: ${msg.type}`);
          break;
      }
    });
  }

  async webRTC(playerId, offer) {
    const pc = new RTCPeerConnection(rtcConfig);

    logPeerConnection(pc);
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.send(
          JSON.stringify({ type: "ice", value: { candidate, playerId } })
        );
      }
    };

    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    window.pc = pc;

    pc.ondatachannel = ({ channel }) => {
      console.log("on data channel");
      window.channel = channel;

      ["onmessage", "onopen", "onclose"].forEach((s) => {
        channel[s] = () => console.log("channel " + s);
      });
    };

    return { answer: pc.localDescription, pc };
  }
}

export { GameHost };
