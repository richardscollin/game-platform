export const hostConfig = {
  cors: "http://localhost:3000",
  rest: "http://localhost:3000",
  websocket: "ws://localhost:3000",
  webRoot: "http://192.168.1.104:3000/game-platform",
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
