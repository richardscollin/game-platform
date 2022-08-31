interface AnswerMessage {
  type: "answer";
  answer: any;
  playerId: string;
}

interface PlayerActiveMessage {
  type: "player-active";
  playerId: string;
}

interface PingMessage {
  type: "ping",
}

// (websocket) message sent from host to server
export type HostServerMessage =
  | AnswerMessage
  | PingMessage
  | PlayerActiveMessage;
