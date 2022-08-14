export const hostConfig = {
  cors: "https://richardscollin.github.io",
  rest: "https://richardscollin.com:9000",
  websocket: "wss://richardscollin.com:9000",
  webRoot: "https://richardscollin.github.io/game-platform",
};

export const iceServers = [
  {
    urls: ["stun:richardscollin.com"],
  },
  {
    urls: ["turn:richardscollin.com"],
    username: "username12",
    credential: "password12",
  },
];
