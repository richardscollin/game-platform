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
