'use strict';
/* الرسم المستمر على الـ Canvas */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.loadColors();
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
    window.addEventListener('resize', () => this.resize());
  }
  loadColors() {
    const s = getComputedStyle(document.body);
    const g = n => s.getPropertyValue(n).trim();
    this.col = { bg: g('--canvas-bg'), grid: g('--grid'), body: g('--comp-bg'), stroke: g('--comp-stroke'),
                 text: g('--text'), low: g('--wire-low'), high: g('--wire-high'), accent: g('--accent') };
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  roundRect(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  draw(circuit, st) {
    const c = this.ctx, col = this.col;
    c.direction = 'ltr';
    c.fillStyle = col.bg; c.fillRect(0, 0, this.w, this.h);
    c.strokeStyle = col.grid; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x <= this.w; x += 20) { c.moveTo(x + .5, 0); c.lineTo(x + .5, this.h); }
    for (let y = 0; y <= this.h; y += 20) { c.moveTo(0, y + .5); c.lineTo(this.w, y + .5); }
    c.stroke();

    for (const w of circuit.wires) {
      const e = wireEnds(circuit, w); if (!e) continue;
      const k = wireCurve(e.a, e.b), on = circuit.get(w.from).output === 1;
      c.beginPath(); c.moveTo(k.a.x, k.a.y);
      c.bezierCurveTo(k.c1.x, k.c1.y, k.c2.x, k.c2.y, k.b.x, k.b.y);
      c.lineWidth = st.selectedWire === w ? 5 : 3;
      c.strokeStyle = st.selectedWire === w ? col.accent : (on ? col.high : col.low);
      c.stroke();
    }
    if (st.drag) {
      const s = st.drag.start;
      const a = s.kind === 'out' ? s.comp.outputPos() : s.comp.inputPos(s.pin);
      const b = { x: st.drag.x, y: st.drag.y };
      const k = s.kind === 'out' ? wireCurve(a, b) : wireCurve(b, a);
      c.beginPath(); c.moveTo(k.a.x, k.a.y);
      c.bezierCurveTo(k.c1.x, k.c1.y, k.c2.x, k.c2.y, k.b.x, k.b.y);
      c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeStyle = col.accent; c.stroke(); c.setLineDash([]);
    }
    for (const comp of circuit.components) this.drawComponent(comp, st);
  }
  drawComponent(comp, st) {
    const c = this.ctx, col = this.col, sel = st.selected === comp;
    this.roundRect(comp.x, comp.y, comp.w, comp.h, 8);
    c.fillStyle = col.body; c.fill();
    c.lineWidth = sel ? 3 : 1.5; c.strokeStyle = sel ? col.accent : col.stroke; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const cx = comp.x + comp.w / 2, cy = comp.y + comp.h / 2;
    c.fillStyle = col.text;
    if (comp.type === 'LED') {
      const on = comp.state === 1;
      c.beginPath(); c.arc(cx, cy, 14, 0, Math.PI * 2);
      c.save();
      if (on) { c.shadowColor = '#facc15'; c.shadowBlur = 24; }
      c.fillStyle = on ? '#facc15' : 'rgba(148,163,184,0.25)'; c.fill();
      c.restore();
      c.lineWidth = 2; c.strokeStyle = col.stroke; c.stroke();
    } else if (comp.type === 'SWITCH' || comp.type === 'CLOCK') {
      const on = comp.output === 1 || (comp.type === 'SWITCH' && comp.state === 1);
      c.font = 'bold 13px Tahoma, Arial, sans-serif';
      c.fillText(comp.label, cx, comp.y + 15);
      this.roundRect(cx - 20, cy - 2, 40, 20, 10);
      c.fillStyle = on ? col.high : col.low; c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 12px Tahoma, Arial, sans-serif';
      c.fillText(on ? '1' : '0', cx, cy + 8);
    } else {
      c.font = 'bold 15px Tahoma, Arial, sans-serif';
      c.fillText(comp.label, cx, cy);
    }
    const hov = st.hover;
    const pin = (p, v, h) => {
      c.beginPath(); c.arc(p.x, p.y, h ? 8 : 6, 0, Math.PI * 2);
      c.fillStyle = v ? col.high : col.low; c.fill();
      c.lineWidth = 2; c.strokeStyle = h ? col.accent : col.bg; c.stroke();
    };
    for (let i = 0; i < comp.nIn; i++) pin(comp.inputPos(i), comp.inputs[i], hov && hov.comp === comp && hov.kind === 'in' && hov.pin === i);
    if (comp.nOut) pin(comp.outputPos(), comp.output, hov && hov.comp === comp && hov.kind === 'out');
  }
}
