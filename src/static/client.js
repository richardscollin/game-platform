import { rtcConfig, postJson } from "./utils.js";

console.oLog = console.log;
console.log = function () {
  console.oLog(arguments);
  fetch("/log", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify([...arguments]),
  });
};
console.log("this is a test");

export class Client {
  playerId = null;
  pc = null;
  roomCode = null;

  constructor() {
    const pc = new RTCPeerConnection(rtcConfig);

    let offer = null;
    pc.onnegotiationneeded = async () => {
      offer = await pc.createOffer({ offerToReceiveAudio: 1 });
      const sdp = offer.sdp;
      offer.sdp = sdp.replace(new RegExp('a=ice\-options:trickle\\s\\n', 'g'), '')
      await pc.setLocalDescription(offer);
    };

    pc.onicecandidate = ({ candidate }) => {
      console.log("onicecandidate " + JSON.stringify(candidate));
    };

    pc.onicegatheringstatechange = async ({ target }) => {
      console.log("gathering state " + target.iceGatheringState);

      if (target.iceGatheringState === "complete") {
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
      onChannel(channel);
    };

    channel.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.type === "ping") {
        channel.send(
          JSON.stringify({
            type: "pong",
            ping: message.ping,
            pong: performance.now(),
          })
        );
      }
    };
  }
}
