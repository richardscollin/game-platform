/** @module client */
import { rtcConfig, postJson } from "./utils.js";
import { ClientHostMessage, HostClientMessage } from "./types/index.js";

const oLog = console.log;
console.log = function () {
  oLog(arguments);
  fetch("/log", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify([...arguments]),
  });
};

abstract class Client {
  playerId: string = null;
  pc: RTCPeerConnection;
  roomCode: string = null;
  #channel: RTCDataChannel;

  abstract onJoin();
  abstract onLeave();

  constructor() {
    const pc = new RTCPeerConnection(rtcConfig);

    let offer = null;
    pc.onnegotiationneeded = async () => {
      offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
    };

    pc.onicecandidate = ({ candidate }) => {
      console.log("onicecandidate " + JSON.stringify(candidate));
    };

    pc.onicegatheringstatechange = async () => {
      if (pc.iceGatheringState === "complete") {
        const res = await postJson(`/join-room/${this.roomCode}`, offer);

        if (!res.ok) {
          console.log(`Unable to join room ${this.roomCode}}`);
          return;
        }

        this.playerId = document.cookie.split("=")[1];

        const data = await res.json();
        const { answer, color } = data;
        this.color = color;
        pc.setRemoteDescription(answer);
      }
    };

    this.pc = pc;
    this.createBeacon();
  }

  set color(value) {
    document.documentElement.style.setProperty("--player-color", value);
    document
      .querySelector("meta[name=theme-color]")
      .setAttribute("content", value);
  }

  createBeacon() {
    document.addEventListener("visibilitychange", () => {
      console.log("visibility changed " + document.visibilityState);
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon(
          `/away-room/${this.roomCode}`,
          JSON.stringify({ playerId: this.playerId })
        );
      }
    });
  }

  sendHost(message: ClientHostMessage) {
    if (!this.#channel) {
      console.log("Attempting send on closed channel");
      return;
    }
    this.#channel.send(JSON.stringify(message));
  }

  joinRoom(roomCode: string) {
    this.roomCode = roomCode;

    this.#channel = this.pc.createDataChannel(`room-${roomCode}`);
    this.#channel.onopen = this.onJoin.bind(this);
    this.#channel.onclose = this.onLeave.bind(this);
    this.#channel.onmessage = ({ data }) => {
      const message = JSON.parse(data) as HostClientMessage;
      if (message.type === "ping") {
        this.sendHost({
          type: "pong",
          ping: message.ping,
          pong: performance.now(),
        });
      }
    };
  }
}

class BrowserClient extends Client {
  currentRoomRef = document.querySelector(".current-room");

  onJoin(): void {
    this.currentRoomRef.textContent = `${this.roomCode} (connected)`;
    document.onpointermove = (e) => {
      this.sendHost({
        type: "move",
        clock: performance.now(),
        x: e.clientX,
        y: e.clientY,
      });
    };
  }

  onLeave(): void {
    this.currentRoomRef.textContent = "disconnected";
    document.onpointermove = null;
  }
}

function appHeight() {
  document.documentElement.style.setProperty(
    "--app-height",
    `${window.innerHeight}px`
  );
}
window.addEventListener("resize", appHeight);

export function main() {
  appHeight();

  const form = document.querySelector("form");
  const input = document.querySelector(".room-code-input") as HTMLInputElement;

  const params = new URLSearchParams(document.location.search);
  const roomCode = params.get("roomCode");
  if (roomCode) {
    input.value = roomCode;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const roomCode = input.value;
    const client = new BrowserClient();
    client.joinRoom(roomCode);
  });
}
main();
