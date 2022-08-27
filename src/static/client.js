/**
 * @module client
 */
import { rtcConfig, postJson } from "./utils.js";

console.oLog = console.log;
console.log = function () {
  console.oLog(arguments);
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

  constructor() {
    const pc = new RTCPeerConnection(rtcConfig);

    let offer = null;
    pc.onnegotiationneeded = async () => {
      offer = await pc.createOffer({ offerToReceiveAudio: 1 });
      await pc.setLocalDescription(offer);
    };

    pc.onicecandidate = ({ candidate }) => {
      console.log("onicecandidate " + JSON.stringify(candidate));
    };

    pc.onicegatheringstatechange = async ({ target }) => {
      console.log("gathering state " + target.iceGatheringState);

      if (target.iceGatheringState === "complete") {
        const res = await postJson(`/join-room/${this.roomCode}`, offer);

        if (!res.ok) {
          console.log(`Unable to join room ${this.roomCode}}`);
          return;
        }

        this.playerId = document.cookie.split("=")[1];
        pc.setRemoteDescription(await res.json());
      }
    };

    this.pc = pc;
  }

  sendHost(message) {
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
          ping: message.ping,
          pong: performance.now(),
        });
      }
    };
  }
}

export function main() {
  const form = document.querySelector("form");
  /** @type {HTMLInputElement} */
  const input = document.querySelector(".room-code-input");
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

        document.onmousemove = (e) => {
          client.sendHost({
            clock: performance.now(),
            x: e.clientX,
            y: e.clientY,
          });
        };

        document.ontouchmove = ({ changedTouches }) => {
          for (let touch of changedTouches) {
            client.sendHost({
              clock: performance.now(),
              x: touch.clientX,
              y: touch.clientY,
            });
          }
        };
      },
      function onLeave() {
        document.onmousemove = null;
        document.ontouchmove = null;
        currentRoomRef.textContent = "disconnected";
      }
    );
  });
}
main();
