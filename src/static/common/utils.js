export const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 1,
};

export function postJson(url, data) {
  // console.log(`POST ${url}`);
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function getWebSocketsOrigin() {
  const { protocol, hostname, port } = document.location;
  return `${protocol === "https:" ? "wss:" : "ws:"}//${hostname}:${port}`;
}

function isAllowedAddress(addr) {
  if (addr.endsWith(".local")) return true;
  // TODO support ipv6
  let match = addr.match(/(\d+).(\d+).(\d+).(\d+)/);
  if (match.shift()) {
    match = match.map((e) => parseInt(e));
    const [a, b] = match;

    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && 16 <= b && b <= 31) return true;
  }
  return false;
}

export async function getPublicOrigin() {
  return new Promise((resolve, reject) => {
    // must get user media in order to get correct ip candidates
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then(() => {
        const pc = new RTCPeerConnection(rtcConfig);

        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
        };

        let host = null;
        pc.onicecandidate = ({ candidate }) => {
          // example:
          // candidate:0 1 UDP 2122252543 1c4cb7d2-782f-4cdf-9f6e-226a7f42ed63.local 37275 typ host
          console.log(candidate);
          const info = candidate?.candidate?.split(" ");
          if (info && info.length > 5) {
            const { protocol, port } = document.location;
            const hostname = info[4];
            if (isAllowedAddress(hostname)) {
              resolve(`${protocol}//${hostname}:${port}`);
            }
          } else if (candidate === null && !host) {
            reject("No candidate hostname found");
          }
        };

        pc.createDataChannel("dummy");
      });
  });
}
