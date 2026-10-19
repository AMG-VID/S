'use strict';
/* محركات المحاكاة: كل محرك يعرّف params/init/step/draw/read */
const TAU = Math.PI * 2, D2R = Math.PI / 180;
var C = {};
const P = (k, l, min, max, v, u, step) => ({ k, l, min, max, v, u: u || '', step: step || (max - min) / 200 });
const fmt = (v, d) => { if (typeof v !== 'number' || !Number.isFinite(v)) return '—'; return String(+v.toFixed(d === undefined ? 2 : d)); };
const nf = v => { const a = Math.abs(v); return fmt(v, a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.01 ? 3 : 5); };
function txt(g, s, x, y, col, al, sz) { g.fillStyle = col || C.text; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.font = (sz || 12) + 'px Tahoma, Arial, sans-serif'; g.fillText(String(s), x, y); }
function line(g, x1, y1, x2, y2, col, w, dash) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col || C.muted; g.lineWidth = w || 1.5; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); }
function circ(g, x, y, r, fill, stroke) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } }
function arrow(g, x1, y1, x2, y2, col, w) { line(g, x1, y1, x2, y2, col, w || 2); const a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 9 * Math.cos(a - .4), y2 - 9 * Math.sin(a - .4)); g.lineTo(x2 - 9 * Math.cos(a + .4), y2 - 9 * Math.sin(a + .4)); g.closePath(); g.fillStyle = col || C.muted; g.fill(); }
function wl2rgb(l) { let r = 0, g = 0, b = 0; if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else r = 1; return [r, g, b].map(v => Math.round(255 * Math.pow(Math.max(0, v), .8))); }

const SIMS = {};

SIMS.freefall = {
  params: [P('g', 'عجلة الجاذبية', 1, 30, 9.8, 'm/s²', .1), P('h', 'الارتفاع', 5, 300, 50, 'm', 1), P('c', 'معامل مقاومة الهواء', 0, 3, 0, '1/s', .05)],
  init(q, S) { S.y = 0; S.v = 0; S.t = 0; S.done = false; },
  step(q, S, dt) { if (S.done) return; for (let i = 0; i < 4; i++) { const h = dt / 4; S.v += (q.g - q.c * S.v) * h; S.y += S.v * h; S.t += h; if (S.y >= q.h) { S.y = q.h; S.done = true; break; } } },
  draw(g, w, h, q, S) {
    const top = 30, gy = h - 30, sc = (gy - top - 10) / q.h;
    line(g, 20, gy, w - 20, gy, C.muted, 3);
    for (let i = 0; i <= 4; i++) { const yy = top + (gy - top - 10) * i / 4; line(g, w - 60, yy, w - 48, yy); txt(g, nf(q.h * i / 4), w - 30, yy, C.muted, 'center', 11); }
    circ(g, w / 2, top + S.y * sc, 10, C.warm);
  },
  read(q, S) { return [['الزمن', fmt(S.t), 's'], ['السرعة', fmt(S.v), 'm/s'], ['المسافة المقطوعة', fmt(S.y), 'm'], ['زمن السقوط في الفراغ', fmt(Math.sqrt(2 * q.h / q.g)), 's']]; }
};

SIMS.projectile = {
  params: [P('v', 'سرعة الإطلاق', 5, 60, 25, 'm/s', 1), P('a', 'زاوية الإطلاق', 0, 90, 45, '°', 1), P('g', 'عجلة الجاذبية', 1, 30, 9.8, 'm/s²', .1), P('h0', 'ارتفاع الإطلاق', 0, 60, 0, 'm', 1), P('c', 'مقاومة الهواء', 0, 1, 0, '1/s', .01)],
  init(q, S) { S.x = 0; S.y = q.h0; S.vx = q.v * Math.cos(q.a * D2R); S.vy = q.v * Math.sin(q.a * D2R); S.t = 0; S.done = false; S.hm = S.y; S.tr = []; },
  step(q, S, dt) {
    if (S.done) return;
    for (let i = 0; i < 8; i++) { const h = dt / 8; S.vx -= q.c * S.vx * h; S.vy -= (q.g + q.c * S.vy) * h; S.x += S.vx * h; S.y += S.vy * h; S.t += h; S.hm = Math.max(S.hm, S.y); if (S.y <= 0) { S.y = 0; S.done = true; break; } }
    S.tr.push([S.x, S.y]);
  },
  draw(g, w, h, q, S) {
    const vx = q.v * Math.cos(q.a * D2R), vy = q.v * Math.sin(q.a * D2R);
    const R = vx * (vy + Math.sqrt(vy * vy + 2 * q.g * q.h0)) / q.g, Hm = q.h0 + vy * vy / (2 * q.g);
    const sc = Math.min((w - 60) / Math.max(R, 5), (h - 60) / Math.max(Hm, 5)), gy = h - 30;
    line(g, 20, gy, w - 20, gy, C.muted, 3);
    g.beginPath(); S.tr.forEach((p, i) => { const X = 30 + p[0] * sc, Y = gy - p[1] * sc; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.strokeStyle = C.accent; g.lineWidth = 2; g.stroke();
    circ(g, 30 + S.x * sc, gy - S.y * sc, 7, C.warm);
  },
  read(q, S) {
    const vy = q.v * Math.sin(q.a * D2R), vx = q.v * Math.cos(q.a * D2R);
    return [['المدى الأفقي', fmt(S.x), 'm'], ['أقصى ارتفاع', fmt(S.hm), 'm'], ['الزمن', fmt(S.t), 's'], ['المدى النظري (فراغ)', fmt(vx * (vy + Math.sqrt(vy * vy + 2 * q.g * q.h0)) / q.g), 'm']];
  }
};

SIMS.pendulum = {
  params: [P('L', 'طول الخيط', .1, 3, 1, 'm', .05), P('g', 'عجلة الجاذبية', 1, 30, 9.8, 'm/s²', .1), P('a0', 'زاوية الإزاحة الابتدائية', 5, 90, 20, '°', 1), P('c', 'معامل الإخماد', 0, 1, 0, '1/s', .01)],
  init(q, S) { S.th = q.a0 * D2R; S.w = 0; S.t = 0; S.last = null; S.T = null; },
  step(q, S, dt) {
    for (let i = 0; i < 20; i++) {
      const h = dt / 20, al = -(q.g / q.L) * Math.sin(S.th) - q.c * S.w; S.w += al * h; const p = S.th; S.th += S.w * h; S.t += h;
      if (p < 0 && S.th >= 0 && S.w > 0) { if (S.last !== null) S.T = S.t - S.last; S.last = S.t; }
    }
  },
  draw(g, w, h, q, S) {
    const px = w / 2, py = 30, len = (h - 80) * q.L / 3.1, bx = px + len * Math.sin(S.th), by = py + len * Math.cos(S.th);
    line(g, px - 40, py, px + 40, py, C.text, 4); line(g, px, py, bx, by, C.muted, 2); circ(g, bx, by, 14, C.warm, C.text);
  },
  read(q, S) { const T0 = 2 * Math.PI * Math.sqrt(q.L / q.g); return [['الزمن الدوري النظري', fmt(T0, 3), 's'], ['الزمن الدوري المقاس', S.T === null ? '—' : fmt(S.T, 3), 's'], ['g المحسوبة من القياس', S.T === null ? '—' : fmt(4 * Math.PI * Math.PI * q.L / (S.T * S.T)), 'm/s²'], ['الزاوية', fmt(S.th / D2R, 1), '°']]; }
};

SIMS.spring = {
  params: [P('k', 'ثابت النابض', 5, 300, 50, 'N/m', 1), P('m', 'الكتلة', .1, 5, 1, 'kg', .05), P('A', 'سعة الاهتزاز', .05, .5, .3, 'm', .01), P('c', 'معامل الإخماد', 0, 2, 0, '1/s', .05)],
  init(q, S) { S.x = q.A; S.v = 0; S.t = 0; S.last = null; S.T = null; },
  step(q, S, dt) {
    for (let i = 0; i < 20; i++) {
      const h = dt / 20, a = (-q.k * S.x - q.c * q.m * S.v) / q.m; S.v += a * h; const p = S.x; S.x += S.v * h; S.t += h;
      if (p < 0 && S.x >= 0 && S.v > 0) { if (S.last !== null) S.T = S.t - S.last; S.last = S.t; }
    }
  },
  draw(g, w, h, q, S) {
    const cy = h / 2, sc = w * .35 / .5, xm = w * .55 + S.x * sc;
    line(g, 25, cy - 40, 25, cy + 40, C.text, 5); line(g, 20, cy + 22, w - 20, cy + 22, C.muted, 2); line(g, w * .55, cy - 50, w * .55, cy + 22, C.muted, 1, [4, 4]);
    g.beginPath(); g.moveTo(25, cy); const x1 = xm - 22; for (let i = 1; i <= 12; i++) g.lineTo(25 + (x1 - 25) * i / 12, cy + (i % 2 ? -12 : 12)); g.lineTo(x1, cy);
    g.strokeStyle = C.accent; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = C.warm; g.fillRect(xm - 22, cy - 22, 44, 44); txt(g, q.m + 'kg', xm, cy, '#000', 'center', 11);
  },
  read(q, S) { return [['الزمن الدوري النظري', fmt(2 * Math.PI * Math.sqrt(q.m / q.k), 3), 's'], ['الزمن الدوري المقاس', S.T === null ? '—' : fmt(S.T, 3), 's'], ['الإزاحة', fmt(S.x, 3), 'm'], ['الطاقة الكلية', fmt(.5 * q.k * S.x * S.x + .5 * q.m * S.v * S.v, 3), 'J']]; }
};

SIMS.incline = {
  params: [P('a', 'زاوية الميل', 0, 80, 30, '°', 1), P('mus', 'معامل الاحتكاك السكوني', 0, 1.2, .5, '', .01), P('muk', 'معامل الاحتكاك الحركي', 0, 1, .4, '', .01), P('m', 'الكتلة', .5, 10, 2, 'kg', .5)],
  init(q, S) { S.s = 0; S.v = 0; S.t = 0; S.slide = false; },
  step(q, S, dt) {
    const th = q.a * D2R, N = q.m * 9.8 * Math.cos(th), dr = q.m * 9.8 * Math.sin(th);
    if (S.v === 0 && dr <= q.mus * N) { S.slide = false; return; }
    S.slide = true; S.acc = 9.8 * (Math.sin(th) - q.muk * Math.cos(th));
    S.v = Math.max(0, S.v + S.acc * dt); S.s += S.v * dt; S.t += dt;
    if (S.s >= 5) { S.s = 5; S.v = 0; S.slide = false; S.end = true; }
  },
  draw(g, w, h, q, S) {
    const th = q.a * D2R, gy = h - 30, x0 = 30, Lp = Math.min((w - 60) / Math.max(Math.cos(th), .2), (h - 60) / Math.max(Math.sin(th), .2));
    g.beginPath(); g.moveTo(x0, gy); g.lineTo(x0 + Lp * Math.cos(th), gy); g.lineTo(x0 + Lp * Math.cos(th), gy - Lp * Math.sin(th)); g.closePath();
    g.fillStyle = C.body; g.fill(); line(g, x0, gy, x0 + Lp * Math.cos(th), gy - Lp * Math.sin(th), C.text, 3);
    const d = Lp * .9 - S.s * Lp / 5.6;
    g.save(); g.translate(x0 + d * Math.cos(th), gy - d * Math.sin(th)); g.rotate(-th); g.fillStyle = C.warm; g.fillRect(-20, -26, 40, 26); g.restore();
    txt(g, fmt(q.a, 0) + '°', x0 + 38, gy - 10, C.accent, 'center', 12);
  },
  read(q, S) {
    const th = q.a * D2R, N = q.m * 9.8 * Math.cos(th), dr = q.m * 9.8 * Math.sin(th);
    const slide = S.slide || S.end || dr > q.mus * N;
    return [['الحالة', S.end ? 'وصل للنهاية' : slide ? 'ينزلق' : 'ساكن', ''], ['التسارع', slide ? fmt(9.8 * (Math.sin(th) - q.muk * Math.cos(th))) : '0', 'm/s²'], ['قوة الاحتكاك', fmt(slide ? q.muk * N : dr), 'N'], ['الزاوية الحرجة (tan⁻¹ μs)', fmt(Math.atan(q.mus) / D2R, 1), '°']];
  }
};

SIMS.collision = {
  params: [P('m1', 'كتلة الجسم الأول', .5, 10, 2, 'kg', .5), P('m2', 'كتلة الجسم الثاني', .5, 10, 2, 'kg', .5), P('v1', 'سرعة الأول', 1, 10, 4, 'm/s', .5), P('v2', 'سرعة الثاني', -5, 5, 0, 'm/s', .5), P('e', 'معامل الارتداد e', 0, 1, 1, '', .05)],
  init(q, S) { S.x1 = 1.5; S.x2 = 6; S.u1 = q.v1; S.u2 = q.v2; S.hit = false; S.p0 = q.m1 * q.v1 + q.m2 * q.v2; S.k0 = .5 * q.m1 * q.v1 * q.v1 + .5 * q.m2 * q.v2 * q.v2; S.p1 = S.p0; S.k1 = S.k0; },
  step(q, S, dt) {
    S.x1 += S.u1 * dt; S.x2 += S.u2 * dt;
    if (!S.hit && S.x2 - S.x1 <= 1) {
      const u1 = S.u1, u2 = S.u2, M = q.m1 + q.m2;
      S.u1 = ((q.m1 - q.e * q.m2) * u1 + (1 + q.e) * q.m2 * u2) / M; S.u2 = ((q.m2 - q.e * q.m1) * u2 + (1 + q.e) * q.m1 * u1) / M;
      S.hit = true; S.x1 = S.x2 - 1; S.p1 = q.m1 * S.u1 + q.m2 * S.u2; S.k1 = .5 * q.m1 * S.u1 * S.u1 + .5 * q.m2 * S.u2 * S.u2;
    }
    if (S.x1 < .5) { S.x1 = .5; S.u1 = 0; } if (S.x1 > 9.5) { S.x1 = 9.5; S.u1 = 0; }
    if (S.x2 < .5) { S.x2 = .5; S.u2 = 0; } if (S.x2 > 9.5) { S.x2 = 9.5; S.u2 = 0; }
  },
  draw(g, w, h, q, S) {
    const gy = h / 2 + 50, px = x => 30 + x / 10 * (w - 60), bw = (w - 60) / 10;
    line(g, 20, gy, w - 20, gy, C.muted, 3);
    [[S.x1, q.m1, C.accent, S.u1], [S.x2, q.m2, C.warm, S.u2]].forEach(([x, m, col, u]) => {
      const bh = 24 + m * 5; g.fillStyle = col; g.fillRect(px(x) - bw / 2, gy - bh, bw, bh); txt(g, m + 'kg', px(x), gy - bh / 2, '#000', 'center', 12);
      if (Math.abs(u) > .05) arrow(g, px(x), gy - bh - 14, px(x) + u * 8, gy - bh - 14, C.text, 2);
    });
  },
  read(q, S) { return [['كمية الحركة قبل', fmt(S.p0), 'kg·m/s'], ['كمية الحركة بعد', fmt(S.p1), 'kg·m/s'], ['طاقة الحركة قبل', fmt(S.k0), 'J'], ['طاقة الحركة بعد', fmt(S.k1), 'J']]; }
};

SIMS.circular = {
  params: [P('r', 'نصف القطر', .2, 3, 1, 'm', .05), P('v', 'السرعة', .5, 15, 5, 'm/s', .1), P('m', 'الكتلة', .1, 5, 1, 'kg', .1)],
  init(q, S) { S.ang = 0; },
  step(q, S, dt) { S.ang += q.v / q.r * dt; },
  draw(g, w, h, q, S) {
    const cx = w / 2, cy = h / 2, R = Math.max(20, (Math.min(w, h) / 2 - 30) * q.r / 3), bx = cx + R * Math.cos(S.ang), by = cy - R * Math.sin(S.ang);
    circ(g, cx, cy, R, null, C.grid); circ(g, cx, cy, 4, C.muted); line(g, cx, cy, bx, by, C.muted, 2); circ(g, bx, by, 11, C.warm, C.text);
    const F = q.m * q.v * q.v / q.r, len = Math.min(R, 15 + F * 1.5); arrow(g, bx, by, bx + (cx - bx) * len / R, by + (cy - by) * len / R, C.hot, 3);
  },
  read(q) { return [['التسارع المركزي', fmt(q.v * q.v / q.r), 'm/s²'], ['القوة المركزية', fmt(q.m * q.v * q.v / q.r), 'N'], ['الزمن الدوري', fmt(2 * Math.PI * q.r / q.v, 3), 's'], ['السرعة الزاوية', fmt(q.v / q.r), 'rad/s']]; }
};

SIMS.orbit = {
  params: [P('e', 'الشذوذ المركزي', 0, .9, .4, '', .01), P('a', 'نصف المحور الأكبر', .3, 5.5, 1, 'AU', .05), P('M', 'كتلة النجم', .5, 3, 1, 'M☉', .1)],
  init(q, S) { const GM = 4 * Math.PI * Math.PI * q.M, r = q.a * (1 + q.e); S.x = r; S.y = 0; S.vx = 0; S.vy = Math.sqrt(GM * (2 / r - 1 / q.a)); S.t = 0; S.tr = []; S.T = Math.pow(q.a, 1.5) / Math.sqrt(q.M); },
  step(q, S, dt) {
    const GM = 4 * Math.PI * Math.PI * q.M, n = 400, h = dt * S.T / 6 / n;
    for (let i = 0; i < n; i++) {
      let r = Math.hypot(S.x, S.y), ax = -GM * S.x / (r * r * r), ay = -GM * S.y / (r * r * r); S.vx += ax * h / 2; S.vy += ay * h / 2; S.x += S.vx * h; S.y += S.vy * h;
      r = Math.hypot(S.x, S.y); ax = -GM * S.x / (r * r * r); ay = -GM * S.y / (r * r * r); S.vx += ax * h / 2; S.vy += ay * h / 2;
    }
    S.t += dt * S.T / 6; S.tr.push([S.x, S.y]); if (S.tr.length > 500) S.tr.shift();
  },
  draw(g, w, h, q, S) {
    const sc = (Math.min(w, h) / 2 - 25) / (q.a * (1 + q.e)), cx = w / 2, cy = h / 2;
    g.beginPath(); S.tr.forEach((p, i) => { const X = cx + p[0] * sc, Y = cy - p[1] * sc; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.strokeStyle = C.accent; g.lineWidth = 1.5; g.stroke();
    circ(g, cx, cy, 9, '#facc15'); circ(g, cx + S.x * sc, cy - S.y * sc, 6, C.warm);
  },
  read(q, S) { const v = Math.hypot(S.vx, S.vy); return [['الزمن الدوري T', fmt(S.T, 3), 'سنة'], ['البعد الحالي', fmt(Math.hypot(S.x, S.y), 3), 'AU'], ['السرعة', fmt(v * 4.74, 2), 'km/s'], ['T²/a³ (قانون كبلر)', fmt(S.T * S.T / Math.pow(q.a, 3), 3), '']]; }
};

SIMS.lens = {
  params: [P('f', 'البعد البؤري', 2, 30, 10, 'cm', .5), P('do', 'بُعد الجسم', 3, 60, 25, 'cm', .5)],
  calc(q, E) {
    const md = E.p.mode, mir = md === 'cmirror' || md === 'vmirror' || md === 'plane';
    let F = (md === 'concave' || md === 'vmirror') ? -q.f : q.f; if (md === 'plane') F = 1e9;
    const inv = 1 / F - 1 / q.do, di = Math.abs(inv) < 1e-9 ? Infinity : 1 / inv; return { mir, F, di, m: -di / q.do };
  },
  draw(g, w, h, q, S, E) {
    const { mir, F, di, m } = SIMS.lens.calc(q, E), cx = w / 2, ay = h / 2, s = (w / 2 - 20) / 68, sv = s * 2, ho = 8, edge = h * .4;
    line(g, 10, ay, w - 10, ay, C.grid, 1.5);
    line(g, cx, ay - edge, cx, ay + edge, C.text, mir ? 5 : 3);
    if (mir) for (let y = ay - edge; y < ay + edge; y += 10) line(g, cx, y, cx + 7, y + 7, C.muted, 1);
    if (E.p.mode !== 'plane') { [mir ? cx - F * s : cx + F * s, mir ? null : cx - F * s].forEach(x => { if (x !== null) { circ(g, x, ay, 3, C.warm); txt(g, 'F', x, ay + 14, C.warm, 'center', 11); } }); }
    const xo = cx - q.do * s, oy = ay - ho * sv; arrow(g, xo, ay, xo, oy, C.accent, 3);
    if (Number.isFinite(di)) {
      let xi = mir ? cx - di * s : cx + di * s; xi = Math.max(10, Math.min(w - 10, xi));
      const yi = ay - Math.max(-edge, Math.min(edge, m * ho * sv)), real = di > 0, dash = real ? [] : [5, 4];
      arrow(g, xi, ay, xi, yi, C.hot, 3);
      line(g, xo, oy, cx, oy, C.warm, 1.5); line(g, cx, oy, xi, yi, C.warm, 1.5, dash);
      line(g, xo, oy, cx, ay, C.muted, 1.5); line(g, cx, ay, xi, yi, C.muted, 1.5, dash);
    } else txt(g, 'الجسم عند البؤرة: الأشعة المنكسرة متوازية ولا تتكون صورة', w / 2, 20, C.warm, 'center', 13);
  },
  read(q, S, E) {
    const { F, di, m } = SIMS.lens.calc(q, E), md = E.p.mode;
    const kind = !Number.isFinite(di) ? 'لا تتكون صورة' : (di > 0 ? 'حقيقية' : 'تقديرية') + '، ' + (m < 0 ? 'مقلوبة' : 'معتدلة') + '، ' + (Math.abs(m) > 1.01 ? 'مكبرة' : Math.abs(m) < .99 ? 'مصغرة' : 'مساوية');
    return [['البعد البؤري', md === 'plane' ? '∞' : fmt(F), 'cm'], ['بُعد الصورة', fmt(di), 'cm'], ['التكبير', fmt(m), '×'], ['نوع الصورة', kind, '']];
  }
};

SIMS.refraction = {
  params: [P('n1', 'معامل انكسار الوسط الأول', 1, 2.5, 1, '', .01), P('n2', 'معامل انكسار الوسط الثاني', 1, 2.5, 1.5, '', .01), P('a', 'زاوية السقوط', 0, 89, 40, '°', 1)],
  draw(g, w, h, q) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 20, t1 = q.a * D2R, s2 = q.n1 * Math.sin(t1) / q.n2;
    g.fillStyle = 'rgba(56,189,248,' + Math.min(.4, .08 * q.n2) + ')'; g.fillRect(0, cy, w, h - cy);
    g.fillStyle = 'rgba(148,163,184,' + Math.min(.3, .05 * q.n1) + ')'; g.fillRect(0, 0, w, cy);
    line(g, 0, cy, w, cy, C.muted, 2); line(g, cx, cy - R, cx, cy + R, C.muted, 1, [5, 5]);
    txt(g, 'n₁ = ' + fmt(q.n1), 50, 18, C.text, 'center', 12); txt(g, 'n₂ = ' + fmt(q.n2), 50, h - 14, C.text, 'center', 12);
    line(g, cx - R * Math.sin(t1), cy - R * Math.cos(t1), cx, cy, C.warm, 3);
    line(g, cx, cy, cx + R * Math.sin(t1), cy - R * Math.cos(t1), C.accent, 2, s2 > 1 ? [] : [6, 4]);
    if (s2 <= 1) { const t2 = Math.asin(s2); line(g, cx, cy, cx + R * Math.sin(t2), cy + R * Math.cos(t2), C.hot, 3); }
    else txt(g, 'انعكاس كلي داخلي', cx, cy + 40, C.hot, 'center', 14);
  },
  read(q) {
    const t1 = q.a * D2R, s2 = q.n1 * Math.sin(t1) / q.n2;
    return [['زاوية الانكسار', s2 > 1 ? 'انعكاس كلي' : fmt(Math.asin(s2) / D2R, 1), '°'], ['الزاوية الحرجة', q.n1 > q.n2 ? fmt(Math.asin(q.n2 / q.n1) / D2R, 1) : 'لا توجد', '°'], ['n₁·sinθ₁', fmt(q.n1 * Math.sin(t1), 3), ''], ['n₂·sinθ₂', s2 > 1 ? '—' : fmt(q.n2 * s2, 3), '']];
  }
};

SIMS.slits = {
  params: [P('lam', 'الطول الموجي', 380, 750, 550, 'nm', 1), P('d', 'المسافة بين الشقوق', 1, 500, 100, 'µm', 1), P('a', 'عرض الشق', .5, 100, 20, 'µm', .5), P('N', 'عدد الشقوق', 1, 10, 2, '', 1), P('L', 'بُعد الشاشة', .5, 5, 2, 'm', .1)],
  I(q, y) {
    const lam = q.lam * 1e-9, d = q.d * 1e-6, a = q.a * 1e-6, N = Math.round(q.N), s = y / Math.hypot(y, q.L), b = Math.PI * a * s / lam, ph = Math.PI * d * s / lam;
    const sc = Math.abs(b) < 1e-9 ? 1 : Math.sin(b) / b, gr = (N === 1 || Math.abs(Math.sin(ph)) < 1e-9) ? 1 : Math.sin(N * ph) / (N * Math.sin(ph)); return sc * sc * gr * gr;
  },
  range(q) { const lam = q.lam * 1e-9; return Math.round(q.N) === 1 ? 4 * lam * q.L / (q.a * 1e-6) : 6 * lam * q.L / (q.d * 1e-6); },
  draw(g, w, h, q) {
    const Y = SIMS.slits.range(q), rgb = wl2rgb(q.lam), base = h - 36, amp = h - 150;
    for (let x = 0; x < w; x += 2) { const y = (x / w * 2 - 1) * Y, v = SIMS.slits.I(q, y); g.fillStyle = 'rgb(' + rgb.map(c => Math.round(c * Math.sqrt(v))).join(',') + ')'; g.fillRect(x, 20, 2, 60); }
    g.beginPath(); for (let x = 0; x <= w; x += 2) { const v = SIMS.slits.I(q, (x / w * 2 - 1) * Y); x ? g.lineTo(x, base - amp * v) : g.moveTo(x, base - amp * v); }
    g.strokeStyle = 'rgb(' + rgb.join(',') + ')'; g.lineWidth = 2; g.stroke(); line(g, 0, base, w, base, C.muted, 1);
    txt(g, '−' + nf(Y * 1000) + ' mm', 40, h - 14, C.muted, 'center', 11); txt(g, '+' + nf(Y * 1000) + ' mm', w - 40, h - 14, C.muted, 'center', 11); txt(g, '0', w / 2, h - 14, C.muted, 'center', 11);
  },
  read(q) { const lam = q.lam * 1e-9; return [['عرض الهدب λL/d', fmt(lam * q.L / (q.d * 1e-6) * 1000, 3), 'mm'], ['أول صفر للحيود λL/a', fmt(lam * q.L / (q.a * 1e-6) * 1000, 3), 'mm'], ['الطول الموجي', fmt(q.lam, 0), 'nm'], ['عدد الشقوق', fmt(q.N, 0), '']]; }
};

SIMS.plot = {
  curves(E) { const f = E.p.fn; return Array.isArray(f) ? f : [[E.p.yl, f]]; },
  init(q, S) { S.sweep = true; },
  step(q, S, dt, E) { if (!S.sweep) return; const x = E.p.params.find(p => p.k === E.p.xk); let v = q[x.k] + (x.max - x.min) * dt / 10; if (v > x.max) v = x.min; q[x.k] = v; },
  draw(g, w, h, q, S, E) {
    const p = E.p, xs = p.params.find(a => a.k === p.xk), cs = SIMS.plot.curves(E), N = 160, m = { l: 62, r: 16, t: 30, b: 42 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
    const data = cs.map(c => { const a = []; for (let i = 0; i <= N; i++) { const x = xs.min + (xs.max - xs.min) * i / N, y = c[1](Object.assign({}, q, { [p.xk]: x })); a.push([x, Number.isFinite(y) ? y : NaN]); } return a; });
    let lo = 0, hi = -1e300; data.forEach(a => a.forEach(pt => { if (pt[1] === pt[1]) { hi = Math.max(hi, pt[1]); lo = Math.min(lo, pt[1]); } }));
    if (hi <= -1e299) hi = 1; if (hi - lo < 1e-12) hi = lo + 1; hi += (hi - lo) * .08; if (lo < 0) lo -= (hi - lo) * .05;
    const px = x => m.l + (x - xs.min) / (xs.max - xs.min) * pw, py = y => m.t + ph - (y - lo) / (hi - lo) * ph;
    for (let i = 0; i <= 4; i++) {
      const gy = m.t + ph * i / 4, gx = m.l + pw * i / 4; line(g, m.l, gy, m.l + pw, gy, C.grid, 1); line(g, gx, m.t, gx, m.t + ph, C.grid, 1);
      txt(g, nf(hi - (hi - lo) * i / 4), m.l - 6, gy, C.muted, 'right', 11); txt(g, nf(xs.min + (xs.max - xs.min) * i / 4), gx, m.t + ph + 14, C.muted, 'center', 11);
    }
    line(g, m.l, m.t, m.l, m.t + ph, C.muted, 1.5); line(g, m.l, m.t + ph, m.l + pw, m.t + ph, C.muted, 1.5);
    if (lo < 0 && hi > 0) line(g, m.l, py(0), m.l + pw, py(0), C.muted, 1, [4, 4]);
    const cols = [C.accent, C.warm, C.hot];
    data.forEach((a, k) => {
      g.beginPath(); let pen = false; a.forEach(pt => { if (pt[1] !== pt[1]) { pen = false; return; } const X = px(pt[0]), Y = Math.max(m.t - 30, Math.min(m.t + ph + 30, py(pt[1]))); pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; });
      g.strokeStyle = cols[k % 3]; g.lineWidth = 2.5; g.stroke();
      const yv = cs[k][1](q); if (Number.isFinite(yv)) circ(g, px(q[p.xk]), Math.max(m.t, Math.min(m.t + ph, py(yv))), 6, cols[k % 3], C.text);
      if (cs.length > 1) txt(g, cs[k][0], m.l + pw - 4 - k * 130, 14, cols[k % 3], 'right', 12);
    });
    line(g, px(q[p.xk]), m.t, px(q[p.xk]), m.t + ph, C.muted, 1, [3, 4]);
    txt(g, p.xl, m.l + pw / 2, h - 10, C.text, 'center', 12);
    g.save(); g.translate(14, m.t + ph / 2); g.rotate(-Math.PI / 2); txt(g, cs.length > 1 ? '' : p.yl, 0, 0, C.text, 'center', 12); g.restore();
  },
  read(q, S, E) {
    const p = E.p, r = [[p.xl, nf(q[p.xk]), '']]; SIMS.plot.curves(E).forEach(c => r.push([c[0], nf(c[1](q)), '']));
    return p.out ? r.concat(p.out(q)) : r;
  }
};

SIMS.truth = {
  idx(q, E) { return E.p.ins.reduce((a, n) => a * 2 + (q[n] ? 1 : 0), 0); },
  bits(i, n) { return Array.from({ length: n }, (_, j) => (i >> (n - 1 - j)) & 1); },
  draw(g, w, h, q, S, E) {
    const ins = E.p.ins, outs = E.p.outs, n = ins.length, rows = 1 << n, cols = n + outs.length, cw = Math.min(90, (w - 40) / cols), rh = Math.min(34, (h - 50) / (rows + 1)), x0 = (w - cw * cols) / 2, y0 = 20, cur = SIMS.truth.idx(q, E);
    ins.concat(outs.map(o => o[0])).forEach((nm, j) => { g.fillStyle = C.body; g.fillRect(x0 + j * cw, y0, cw - 2, rh - 2); txt(g, nm, x0 + j * cw + cw / 2, y0 + rh / 2, C.accent, 'center', 13); });
    for (let r = 0; r < rows; r++) {
      const b = SIMS.truth.bits(r, n), cells = b.concat(outs.map(f => f[1](b) ? 1 : 0));
      if (r === cur) { g.fillStyle = C.sel; g.fillRect(x0 - 4, y0 + (r + 1) * rh - 2, cw * cols + 6, rh); }
      cells.forEach((v, j) => txt(g, v, x0 + j * cw + cw / 2, y0 + (r + 1) * rh + rh / 2 - 2, j >= n && v ? C.hot : C.text, 'center', 15));
    }
  },
  read(q, S, E) { const b = SIMS.truth.bits(SIMS.truth.idx(q, E), E.p.ins.length); return E.p.outs.map(o => [o[0], o[1](b) ? 1 : 0, '']); }
};

SIMS.seq = {
  params: [P('f', 'تردد الساعة', .5, 6, 1.5, 'Hz', .1), P('n', 'عدد البتات', 2, 8, 4, '', 1), P('D', 'الدخل D', 0, 1, 1, '', 1), P('S', 'الدخل S (Set)', 0, 1, 0, '', 1), P('R', 'الدخل R (Reset)', 0, 1, 0, '', 1)],
  init(q, S, E) { const m = E.p.mode, n = (m === 'dff' || m === 'sr') ? 1 : Math.round(q.n); S.n = n; S.v = 0; S.bits = new Array(n).fill(0); if (m === 'ring') S.bits[0] = 1; S.acc = 0; S.q = 0; S.ticks = 0; S.flash = 0; S.bad = false; },
  step(q, S, dt, E) {
    const m = E.p.mode;
    if (m === 'sr') { if (q.S && !q.R) S.q = 1; else if (!q.S && q.R) S.q = 0; S.bad = !!(q.S && q.R); return; }
    S.acc += dt * q.f; S.flash = Math.max(0, S.flash - dt * 4);
    while (S.acc >= 1) {
      S.acc -= 1; S.ticks++; S.flash = 1; const n = S.n;
      if (m === 'up' || m === 'down') { const M = 1 << n; S.v = (S.v + (m === 'up' ? 1 : M - 1)) % M; S.bits = Array.from({ length: n }, (_, i) => (S.v >> (n - 1 - i)) & 1); }
      else if (m === 'ring') S.bits.unshift(S.bits.pop());
      else if (m === 'johnson') S.bits.unshift(S.bits.pop() ^ 1);
      else if (m === 'shift') { S.bits.unshift(q.D ? 1 : 0); S.bits.pop(); }
      else if (m === 'dff') S.q = q.D ? 1 : 0;
    }
  },
  draw(g, w, h, q, S, E) {
    const m = E.p.mode; let items;
    if (m === 'sr') items = [['S', q.S], ['R', q.R], ['Q', S.bad ? 0 : S.q], ['Q̄', S.bad ? 0 : 1 - S.q]];
    else if (m === 'dff') items = [['D', q.D], ['CLK', S.flash > .5 ? 1 : 0], ['Q', S.q]];
    else items = S.bits.map((b, i) => ['Q' + (S.n - 1 - i), b]);
    const r = Math.min(26, (w - 30) / items.length / 2.4), gap = r * 2.4, x0 = w / 2 - gap * (items.length - 1) / 2, y = h / 2;
    items.forEach(([nm, v], i) => { const x = x0 + i * gap; g.save(); if (v) { g.shadowColor = C.warm; g.shadowBlur = 18; } circ(g, x, y, r, v ? C.warm : C.body, C.muted); g.restore(); txt(g, v, x, y, v ? '#000' : C.muted, 'center', r); txt(g, nm, x, y + r + 16, C.text, 'center', 13); });
    if (S.bad) txt(g, 'حالة غير مسموحة: S = R = 1', w / 2, y - r - 30, C.hot, 'center', 14);
  },
  read(q, S, E) {
    const m = E.p.mode;
    if (m === 'sr') return [['Q', S.bad ? '—' : S.q, ''], ['الحالة', S.bad ? 'غير مسموحة' : q.S ? 'ضبط Set' : q.R ? 'مسح Reset' : 'احتفاظ', '']];
    if (m === 'dff') return [['Q', S.q, ''], ['عدد النبضات', S.ticks, '']];
    return [['القيمة العشرية', S.bits.reduce((a, b) => a * 2 + b, 0), ''], ['القيمة الثنائية', S.bits.join(''), ''], ['عدد النبضات', S.ticks, '']];
  }
};

SIMS.wave = {
  params: [P('f', 'التردد', .5, 5, 1, 'Hz', .1), P('lam', 'الطول الموجي', .5, 5, 2, 'm', .1), P('A', 'السعة', .1, 1, .6, '', .05), P('n', 'رقم التوافقي', 1, 8, 3, '', 1), P('df', 'فرق التردد', .1, 2, .5, 'Hz', .1)],
  init(q, S) { S.t = 0; },
  step(q, S, dt) { S.t += dt; },
  draw(g, w, h, q, S, E) {
    const m = E.p.mode, cy = h / 2, amp = h * .38 * q.A, W = 6; line(g, 0, cy, w, cy, C.grid, 1);
    g.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const x = i / w * W; let y;
      if (m === 'travel') y = Math.sin(TAU * (x / q.lam - q.f * S.t)); else if (m === 'standing') y = Math.sin(q.n * Math.PI * x / W) * Math.cos(TAU * q.n * .3 * S.t); else y = .5 * (Math.sin(TAU * q.f * x) + Math.sin(TAU * (q.f + q.df) * x));
      i ? g.lineTo(i, cy - amp * y) : g.moveTo(i, cy - amp * y);
    }
    g.strokeStyle = C.accent; g.lineWidth = 2.5; g.stroke();
    if (m === 'standing') for (let k = 0; k <= q.n; k++) circ(g, k * w / q.n, cy, 4, C.hot);
    if (m === 'beats') txt(g, 'المحور الأفقي: الزمن (s)', w / 2, h - 12, C.muted, 'center', 11);
  },
  read(q, S, E) {
    const m = E.p.mode;
    if (m === 'travel') return [['السرعة v = f·λ', fmt(q.f * q.lam), 'm/s'], ['الزمن الدوري', fmt(1 / q.f, 3), 's']];
    if (m === 'standing') return [['الطول الموجي 2L/n', fmt(12 / q.n), 'm'], ['التردد (v = 6 m/s)', fmt(q.n * 6 / 12), 'Hz'], ['عدد العُقَد', q.n + 1, '']];
    return [['تردد الضربات', fmt(q.df), 'Hz'], ['زمن الضربة', fmt(1 / q.df), 's'], ['متوسط التردد', fmt(q.f + q.df / 2), 'Hz']];
  }
};
