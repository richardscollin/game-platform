import { logPeerConnection, rtcConfig, postJson } from "../common/utils.js";

async function joinRoom(roomCode) {
  const pc = new RTCPeerConnection(rtcConfig);
  logPeerConnection(pc);

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      //console.log(candidate);
      postJson(`/add-ice-candidate/${roomCode}`, candidate);
    }
  };

  // {offerToReceiveAudio: 1} // this is needed for ice for some reason
  await pc.setLocalDescription(
    await pc.createOffer({ offerToReceiveAudio: 1 })
  );

  const res = await postJson(`/join-room/${roomCode}`, pc.localDescription);
  if (!res.ok) {
    console.log(`Unable to join room ${await res.text()}`);
    return;
  }
  await pc.setRemoteDescription(await res.json());
  window.pc = pc;

  pc.onconnectionstatechange = () => {
    console.log("on connection state change");
  };

  const interval = setInterval(async () => {
    const res = await postJson(`/pop-ice-candidate/${roomCode}`);
    if (res.ok) {
      const candidates = await res.json();
      candidates.forEach((candidate) => {
        pc.addIceCandidate(candidate);
      });
      if (candidates.length > 0) {
        clearInterval(interval);
      }
    }
  }, 2000);

  setTimeout(() => {
    const channel = pc.createDataChannel("room");
    // TODO it seems we can't get to the point where we 
    // can send data, channel onopen never triggers
    // 
    channel.send('ping')
  }, 3000);
}

export { joinRoom };
