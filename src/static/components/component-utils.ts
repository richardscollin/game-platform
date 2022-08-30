export function css(s: any) {
  document.head.insertAdjacentHTML("beforeend", "<style>" + s + "</style>");
}

export function html(s: any) {
  document.body.insertAdjacentHTML("beforeend", s);
}

export function cloneTemplate(cssId: string) {
  const template = document.getElementById(cssId) as HTMLTemplateElement;
  return template.content.firstElementChild.cloneNode(true) as HTMLElement;
}

export class BaseElement extends HTMLElement {
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this[name] = newValue;
    }
  }

  setAttributes(obj: { [k: string]: string }) {
    for (const k in obj) {
      this.setAttribute(k, obj[k]);
    }
    return this;
  }
}
