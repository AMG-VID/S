'use strict';
/* الحفظ في LocalStorage والتصدير/الاستيراد بصيغة JSON */
const STORAGE_KEY = 'logic-simulator-circuit-v1';

function serializeCircuit(circuit) {
  return {
    version: 1,
    components: circuit.components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, state: c.type === 'SWITCH' ? c.state : 0 })),
    wires: circuit.wires.map(w => ({ id: w.id, from: w.from, to: w.to, pin: w.pin }))
  };
}

function deserializeCircuit(circuit, data) {
  if (!data || !Array.isArray(data.components) || !Array.isArray(data.wires)) throw new Error('ملف الدائرة غير صالح.');
  const t = new Circuit();
  for (const c of data.components) {
    if (!c || !Object.prototype.hasOwnProperty.call(COMPONENT_DEFS, c.type) ||
        !Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isInteger(c.id) || t.get(c.id)) {
      throw new Error('بيانات قطعة غير صالحة.');
    }
    t.add(c.type, c.x, c.y, c.id).state = c.state ? 1 : 0;
  }
  for (const w of data.wires) { if (w) t.addWire(w.from, w.to, w.pin); }
  circuit.components = t.components;
  circuit.wires = t.wires;
  circuit.nextId = t.nextId;
}

function saveToLocal(circuit) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCircuit(circuit))); return true; }
  catch (e) { return false; }
}

function loadFromLocal(circuit) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    deserializeCircuit(circuit, JSON.parse(raw));
    return true;
  } catch (e) { return false; }
}

function exportAsJSON(circuit, filename) {
  const blob = new Blob([JSON.stringify(serializeCircuit(circuit), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'circuit.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importFromFile(circuit, file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try { deserializeCircuit(circuit, JSON.parse(r.result)); resolve(); }
      catch (e) { reject(new Error('تعذر قراءة الملف: ' + e.message)); }
    };
    r.onerror = () => reject(new Error('تعذر فتح الملف.'));
    r.readAsText(file);
  });
}
