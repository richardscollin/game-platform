import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { SignalingServer, Player } from "./signaling-server/index.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("src/static"));

const signalingServer = new SignalingServer();

app.get("/", (req, res) => {
  res.sendFile(path.resolve("src/static/game-client/client.html"));
});

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

app.post("/add-ice-candidates/:roomCode", (req, res) => {
  const playerId = req.cookies.playerId;
  if (!playerId) {
    res.status(400).end("Missing required cookie playerId");
    return;
  }

  const room = signalingServer.findRoom(req.params.roomCode);
  if (!room) {
    res.status(400).end("Invalid room code");
    return;
  }

  for (const candidate of req.body) {
    room.sendMessage({
      type: "ice",
      value: { candidate, playerId },
    });
  }

  res.status(200).end();
});

app.post("/join-room/:roomCode", (req, res) => {
  const room = signalingServer.findRoom(req.params.roomCode);

  if (!room) {
    res.status(400).end("Invalid room code");
    return;
  }

  const { type, sdp } = req.body;
  const player = new Player(req.cookies.playerId, { type, sdp });

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
