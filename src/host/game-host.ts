import { rtcConfig, hostConfig } from "../utils.js";
import { Notifier } from "../components/notifier/notifier.js";
import {
  ServerHostMessage,
  HostServerMessage,
  ClientHostMessage,
} from "../types/index.js";
import { Player } from "./player.js";

export abstract class GameHost {
  socket: WebSocket;
  roomCode: string;
  players = {};

  onplayers;
  origin = null;
  pingInterval = null;
  notifier: Notifier;

  abstract onPlayerConnect(player: Player);
  abstract onPlayerDisconnect(player: Player);
  abstract onPlayerAway(player: Player);
  abstract onPlayerRejoin(player: Player);
  abstract onServerConnect();
  abstract onServerDisconnect();

  constructor(onplayers) {
    this.notifier = new Notifier();
    this.onplayers = onplayers;

    this.socket = new WebSocket(`${hostConfig.websocket}/create-room`);
    this.socket.onopen = this.onSocketOpen.bind(this);
    this.socket.onclose = this.onSocketClose.bind(this);
    this.socket.onmessage = ({ data }) => {
      const msg = JSON.parse(data) as ServerHostMessage;
      this.onSocketMessage(msg);
    };
  }

  onSocketOpen() {
    this.notifier.notify("Server Connected", "Joined room", 1000, "green");
    this.pingInterval = setInterval(() => {
      this.sendMessage({ type: "ping" });
    }, 1000);
  }

  onSocketClose() {
    const message = `room ${this.roomCode} websocket closed`;
    this.notifier.notify("Disconnected", message, 10000, "red");
    this.onServerDisconnect();
    console.log(message);
    this.socket = null;
  }

  async onSocketMessage(msg: ServerHostMessage) {
    switch (msg.type) {
      case "room-code": {
        this.roomCode = msg.roomCode;
        this.onServerConnect();
        break;
      }
      case "connect-player": {
        const { offer, playerId, color } = msg;
        await this.webRTC(playerId, offer, color, (answer) => {
          this.sendMessage({ type: "answer", answer, playerId });
          this.onplayers();
        });
        break;
      }
      case "away-player": {
        const player = this.players[msg.playerId];
        player.status = "away";
        this.onPlayerAway(player);
        break;
      }
    }
  }

  async webRTC(playerId, offer, color, onAnswer) {
    const pc = new RTCPeerConnection(rtcConfig);
    const player = this.getOrCreatePlayer(playerId, pc, color);

    pc.onicegatheringstatechange = async () => {
      if (pc.iceGatheringState === "complete") {
        onAnswer(pc.localDescription);
      }
    };
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());

    pc.ondatachannel = ({ channel }) => {
      console.log("ondatachannel");
      channel.onopen = () => {
        player.channel = channel;
        this.notifier.notify(
          "Player Connected",
          `${playerId} joined room`,
          1000,
          "green"
        );

        setInterval(() => {
          channel.send(
            JSON.stringify({ type: "ping", ping: performance.now() })
          );
        }, 5000);

        this.onplayers();
        this.onPlayerConnect(player);
      };

      channel.onclose = () => {
        player.channel = null;
        console.log("close");
        this.onplayers();
        this.onPlayerDisconnect(player);
      };

      channel.onmessage = async ({ data }) => {
        const message = JSON.parse(data) as ClientHostMessage;
        // if (player.status !== "active") {
        //   this.onPlayerRejoin();
        // }
        // player.status = "active";

        player.onMessage(message);
        this.onplayers();
      };
    };
  }

  /**
   * @param {string} playerId
   * @param {?RTCPeerConnection} peerConnection
   * @returns {Player} the current player with that playerId or a newly create player
   */
  getOrCreatePlayer(playerId, peerConnection, color) {
    if (!this.players[playerId]) {
      this.players[playerId] = new Player(playerId, color);
    }
    const player = this.players[playerId];

    if (peerConnection) {
      player.pc = peerConnection;
    }

    return player;
  }

  sendMessage(msg: HostServerMessage) {
    if (!this.socket) {
      console.error("Attempting to send message on closed websocket");
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }
}
