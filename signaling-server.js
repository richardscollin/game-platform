import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import { nanoid, customAlphabet } from "nanoid";
import { WebSocketServer } from "ws";

/**
 * @returns {string} a random all caps room code of length 4, some symbols are disallowed
 * @example
 * // returns "BACET"
 */
const generateRoomCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ", 4);

class Player {
  name = null;
  answer = null;
  iceCandidates = [];

  constructor(id, offer) {
    this.id = id ?? nanoid();
    this.offer = offer;
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

const app = express();
app.use(express.json());
app.use(cookieParser());

const signalingServer = new SignalingServer();


app.get("/rooms", (_req, res) => {
  res.json({ rooms: signalingServer.rooms });
});

app.post("/get-ice-candidates/:roomCode", (req, res) => {
  const room = signalingServer.findRoom(req.params.roomCode);
  if (!room) {
    res.status(400).end("Invalid room code");
    return;
  }

  const playerId = req.cookies.playerId;
  if (!playerId) {
    res.status(400).end("Missing required cookie playerId");
    return;
  }

  res.json(room.players[playerId].iceCandidates).end();
});
  
app.post("/join-room/:roomCode", (req, res) => {
  const room = signalingServer.findRoom(req.params.roomCode);

  if (!room) {
    res.status(400).end("Invalid room code");
    return;
  }

  const candidate = req.body;
  const player = new Player(req.cookies.playerId, candidate);

  room.addPlayer(player, (answer) => {
    console.log(`add player ${player.id}`);

    if (!answer) {
      res.status(500).end("A signaling error occured while connecting");
      return;
    }

    player.answer = answer;
    res.cookie("playerId", player.id, { sameSite: "strict" });
    res.json(answer).end();
  });
});

const PORT = process.env.PORT ?? 3000;
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: "/create-room" });

wsServer.on("connection", (socket) => {
  const room = signalingServer.createRoom(socket);
  room.notifyRoomCode();
  socket.on("close", () => {
    console.log(`removing room ${room.code} due to ws disconnect`);
    signalingServer.removeRoom(room.code);
  });
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
