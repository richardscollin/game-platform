interface PongMessage {
  type: "pong";
  ping: number;
  pong: number;
}
interface PlayerMoveMessage {
  type: "move";
  x: number;
  y: number;
  clock: number;
}

// message sent from client to host
export type ClientHostMessage = PongMessage | PlayerMoveMessage;
