function logPeerConnection(pc) {
  [
    "onicegatheringstatechange",
    "onicecandidate",
    "onnegotiationneeded",
    "oniceconnectionstatechange",
    "onicecandidateerror",
  ].forEach((s) => {
    pc[s] = (ev) => {
      console.log(s);
      console.log(ev);
    };
  });
}

const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 1,
};

function postJson(url, data) {
  // console.log(`POST ${url}`);
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export { rtcConfig, logPeerConnection, postJson };
