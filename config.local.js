export const hostConfig = {
  cors: "http://localhost:3000",
  rest: "http://localhost:3000",
  websocket: "ws://localhost:3000",
  webRoot: "http://192.168.1.104:3000",
};

export const iceServers = [
  {
    urls: ["stun:coturn.local"],
  },
  {
    urls: ["turn:coturn.local"],
  },
];
