import { ClientHostMessage, HostClientMessage } from "../types/index.js";

export class Player {
  updates = 0;
  id: string = null;
  status: string = "active";
  color: string;
  pc: RTCPeerConnection = null;
  channel: RTCDataChannel = null;
  #rttCount = 0;
  #avgRTT = 0;
  x = 0;
  y = 0;

  constructor(playerId: string, color: string) {
    this.id = playerId;
    this.color = color;
  }

  get latency() {
    return this.#avgRTT / 2;
  }

  appendRTT(rtt) {
    // A_{n+1} = (x_{n+1} + n * A_n) / (n + 1)
    const n = this.#rttCount++;
    this.#avgRTT = (rtt + n * this.#avgRTT) / (n + 1);
  }

  sendMessage(message: HostClientMessage) {
    if (!this.channel) {
      console.error(
        `Attempting to send a message to player ${this.id} with no channel`
      );
      return;
    }

    this.channel.send(JSON.stringify(message));
  }

  onMessage(msg: ClientHostMessage) {
    this.updates++;
    switch (msg.type) {
      case "pong": {
        this.appendRTT(performance.now() - msg.ping);
        return;
      }
      case "move": {
        const { x, y } = msg;
        this.x = x;
        this.y = y;
      }
    }
  }

  toString() {
    return `Player ${this.id}:  (${this.x},${this.y}) ${!!this.channel} ${
      this.updates
    } ${this.latency}`;
  }
}
