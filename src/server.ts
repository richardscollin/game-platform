import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { resolve } from "path";
import { createServer } from "http";
import { nanoid, customAlphabet } from "nanoid";
import { WebSocketServer, type WebSocket } from "ws";
import { hostConfig } from "./config.js";
import { HostServerMessage, ServerHostMessage } from "./types/index.js";

const generateRoomCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ", 4);

class Player {
  id = null;
  offer = null;
  answer = null;
  color = null;

  away = false;

  hostIce;

  constructor(id, offer) {
    this.id = id ?? nanoid();
    this.offer = offer;
  }

  isAway() {
    return this.away;
  }

  setAway() {
    this.away = true;
  }

  setActive() {
    this.away = false;
  }
}

/**
 * Class representing a game room. Manages the players and
 * hosts. In order to play a game, first a room must be created.
 */
class Room {
  pendingResponses = {};
  players = {};
  code;
  hostWebsocket;

  constructor(hostWebsocket) {
    this.code = generateRoomCode();
    this.hostWebsocket = hostWebsocket;

    hostWebsocket.addEventListener("message", ({ data }) => {
      this.onMessage(JSON.parse(data));
    });
  }

  onMessage(msg: HostServerMessage) {
    switch (msg.type) {
      case "ping": // nop keep connection alive
        break;
      case "answer": {
        const { answer, playerId } = msg;
        if (this.pendingResponses[playerId]) {
          this.pendingResponses[playerId](answer);
        } else {
          console.warn("Recieved an answer without a pending offer");
        }

        break;
      }
      case "player-active": {
        const { playerId } = msg;
        this.setPlayerActive(playerId);
        break;
      }
    }
  }

  addPlayer(player, onHostAnswer) {
    this.players[player.id] = player;
    player.color = this.randomColor();

    this.pendingResponses[player.id] = onHostAnswer;

    console.log("adding player to room, awaiting response from host");
    this.sendMessage({
      type: "connect-player",
      playerId: player.id,
      color: player.color,
      offer: player.offer,
    });
  }

  setPlayerAway(playerId) {
    const player = this.players[playerId];

    if (!player) {
      return false;
    }

    if (player.isAway()) return; // no-op

    player.setAway();
    this.sendMessage({
      type: "away-player",
      playerId: player.id,
    });
  }

  setPlayerActive(playerId) {
    this.players[playerId]?.setActive();
  }

  notifyRoomCode() {
    this.sendMessage({ type: "room-code", roomCode: this.code });
  }

  sendMessage(message: ServerHostMessage) {
    this.hostWebsocket.send(JSON.stringify(message));
  }

  randomColor() {
    // todo make unique
    const colors = [
      "#DC2626", // red
      "#EA580C", // orange
      "#CA8A04", // yellow
      "#2563EB", // blue
      "#C026D3", // purple
      "#F472B6", // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

class SignalingServer {
  rooms = {};

  createRoom(webSocket: WebSocket) {
    const room = new Room(webSocket);
    this.rooms[room.code] = room;
    console.log(`creating room ${room.code}`);
    return room;
  }

  removeRoom(code: string) {
    delete this.rooms[code];
    // TODO worry about lingering callbacks
  }

  findRoom(roomCode: string): Room {
    return this.rooms[roomCode.toUpperCase()] ?? null;
  }
}

const app = express();
app.use("/", express.static("./out/static"));
app.use("/", express.static("./src/static"));

app.use(
  cors({
    origin: hostConfig.cors,
  })
);
app.use(express.json());
app.use(cookieParser());
app.get("/config.js", (req, res) => {
  res.sendFile(resolve("out/config.js"));
});

const signalingServer = new SignalingServer();

app.post("/log", (req, res) => {
  console.log(req.body);
  res.status(200).end();
});

app.post("/away-room/:roomCode", (req, res) => {
  const { playerId } = JSON.parse(req.body);

  console.log(`POST ${req.url} playerId=${playerId}`);
  const room = signalingServer.findRoom(req.params.roomCode);

  if (!room) {
    res.status(400).end("Invalid room code");
    return;
  }

  if (!playerId) {
    res.status(400).end("Invalid player id");
    return;
  }

  room.setPlayerAway(playerId);

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
    res.json({ answer, color: player.color }).end();
  });
});

const PORT = parseInt(process.env.PORT ?? "3000");
const server = createServer(app);
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
  console.log(process.env.NODE_ENV);
  console.log(`http://localhost:${PORT}`);
});
