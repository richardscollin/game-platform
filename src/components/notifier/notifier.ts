import { cloneTemplate } from "../component-utils.js";
import "./notifier.css";

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
