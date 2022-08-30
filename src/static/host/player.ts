import {
  ClientHostMessage,
  PongMessage,
  PlayerMoveMessage,
  HostClientMessage,
} from "../../types.js";

export class Player {
  updates = 0;
  /** @type {?string} */ id = null;
  /** @type {?string} */ status = "active";
  /** @type {?string} */ color;
  /** @type {?RTCPeerConnection} */ pc = null;
  /** @type {?RTCDataChannel} */ channel = null;
  /** @type {number} */ #rttCount = 0;
  /** @type {number} */ #avgRTT = 0;
  /** @type {number} */ x = 0;
  /** @type {number} */ y = 0;

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
        const value = msg.value as PongMessage;
        this.appendRTT(performance.now() - value.ping);
        return;
      }
      case "move": {
        const value = msg.value as PlayerMoveMessage;
        this.x = value.x;
        this.y = value.y;
      }
    }
  }

  toString() {
    return `Player ${this.id}:  (${this.x},${this.y}) ${!!this.channel} ${
      this.updates
    } ${this.latency}`;
  }
}
