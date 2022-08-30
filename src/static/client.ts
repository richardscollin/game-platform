/**
 * @module client
 */
import { ClientHostMessage } from "../types.js";
import { rtcConfig, postJson } from "./utils.js";

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
console.log("this is a test");

/**
 * hello
 */
class Client {
  /** @type {?string} */ playerId = null;
  /** @type {RTCPeerConnection} */ pc;
  /** @type {?string} */ roomCode = null;
  /** @type {RTCDataChannel} */ #channel;

  set color(value) {
    document.documentElement.style.setProperty("--player-color", value);
    document
      .querySelector("meta[name=theme-color]")
      .setAttribute("content", value);
  }

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

  createBeacon() {
    document.addEventListener("visibilitychange", () => {
      console.log("visibility changed " + document.visibilityState);
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon(
          `/away-room/${this.roomCode}`,
          JSON.stringify({ beacon: true })
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

  /**
   * @param {string} roomCode
   * @param {function} onopen
   * @param {function} onclose
   */
  async joinRoom(roomCode, onopen, onclose) {
    this.roomCode = roomCode;

    this.#channel = this.pc.createDataChannel(`room-${roomCode}`);
    this.#channel.onopen = () => {
      console.log("channel " + JSON.stringify(this.#channel));
      console.log("on data channel open");
      onopen();
    };
    this.#channel.onclose = () => {
      console.log("channel " + JSON.stringify(this.#channel));
      console.log("on data channel open");
      onclose();
    };

    this.#channel.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.type === "ping") {
        this.sendHost({
          type: "pong",
          value: {
            ping: message.ping,
            pong: performance.now(),
          },
        });
      }
    };
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
  const currentRoomRef = document.querySelector(".current-room");

  const params = new URLSearchParams(document.location.search);
  const roomCode = params.get("roomCode");
  if (roomCode) {
    input.value = roomCode;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const roomCode = input.value;
    const client = new Client();
    console.log("client created");
    await client.joinRoom(
      roomCode,
      function onJoin() {
        currentRoomRef.textContent = `${roomCode} (connected)`;

        document.onpointermove = (e) => {
          client.sendHost({
            type: "move",
            value: {
              clock: performance.now(),
              x: e.clientX,
              y: e.clientY,
            },
          });
        };
      },
      function onLeave() {
        document.onpointermove = null;
        currentRoomRef.textContent = "disconnected";
      }
    );
  });
}
main();
