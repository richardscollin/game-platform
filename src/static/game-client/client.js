import { rtcConfig, postJson } from "../common/utils.js";

/**
 * @param {string} roomCode
 * @returns {RTCDataChannel}
 */
export async function joinRoom(roomCode) {
  const pc = new RTCPeerConnection(rtcConfig);

  const offerConfig = { offerToReceiveAudio: 1 }; // this is needed for ice for some reason
  await pc.setLocalDescription(await pc.createOffer(offerConfig));

  const res = await postJson(`/join-room/${roomCode}`, pc.localDescription);
  if (!res.ok) {
    console.log(`Unable to join room ${await res.text()}`);
    return;
  }
  await pc.setRemoteDescription(await res.json());

  const candidates = [];
  pc.onicecandidate = ({ candidate }) => {
    candidates.push(candidate);
    if (!candidate) {
      postJson(`/add-ice-candidates/${roomCode}`, candidates);
    }
  };

  async function pollIceCandidates() {
    const res = await postJson(`/get-ice-candidates/${roomCode}`);
    if (!res.ok) return;
    let containsEndOfCandidates = false;

    (await res.json()).forEach((candidate) => {
      pc.addIceCandidate(candidate);
      if (!candidate) {
        containsEndOfCandidates = true;
      }
    });

    if (!containsEndOfCandidates) {
      setTimeout(pollIceCandidates, 1000);
    }
  }
  setTimeout(pollIceCandidates, 500);

  return pc.createDataChannel(`room-${roomCode}`);
}
