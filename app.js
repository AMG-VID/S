// معمل الكيمياء الافتراضي - المنطق الرئيسي
// بدون قاعدة بيانات، بدون AI، بدون خادم

let allMaterials = [];
let allExperiments = [];

// تحميل البيانات من ملفات JSON
async function loadData() {
  try {
    const matRes = await fetch('materials.json');
    allMaterials = await matRes.json();
    const expRes = await fetch('experiments.json');
    allExperiments = await expRes.json();
    renderMaterials(allMaterials);
    renderExperiments(allExperiments);
  } catch (err) {
    console.error('خطأ في تحميل البيانات:', err);
  }
}

// عرض المواد
function renderMaterials(list) {
  const grid = document.getElementById('materialsGrid');
  grid.innerHTML = list.map(m => `
    <div class="card" onclick="showMaterial('${m.id}')">
      <h3>${m.name}</h3>
      <span class="formula">${m.formula || m.symbol}</span>
      <div class="meta">${m.mass ? 'كتلة: ' + m.mass + ' g/mol' : ''}</div>
      <span class="badge">${m.category}</span>
    </div>
  `).join('');
}

// عرض التجارب
function renderExperiments(list) {
  const grid = document.getElementById('experimentsGrid');
  grid.innerHTML = list.map(e => `
    <div class="card" onclick="showExperiment('${e.id}')">
      <h3>${e.name}</h3>
      <span class="badge">${e.cat}</span>
      <div class="meta">المستوى: ${e.level}</div>
    </div>
  `).join('');
}

// نافذة تفاصيل مادة
function showMaterial(id) {
  const m = allMaterials.find(x => x.id === id);
  if (!m) return;
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <h2>${m.name} ${m.symbol ? '(' + m.symbol + ')' : ''}</h2>
    ${m.formula ? `<div class="section"><h3>الصيغة</h3><p>${m.formula}</p></div>` : ''}
    ${m.mass ? `<div class="section"><h3>الكتلة المولية</h3><p>${m.mass} g/mol</p></div>` : ''}
    ${m.state ? `<div class="section"><h3>الحالة</h3><p>${m.state}</p></div>` : ''}
    ${m.density ? `<div class="section"><h3>الكثافة</h3><p>${m.density}</p></div>` : ''}
    ${m.mp ? `<div class="section"><h3>درجة الانصهار</h3><p>${m.mp} °C</p></div>` : ''}
    ${m.bp ? `<div class="section"><h3>درجة الغليان</h3><p>${m.bp} °C</p></div>` : ''}
    ${m.hazard ? `<div class="section"><h3>⚠️ المخاطر</h3><p>${m.hazard}</p></div>` : ''}
    ${m.uses ? `<div class="section"><h3>الاستخدامات</h3><p>${m.uses}</p></div>` : ''}
    ${m.reaction ? `<div class="section"><h3>تفاعل شهير</h3><p>${m.reaction}</p></div>` : ''}
  `;
  document.getElementById('modal').classList.add('show');
}

// نافذة تفاصيل تجربة
function showExperiment(id) {
  const e = allExperiments.find(x => x.id === id);
  if (!e) return;
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <h2>${e.name}</h2>
    <div class="section"><h3>القسم</h3><p>${e.cat}</p></div>
    <div class="section"><h3>المستوى</h3><p>${e.level}</p></div>
    ${e.objective ? `<div class="section"><h3>الهدف</h3><p>${e.objective}</p></div>` : ''}
    ${e.materials ? `<div class="section"><h3>المواد المطلوبة</h3><ul>${e.materials.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    ${e.steps ? `<div class="section"><h3>الخطوات</h3><ul>${e.steps.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    ${e.formula ? `<div class="section"><h3>المعادلة</h3><p>${e.formula}</p></div>` : ''}
    ${e.safety ? `<div class="section"><h3>⚠️ السلامة</h3><p>${e.safety}</p></div>` : ''}
  `;
  document.getElementById('modal').classList.add('show');
}

// إغلاق النافذة
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('modal').classList.remove('show');
});
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') document.getElementById('modal').classList.remove('show');
});

// التبويبات
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// بحث المواد
document.getElementById('searchMaterials').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const cat = document.getElementById('filterCategory').value;
  const filtered = allMaterials.filter(m => {
    const matchQ = !q || (m.name && m.name.toLowerCase().includes(q)) ||
                   (m.symbol && m.symbol.toLowerCase().includes(q)) ||
                   (m.formula && m.formula.toLowerCase().includes(q));
    const matchCat = !cat || m.category === cat;
    return matchQ && matchCat;
  });
  renderMaterials(filtered);
});

document.getElementById('filterCategory').addEventListener('change', () => {
  document.getElementById('searchMaterials').dispatchEvent(new Event('input'));
});

// بحث التجارب
document.getElementById('searchExperiments').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const cat = document.getElementById('filterExpCat').value;
  const filtered = allExperiments.filter(ex => {
    const matchQ = !q || ex.name.toLowerCase().includes(q);
    const matchCat = !cat || ex.cat === cat;
    return matchQ && matchCat;
  });
  renderExperiments(filtered);
});

document.getElementById('filterExpCat').addEventListener('change', () => {
  document.getElementById('searchExperiments').dispatchEvent(new Event('input'));
});

// بدء التحميل
loadData();