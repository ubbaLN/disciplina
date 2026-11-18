// Disciplina 2027 — app web (PWA)
// Sem etapa de build: um único módulo JS. Dados no Supabase ou, sem configuração, só neste aparelho.

const CFG = window.DISCIPLINA_CONFIG || {};
const LOCAL_MODE = !CFG.supabaseUrl || !CFG.supabaseAnonKey;

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIAS_LONGOS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TIPOS_REFEICAO = ['Café da manhã', 'Almoço', 'Lanche', 'Pré-treino', 'Jantar', 'Ceia'];

const DEFAULT_SETTINGS = {
  inicio: '2027-02-01',
  meta: 80,
  aguaMetaMl: 3000,
  horaDormir: '00:00',
  semestre: '1º semestre de 2027',
  diasAula: [1, 3],
  objetivo: 'Ganhar massa e secar gordura',
  itens: [
    { id: 'musc', nome: 'Musculação', tipo: 'check', ativo: true },
    { id: 'ativ', nome: 'Atividade física diversificada', tipo: 'nota', ativo: true },
    { id: 'trab1', nome: 'Trabalho — antes do almoço', tipo: 'check', ativo: true },
    { id: 'trab2', nome: 'Trabalho — depois do almoço', tipo: 'check', ativo: true },
    { id: 'ubba', nome: 'Foco na UBBA e nos eventos', tipo: 'check', ativo: true },
    { id: 'fac', nome: 'Faculdade / foco da semana', tipo: 'faculdade', ativo: true },
    { id: 'dieta', nome: 'Dieta em dia', tipo: 'dieta', ativo: true },
    { id: 'agua', nome: 'Água', tipo: 'agua', ativo: true },
    { id: 'sono', nome: 'Dormir no horário', tipo: 'sono', ativo: true }
  ],
  bonus: [
    { id: 'bmusc', nome: 'Musculação extra' },
    { id: 'bativ', nome: 'Atividade diversificada extra' }
  ]
};

/* ============ Datas (sempre no fuso do aparelho) ============ */
const pad = (n) => String(n).padStart(2, '0');
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const dow = (s) => (pd(s).getDay() + 6) % 7; // 0 = segunda
const monday = (s) => addDays(s, -dow(s));
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const today = () => ds(new Date());
const fmtDia = (s) => { const d = pd(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtData = (s) => { const d = pd(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
function fmtRange(a, b) {
  const da = pd(a), db = pd(b);
  return da.getMonth() === db.getMonth()
    ? `${da.getDate()}–${db.getDate()} ${MESES[db.getMonth()]}`
    : `${fmtDia(a)} – ${fmtDia(b)}`;
}
const litros = (ml) => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L';

/* ============ Utilidades ============ */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço ou bloqueado */ } };
function avg(list) {
  const v = list.filter((x) => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
}
function summarize(pcts) {
  const groups = {}; let exc = 0;
  pcts.forEach((p) => { if (p === null) { exc++; return; } groups[p] = (groups[p] || 0) + 1; });
  const parts = Object.keys(groups).map(Number).sort((a, b) => b - a)
    .map((k) => `${groups[k]} ${groups[k] > 1 ? 'dias' : 'dia'} ${k}%`);
  if (exc) parts.push(`${exc} ${exc > 1 ? 'exceções' : 'exceção'}`);
  return parts.join(' · ') || 'Sem dias registrados';
}
function mergeSettings(saved) {
  const s = Object.assign(clone(DEFAULT_SETTINGS), saved || {});
  if (!Array.isArray(s.itens) || !s.itens.length) s.itens = clone(DEFAULT_SETTINGS.itens);
  if (!Array.isArray(s.bonus)) s.bonus = clone(DEFAULT_SETTINGS.bonus);
  if (!Array.isArray(s.diasAula)) s.diasAula = [];
  return s;
}
const emptyDay = (data) => ({ data, feitos: {}, agua_ml: 0, excecao: false, excecao_texto: '', atividade_texto: '', refeicoes: [] });

/* ============ Ícones ============ */
const svg = (inner, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = {
  hoje: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.5"/>'),
  semanas: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  evolucao: svg('<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>'),
  dieta: svg('<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M17 21V3c-2 1.2-3 4-3 7v3h3"/>'),
  ajustes: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  prev: svg('<path d="M15 6l-6 6 6 6"/>', 20),
  next: svg('<path d="M9 6l6 6-6 6"/>', 20),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 18),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>', 18)
};

/* ============ Estado ============ */
const S = {
  screen: 'app', loaded: false, tab: 'hoje', sel: today(),
  settings: mergeSettings(null), days: {},
  excOpen: false, excDraft: '', mealTipo: 'Almoço', mealDraft: '', range: '16', newItem: '',
  sync: 'ok', toast: '', user: null
};
const pending = new Set(lsGet('disc_pending', []));
let pendingSettings = lsGet('disc_pending_settings', false);
let store = null;

/* ============ Armazenamento ============ */
const LocalStore = {
  async init() { return true; },
  async load() {
    const data = lsGet('disc_local', { settings: null, days: {} });
    return { settings: data.settings, days: data.days || {} };
  },
  async saveDay() { this._write(); },
  async saveSettings() { this._write(); },
  _write() { lsSet('disc_local', { settings: S.settings, days: S.days }); },
  async logout() {}
};

const SupaStore = {
  sb: null,
  async init() {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    this.sb = mod.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await this.sb.auth.getSession();
    S.user = data.session ? data.session.user : null;
    return !!S.user;
  },
  async login(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    S.user = data.user;
  },
  async load() {
    const from = addDays(S.settings.inicio < today() ? S.settings.inicio : today(), -60);
    const [aj, dias] = await Promise.all([
      this.sb.from('ajustes').select('dados').maybeSingle(),
      this.sb.from('dias').select('*').gte('data', from).order('data')
    ]);
    if (aj.error) throw aj.error;
    if (dias.error) throw dias.error;
    const days = {};
    (dias.data || []).forEach((r) => { days[r.data] = Object.assign(emptyDay(r.data), r); });
    return { settings: aj.data ? aj.data.dados : null, days };
  },
  async saveDay(row) {
    const { data, feitos, agua_ml, excecao, excecao_texto, atividade_texto, refeicoes, itens } = row;
    const { error } = await this.sb.from('dias').upsert(
      { user_id: S.user.id, data, feitos, agua_ml, excecao, excecao_texto, atividade_texto, refeicoes, itens: itens || null, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,data' }
    );
    if (error) throw error;
  },
  async saveSettings(settings) {
    const { error } = await this.sb.from('ajustes').upsert(
      { user_id: S.user.id, dados: settings, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
  },
  async logout() { await this.sb.auth.signOut(); }
};

function cacheLocal() {
  if (!LOCAL_MODE) lsSet('disc_cache', { settings: S.settings, days: S.days });
}
const dayTimers = {};
function queueSaveDay(date) {
  if (LOCAL_MODE) { LocalStore._write(); return; }
  cacheLocal();
  pending.add(date); lsSet('disc_pending', [...pending]);
  clearTimeout(dayTimers[date]);
  dayTimers[date] = setTimeout(() => flush(), 600);
}
let settingsTimer = null;
function queueSaveSettings() {
  if (LOCAL_MODE) { LocalStore._write(); return; }
  cacheLocal();
  pendingSettings = true; lsSet('disc_pending_settings', true);
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => flush(), 600);
}
let flushing = false, flushAgain = false;
async function flush() {
  if (!store) return;
  if (flushing) { flushAgain = true; return; }
  flushing = true; flushAgain = false;
  try {
    if (pendingSettings) {
      await store.saveSettings(S.settings);
      pendingSettings = false; lsSet('disc_pending_settings', false);
    }
    for (const date of [...pending]) {
      if (S.days[date]) await store.saveDay(S.days[date]);
      pending.delete(date); lsSet('disc_pending', [...pending]);
    }
    setSync('ok');
  } catch (e) {
    console.warn('Falha ao salvar', e);
    setSync('off');
  } finally {
    flushing = false;
    if (flushAgain && S.sync === 'ok') flush();
  }
}
function setSync(v) {
  if (S.sync === v) return;
  S.sync = v;
  const el = document.querySelector('.sync');
  if (el) el.outerHTML = syncHTML();
}

/* ============ Regras do dia ============ */
const activeItems = () => S.settings.itens.filter((i) => i.ativo);
const dayRow = (date) => S.days[date] || emptyDay(date);
const isWeekend = (date) => dow(date) >= 5;
function isDone(item, row) {
  if (item.tipo === 'agua') return row.agua_ml >= S.settings.aguaMetaMl;
  return !!row.feitos[item.id];
}
// Cada dia guarda quais itens valiam naquele dia (row.itens). Assim, criar ou desligar um item
// depois não muda a nota das semanas que já passaram.
function itemsFor(date) {
  const r = S.days[date];
  if (!r || !Array.isArray(r.itens) || date >= today()) return activeItems();
  const byId = {}; S.settings.itens.forEach((i) => { byId[i.id] = i; });
  return r.itens.map((id) => byId[id]).filter(Boolean);
}
function dayCount(date) { const r = dayRow(date); return itemsFor(date).filter((i) => isDone(i, r)).length; }
function dayPct(date) {
  if (isWeekend(date)) return null;
  const r = dayRow(date);
  if (r.excecao) return null;
  const n = itemsFor(date).length;
  return n ? Math.round(dayCount(date) / n * 100) : 0;
}
const bonusCount = (date) => S.settings.bonus.filter((b) => dayRow(date).feitos[b.id]).length;
function canEdit(date) { const t = today(); return date === t || date === addDays(t, -1); }
const weekNumber = (date) => Math.floor(diffDays(monday(S.settings.inicio), monday(date)) / 7) + 1;
const pctColor = (p) => (p >= S.settings.meta ? 'var(--purple)' : 'var(--red)');
const barColor = (p) => (p === null ? '#52525B' : p === 100 ? '#A970E8' : p >= S.settings.meta ? '#7C4DDB' : '#F0535A');

function weeksData() {
  const s = S.settings, t = today();
  const startMon = monday(s.inicio), curMon = monday(t);
  const out = [];
  if (curMon < startMon) return out;
  for (let m = startMon; m <= curMon; m = addDays(m, 7)) {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = addDays(m, i);
      if (d < s.inicio || d > t) { days.push(undefined); continue; }
      days.push(dayPct(d));
    }
    const valid = days.filter((x) => x !== undefined);
    out.push({ n: weekNumber(m), mon: m, days, valid, avg: avg(valid), cur: m === curMon });
  }
  return out;
}

function mutDay(date, fn, rerender = true) {
  const row = clone(dayRow(date));
  fn(row);
  if (date >= today() || !Array.isArray(row.itens)) row.itens = itemsFor(date).map((i) => i.id);
  S.days[date] = row;
  queueSaveDay(date);
  if (rerender) render();
}

/* ============ Telas ============ */
function syncHTML() {
  if (LOCAL_MODE) return '<span class="sync"><span class="sync-dot"></span>Modo local</span>';
  return S.sync === 'off'
    ? '<span class="sync off" role="status"><span class="sync-dot"></span>Sem conexão · salvo no aparelho</span>'
    : '<span class="sync" role="status"><span class="sync-dot"></span>Sincronizado</span>';
}

function navHTML() {
  const tabs = [['hoje', 'Hoje'], ['semanas', 'Semanas'], ['evolucao', 'Evolução'], ['dieta', 'Dieta'], ['ajustes', 'Ajustes']];
  return `<nav class="nav" aria-label="Seções"><span class="nav-brand">DISCIPLINA 2027</span>${tabs.map(([id, nome]) =>
    `<button type="button" class="nav-btn" data-act="tab" data-v="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${ICON[id]}<span>${nome}</span></button>`
  ).join('')}</nav>`;
}

function renderHoje() {
  const s = S.settings, t = today(), sel = S.sel;
  const mon = monday(sel), curMon = monday(t);
  const wn = weekNumber(sel);
  const weekTitle = wn >= 1 ? `Semana ${wn}` : 'Antes do início';
  const row = dayRow(sel);
  const wkend = isWeekend(sel);
  const editable = canEdit(sel);
  const blocked = !editable || row.excecao;

  const strip = DIAS.map((nm, i) => {
    const d = addDays(mon, i);
    let tag = '—', color = 'var(--muted)';
    if (i >= 5) { const b = bonusCount(d); tag = b ? `+${b}` : 'livre'; }
    else if (dayRow(d).excecao) { tag = 'exc.'; color = 'var(--red)'; }
    else if (d <= t) { const p = dayPct(d); tag = `${p}%`; color = pctColor(p); }
    return `<button type="button" class="day ${d === t ? 'today' : ''}" data-act="sel" data-v="${d}" aria-pressed="${d === sel}" aria-label="${DIAS_LONGOS[i]}, ${fmtDia(d)}">
      <span class="day-name">${nm}</span><span class="day-num">${pd(d).getDate()}</span><span class="day-tag" style="color:${color}">${tag}</span></button>`;
  }).join('');

  let big, color = 'var(--text)', barW = 0, count = '';
  const n = itemsFor(sel).length;
  if (wkend) { big = 'Livre'; count = `+${bonusCount(sel)} bônus`; }
  else if (row.excecao) { big = 'Exceção'; color = 'var(--red)'; count = 'não conta na média'; }
  else if (sel > t) { big = '—'; count = `0 de ${n} metas`; }
  else { const p = dayPct(sel); big = `${p}%`; color = pctColor(p); barW = p; count = `${dayCount(sel)} de ${n} metas`; }

  let status;
  if (sel > t) status = 'Ainda não chegou';
  else if (sel === t) status = 'Hoje · em andamento';
  else if (editable) status = 'Ontem · ainda dá para marcar até hoje, 23:59';
  else status = 'Dia fechado · prazo de marcação encerrado';
  if (wkend && sel <= t) status += ' · fim de semana livre, treinos contam como bônus';
  if (sel < s.inicio) status += ` · a contagem oficial começa em ${fmtData(s.inicio)}`;

  let list = '';
  if (wkend) {
    list = s.bonus.map((b) => {
      const done = !!row.feitos[b.id];
      return `<div class="item-wrap"><button type="button" class="item ${done ? 'done' : ''}" data-act="toggle" data-v="${b.id}" ${!editable ? 'disabled' : ''} aria-pressed="${done}">
        <span class="check">${done ? ICON.check : ''}</span><span class="item-text"><span class="item-label">${esc(b.nome)}</span><span class="item-sub">Bônus de fim de semana</span></span></button></div>`;
    }).join('');
  } else {
    list = itemsFor(sel).map((it) => itemHTML(it, row, sel, blocked)).join('');
  }

  let exc = '';
  if (!wkend && row.excecao) {
    exc = `<div class="exc-card"><span class="exc-title">EXCEÇÃO — NÃO CONTA NA MÉDIA</span><span style="font-size:14px;line-height:1.45">${esc(row.excecao_texto)}</span>
      ${editable ? '<button type="button" class="btn small" data-act="exc-undo" style="align-self:flex-start">Desfazer exceção</button>' : ''}</div>`;
  }
  let excForm = '';
  if (!wkend && editable && !row.excecao && sel <= t) {
    excForm = S.excOpen
      ? `<div class="card stack" style="margin-top:14px"><label class="label" for="exc-text" style="font-weight:600">O que aconteceu nesse dia?</label>
          <textarea id="exc-text" class="field" data-input="exc" placeholder="Ex.: feriado, doente, viagem, alta temporada…">${esc(S.excDraft)}</textarea>
          <div class="row"><button type="button" class="btn danger" style="flex:1" data-act="exc-save">Salvar exceção</button><button type="button" class="btn" style="flex:1" data-act="exc-cancel">Cancelar</button></div></div>`
      : '<button type="button" class="btn ghost block" style="margin-top:14px" data-act="exc-open">Marcar este dia como exceção</button>';
  }

  return `
    <div class="week-nav">
      <button type="button" class="icon-btn" data-act="week" data-v="-1" aria-label="Semana anterior">${ICON.prev}</button>
      <span class="week-nav-title">${weekTitle} · ${fmtRange(mon, addDays(mon, 4))}</span>
      <button type="button" class="icon-btn" data-act="week" data-v="1" aria-label="Próxima semana" ${mon >= curMon ? 'disabled' : ''}>${ICON.next}</button>
    </div>
    <div class="strip">${strip}</div>
    <section class="card score">
      <div class="row between"><span class="small muted" style="font-size:13px">${DIAS_LONGOS[dow(sel)]}, ${fmtDia(sel)}</span><span class="small muted">${count}</span></div>
      <div class="score-big" style="color:${color}">${big}</div>
      <div class="bar"><span style="width:${barW}%;background:${color}"></span></div>
      <span class="small muted">${status}</span>
    </section>
    ${exc}
    <div class="items ${row.excecao ? 'excluded' : (blocked ? 'locked' : '')}">${list}</div>
    ${excForm}`;
}

function itemHTML(it, row, date, blocked) {
  const s = S.settings;
  if (it.tipo === 'agua') {
    const done = row.agua_ml >= s.aguaMetaMl;
    const pct = Math.min(100, Math.round(row.agua_ml / s.aguaMetaMl * 100));
    const dis = blocked ? 'disabled' : '';
    return `<div class="water">
      <div class="row" style="gap:14px"><span class="check ${done ? 'on' : ''}">${done ? ICON.check : ''}</span>
        <span style="flex:1;font-size:15px;font-weight:500">${esc(it.nome)} — meta ${litros(s.aguaMetaMl)}</span>
        <span class="water-amount" style="color:${done ? '#C49BF0' : 'var(--text)'}">${litros(row.agua_ml)}</span></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="water-btns">
        <button type="button" data-act="agua" data-v="-250" ${dis}>−250 ml</button>
        <button type="button" data-act="agua" data-v="250" ${dis}>+250 ml</button>
        <button type="button" class="primary" data-act="agua" data-v="500" ${dis}>+500 ml</button>
      </div></div>`;
  }
  const done = isDone(it, row);
  let label = it.nome, sub = '';
  if (it.tipo === 'faculdade') {
    const aula = s.diasAula.includes(dow(date));
    label = aula ? 'Faculdade — fui à aula' : 'Foco da semana (estudo ou projeto)';
    sub = aula ? 'Dia de aula' : 'Sem aula hoje';
  } else if (it.tipo === 'sono') {
    sub = `Meta: ${s.horaDormir}`;
  } else if (it.tipo === 'nota') {
    sub = row.atividade_texto ? `Fiz: ${row.atividade_texto}` : 'Pilates, yoga, luta…';
  } else if (it.tipo === 'dieta') {
    const n = (row.refeicoes || []).length;
    sub = n ? `${n} ${n > 1 ? 'refeições registradas' : 'refeição registrada'}` : 'Registre as refeições na aba Dieta';
  }
  const note = (it.tipo === 'nota' && done && !blocked)
    ? `<div class="note field-group"><label class="label small" for="ativ-note">O que você fez?</label>
       <input id="ativ-note" class="field" data-input="ativ" value="${esc(row.atividade_texto)}" placeholder="Ex.: pilates, 50 min" autocomplete="off"></div>`
    : '';
  return `<div class="item-wrap"><button type="button" class="item ${done ? 'done' : ''}" data-act="toggle" data-v="${esc(it.id)}" ${blocked ? 'disabled' : ''} aria-pressed="${done}">
    <span class="check">${done ? ICON.check : ''}</span>
    <span class="item-text"><span class="item-label">${esc(label)}</span>${sub ? `<span class="item-sub">${esc(sub)}</span>` : ''}</span></button>${note}</div>`;
}

function notStartedBanner() {
  return `<div class="banner">A contagem começa em <strong>${fmtData(S.settings.inicio)}</strong>. Para testar antes, mude a data de início em Ajustes e depois volte para ${fmtData(S.settings.inicio)}.</div>`;
}

function renderSemanas() {
  const weeks = weeksData();
  if (!weeks.length) return `<h1 class="page-title">Semanas</h1>${notStartedBanner()}`;
  const s = S.settings;
  const cur = weeks[weeks.length - 1];
  const curBars = DIAS.slice(0, 5).map((nm, i) => {
    const p = cur.days[i];
    const h = p === undefined || p === null ? 6 : Math.max(6, Math.round(p * 0.64));
    const c = p === undefined ? '#26262B' : barColor(p);
    const tag = p === undefined ? '' : p === null ? 'exc.' : `${p}%`;
    const tc = p === undefined ? 'var(--muted)' : p === null ? 'var(--red)' : pctColor(p);
    return `<div class="curbar"><span class="small" style="font-size:10px;font-weight:700;color:${tc}">${tag}</span>
      <div class="curbar-track"><div class="curbar-fill" style="height:${h}px;background:${c}"></div></div><span class="small muted">${nm}</span></div>`;
  }).join('');
  const aulas = s.diasAula.length ? s.diasAula.slice().sort().map((i) => DIAS_LONGOS[i].toLowerCase()).join(', ') : 'nenhum dia marcado';

  const past = weeks.slice(0, -1).reverse().map((w) => `
    <section class="card week-card">
      <div class="stack" style="gap:4px;min-width:0">
        <span class="week-title">Semana ${w.n} <span class="small muted" style="font-weight:400">· ${fmtRange(w.mon, addDays(w.mon, 4))}</span></span>
        <span class="week-summary">${summarize(w.valid)}</span>
      </div>
      <div class="stack" style="gap:6px;align-items:flex-end;flex:0 0 auto">
        <span class="week-pct" style="color:${w.avg === null ? 'var(--muted)' : pctColor(w.avg)}">${w.avg === null ? '—' : w.avg + '%'}</span>
        <div class="minibars">${w.days.map((p) => p === undefined ? '' : `<span style="height:${p === null ? 4 : Math.max(4, Math.round(p * 0.36))}px;background:${barColor(p)}"></span>`).join('')}</div>
      </div>
    </section>`).join('');

  return `
    <h1 class="page-title">Semanas</h1>
    <div class="stack">
      <section class="card stack">
        <div class="row between" style="align-items:flex-start">
          <div class="stack" style="gap:3px"><span class="week-title" style="font-size:18px">Semana ${cur.n}</span>
            <span class="small muted">${fmtRange(cur.mon, addDays(cur.mon, 4))} · em andamento</span></div>
          <span class="week-pct" style="font-size:28px;color:${cur.avg === null ? 'var(--muted)' : pctColor(cur.avg)}">${cur.avg === null ? '—' : cur.avg + '%'}</span>
        </div>
        <div class="curbars">${curBars}</div>
        <span class="week-summary">${summarize(cur.valid)}</span>
        <span class="small muted">Aulas neste semestre: ${aulas}</span>
      </section>
      ${past ? '<h2 class="section-title">SEMANAS ANTERIORES</h2>' + past : ''}
    </div>`;
}

function chartSVG(weeks, n, meta) {
  const W = 640, H = 320, pl = 62, pr = 16, pt = 16, pb = 40;
  const X = (i) => pl + (n <= 1 ? 0 : (i - 1) / (n - 1)) * (W - pl - pr);
  const Y = (v) => pt + (1 - v / 100) * (H - pt - pb);
  let out = '';
  [0, 25, 50, 75, 100].forEach((v) => {
    out += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#26262B" stroke-width="1.5"/>`;
    out += `<text x="${pl - 10}" y="${Y(v) + 6}" text-anchor="end" font-size="18" fill="#A1A1AA">${v}%</text>`;
  });
  const step = Math.max(1, Math.ceil(n / 6));
  for (let i = 1; i <= n; i += step) out += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="18" fill="#A1A1AA">S${i}</text>`;
  out += `<path d="M${X(1)} ${Y(meta)} L${X(n)} ${Y(meta)}" fill="none" stroke="#F0535A" stroke-width="3" stroke-dasharray="10 8" stroke-linecap="round"/>`;
  const pts = weeks.filter((w) => w.avg !== null).map((w) => ({ x: X(w.n), y: Y(w.avg), cur: w.cur }));
  const closed = pts.filter((p) => !p.cur);
  const cur = pts.find((p) => p.cur);
  if (closed.length > 1) out += `<path d="${closed.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="#A970E8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  // Semana em andamento: ligada por um pontilhado fino, para não "derrubar" a linha no meio da semana.
  if (cur && closed.length) { const l = closed[closed.length - 1]; out += `<path d="M${l.x} ${l.y} L${cur.x} ${cur.y}" fill="none" stroke="#A970E8" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`; }
  closed.forEach((p) => { out += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#A970E8"/>`; });
  if (cur) out += `<circle cx="${cur.x}" cy="${cur.y}" r="7" fill="#151518" stroke="#A970E8" stroke-width="3"/>`;
  const desc = weeks.filter((w) => w.avg !== null).map((w) => `semana ${w.n}: ${w.avg}%${w.cur ? ' (em andamento)' : ''}`).join(', ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Disciplina por semana. ${esc(desc)}. Meta ${meta}%.">${out}</svg>`;
}

function renderEvolucao() {
  const weeks = weeksData();
  if (!weeks.length) return `<h1 class="page-title">Evolução</h1>${notStartedBanner()}`;
  const s = S.settings;
  const yearEnd = `${pd(s.inicio).getFullYear()}-12-31`;
  const total = Math.max(weeks.length, Math.floor(diffDays(monday(s.inicio), monday(yearEnd)) / 7) + 1);
  const n = S.range === '16' ? Math.max(16, weeks.length) : total;
  const done = weeks.filter((w) => !w.cur && w.avg !== null);
  const media = avg(done.map((w) => w.avg));
  let seq = 0;
  for (let i = done.length - 1; i >= 0 && done[i].avg >= s.meta; i--) seq++;
  return `
    <h1 class="page-title">Evolução</h1>
    <div class="stack">
      <section class="card stack">
        <div class="legend"><span><span class="lg-solid"></span>Você, semana a semana</span><span><span class="lg-dash"></span>Meta de ${s.meta}%</span></div>
        ${chartSVG(weeks, n, s.meta)}
        <p class="small" style="margin:0;line-height:1.5;color:var(--text-2)">Cada ponto é o % da semana. A linha cai quando você piora em relação à semana anterior. O círculo vazado é a semana em andamento: ela só entra na linha quando fecha.</p>
      </section>
      <div class="seg">
        <button type="button" class="pill" data-act="range" data-v="16" aria-pressed="${S.range === '16'}">Primeiras 16 semanas</button>
        <button type="button" class="pill" data-act="range" data-v="ano" aria-pressed="${S.range === 'ano'}">Ano todo</button>
      </div>
      <div class="stats">
        <div class="stat"><span class="stat-label">Média</span><span class="stat-value">${media === null ? '—' : media + '%'}</span></div>
        <div class="stat"><span class="stat-label">Semanas ≥ ${s.meta}%</span><span class="stat-value">${done.filter((w) => w.avg >= s.meta).length} de ${done.length}</span></div>
        <div class="stat"><span class="stat-label">Sequência</span><span class="stat-value">${seq} ${seq === 1 ? 'sem.' : 'sem.'}</span></div>
      </div>
      <span class="small muted">Média, semanas acima da meta e sequência contam só semanas fechadas.</span>
    </div>`;
}

function dietDate() { return canEdit(S.sel) ? S.sel : today(); }

function renderDieta() {
  const date = dietDate();
  const row = dayRow(date);
  const dietaItem = S.settings.itens.find((i) => i.tipo === 'dieta' && i.ativo);
  const ok = !!row.feitos.dieta;
  const quando = date === today() ? 'hoje' : 'ontem';
  const meals = (row.refeicoes || []).map((m, i) => `
    <div class="meal"><div class="stack" style="gap:3px;min-width:0"><span class="small muted">${esc(m.tipo)}${m.hora ? ' · ' + esc(m.hora) : ''}</span><span style="font-size:14px;line-height:1.4">${esc(m.texto)}</span></div>
      <button type="button" class="meal-del" data-act="meal-del" data-v="${i}" aria-label="Apagar refeição: ${esc(m.tipo)}">${ICON.trash}</button></div>`).join('');
  return `
    <h1 class="page-title">Dieta</h1>
    <div class="stack">
      <section class="card row between">
        <div class="stack" style="gap:3px"><span class="small muted" style="font-weight:700;letter-spacing:0.1em">OBJETIVO</span><span style="font-size:15px;font-weight:600">${esc(S.settings.objetivo)}</span></div>
        ${dietaItem && !isWeekend(date) ? `<button type="button" class="pill" data-act="dieta-ok" aria-pressed="${ok}">${ok ? `Dieta de ${quando}: ok` : `Marcar dieta de ${quando}`}</button>` : ''}
      </section>
      <section class="card stack">
        <span style="font-size:15px;font-weight:600">Registrar refeição de ${quando}</span>
        <div class="pills" role="group" aria-label="Tipo de refeição">${TIPOS_REFEICAO.map((t) => `<button type="button" class="pill" data-act="meal-tipo" data-v="${t}" aria-pressed="${S.mealTipo === t}">${t}</button>`).join('')}</div>
        <label class="label" for="meal-text">O que você comeu?</label>
        <textarea id="meal-text" class="field" data-input="meal" placeholder="Ex.: arroz, feijão, frango grelhado e salada">${esc(S.mealDraft)}</textarea>
        <button type="button" class="btn primary" data-act="meal-add">Registrar</button>
      </section>
      <span class="small muted">Sugestões com IA ficam para uma próxima versão.</span>
      ${meals ? `<h2 class="section-title">${quando.toUpperCase()}</h2>${meals}` : ''}
    </div>`;
}

function renderAjustes() {
  const s = S.settings;
  const n = activeItems().length;
  const itens = s.itens.map((it, i) => `
    <div class="set-item">
      <label class="sr-only" for="item-${i}">Nome do item ${i + 1}</label>
      <input id="item-${i}" class="field" data-set-item="${i}" value="${esc(it.nome)}" style="color:${it.ativo ? 'var(--text)' : '#8E8E97'}">
      ${i > 0 ? `<button type="button" class="tiny-btn" data-act="item-up" data-v="${i}" aria-label="Subir ${esc(it.nome)}">${ICON.up}</button>` : '<span style="width:40px;flex:0 0 auto"></span>'}
      ${it.id.startsWith('c_') ? `<button type="button" class="tiny-btn" data-act="item-del" data-v="${i}" aria-label="Apagar ${esc(it.nome)}">${ICON.trash}</button>` : ''}
      <button type="button" class="switch" role="switch" aria-checked="${it.ativo}" data-act="item-toggle" data-v="${i}" aria-label="${it.ativo ? 'Desativar' : 'Ativar'} ${esc(it.nome)}"></button>
    </div>`).join('');
  const bonus = s.bonus.map((b, i) => `
    <div class="set-item"><label class="sr-only" for="bonus-${i}">Bônus ${i + 1}</label><input id="bonus-${i}" class="field" data-set-bonus="${i}" value="${esc(b.nome)}"></div>`).join('');
  return `
    <h1 class="page-title">Ajustes</h1>
    <p class="muted" style="margin:0 0 16px;font-size:14px">No notebook você personaliza. No celular, você só marca.</p>
    <div class="settings-grid">
      <section class="card stack">
        <h2 style="margin:0;font-size:17px">Faculdade</h2>
        <div class="field-group"><label class="label" for="set-semestre">Semestre atual</label>
          <input id="set-semestre" class="field" data-set="semestre" value="${esc(s.semestre)}"></div>
        <div class="field-group"><span class="label" id="dias-aula">Dias de aula neste semestre</span>
          <div class="weekdays" role="group" aria-labelledby="dias-aula">${DIAS.slice(0, 5).map((nm, i) => `<button type="button" class="pill" data-act="aula" data-v="${i}" aria-pressed="${s.diasAula.includes(i)}">${nm}</button>`).join('')}</div>
          <span class="small muted" style="line-height:1.5">Nos dias de aula o item vira “Fui à aula”. Nos outros, “Foco da semana”.</span></div>
      </section>

      <section class="card stack">
        <h2 style="margin:0;font-size:17px">Metas</h2>
        <div class="grid-2">
          <div class="field-group"><label class="label" for="set-inicio">Início da contagem</label><input id="set-inicio" type="date" class="field" data-set="inicio" value="${esc(s.inicio)}"></div>
          <div class="field-group"><label class="label" for="set-meta">Meta de disciplina (%)</label><input id="set-meta" type="number" inputmode="numeric" min="10" max="100" class="field" data-set="meta" value="${s.meta}"></div>
          <div class="field-group"><label class="label" for="set-agua">Água por dia (litros)</label><input id="set-agua" type="number" inputmode="decimal" step="0.25" min="0.5" class="field" data-set="agua" value="${s.aguaMetaMl / 1000}"></div>
          <div class="field-group"><label class="label" for="set-dormir">Horário de dormir</label><input id="set-dormir" type="time" class="field" data-set="horaDormir" value="${esc(s.horaDormir)}"></div>
        </div>
        <span class="small muted" style="line-height:1.5">Dá para marcar um dia até o fim do dia seguinte. Fim de semana é livre.</span>
      </section>

      <section class="card stack">
        <div class="row between"><h2 style="margin:0;font-size:17px">Checklist de segunda a sexta</h2><span class="small muted">${n} itens · ${n ? Math.round(100 / n) : 0}% cada</span></div>
        ${itens}
        <div class="set-item"><label class="sr-only" for="new-item">Novo item</label>
          <input id="new-item" class="field" data-input="new-item" value="${esc(S.newItem)}" placeholder="Novo item (ex.: Leitura)">
          <button type="button" class="btn small" data-act="item-add">Adicionar</button></div>
      </section>

      <section class="card stack">
        <h2 style="margin:0;font-size:17px">Fim de semana (bônus)</h2>
        ${bonus}
        <h2 style="margin:8px 0 0;font-size:17px">Dieta</h2>
        <div class="field-group"><label class="label" for="set-obj">Objetivo</label><input id="set-obj" class="field" data-set="objetivo" value="${esc(s.objetivo)}"></div>
      </section>

      <section class="card stack">
        <h2 style="margin:0;font-size:17px">Instalar no iPhone</h2>
        <details><summary>Como colocar o app na tela de início</summary>
          <ol><li>Abra este endereço no <strong>Safari</strong>.</li><li>Toque em Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</li><li>Abra pelo ícone novo: ele funciona como app, em tela cheia.</li></ol></details>
        <details><summary>Widget e notificações das 00h</summary>
          <ol><li>Instale o app <strong>Scriptable</strong> e crie o script <strong>Disciplina</strong> (veja o guia).</li><li>Widget: segure a tela de início, toque em +, escolha Scriptable e selecione o script Disciplina.</li><li>Notificações: no app Atalhos, crie uma automação diária às ${esc(s.horaDormir)} que roda o script com o parâmetro <strong>meianoite</strong>.</li></ol></details>
      </section>

      <section class="card stack">
        <h2 style="margin:0;font-size:17px">Conta e dados</h2>
        ${LOCAL_MODE
          ? '<div class="banner warn">Modo local: os dados ficam só neste navegador. Para sincronizar celular, notebook e widget, preencha o arquivo config.js com os dados do Supabase.</div>'
          : `<span class="small muted">Conectado como ${esc(S.user && S.user.email)}</span>`}
        <div class="row"><button type="button" class="btn" style="flex:1" data-act="export">Baixar backup</button>
          ${LOCAL_MODE ? '' : '<button type="button" class="btn" style="flex:1" data-act="logout">Sair</button>'}</div>
      </section>
    </div>`;
}

function renderLogin(err) {
  return `<div class="login stack">
    <span class="brand-name" style="font-family:var(--font-display);font-size:13px;font-weight:700;letter-spacing:0.18em">DISCIPLINA 2027</span>
    <h1 class="page-title">Entrar</h1>
    <form class="stack" data-form="login">
      <div class="field-group"><label class="label" for="login-email">E-mail</label><input id="login-email" class="field" type="email" name="email" autocomplete="email" required></div>
      <div class="field-group"><label class="label" for="login-pass">Senha</label><input id="login-pass" class="field" type="password" name="password" autocomplete="current-password" required></div>
      ${err ? `<div class="banner warn" role="alert">${esc(err)}</div>` : ''}
      <button type="submit" class="btn primary">Entrar</button>
    </form></div>`;
}

function render() {
  const app = document.getElementById('app');
  if (S.screen === 'login') return;
  if (!S.loaded) { app.innerHTML = '<p class="loading">Carregando…</p>'; return; }
  const focusId = document.activeElement && document.activeElement.id;
  const views = { hoje: renderHoje, semanas: renderSemanas, evolucao: renderEvolucao, dieta: renderDieta, ajustes: renderAjustes };
  const wn = weekNumber(today());
  app.innerHTML = `<div class="shell">${navHTML()}<main class="main">
      <header class="top"><div class="brand"><span class="brand-name">DISCIPLINA 2027</span><span class="brand-sub">${wn >= 1 ? `Semana ${wn}` : `Começa em ${fmtData(S.settings.inicio)}`} · ${DIAS_LONGOS[dow(today())]}, ${fmtDia(today())}</span></div>${syncHTML()}</header>
      ${views[S.tab]()}
    </main></div>${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''}`;
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
}

let toastTimer = null;
function toast(msg) {
  S.toast = msg; render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast = ''; render(); }, 2600);
}

/* ============ Ações ============ */
const actions = {
  tab(v) { S.tab = v; S.excOpen = false; render(); window.scrollTo(0, 0); },
  sel(v) { S.sel = v; S.excOpen = false; S.excDraft = ''; render(); },
  week(v) {
    const next = addDays(monday(S.sel), Number(v) * 7);
    if (next > monday(today())) return;
    const d = addDays(next, Math.min(dow(S.sel), 6));
    S.sel = d > today() ? today() : d; S.excOpen = false; render();
  },
  toggle(id) {
    const d = S.sel;
    if (!canEdit(d) || dayRow(d).excecao) return;
    mutDay(d, (r) => { r.feitos[id] = !r.feitos[id]; });
  },
  agua(v) {
    const d = S.sel;
    if (!canEdit(d) || dayRow(d).excecao || isWeekend(d)) return;
    mutDay(d, (r) => { r.agua_ml = Math.max(0, Math.min(8000, r.agua_ml + Number(v))); });
  },
  'exc-open'() { S.excOpen = true; render(); const el = document.getElementById('exc-text'); if (el) el.focus(); },
  'exc-cancel'() { S.excOpen = false; S.excDraft = ''; render(); },
  'exc-save'() {
    const t = S.excDraft.trim();
    if (!t) { toast('Escreva o que aconteceu.'); return; }
    S.excOpen = false; S.excDraft = '';
    mutDay(S.sel, (r) => { r.excecao = true; r.excecao_texto = t; });
  },
  'exc-undo'() { mutDay(S.sel, (r) => { r.excecao = false; r.excecao_texto = ''; }); },
  'dieta-ok'() { const d = dietDate(); mutDay(d, (r) => { r.feitos.dieta = !r.feitos.dieta; }); },
  'meal-tipo'(v) { S.mealTipo = v; render(); },
  'meal-add'() {
    const t = S.mealDraft.trim();
    if (!t) { toast('Escreva o que você comeu.'); return; }
    const now = new Date();
    S.mealDraft = '';
    mutDay(dietDate(), (r) => { r.refeicoes = (r.refeicoes || []).concat([{ tipo: S.mealTipo, texto: t, hora: `${pad(now.getHours())}:${pad(now.getMinutes())}` }]); });
    toast('Refeição registrada');
  },
  'meal-del'(v) { mutDay(dietDate(), (r) => { r.refeicoes.splice(Number(v), 1); }); },
  range(v) { S.range = v; render(); },
  aula(v) {
    const i = Number(v), a = S.settings.diasAula;
    S.settings.diasAula = a.includes(i) ? a.filter((x) => x !== i) : a.concat([i]).sort();
    queueSaveSettings(); render();
  },
  'item-toggle'(v) { const it = S.settings.itens[Number(v)]; it.ativo = !it.ativo; queueSaveSettings(); render(); },
  'item-up'(v) {
    const i = Number(v), l = S.settings.itens;
    if (i < 1) return;
    [l[i - 1], l[i]] = [l[i], l[i - 1]];
    queueSaveSettings(); render();
  },
  'item-del'(v) {
    const it = S.settings.itens[Number(v)];
    if (!confirmDelete(it.nome)) return;
    S.settings.itens.splice(Number(v), 1); queueSaveSettings(); render();
  },
  'item-add'() {
    const nome = S.newItem.trim();
    if (!nome) return;
    S.settings.itens.push({ id: 'c_' + Date.now().toString(36), nome, tipo: 'check', ativo: true });
    S.newItem = ''; queueSaveSettings(); render();
  },
  export() {
    const blob = new Blob([JSON.stringify({ ajustes: S.settings, dias: S.days }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `disciplina-backup-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  },
  async logout() { await store.logout(); lsSet('disc_cache', null); location.reload(); }
};

function confirmDelete(nome) {
  // Item apagado some do checklist dos dias futuros; os dias já marcados não mudam de nota.
  return window.confirm(`Apagar o item "${nome}"? Ele some do checklist a partir de agora.`);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset.v);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  const k = el.dataset.input;
  if (k === 'exc') S.excDraft = el.value;
  else if (k === 'meal') S.mealDraft = el.value;
  else if (k === 'new-item') S.newItem = el.value;
  else if (k === 'ativ') mutDay(S.sel, (r) => { r.atividade_texto = el.value; }, false);
});

document.addEventListener('change', (e) => {
  const el = e.target;
  const s = S.settings;
  if (el.dataset.set) {
    const k = el.dataset.set, v = el.value;
    if (k === 'meta') { const n = Math.round(Number(v)); if (n >= 10 && n <= 100) s.meta = n; }
    else if (k === 'agua') { const n = Number(String(v).replace(',', '.')); if (n > 0) s.aguaMetaMl = Math.round(n * 1000); }
    else if (k === 'inicio') { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) s.inicio = v; }
    else if (k === 'horaDormir') { if (v) s.horaDormir = v; }
    else s[k] = v;
    queueSaveSettings();
  } else if (el.dataset.setItem !== undefined) {
    const it = s.itens[Number(el.dataset.setItem)];
    if (el.value.trim()) { it.nome = el.value.trim(); queueSaveSettings(); }
  } else if (el.dataset.setBonus !== undefined) {
    const b = s.bonus[Number(el.dataset.setBonus)];
    if (el.value.trim()) { b.nome = el.value.trim(); queueSaveSettings(); }
  }
  // Sem redesenhar a tela aqui: o "change" dispara ao sair do campo, e redesenhar
  // nesse momento engoliria o toque no próximo botão.
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.input === 'new-item') { e.preventDefault(); actions['item-add'](); }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.dataset.form !== 'login') return;
  e.preventDefault();
  const fd = new FormData(form);
  try {
    await store.login(String(fd.get('email')).trim(), String(fd.get('password')));
    S.screen = 'app';
    await loadData();
  } catch (err) {
    document.getElementById('app').innerHTML = renderLogin('E-mail ou senha incorretos.');
  }
});

/* ============ Início ============ */
async function loadData() {
  if (!LOCAL_MODE) {
    const cache = lsGet('disc_cache', null);
    if (cache && cache.settings) {
      S.settings = mergeSettings(cache.settings); S.days = cache.days || {}; S.loaded = true; render();
    }
  }
  try {
    const data = await store.load();
    const unsaved = {};
    pending.forEach((d) => { if (S.days[d]) unsaved[d] = S.days[d]; });
    if (!pendingSettings) S.settings = mergeSettings(data.settings);
    S.days = Object.assign({}, data.days, unsaved);
    S.loaded = true;
    if (!data.settings && !pendingSettings) queueSaveSettings();
    cacheLocal();
    render();
    flush();
  } catch (e) {
    console.warn('Falha ao carregar', e);
    S.loaded = true; setSync('off'); render();
  }
}

async function start() {
  store = LOCAL_MODE ? LocalStore : SupaStore;
  try {
    const ok = await store.init();
    if (!ok) { S.screen = 'login'; document.getElementById('app').innerHTML = renderLogin(); return; }
  } catch (e) {
    // Sem internet na abertura: usa o que está guardado no aparelho.
    const cache = lsGet('disc_cache', null);
    if (cache && cache.settings) { S.settings = mergeSettings(cache.settings); S.days = cache.days || {}; }
    S.loaded = true; S.sync = 'off'; render();
    return;
  }
  await loadData();
}

window.addEventListener('online', () => flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (S.sel !== today() && !canEdit(S.sel)) S.sel = today();
    flush();
    if (S.loaded && store && S.screen === 'app') loadData();
  }
});
setInterval(() => { if (pending.size || pendingSettings) flush(); }, 30000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

start();
