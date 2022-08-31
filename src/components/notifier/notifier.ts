import { cloneTemplate, html } from "../component-utils.js";
import "./notifier.css";

html`<template id="notification-template">
  <div class="notification show">
    <div class="notification-header">Goal!</div>
    <div class="notification-body">Player 1 Scored a point</div>
    <img
      src="../images/icons/x-mark.svg"
      class="notification-dismiss"
      onclick="this.parentElement.classList.remove('show');"
    />
  </div>
</template>`;

export class Notifier {
  notificationTrayRef = document.querySelector(".notification-tray");

  notify(header, body, timeout = 5000, color = null) {
    const clone = cloneTemplate("notification-template");
    if (color) {
      clone.style.setProperty("--notification-color", color);
    }
    clone.ontransitionend = clone.remove;
    clone.querySelector<HTMLElement>(".notification-header").innerText = header;
    clone.querySelector<HTMLElement>(".notification-body").innerText = body;
    this.notificationTrayRef.appendChild(clone);
    setTimeout(() => {
      clone?.classList?.remove("show");
    }, timeout);
  }
}
