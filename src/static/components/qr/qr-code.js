/**
 * @module components
 */
import { css } from "../component-utils.js";
import qrcodegen from "../../lib/qrcodegen.js";

css`
  .my-qr {
    flex-shrink: 0;
    height: calc(
      var(--bottom-panel-height) - 2 * var(--bottom-panel-padding-y)
    );
    width: calc(var(--bottom-panel-height) - 2 * var(--bottom-panel-padding-y));
  }
`;

customElements.define(
  "qr-code",
  class extends HTMLElement {
    static observedAttributes = ["value"];

    attributeChangedCallback(name, oldValue, newValue) {
      const svgHTML = qrcodegen.QrCode.encodeText(
        newValue,
        qrcodegen.QrCode.Ecc.MEDIUM
      ).toSvgString(1);

      this.innerHTML = "<div class='my-qr'>" + svgHTML + "</div>";

      // no filter for now
      // this.querySelector("path").setAttribute(
      //   "filter",
      //   "url(./filters.svg#qr-goo)"
      // );
    }
  }
);
