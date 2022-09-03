import { qrcodegen } from "../../lib/qrcodegen.js";
import { BaseElement } from "../component-utils.js";
import "./qr-code.css";

class QRCode extends BaseElement {
  qrValue;
  static observedAttributes = ["value"];
  templateId = "qr-code-template";

  rerender(root: HTMLElement) {
    const qr0 = qrcodegen.QrCode.encodeText(this.qrValue, qrcodegen.QrCode.Ecc.MEDIUM);
    toSvgString(qr0, 1, root.firstElementChild);
  }

  set value(newValue) {
    this.qrValue = newValue;
    this.update();
  }
}
customElements.define("qr-code", QRCode);

function toSvgString(qr: qrcodegen.QrCode, border: number, element: Element) {
  if (border < 0) throw new RangeError("Border must be non-negative");
  const parts = [""];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y))
        parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  const size = qr.size + border * 2;
  element.setAttribute("viewBox", `0 0 ${size} ${size}`);
  element.querySelector("path").setAttribute("d", parts.join(" "));
}
