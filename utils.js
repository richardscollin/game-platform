const hostConfig = {
  rest: "https://richardscollin.com:9000",
  websocket: "wss://richardscollin.com:9000",
  static: "https://richardscollin.github.io/game-platform",
};

export const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:richardscollin.com"],
    },
    {
      urls: ["turn:richardscollin.com"],
      username: "username12",
      credential: "password12",
    },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 1,
};

export function postJson(url, data) {
  // console.log(`POST ${url}`);
  return fetch(`${hostConfig.rest}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function getWebSocketsOrigin() {
  return hostConfig.websocket;
  // if hosted from the same domain
  // const { protocol, hostname, port } = document.location;
  // return `${protocol === "https:" ? "wss:" : "ws:"}//${hostname}:${port}`;
}

export async function getPublicOrigin() {
  return new Promise((resolve) => {
    resolve(hostConfig.static);
  });
}
