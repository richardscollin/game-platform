import { rtcConfig, postJson } from "../common/utils.js";

/**
 * @param {string} roomCode
 * @returns {RTCDataChannel}
 */
export async function joinRoom(roomCode, onChannel) {
  const pc = new RTCPeerConnection(rtcConfig);

  let offer = null;
  pc.onnegotiationneeded = async () => {
    console.log("onnegotiationneeded");
    offer = await pc.createOffer({ offerToReceiveAudio: 1 });
    await pc.setLocalDescription(offer);
  };

  pc.onicegatheringstatechange = ({ target }) => {
    console.log("gathering state " + target.iceGatheringState);
    if (target.iceGatheringState === "complete") {
      postJson(`/join-room/${roomCode}`, offer)
        .then((res) => {
          if (!res.ok) {
            console.log(`Unable to join room ${this.roomCode}}`);
            return;
          }
          return res.json();
        })
        .then((json) => pc.setRemoteDescription(json));
    }
  };

  const channel = pc.createDataChannel(`room-${roomCode}`);
  channel.onopen = () => {
    onChannel(channel);
  };

  window.pc = pc;
}
