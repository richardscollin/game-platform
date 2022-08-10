import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { SignalingServer, Player } from "./signaling-server/index.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("src/static"));

const signalingServer = new SignalingServer();

app.get("/rooms", (_req, res) => {
  res.json({ rooms: signalingServer.rooms });
});

app.post("/pop-ice-candidate/:roomCode", (req, res) => {
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

  const candidates = room.players[playerId].iceCandidates.slice();
  room.players[playerId].iceCandidates = [];
  res.json(candidates).end();
});

app.post("/add-ice-candidate/:roomCode", (req, res) => {
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

  room.hostWebsocket.send(
    JSON.stringify({ type: "ice", value: { candidate: req.body, playerId } })
  );
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
    console.log("forwarding");
    console.log(answer.sdp);
    if (answer) {
      player.answer = answer;
      res.cookie("playerId", player.id, { sameSite: "strict" });
      res.json(answer).end();
    } else {
      res.status(500).end("A signaling error occured while connecting");
    }
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
