export const hostConfig = {
  cors: [ "https://richardscollin.github.io", "http://localhost:3000", "https://game.richardscollin.com" ],
  rest: "https://game.richardscollin.com",
  websocket: "wss://game.richardscollin.com",
  webRoot: "https://game.richardscollin.com",
};

export const iceServers = [
  // {
  //   urls: ["stun:stun.l.google.com:19302"]
  // }
  {
    urls: ["stun:richardscollin.com"],
  },
  {
    urls: ["turn:richardscollin.com"],
    username: "username12",
    credential: "password12",
  },
];
