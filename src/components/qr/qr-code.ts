import { qrcodegen } from "../../lib/qrcodegen.js";

import "./qr-code.css";

class QRCode extends HTMLElement {
  static observedAttributes = ["value"];

  attributeChangedCallback(name, oldValue, newValue) {
    const svgHTML = toSvgString(
      qrcodegen.QrCode.encodeText(newValue, qrcodegen.QrCode.Ecc.MEDIUM),
      1
    );

    this.innerHTML = "<div class='qr-code'>" + svgHTML + "</div>";

    // no filter for now
    // this.querySelector("path").setAttribute(
    //   "filter",
    //   "url(./filters.svg#qr-goo)"
    // );
  }
}
customElements.define("qr-code", QRCode);

function toSvgString(qr: qrcodegen.QrCode, border: number): string {
  if (border < 0) throw new RangeError("Border must be non-negative");
  const parts = [""];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y))
        parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${
    qr.size + border * 2
  } ${qr.size + border * 2}" stroke="none">
<rect width="100%" height="100%" fill="white"/>
<path d="${parts.join(" ")}" fill="black"/>
</svg>
`;
}
