interface AnswerMessage {
  answer: any;
  playerId: string;
}

export interface ConnectPlayerMessage {
  offer: any;
  playerId: string;
  color: string;
}

// (websocket) message sent from server to host
export interface ServerHostMessage {
  type: "room-code" | "connect-player" | "away-player";
  value?: AnswerMessage | ConnectPlayerMessage;
}

// (websocket) message sent from host to server
export interface HostServerMessage {
  type: "answer" | "ping" | "player-active";
  value?: AnswerMessage;
}

export interface PongMessage {
  ping: number;
  pong: number;
}

export interface PlayerMoveMessage {
  clock: number;
  x: number;
  y: number;
}

// message sent from client to host
export interface ClientHostMessage {
  type: "pong" | "move";
  value?: PongMessage | PlayerMoveMessage;
}

// message sent from host to client
export interface HostClientMessage {
  type: "";
  value?: AnswerMessage;
}
