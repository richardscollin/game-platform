interface RoomCodeMessage {
  type: "room-code";
  roomCode: string;
}

interface ConnectPlayerMessage {
  type: "connect-player";
  offer: any;
  playerId: string;
  color: string;
}

interface AwayPlayerMessage {
  type: "away-player";
  playerId: string;
}

// (websocket) message sent from server to host
export type ServerHostMessage =
  | RoomCodeMessage
  | ConnectPlayerMessage
  | AwayPlayerMessage;
