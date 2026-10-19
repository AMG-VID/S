'use strict';
/* الدائرة والأسلاك وحساب تدفق الإشارة */
const PIN_HIT = 11;

class Circuit {
  constructor() { this.clear(); }
  clear() { this.components = []; this.wires = []; this.nextId = 1; }
  get(id) { return this.components.find(c => c.id === id) || null; }
  add(type, x, y, id) {
    const c = new Component(type, x, y, id !== undefined ? id : this.nextId);
    this.nextId = Math.max(this.nextId, c.id + 1);
    this.components.push(c);
    return c;
  }
  remove(c) {
    this.components = this.components.filter(k => k !== c);
    this.wires = this.wires.filter(w => w.from !== c.id && w.to !== c.id);
  }
  addWire(from, to, pin) {
    const a = this.get(from), b = this.get(to);
    if (!a || !b || a === b || a.nOut === 0) return null;
    if (!Number.isInteger(pin) || pin < 0 || pin >= b.nIn) return null;
    this.wires = this.wires.filter(w => !(w.to === to && w.pin === pin)); // مدخل واحد = سلك واحد
    const w = { id: this.nextId++, from, to, pin };
    this.wires.push(w);
    return w;
  }
  removeWire(w) { this.wires = this.wires.filter(k => k !== w); }
  reset() { this.components.forEach(c => c.reset()); }
  propagate(time) {
    const src = new Map();
    this.wires.forEach(w => src.set(w.to + ':' + w.pin, w.from));
    for (let n = 0; n < 50; n++) {
      let changed = false;
      for (const c of this.components) {
        for (let i = 0; i < c.nIn; i++) {
          const f = src.get(c.id + ':' + i);
          const s = f === undefined ? null : this.get(f);
          const v = s ? s.output : 0;
          if (c.inputs[i] !== v) { c.inputs[i] = v; changed = true; }
        }
        const prev = c.output;
        c.evaluate(time);
        if (prev !== c.output) changed = true;
      }
      if (!changed) break;
    }
  }
}

function wireEnds(circuit, w) {
  const a = circuit.get(w.from), b = circuit.get(w.to);
  if (!a || !b) return null;
  return { a: a.outputPos(), b: b.inputPos(w.pin) };
}
function wireCurve(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return { a, c1: { x: a.x + dx, y: a.y }, c2: { x: b.x - dx, y: b.y }, b };
}
function bezierAt(k, t) {
  const u = 1 - t;
  const f = (p0, p1, p2, p3) => u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  return { x: f(k.a.x, k.c1.x, k.c2.x, k.b.x), y: f(k.a.y, k.c1.y, k.c2.y, k.b.y) };
}
function hitPin(circuit, x, y) {
  for (let j = circuit.components.length - 1; j >= 0; j--) {
    const c = circuit.components[j];
    if (c.nOut) {
      const p = c.outputPos();
      if (Math.hypot(p.x - x, p.y - y) <= PIN_HIT) return { comp: c, kind: 'out', pin: 0 };
    }
    for (let i = 0; i < c.nIn; i++) {
      const p = c.inputPos(i);
      if (Math.hypot(p.x - x, p.y - y) <= PIN_HIT) return { comp: c, kind: 'in', pin: i };
    }
  }
  return null;
}
function hitWire(circuit, x, y) {
  for (let j = circuit.wires.length - 1; j >= 0; j--) {
    const w = circuit.wires[j], e = wireEnds(circuit, w);
    if (!e) continue;
    const k = wireCurve(e.a, e.b);
    for (let t = 0; t <= 1; t += 1 / 30) {
      const p = bezierAt(k, t);
      if (Math.hypot(p.x - x, p.y - y) < 8) return w;
    }
  }
  return null;
}
function finishWire(circuit, start, target) {
  if (!start || !target || start.kind === target.kind) return null;
  if (start.kind === 'out') return circuit.addWire(start.comp.id, target.comp.id, target.pin);
  return circuit.addWire(target.comp.id, start.comp.id, start.pin);
}
