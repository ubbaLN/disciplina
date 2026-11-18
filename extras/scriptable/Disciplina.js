// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: check-circle;

// =====================================================================
//  Disciplina 2027 — widget e notificações da meia-noite (Scriptable)
//
//  Como usar:
//   • Widget: adicione um widget do Scriptable na tela de início e escolha
//     este script (nome: Disciplina). Funciona no tamanho pequeno e médio.
//   • Notificações: no app Atalhos, crie uma automação "Hora do dia" às 00:00
//     que roda este script com o parâmetro: meianoite
//   • Rodar aqui no Scriptable mostra uma prévia do widget (e pede login na 1ª vez).
// =====================================================================

// ---- Preencha com os mesmos dados do config.js do app ----
const SUPABASE_URL = 'https://zrbgqnzjsodugcpobwcq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TxqCe-WdzTuS7lFjOrNwEg_eSdHhjft';
const APP_URL = 'https://ubbaln.github.io/disciplina/';

// ---- Visual ----
const C = {
  bg: new Color('#0B0B0D'), text: new Color('#F4F4F5'), muted: new Color('#A1A1AA'),
  purple: new Color('#A970E8'), purpleFill: new Color('#7C4DDB'), red: new Color('#F0535A'),
  track: new Color('#26262B'), gray: new Color('#52525B')
};
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIAS_LONGOS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Mesmos padrões do app (usados se os ajustes ainda não foram salvos).
const DEFAULTS = {
  inicio: '2027-02-01', meta: 80, aguaMetaMl: 3000, horaDormir: '00:00',
  itens: [
    { id: 'musc', tipo: 'check', ativo: true }, { id: 'ativ', tipo: 'nota', ativo: true },
    { id: 'trab1', tipo: 'check', ativo: true }, { id: 'trab2', tipo: 'check', ativo: true },
    { id: 'ubba', tipo: 'check', ativo: true }, { id: 'fac', tipo: 'faculdade', ativo: true },
    { id: 'dieta', tipo: 'dieta', ativo: true }, { id: 'agua', tipo: 'agua', ativo: true },
    { id: 'sono', tipo: 'sono', ativo: true }
  ],
  bonus: [{ id: 'bmusc' }, { id: 'bativ' }]
};

// ---- Datas ----
const pad = (n) => String(n).padStart(2, '0');
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const dow = (s) => (pd(s).getDay() + 6) % 7;
const monday = (s) => addDays(s, -dow(s));
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const fmtDia = (s) => { const d = pd(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtData = (s) => { const d = pd(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const litros = (ml) => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
// Até as 5h da manhã, "o dia" ainda é o de ontem (é o dia que acabou de terminar).
function refDay() { const n = new Date(); if (n.getHours() < 5) n.setDate(n.getDate() - 1); return ds(n); }

// ---- Supabase ----
const KC_EMAIL = 'disciplina_email', KC_PASS = 'disciplina_senha';

async function credentials() {
  if (Keychain.contains(KC_EMAIL) && Keychain.contains(KC_PASS)) {
    return { email: Keychain.get(KC_EMAIL), senha: Keychain.get(KC_PASS) };
  }
  if (config.runsInWidget || config.runsInNotification || !config.runsInApp) {
    throw new Error('Abra o script Disciplina no app Scriptable uma vez para fazer login.');
  }
  const a = new Alert();
  a.title = 'Disciplina — login';
  a.message = 'Use o mesmo e-mail e senha do app. Ficam guardados só no Keychain deste iPhone.';
  a.addTextField('E-mail');
  a.addSecureTextField('Senha');
  a.addAction('Entrar');
  a.addCancelAction('Cancelar');
  if ((await a.presentAlert()) === -1) throw new Error('Login cancelado.');
  const email = a.textFieldValue(0).trim(), senha = a.textFieldValue(1);
  Keychain.set(KC_EMAIL, email);
  Keychain.set(KC_PASS, senha);
  return { email, senha };
}

async function login() {
  const c = await credentials();
  const req = new Request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
  req.method = 'POST';
  req.headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  req.body = JSON.stringify({ email: c.email, password: c.senha });
  const res = await req.loadJSON();
  if (!res.access_token) {
    if (req.response && req.response.statusCode === 400) { Keychain.remove(KC_EMAIL); Keychain.remove(KC_PASS); }
    throw new Error('Não consegui entrar. Rode o script no app Scriptable para fazer login de novo.');
  }
  return { token: res.access_token, userId: res.user.id };
}

async function api(path, auth, opts = {}) {
  const req = new Request(`${SUPABASE_URL}/rest/v1/${path}`);
  req.method = opts.method || 'GET';
  req.headers = Object.assign(
    { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    opts.headers || {}
  );
  if (opts.body) req.body = JSON.stringify(opts.body);
  if (opts.noBody) {
    await req.loadString();
    const code = req.response ? req.response.statusCode : 0;
    if (code >= 300) throw new Error(`Erro ao salvar (${code}).`);
    return null;
  }
  const out = await req.loadJSON();
  if (out && out.message && out.code) throw new Error(out.message);
  return out;
}

// ---- Regras (as mesmas do app) ----
function mergeSettings(saved) {
  const s = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), saved || {});
  if (!Array.isArray(s.itens) || !s.itens.length) s.itens = DEFAULTS.itens;
  if (!Array.isArray(s.bonus)) s.bonus = DEFAULTS.bonus;
  return s;
}
const emptyRow = (data) => ({ data, feitos: {}, agua_ml: 0, excecao: false, itens: null });

function makeCalc(settings, rows) {
  const realToday = ds(new Date());
  const row = (d) => rows[d] || emptyRow(d);
  const active = () => settings.itens.filter((i) => i.ativo);
  const itemsFor = (d) => {
    const r = rows[d];
    if (!r || !Array.isArray(r.itens) || d >= realToday) return active();
    const byId = {}; settings.itens.forEach((i) => { byId[i.id] = i; });
    return r.itens.map((id) => byId[id]).filter(Boolean);
  };
  const isDone = (it, r) => (it.tipo === 'agua' ? r.agua_ml >= settings.aguaMetaMl : !!(r.feitos || {})[it.id]);
  const dayPct = (d) => {
    if (dow(d) >= 5) return null;
    const r = row(d);
    if (r.excecao) return null;
    const its = itemsFor(d);
    return its.length ? Math.round(its.filter((i) => isDone(i, r)).length / its.length * 100) : 0;
  };
  return { row, itemsFor, dayPct };
}

async function loadData(auth) {
  const ref = refDay();
  const mon = monday(ref);
  const [aj, dias] = await Promise.all([
    api('ajustes?select=dados', auth),
    api(`dias?select=*&data=gte.${mon}&data=lte.${addDays(mon, 6)}`, auth)
  ]);
  const settings = mergeSettings(aj && aj[0] ? aj[0].dados : null);
  const rows = {};
  (dias || []).forEach((r) => { rows[r.data] = r; });
  const calc = makeCalc(settings, rows);

  const week = [0, 1, 2, 3, 4].map((i) => {
    const d = addDays(mon, i);
    const pct = (d > ref || d < settings.inicio) ? undefined : calc.dayPct(d);
    return { d, nome: DIAS[i], pct };
  });
  const valid = week.filter((x) => x.pct !== undefined && x.pct !== null).map((x) => x.pct);
  const weekAvg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const weekN = Math.floor(diffDays(monday(settings.inicio), mon) / 7) + 1;
  const r = calc.row(ref);
  const sonoAtivo = calc.itemsFor(ref).some((i) => i.tipo === 'sono');
  return { settings, rows, calc, ref, week, weekAvg, weekN, row: r, pct: calc.dayPct(ref), sonoAtivo };
}

// ---- Ações ----
async function markSleep(auth, data) {
  const r = data.row;
  const feitos = Object.assign({}, r.feitos || {}, { sono: true });
  const itens = Array.isArray(r.itens) ? r.itens : data.calc.itemsFor(data.ref).map((i) => i.id);
  await api('dias?on_conflict=user_id,data', auth, {
    method: 'POST', noBody: true,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: auth.userId, data: data.ref, feitos, itens, atualizado_em: new Date().toISOString() }
  });
}

function scriptURL(acao) {
  return `scriptable:///run/${encodeURIComponent(Script.name())}?acao=${acao}`;
}

async function notifySleep() {
  const n = new Notification();
  n.title = 'Hora de dormir';
  n.body = 'Marque que você está indo dormir agora. (Segure a notificação para ver os botões.)';
  n.threadIdentifier = 'disciplina';
  n.addAction('Estou indo dormir', scriptURL('dormir'));
  n.addAction('Ainda não', scriptURL('resumo'));
  await n.schedule();
}

async function notifySummary(data) {
  const n = new Notification();
  n.title = 'O dia acabou';
  n.body = data.pct === null
    ? 'Hoje foi marcado como exceção. Boa noite e até amanhã.'
    : `Você fez ${data.pct}% das metas diárias. Boa noite e até amanhã.`;
  n.threadIdentifier = 'disciplina';
  if (APP_URL) n.openURL = APP_URL;
  await n.schedule();
}

// ---- Widget ----
function addText(stack, text, size, color, bold) {
  const t = stack.addText(text);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
  return t;
}
const pctColor = (p, meta) => (p >= meta ? C.purple : C.red);

function buildWidget(data) {
  const s = data.settings;
  const fam = config.widgetFamily || 'medium';
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 14, 14, 14);
  if (APP_URL) w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  const main = w.addStack();
  main.layoutHorizontally();
  const left = main.addStack();
  left.layoutVertically();

  addText(left, 'DISCIPLINA', 10, C.muted, true);
  left.addSpacer(2);
  addText(left, `${DIAS_LONGOS[dow(data.ref)]}, ${fmtDia(data.ref)}`, 11, C.muted, false);
  left.addSpacer(6);

  let big = `${data.pct}%`, color = C.text;
  if (dow(data.ref) >= 5) big = 'Livre';
  else if (data.pct === null) { big = 'Exceção'; color = C.red; }
  else color = pctColor(data.pct, s.meta);
  addText(left, big, data.pct === null || dow(data.ref) >= 5 ? 24 : 36, color, true);

  left.addSpacer();
  if (dow(data.ref) < 5) addText(left, `Água ${litros(data.row.agua_ml || 0)} / ${litros(s.aguaMetaMl)} L`, 11, C.text, false);
  const semana = data.weekN >= 1
    ? `Semana ${data.weekN}${data.weekAvg === null ? '' : ` · ${data.weekAvg}%`}`
    : `Começa em ${fmtData(s.inicio)}`;
  addText(left, semana, 11, C.muted, false);

  if (fam !== 'small') {
    main.addSpacer();
    const right = main.addStack();
    right.layoutHorizontally();
    right.bottomAlignContent();
    const H = 70;
    data.week.forEach((x, i) => {
      if (i) right.addSpacer(8);
      const col = right.addStack();
      col.layoutVertically();
      const tag = x.pct === undefined ? ' ' : x.pct === null ? 'exc.' : `${x.pct}`;
      const tagColor = x.pct === undefined ? C.muted : x.pct === null ? C.red : pctColor(x.pct, s.meta);
      addText(col, tag, 9, tagColor, true);
      col.addSpacer(3);
      const track = col.addStack();
      track.size = new Size(18, H);
      track.layoutVertically();
      track.backgroundColor = C.track;
      track.cornerRadius = 5;
      track.addSpacer();
      const h = x.pct === undefined || x.pct === null ? 0 : Math.max(4, Math.round(x.pct / 100 * H));
      if (h) {
        const fill = track.addStack();
        fill.size = new Size(18, h);
        fill.backgroundColor = x.pct === 100 ? C.purple : x.pct >= s.meta ? C.purpleFill : C.red;
        fill.cornerRadius = 5;
      }
      col.addSpacer(3);
      addText(col, x.d === data.ref ? x.nome.toUpperCase() : x.nome, 9, x.d === data.ref ? C.text : C.muted, x.d === data.ref);
    });
  }
  return w;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 14, 14, 14);
  addText(w, 'DISCIPLINA', 10, C.muted, true);
  w.addSpacer(6);
  const t = w.addText(msg);
  t.font = Font.systemFont(12);
  t.textColor = C.text;
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  if (APP_URL) w.url = APP_URL;
  return w;
}

// ---- Início ----
function getAcao() {
  if (args.queryParameters && args.queryParameters.acao) return args.queryParameters.acao;
  if (typeof args.shortcutParameter === 'string' && args.shortcutParameter.trim()) return args.shortcutParameter.trim().toLowerCase();
  return null;
}

const acao = getAcao();
try {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Preencha SUPABASE_URL e SUPABASE_ANON_KEY no topo do script.');
  if (acao === 'sair') {
    Keychain.remove(KC_EMAIL); Keychain.remove(KC_PASS);
  } else {
    const auth = await login();
    let data = await loadData(auth);
    if (config.runsInWidget) {
      Script.setWidget(buildWidget(data));
    } else if (acao === 'meianoite') {
      // Fim de semana é livre: sem lembrete de sono nem resumo.
      if (dow(data.ref) < 5) {
        if (data.sonoAtivo && !(data.row.feitos || {}).sono && !data.row.excecao) await notifySleep();
        else await notifySummary(data);
      }
    } else if (acao === 'dormir') {
      if (dow(data.ref) < 5 && !data.row.excecao) {
        await markSleep(auth, data);
        data = await loadData(auth);
      }
      await notifySummary(data);
    } else if (acao === 'resumo') {
      await notifySummary(data);
    } else {
      await buildWidget(data).presentMedium();
    }
  }
} catch (e) {
  if (config.runsInWidget) {
    Script.setWidget(errorWidget(e.message));
  } else if (acao) {
    const n = new Notification();
    n.title = 'Disciplina';
    n.body = e.message;
    await n.schedule();
  } else {
    const a = new Alert();
    a.title = 'Disciplina';
    a.message = e.message;
    a.addAction('OK');
    await a.presentAlert();
  }
}
Script.complete();
