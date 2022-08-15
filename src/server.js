import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { nanoid, customAlphabet } from "nanoid";
import { WebSocketServer } from "ws";
import { hostConfig } from "../config.js";

const generateRoomCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ", 4);

class Player {
  id = null;
  offer = null;
  answer = null;

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
  pendingResponses = {};
  players = {};

  constructor(hostWebsocket) {
    /**
     * @type {WebSocket.WebSocket}
     */
    this.code = generateRoomCode();
    this.hostWebsocket = hostWebsocket;

    hostWebsocket.addEventListener("message", ({ data }) => {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "ping": // nop keep connection alive
          break;
        case "answer": {
          const { answer, playerId } = msg.value;
          if (this.pendingResponses[playerId]) {
            this.pendingResponses[playerId](answer);
          } else {
            console.warn("Recieved an answer without a pending offer");
          }

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

    console.log("adding player to room, awaiting response from host");
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
  rooms = {};

  createRoom(webSocket) {
    const room = new Room(webSocket);
    this.rooms[room.code] = room;
    console.log(`creating room ${room.code}`);
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
app.use("/", express.static("src/static"));
app.use(
  cors({
    origin: hostConfig.cors,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/config.js", (_req, res) => {
  res.sendFile(path.resolve("config.js"));
});

const signalingServer = new SignalingServer();

app.post('/log', (req, res) => {
  console.log(req.body);
  res.status(200).end();
});

app.post("/join-room/:roomCode", (req, res) => {
  console.log(`POST ${req.url} playerId=${req.cookies.playerId}`);
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
  console.log("UPGRADE /create-room");
  const room = signalingServer.createRoom(socket);
  room.notifyRoomCode();
  socket.on("close", () => {
    console.log(`removing room ${room.code} due to ws disconnect`);
    signalingServer.removeRoom(room.code);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`http://localhost:${PORT}`);
});
