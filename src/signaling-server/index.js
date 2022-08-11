/** @module SignalingServer */
import { nanoid, customAlphabet } from "nanoid";

/**
 * @returns {string} a random all caps room code of length 4, some symbols are disallowed
 * @example
 * // returns "BACET"
 */
const generateRoomCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ", 4);

class Player {
  constructor(id, offer) {
    this.id = id ?? nanoid();
    this.offer = offer;
    this.name = null;
    this.answer = null;
    this.iceCandidates = [];
  }
}

/**
 * Class representing a game room. Manages the players and
 * hosts. In order to play a game, first a room must be created.
 */
class Room {
  constructor(hostWebsocket) {
    /**
     * @type {WebSocket.WebSocket}
     */
    this.hostWebsocket = hostWebsocket;
    this.pendingResponses = {};
    this.players = {};
    this.code = generateRoomCode();

    hostWebsocket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "answer": {
          const { answer, playerId } = msg.value;
          if (this.pendingResponses[playerId]) {
            this.pendingResponses[playerId](answer);
          } else {
            console.warn("Recieved an answer without a pending offer");
          }

          break;
        }
        case "ice": {
          this.players[msg.value.playerId].iceCandidates = msg.value.candidates;
          break;
        }
        default:
          console.log(`Unknown message type: ${msg.type}`);
      }
    });
  }

  addPlayer(player, onHostAnswer) {
    this.players[player.id] = player;

    this.pendingResponses[player.id] = onHostAnswer;

    console.log("host websocket send");
    this.hostWebsocket.send(
      JSON.stringify({
        type: "connect-player",
        value: { playerId: player.id, offer: player.offer },
      })
    );
  }

  sendMessage(message) {
    this.hostWebsocket.send(JSON.stringify(message));
  }

  notifyRoomCode() {
    this.hostWebsocket.send(
      JSON.stringify({ type: "room-code", value: this.code })
    );
  }
}

class SignalingServer {
  constructor() {
    this.rooms = {};
  }

  createRoom(webSocket) {
    const room = new Room(webSocket);
    this.rooms[room.code] = room;
    return room;
  }

  removeRoom(code) {
    delete this.rooms[code];
    // TODO worry about lingering callbacks
  }

  /**
   *
   * @param {string} roomCode room code
   * @returns {Room | null} the room associated with the roomCode, null otherwise
   */
  findRoom(roomCode) {
    return this.rooms[roomCode.toUpperCase()] ?? null;
  }
}

export { SignalingServer, Room, Player };
