'use strict';
/* تعريف القطع والبوابات المنطقية */
const COMPONENT_DEFS = {
  AND:    { label: 'AND',  inputs: 2, fn: i => i[0] & i[1] },
  OR:     { label: 'OR',   inputs: 2, fn: i => i[0] | i[1] },
  NOT:    { label: 'NOT',  inputs: 1, fn: i => i[0] ^ 1 },
  NAND:   { label: 'NAND', inputs: 2, fn: i => (i[0] & i[1]) ^ 1 },
  NOR:    { label: 'NOR',  inputs: 2, fn: i => (i[0] | i[1]) ^ 1 },
  XOR:    { label: 'XOR',  inputs: 2, fn: i => i[0] ^ i[1] },
  SWITCH: { label: 'SW',   inputs: 0 },
  CLOCK:  { label: 'CLK',  inputs: 0 },
  LED:    { label: 'LED',  inputs: 1, outputs: 0 }
};

class Component {
  constructor(type, x, y, id) {
    const d = COMPONENT_DEFS[type];
    if (!d) throw new Error('نوع قطعة غير معروف: ' + type);
    this.id = id;
    this.type = type;
    this.label = d.label;
    this.x = x;
    this.y = y;
    this.nIn = d.inputs;
    this.nOut = d.outputs === 0 ? 0 : 1;
    this.w = type === 'LED' ? 64 : 90;
    this.h = Math.max(50, 20 + this.nIn * 22);
    this.state = 0;                       // حالة المفتاح أو إضاءة الـ LED
    this.inputs = new Array(this.nIn).fill(0);
    this.output = 0;
  }
  inputPos(i) { return { x: this.x, y: this.y + this.h * (i + 1) / (this.nIn + 1) }; }
  outputPos() { return { x: this.x + this.w, y: this.y + this.h / 2 }; }
  contains(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  evaluate(time) {
    if (this.type === 'SWITCH') this.output = this.state;
    else if (this.type === 'CLOCK') this.output = Math.floor(time / 600) % 2;
    else if (this.type === 'LED') this.state = this.inputs[0];
    else this.output = COMPONENT_DEFS[this.type].fn(this.inputs) ? 1 : 0;
  }
  reset() {
    this.inputs.fill(0);
    this.output = 0;
    if (this.type === 'LED') this.state = 0;
  }
}
