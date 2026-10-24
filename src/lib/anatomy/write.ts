// The figures redraw every frame, but most of their parts sit still for most
// of the loop. Any write to an SVG restyles and repaints the whole figure, so
// these only touch the DOM when the value actually changes.
export function setAttr(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function setOpacity(el: SVGElement, value: string) {
  if (el.style.opacity !== value) el.style.opacity = value;
}
