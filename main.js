'use strict';
/* نقطة الانطلاق: الأحداث وحلقة المحاكاة */
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('board');
  const circuit = new Circuit();
  const renderer = new Renderer(canvas);
  const st = { selected: null, selectedWire: null, drag: null, moving: null, hover: null, running: true };
  const snap = v => Math.round(v / 10) * 10;
  let statusTimer = 0;

  function say(msg) {
    $('status').textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { $('status').textContent = st.running ? 'المحاكاة تعمل' : 'المحاكاة متوقفة'; }, 2500);
  }
  function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function select(comp, wire) { st.selected = comp; st.selectedWire = wire; updateProps(); }
  function hitComponent(x, y) {
    for (let i = circuit.components.length - 1; i >= 0; i--) if (circuit.components[i].contains(x, y)) return circuit.components[i];
    return null;
  }
  function addAt(type, x, y) {
    const c = circuit.add(type, 0, 0);
    c.x = Math.max(0, snap(x - c.w / 2));
    c.y = Math.max(0, snap(y - c.h / 2));
    select(c, null);
  }
  function deleteSelected() {
    if (st.selected) circuit.remove(st.selected);
    else if (st.selectedWire) circuit.removeWire(st.selectedWire);
    select(null, null);
  }
  function setRunning(v) {
    st.running = v;
    $('btn-run').classList.toggle('primary', v);
    $('btn-stop').classList.toggle('active', !v);
    say(v ? 'المحاكاة تعمل' : 'المحاكاة متوقفة');
  }
  function updateProps() {
    const info = $('prop-info'), del = $('btn-delete'), c = st.selected;
    if (c) {
      const lines = ['النوع: ' + c.label, 'الرقم: ' + c.id];
      c.inputs.forEach((v, i) => lines.push('المدخل ' + (i + 1) + ': ' + v));
      if (c.nOut) lines.push('المخرج: ' + c.output);
      if (c.type === 'LED') lines.push('الإضاءة: ' + (c.state ? 'مضاء' : 'مطفأ'));
      info.textContent = lines.join('\n'); del.hidden = false;
    } else if (st.selectedWire) {
      info.textContent = 'سلك بين القطعة ' + st.selectedWire.from + ' والقطعة ' + st.selectedWire.to;
      del.hidden = false;
    } else { info.textContent = 'لا يوجد عنصر محدد.'; del.hidden = true; }
  }

  /* ---- الفأرة / اللمس ---- */
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e), pin = hitPin(circuit, p.x, p.y);
    if (pin) { select(null, null); st.drag = { start: pin, x: p.x, y: p.y }; return; }
    const c = hitComponent(p.x, p.y);
    if (c) {
      select(c, null);
      circuit.components.splice(circuit.components.indexOf(c), 1);
      circuit.components.push(c);                      // إحضار للأمام
      st.moving = { comp: c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
      return;
    }
    select(null, hitWire(circuit, p.x, p.y));
  });
  canvas.addEventListener('pointermove', e => {
    const p = pos(e);
    if (st.drag) { st.drag.x = p.x; st.drag.y = p.y; st.hover = hitPin(circuit, p.x, p.y); }
    else if (st.moving) {
      const m = st.moving;
      if (!m.moved && Math.hypot(p.x - m.sx, p.y - m.sy) > 4) m.moved = true;
      if (m.moved) { m.comp.x = Math.max(0, snap(p.x - m.dx)); m.comp.y = Math.max(0, snap(p.y - m.dy)); }
    } else st.hover = hitPin(circuit, p.x, p.y);
  });
  function release(e, cancel) {
    const p = pos(e);
    if (st.drag) {
      if (!cancel) {
        const t = hitPin(circuit, p.x, p.y);
        if (t && !finishWire(circuit, st.drag.start, t)) say('لا يمكن توصيل هاتين النقطتين.');
      }
      st.drag = null;
    }
    if (st.moving) {
      const m = st.moving;
      if (!cancel && !m.moved && m.comp.type === 'SWITCH') m.comp.state ^= 1;
      st.moving = null;
    }
  }
  canvas.addEventListener('pointerup', e => release(e, false));
  canvas.addEventListener('pointercancel', e => release(e, true));
  canvas.addEventListener('pointerleave', () => { if (!st.drag && !st.moving) st.hover = null; });

  /* ---- السحب والإفلات من الشريط الجانبي ---- */
  document.querySelectorAll('.tool').forEach(b => {
    b.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', b.dataset.type); e.dataTransfer.effectAllowed = 'copy'; });
    b.addEventListener('click', () => {
      const n = circuit.components.length;
      addAt(b.dataset.type, 120 + (n % 6) * 40, 80 + (n % 6) * 40);
    });
  });
  canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (Object.prototype.hasOwnProperty.call(COMPONENT_DEFS, type)) { const p = pos(e); addAt(type, p.x, p.y); }
  });

  /* ---- لوحة المفاتيح ---- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') { if (st.selected || st.selectedWire) { e.preventDefault(); deleteSelected(); } }
    else if (e.key === 'Escape') { st.drag = null; select(null, null); }
  });

  /* ---- الأزرار ---- */
  $('btn-run').onclick = () => setRunning(true);
  $('btn-stop').onclick = () => setRunning(false);
  $('btn-delete').onclick = deleteSelected;
  $('btn-clear').onclick = () => {
    if (circuit.components.length && !confirm('هل تريد مسح الدائرة بالكامل؟')) return;
    circuit.clear(); select(null, null); say('تم مسح الدائرة.');
  };
  $('btn-save').onclick = () => say(saveToLocal(circuit) ? 'تم حفظ الدائرة في المتصفح.' : 'تعذر الحفظ في المتصفح.');
  $('btn-load').onclick = () => { const ok = loadFromLocal(circuit); select(null, null); say(ok ? 'تم استرجاع الدائرة المحفوظة.' : 'لا توجد دائرة محفوظة.'); };
  $('btn-export').onclick = () => { exportAsJSON(circuit, 'circuit.json'); say('تم تصدير الملف.'); };
  $('btn-import').onclick = () => $('file-input').click();
  $('file-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    importFromFile(circuit, f).then(() => { select(null, null); say('تم استيراد الدائرة.'); }).catch(err => say(err.message));
    e.target.value = '';
  });
  $('btn-theme').onclick = () => {
    const light = document.body.classList.toggle('light');
    $('btn-theme').textContent = light ? 'الوضع الداكن' : 'الوضع الفاتح';
    renderer.loadColors();
    try { localStorage.setItem('logic-simulator-theme', light ? 'light' : 'dark'); } catch (e) { /* تجاهل */ }
  };
  try {
    if (localStorage.getItem('logic-simulator-theme') === 'light') { document.body.classList.add('light'); $('btn-theme').textContent = 'الوضع الداكن'; renderer.loadColors(); }
  } catch (e) { /* تجاهل */ }

  /* ---- حلقة المحاكاة ---- */
  function frame(t) {
    if (st.running) circuit.propagate(t); else circuit.reset();
    renderer.draw(circuit, st);
    requestAnimationFrame(frame);
  }
  setInterval(updateProps, 200);
  setRunning(true);
  requestAnimationFrame(frame);
})();
