export function css(s) {
  document.head.insertAdjacentHTML("beforeend", "<style>" + s + "</style>");
}

export function html(s) {
  document.body.insertAdjacentHTML("beforeend", s);
}

/**
 * return a clone of an html template element with the html id
 * @param {string} cssId
 * @returns {HTMLElement}
 */
export function cloneTemplate(cssId) {
  return document
    .getElementById(cssId)
    .content.firstElementChild.cloneNode(true);
}

export class BaseElement extends HTMLElement {
  constructor() {
    super();
    // this.innerHTML = cloneTemplate("player-template").outerHTML;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this[name] = newValue;
    }
  }
}
