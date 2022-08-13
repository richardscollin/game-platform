import { rtcConfig, postJson } from "../common/utils.js";

export class Client {
  playerId = null;
  pc = null;
  roomCode = null;
  clock = null;

  constructor() {
    const pc = new RTCPeerConnection(rtcConfig);

    let offer = null;
    pc.onnegotiationneeded = async () => {
      offer = await pc.createOffer({ offerToReceiveAudio: 1 });
      await pc.setLocalDescription(offer);
    };

    pc.onicegatheringstatechange = async ({ target }) => {
      if (target.iceGatheringState === "complete") {
        console.log("gathering state " + target.iceGatheringState);
        this.clock = performance.now();
        const res = await postJson(`/join-room/${this.roomCode}`, offer);

        if (!res.ok) {
          console.log(`Unable to join room ${this.roomCode}}`);
          return;
        }

        this.playerId = document.cookie.split("=")[1];

        pc.setRemoteDescription(await res.json());
      }
    };

    this.pc = pc;
  }

  /**
   * @param {string} roomCode
   * @returns {RTCDataChannel}
   */
  async joinRoom(roomCode, onChannel) {
    this.roomCode = roomCode;

    const channel = this.pc.createDataChannel(`room-${roomCode}`);
    channel.onopen = () => {
      this.clock = performance.now();
      channel.send(JSON.stringify({ type: "ping", clock: this.clock }));
      onChannel(channel);
    };
  }
}
