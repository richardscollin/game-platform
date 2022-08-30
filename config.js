const ip = "192.168.1.104";
export const hostConfig = {
  cors: [`http://${ip}:3000`, 'http://localhost:3000'],
  rest: `http://${ip}:3000`,
  websocket: `ws://${ip}:3000`,
  webRoot: `http://${ip}:3000`,
};

export const iceServers = [
  {
    urls: ["stun:stun.l.google.com:19302"],
  },
];
